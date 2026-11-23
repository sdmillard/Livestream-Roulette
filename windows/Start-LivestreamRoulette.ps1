param(
    [ValidateRange(1024, 65535)][int]$Port = 8768
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sessionUrl = "http://127.0.0.1:$Port/api/session"

function Get-CompanionSession {
    try {
        $session = Invoke-RestMethod $sessionUrl -TimeoutSec 2
    } catch {
        return
    }
    if ($session.epoch -notmatch '^[a-f0-9]{32}$' -or
        'trialPlayerMounted' -notin $session.PSObject.Properties.Name) {
        throw "Port $Port replied with an unexpected session."
    }
    $session
}

function Wait-ForCompanionProcess {
    param($Process, [string]$Name, [int]$Seconds, [scriptblock]$Ready)

    $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    do {
        if (& $Ready) { return }
        if ($Process.HasExited) { break }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "$Name did not become ready. Check the logs in $logs."
}

$mutex = [Threading.Mutex]::new($false, "Local\LivestreamRouletteLauncher-$Port")
$locked = $false
try {
    try {
        $locked = $mutex.WaitOne([TimeSpan]::FromSeconds(90))
    } catch [Threading.AbandonedMutexException] {
        $locked = $true
    }
    if (!$locked) { throw 'Livestream Roulette is still starting in another window.' }

    $logs = Join-Path $env:LOCALAPPDATA "Livestream Roulette\Logs\$Port"
    New-Item -ItemType Directory -Force -Path $logs | Out-Null
    $session = Get-CompanionSession
    if (!$session) {
        $python = Get-Command python.exe -CommandType Application -ErrorAction SilentlyContinue
        if (!$python) { throw 'Install Python and make python.exe available on PATH.' }
        $server = Start-Process -FilePath $python.Source -ArgumentList @('companion_server.py', '--port', $Port) `
            -WorkingDirectory $root -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logs 'server.log') `
            -RedirectStandardError (Join-Path $logs 'server-error.log')
        Wait-ForCompanionProcess $server 'The companion server' 10 { Get-CompanionSession }
        $session = Get-CompanionSession
    }

    # A fresh visibility sample also identifies tray helpers started manually.
    if ($null -eq $session.visibility) {
        $controls = Join-Path $PSScriptRoot 'Start-Controls.ps1'
        $trayLog = Join-Path $logs 'tray.log'
        $tray = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') `
            -ArgumentList @('-NoProfile', '-STA', '-ExecutionPolicy', 'RemoteSigned', '-File', ('"{0}"' -f $controls), '-Port', $Port) `
            -WindowStyle Hidden -PassThru -RedirectStandardOutput $trayLog `
            -RedirectStandardError (Join-Path $logs 'tray-error.log')
        Wait-ForCompanionProcess $tray 'The tray helper' 75 {
            (Select-String -LiteralPath $trayLog -SimpleMatch -Quiet 'Livestream Roulette tray icon is ready.') -and
                ($null -ne (Get-CompanionSession).visibility)
        }
    }
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
