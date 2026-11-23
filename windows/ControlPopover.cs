using System;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public sealed class ControlPopover : Form
{
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] private static extern bool DestroyIcon(IntPtr icon);

    private readonly WebView2 web = new WebView2();
    private readonly Timer desktopTimer = new Timer { Interval = 500 };
    private readonly JavaScriptSerializer json = new JavaScriptSerializer();
    private readonly Uri controlsUrl;
    private readonly NotifyIcon tray;
    private bool popupOpen;
    private string controlsRequest;
    private bool reportingVisibility;

    protected override bool ShowWithoutActivation { get { return true; } }

    private ControlPopover(Uri url, string profile)
    {
        controlsUrl = url;
        Text = "Livestream Roulette Controls";
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        ShowInTaskbar = false;
        TopMost = true;
        Opacity = 0.94;
        BackColor = Color.FromArgb(11, 28, 38);
        var emptyRegion = new Region();
        emptyRegion.MakeEmpty();
        Region = emptyRegion;
        PlaceAboveTaskbar();

        tray = new NotifyIcon
        {
            Icon = CreateTrayIcon(),
            Text = "Livestream Roulette"
        };
        tray.MouseClick += delegate(object sender, MouseEventArgs args)
        {
            if (args.Button != MouseButtons.Left && args.Button != MouseButtons.Right) return;
            if (controlsRequest != null) CloseControls();
            else OpenControls();
        };

        web.Dock = DockStyle.Fill;
        Controls.Add(web);
        Shown += async delegate
        {
            try
            {
                var environment = await CoreWebView2Environment.CreateAsync(null, profile);
                await web.EnsureCoreWebView2Async(environment);
                var core = web.CoreWebView2;
                core.Settings.AreDefaultContextMenusEnabled = false;
                core.Settings.AreDevToolsEnabled = false;
                core.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs args)
                {
                    args.Cancel = args.Uri != controlsUrl.AbsoluteUri;
                };
                core.NewWindowRequested += OpenSourceLink;
                core.WebMessageReceived += SetInteractiveRegion;
                core.NavigationCompleted += delegate(object sender, CoreWebView2NavigationCompletedEventArgs args)
                {
                    if (!args.IsSuccess)
                    {
                        Console.Error.WriteLine("The Livestream Roulette controls page could not load.");
                        Close();
                        return;
                    }
                    Hide();
                    tray.Visible = true;
                    Console.WriteLine("Livestream Roulette tray icon is ready.");
                };
                core.Navigate(controlsUrl.AbsoluteUri);
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(error);
                Close();
            }
        };
        Deactivate += delegate { CloseControls(); };
        desktopTimer.Tick += async delegate
        {
            PlaceAboveTaskbar();
            if (reportingVisibility) return;
            reportingVisibility = true;
            try
            {
                var screen = Screen.PrimaryScreen;
                var visible = DesktopVisibility.Measure(screen.WorkingArea, Handle);
                var player = screen.WorkingArea;
                var full = screen.Bounds;
                var sample = new
                {
                    fraction = visible,
                    controlsOpen = controlsRequest != null,
                    controlsRequest = controlsRequest,
                    playerVisibility = visible,
                    playerArea = new
                    {
                        left = (double)(player.Left - full.Left) / full.Width,
                        top = (double)(player.Top - full.Top) / full.Height,
                        width = (double)player.Width / full.Width,
                        height = (double)player.Height / full.Height
                    }
                };
                using (var client = new WebClient())
                {
                    client.Proxy = null;
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";
                    client.Headers["Origin"] = controlsUrl.GetLeftPart(UriPartial.Authority);
                    await client.UploadStringTaskAsync(new Uri(controlsUrl, "/api/visibility"), "POST", json.Serialize(sample));
                }
            }
            catch (WebException)
            {
                // The wallpaper treats missing measurements as covered.
            }
            finally
            {
                reportingVisibility = false;
            }
        };
        desktopTimer.Start();
        FormClosed += delegate
        {
            desktopTimer.Dispose();
            tray.Visible = false;
            tray.Icon.Dispose();
            tray.Dispose();
        };
    }

    private static Icon CreateTrayIcon()
    {
        using (var image = new Bitmap(32, 32))
        using (var graphics = Graphics.FromImage(image))
        using (var font = new Font("Segoe UI Symbol", 22, GraphicsUnit.Pixel))
        using (var format = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
        {
            graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
            graphics.FillEllipse(Brushes.DarkSlateGray, 1, 1, 30, 30);
            graphics.DrawString("\u2699", font, Brushes.White, new RectangleF(0, 0, 32, 32), format);
            var handle = image.GetHicon();
            try
            {
                using (var original = Icon.FromHandle(handle)) return (Icon)original.Clone();
            }
            finally
            {
                DestroyIcon(handle);
            }
        }
    }

    private async void OpenControls()
    {
        if (controlsRequest != null || web.CoreWebView2 == null) return;
        var request = Guid.NewGuid().ToString();
        controlsRequest = request;
        try
        {
            using (var client = new WebClient { Proxy = null })
            {
                for (var attempt = 0; attempt < 24 && controlsRequest == request; attempt++)
                {
                    var body = await client.DownloadStringTaskAsync(new Uri(controlsUrl, "/api/session"));
                    if (controlsRequest != request) return;
                    var session = json.Deserialize<ControlSession>(body);
                    if (session.controlsRequest == request && !session.trialPlayerMounted)
                    {
                        popupOpen = true;
                        PlaceAboveTaskbar();
                        Show();
                        Activate();
                        web.Focus();
                        web.CoreWebView2.PostWebMessageAsString("expand");
                        return;
                    }
                    await Task.Delay(125);
                }
            }
        }
        catch (WebException) {}
        if (controlsRequest == request)
        {
            controlsRequest = null;
            tray.ShowBalloonTip(2500, "Livestream Roulette", "Could not confirm the player was closed. Try again with the desktop visible.", ToolTipIcon.Info);
        }
    }

    private void CloseControls()
    {
        controlsRequest = null;
        if (!popupOpen) return;
        popupOpen = false;
        web.CoreWebView2.PostWebMessageAsString("collapse");
        Hide();
    }

    public sealed class ControlSession
    {
        public string controlsRequest { get; set; }
        public bool trialPlayerMounted { get; set; }
    }

    private void PlaceAboveTaskbar()
    {
        var workArea = Screen.PrimaryScreen.WorkingArea;
        var width = Math.Min(810, workArea.Width);
        var height = Math.Min(780, workArea.Height);
        var bounds = new Rectangle(workArea.Right - width, workArea.Bottom - height, width, height);
        if (Bounds != bounds) Bounds = bounds;
    }

    private void OpenSourceLink(object sender, CoreWebView2NewWindowRequestedEventArgs args)
    {
        args.Handled = true;
        Uri link;
        if (Uri.TryCreate(args.Uri, UriKind.Absolute, out link)
            && link.Scheme == Uri.UriSchemeHttps && string.IsNullOrEmpty(link.UserInfo))
            Process.Start(new ProcessStartInfo(link.AbsoluteUri) { UseShellExecute = true });
    }

    public sealed class ControlBounds
    {
        public double width { get; set; }
        public double height { get; set; }
        public PanelBounds[] rects { get; set; }
    }

    public sealed class PanelBounds
    {
        public double left { get; set; }
        public double top { get; set; }
        public double width { get; set; }
        public double height { get; set; }
    }

    private void SetInteractiveRegion(object sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        if (args.Source != controlsUrl.AbsoluteUri) return;
        if (args.WebMessageAsJson == "\"exit-controls\"")
        {
            CloseControls();
            Close();
            return;
        }
        if (args.WebMessageAsJson == "\"close-controls\"")
        {
            CloseControls();
            return;
        }
        var report = json.Deserialize<ControlBounds>(args.WebMessageAsJson);
        if (report.width <= 0 || report.height <= 0 || report.rects == null) return;

        var scaleX = ClientSize.Width / report.width;
        var scaleY = ClientSize.Height / report.height;
        var region = new Region();
        region.MakeEmpty();
        foreach (var rect in report.rects)
        {
            var bounds = Rectangle.FromLTRB(
                (int)Math.Floor(rect.left * scaleX),
                (int)Math.Floor(rect.top * scaleY),
                (int)Math.Ceiling((rect.left + rect.width) * scaleX),
                (int)Math.Ceiling((rect.top + rect.height) * scaleY));
            region.Union(Rectangle.Intersect(bounds, ClientRectangle));
        }
        var previous = Region;
        Region = region;
        if (previous != null) previous.Dispose();
    }

    public static void Open(string url, string profile)
    {
        SetProcessDPIAware();
        Application.EnableVisualStyles();
        using (var popover = new ControlPopover(new Uri(url), profile))
            Application.Run(popover);
    }
}
