using System;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public sealed class ControlPopover : Form
{
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr window, StringBuilder name, int size);

    private readonly WebView2 web = new WebView2();
    private readonly Timer desktopTimer = new Timer { Interval = 200 };
    private readonly JavaScriptSerializer json = new JavaScriptSerializer();
    private readonly Uri controlsUrl;
    private readonly bool showOverWindows;
    private bool reportedReady;

    protected override bool ShowWithoutActivation { get { return true; } }

    private ControlPopover(Uri url, string profile, bool testMode)
    {
        controlsUrl = url;
        showOverWindows = testMode;
        Text = "Livestream Roulette Controls";
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        ShowInTaskbar = testMode;
        TopMost = true;
        Opacity = 0.94;
        BackColor = Color.FromArgb(11, 28, 38);
        var emptyRegion = new Region();
        emptyRegion.MakeEmpty();
        Region = emptyRegion;
        PlaceAboveTaskbar();

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
                core.Navigate(controlsUrl.AbsoluteUri);
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(error);
                Close();
            }
        };
        desktopTimer.Tick += delegate
        {
            var shouldShow = showOverWindows || DesktopIsForeground();
            if (Visible != shouldShow) Visible = shouldShow;
            if (Visible) PlaceAboveTaskbar();
        };
        desktopTimer.Start();
        FormClosed += delegate { desktopTimer.Dispose(); };
    }

    private void PlaceAboveTaskbar()
    {
        var workArea = Screen.PrimaryScreen.WorkingArea;
        var width = Math.Min(810, workArea.Width);
        var height = Math.Min(780, workArea.Height);
        var bounds = new Rectangle(workArea.Right - width, workArea.Bottom - height, width, height);
        if (Bounds != bounds) Bounds = bounds;
    }

    private bool DesktopIsForeground()
    {
        var foreground = GetForegroundWindow();
        if (foreground == IntPtr.Zero || foreground == Handle || foreground == GetShellWindow()) return true;
        var name = new StringBuilder(128);
        GetClassName(foreground, name, name.Capacity);
        return name.ToString() == "Progman" || name.ToString() == "WorkerW";
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
        if (!reportedReady && report.rects.Length > 0)
        {
            reportedReady = true;
            Console.WriteLine("Livestream Roulette controls are ready.");
        }
    }

    public static void Open(string url, string profile, bool testMode)
    {
        SetProcessDPIAware();
        Application.EnableVisualStyles();
        using (var popover = new ControlPopover(new Uri(url), profile, testMode))
            Application.Run(popover);
    }
}
