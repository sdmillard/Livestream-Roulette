$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PSScriptRoot '../windows/DesktopVisibility.cs') -ReferencedAssemblies System.Drawing.dll

$desktop = [Drawing.Rectangle]::new(0, 0, 100, 100)

function Assert-VisibleFraction($expected, [Drawing.Rectangle[]]$windows) {
    $actual = [DesktopVisibility]::UncoveredFraction($desktop, $windows)
    if ([Math]::Abs($actual - $expected) -gt 0.000001) {
        throw "Expected $expected of the desktop to be visible, got $actual."
    }
}

Assert-VisibleFraction 1 @()
Assert-VisibleFraction 0.5 @([Drawing.Rectangle]::new(0, 0, 50, 100))
Assert-VisibleFraction 0.25 @(
    [Drawing.Rectangle]::new(0, 0, 50, 100),
    [Drawing.Rectangle]::new(25, 0, 50, 100)
)
Assert-VisibleFraction 0.9 @([Drawing.Rectangle]::new(-20, 0, 30, 100))
Assert-VisibleFraction 0 @($desktop)
$popover = [Drawing.Rectangle]::new(55, 40, 45, 60)
$player = [DesktopVisibility]::PlayerArea($desktop, $popover)
if ($player.Width -ne 55 -or $player.IntersectsWith($popover)) {
    throw 'The player must stay outside the popover rectangle.'
}
$popover = [Drawing.Rectangle]::new(20, 70, 80, 30)
$player = [DesktopVisibility]::PlayerArea($desktop, $popover)
if ($player.Height -ne 70 -or $player.IntersectsWith($popover)) {
    throw 'The player must use the space above the popover when it is larger.'
}
'Desktop coverage checks passed.'
