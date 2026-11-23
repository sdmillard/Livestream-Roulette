using System;
using System.IO;
using Microsoft.Win32;

// Registers the launcher under the current user's Run key so the companion starts at sign-in.
public static class StartupRegistration
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "Livestream Roulette";

    public static string Command(string launcher, int port)
    {
        var powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
            @"WindowsPowerShell\v1.0\powershell.exe");
        return string.Format("\"{0}\" -NoProfile -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File \"{1}\" -Port {2}",
            powershell, Path.GetFullPath(launcher), port);
    }

    public static bool IsEnabled(string launcher, int port)
    {
        using (var key = Registry.CurrentUser.OpenSubKey(RunKey))
        {
            var value = key == null ? null : key.GetValue(ValueName) as string;
            return string.Equals(value, Command(launcher, port), StringComparison.OrdinalIgnoreCase);
        }
    }

    public static void SetEnabled(string launcher, int port, bool enabled)
    {
        using (var key = Registry.CurrentUser.CreateSubKey(RunKey))
        {
            if (enabled) key.SetValue(ValueName, Command(launcher, port), RegistryValueKind.String);
            else key.DeleteValue(ValueName, false);
        }
    }
}
