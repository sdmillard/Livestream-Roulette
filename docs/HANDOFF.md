# Livestream Roulette work log

Add an entry under **Recent work** when a change lands or a test changes what we know. Record the commit or test environment, the observed result, and any follow-up. Keep the newest entries first and update **Open work** when priorities change.

## Current state

- Work continues on `feat/design-and-browser-prototype` in [draft PR #1](https://github.com/sdmillard/Livestream-Roulette/pull/1). Keep changes reviewable and leave the PR unmerged until Spencer approves.
- The working MVP is a Windows wallpaper with a separate, translucent tray menu. Left-click opens the cascading controls. **Close menu** dismisses them. Right-click **Exit Livestream Roulette** stops the tray and local service. The launcher is manual.
- Start with [README.md](../README.md) for launch and test commands. The companion wallpaper URL is `http://127.0.0.1:8768/?wallpaper=1&companion=1`. The tray and wallpaper have separate browser instances and can need separate reloads after a change. Camera and playlist settings live in `%LOCALAPPDATA%/Livestream Roulette/settings.json` on the test PC.
- Direct playback is allowed at exactly 50% measured desktop visibility. Below that, it pauses and can show the last frame. The opt-in official YouTube player requires more than 50% measured player visibility and a closed popover. Keep audio muted by default and desktop icons usable.

## Open work

1. **Startup at sign-in.** This was discussed as the next optional convenience feature after the quick playlist switcher. Windows startup is currently manual.
2. **Finish playback recovery validation.** Test a feed that stalls after it has started, Windows sleep and wake, and audible mute behavior. Startup hangs and coverage-driven pause and resume have been tested in Wallpaper Engine. See [validation results](VALIDATION.md).
3. **Verify native library backup dialogs.** The Edge file import and backup merge tests passed. The updated tray initialized, and a complete Save/Open round trip through the Windows dialogs remains unverified.
4. **Find a second direct wildlife feed for rotation with YouTube off.** The AGH kestrel cam played in a private local test. Its live hours and wallpaper permission are unresolved. Ocean Networks Canada published working HLS transport for scheduled underwater cams. Camera-specific permission and on-window playback still need confirmation. See [feed research](FEED-RESEARCH.md).

## Recent work

### November 22, 2026

- **Quick playlist switching** (`30d1269`). Added **Playback → Playlist** and kept editing under **Settings → Playlists**. Edge verified selection sync and switching while **Stay here** was active. The Windows tray was reloaded. The held-camera behavior in the running wallpaper requires a wallpaper reload and was verified in Edge.
- **Portable camera and playlist library** (`30ff01c`). Added JSON export and merge import. Node verified round trips, ID collision handling, and rejection of invalid backups. Edge verified importing through the menu. The Windows tray compiled and initialized with the file dialog integration.
- **Wallpaper Engine startup stall test** (`ee29fa7`). A temporary local feed accepted a connection and sent no response. The wallpaper buffered, then automatically switched to the Unified Streaming Color Bars feed. The prior settings and camera were restored.
- **Tray layout and spacing** (`e10948b`, `80a8417`). Anchored the cascade above the taskbar, kept parent panels available, and moved focus indicators inside controls. Edge checks passed for spacing and wide and narrow panel layouts.
- **Named playlists and automatic recovery** (`d6dc567`). Added menu-based playlist editing, one reconnect attempt, temporary skipping, and retry after cooldown. Edge verified playlist persistence, timer rotation, and standby after a failed video.
- **Feed research and real wallpaper rotation** (`23aeeaf`, `bd05bcb`). Wallpaper Engine rotated between AGH Kestrel Nest and Barn Owl Live with a temporary 15-second timer. Both paused under desktop coverage and resumed when uncovered. Coral City Camera also played through its official YouTube embed in a temporary test. Local test changes were restored.
- **Windows launcher and tray exit** (`7c9845f`, `ebd5bd2`). Verified fresh launch, reuse of both running processes, server shutdown, and relaunch.
