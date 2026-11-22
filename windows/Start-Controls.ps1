# Run in Windows PowerShell 5.1 (powershell.exe).
param(
    [ValidateRange(1024, 65535)][int]$Port = 8768
)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop') {
    throw 'Run this script with Windows PowerShell 5.1 (powershell.exe).'
}
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'Run powershell.exe with the -STA option.'
}
$origin = "http://127.0.0.1:$Port"
try {
    Invoke-RestMethod "$origin/api/session" -TimeoutSec 2 | Out-Null
} catch {
    throw "Start companion_server.py on port $Port before opening the controls."
}

$data = Join-Path $env:LOCALAPPDATA 'Livestream Roulette'
$version = '1.0.2903.40'
$sdk = Join-Path $data "WebView2-SDK/$version"
$net = Join-Path $sdk 'lib/net462'
$core = Join-Path $net 'Microsoft.Web.WebView2.Core.dll'
$forms = Join-Path $net 'Microsoft.Web.WebView2.WinForms.dll'
$architecture = switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { 'x64' }
    'ARM64' { 'arm64' }
    'x86' { 'x86' }
    default { throw 'Unsupported Windows architecture.' }
}
$native = Join-Path $sdk "runtimes/win-$architecture/native"
if (!(Test-Path -LiteralPath $core) -or !(Test-Path -LiteralPath $forms) -or
    !(Test-Path -LiteralPath (Join-Path $native 'WebView2Loader.dll'))) {
    New-Item -ItemType Directory -Force $sdk | Out-Null
    $zip = Join-Path $sdk 'webview2.zip'
    $package = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg"
    Invoke-WebRequest -UseBasicParsing $package -OutFile $zip
    Expand-Archive -LiteralPath $zip -DestinationPath $sdk -Force
}
$env:Path = "$native;$env:Path"
[Reflection.Assembly]::LoadFrom($core) | Out-Null
[Reflection.Assembly]::LoadFrom($forms) | Out-Null
if (-not ('ControlPopover' -as [type])) {
    $sources = @('ControlPopover.cs', 'DesktopVisibility.cs') | ForEach-Object { Join-Path $PSScriptRoot $_ }
    Add-Type -Path $sources -ReferencedAssemblies @(
        'System.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll', 'System.Web.Extensions.dll', $core, $forms
    )
}
[ControlPopover]::Open("$origin/?controls=1", (Join-Path $data 'ControlWebView'))
