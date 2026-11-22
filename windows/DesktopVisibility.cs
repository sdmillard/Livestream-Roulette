using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;

public static class DesktopVisibility
{
    public static Rectangle PlayerArea(Rectangle workingArea, Rectangle popover)
    {
        var left = Rectangle.FromLTRB(workingArea.Left, workingArea.Top,
            Math.Max(workingArea.Left, popover.Left), workingArea.Bottom);
        var upper = Rectangle.FromLTRB(workingArea.Left, workingArea.Top, workingArea.Right,
            Math.Max(workingArea.Top, popover.Top));
        var leftArea = (long)left.Width * left.Height;
        var upperArea = (long)upper.Width * upper.Height;
        return leftArea >= upperArea ? left : upper;
    }

    private const int ExtendedFrameBounds = 9;
    private const int Cloaked = 14;
    private const uint DesktopReadObjects = 0x0001;
    private const int UserObjectName = 2;
    private const int ExtendedStyle = -20;
    private const int TransparentLayered = 0x00080020;

    private delegate bool WindowCallback(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(WindowCallback callback, IntPtr data);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongW")]
    private static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Bounds bounds);
    [DllImport("user32.dll")] private static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] private static extern bool CloseDesktop(IntPtr desktop);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, int size, out int needed);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr window, StringBuilder name, int size);
    [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")]
    private static extern int GetDwmBounds(IntPtr window, int attribute, out Bounds bounds, int size);
    [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")]
    private static extern int GetDwmValue(IntPtr window, int attribute, out int value, int size);

    [StructLayout(LayoutKind.Sequential)]
    private struct Bounds
    {
        public int Left, Top, Right, Bottom;
    }

    private static bool IsDefaultInputDesktop()
    {
        var desktop = OpenInputDesktop(0, false, DesktopReadObjects);
        if (desktop == IntPtr.Zero) return false;
        try
        {
            var name = new StringBuilder(128);
            int needed;
            return GetUserObjectInformation(desktop, UserObjectName, name, name.Capacity * sizeof(char), out needed)
                && name.ToString() == "Default";
        }
        finally
        {
            CloseDesktop(desktop);
        }
    }

    public static double Measure(Rectangle desktop, IntPtr companionWindow)
    {
        if (!IsDefaultInputDesktop()) return 0;
        var windows = new List<Rectangle>();
        var name = new StringBuilder(128);
        var completed = EnumWindows(delegate(IntPtr window, IntPtr data)
        {
            if (window == companionWindow || !IsWindowVisible(window) || IsIconic(window)) return true;
            // Click-through layered surfaces can cover the screen with transparent pixels.
            if ((GetWindowLong(window, ExtendedStyle) & TransparentLayered) == TransparentLayered) return true;
            GetClassName(window, name, name.Capacity);
            switch (name.ToString())
            {
                case "Progman":
                case "WorkerW":
                case "Shell_TrayWnd":
                case "Shell_SecondaryTrayWnd":
                    return true;
            }
            int cloaked;
            if (GetDwmValue(window, Cloaked, out cloaked, sizeof(int)) == 0 && cloaked != 0) return true;
            Bounds bounds;
            if (GetDwmBounds(window, ExtendedFrameBounds, out bounds, Marshal.SizeOf(typeof(Bounds))) != 0
                && !GetWindowRect(window, out bounds)) return true;
            windows.Add(Rectangle.FromLTRB(bounds.Left, bounds.Top, bounds.Right, bounds.Bottom));
            return true;
        }, IntPtr.Zero);
        return completed ? UncoveredFraction(desktop, windows) : 0;
    }

    public static double UncoveredFraction(Rectangle desktop, IEnumerable<Rectangle> windows)
    {
        if (desktop.Width <= 0 || desktop.Height <= 0) return 0;
        using (var uncovered = new Region(desktop))
        using (var identity = new System.Drawing.Drawing2D.Matrix())
        {
            foreach (var window in windows)
                uncovered.Exclude(window);
            double area = 0;
            foreach (var scan in uncovered.GetRegionScans(identity))
                area += (double)scan.Width * scan.Height;
            return Math.Max(0, Math.Min(1, area / ((double)desktop.Width * desktop.Height)));
        }
    }
}
