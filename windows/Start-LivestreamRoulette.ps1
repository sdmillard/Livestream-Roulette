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

function Invoke-Git {
    param([string]$Git, [string]$Arguments, [int]$Seconds)

    $info = [Diagnostics.ProcessStartInfo]::new($Git, $Arguments)
    $info.WorkingDirectory = $root
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'
    $process = [Diagnostics.Process]::Start($info)
    $output = $process.StandardOutput.ReadToEndAsync()
    $errors = $process.StandardError.ReadToEndAsync()
    if (!$process.WaitForExit($Seconds * 1000)) {
        $process.Kill()
        return [pscustomobject]@{ Ok = $false; Text = "git $Arguments timed out after $Seconds seconds." }
    }
    [pscustomobject]@{ Ok = $process.ExitCode -eq 0; Text = ($output.Result + $errors.Result).Trim() }
}

# Fast-forwards a clean main checkout before the server starts. Feature branches and local
# edits are left alone, and any failure only gets logged.
function Update-FromMain {
    $git = Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue
    if (!$git) { return 'Skipped update: git.exe is not on PATH.' }
    $branch = Invoke-Git $git.Source 'rev-parse --abbrev-ref HEAD' 10
    if (!$branch.Ok) { return "Skipped update: $($branch.Text)" }
    if ($branch.Text -ne 'main') { return "Skipped update: on branch $($branch.Text), not main." }
    $status = Invoke-Git $git.Source 'status --porcelain --untracked-files=no' 10
    if (!$status.Ok -or $status.Text) { return 'Skipped update: the folder has uncommitted changes.' }
    $pull = Invoke-Git $git.Source 'pull --ff-only' 30
    if ($pull.Ok) { "Updated from main: $($pull.Text)" } else { "Update failed, starting the current version: $($pull.Text)" }
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
        try { $update = Update-FromMain } catch { $update = "Update failed, starting the current version: $_" }
        Add-Content -LiteralPath (Join-Path $logs 'update.log') -Value ('{0:u} {1}' -f [DateTime]::Now, $update)
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
