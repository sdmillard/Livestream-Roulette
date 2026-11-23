# Livestream Roulette

Livestream Roulette rotates among publisher-authorized live cameras. Wildlife is the first collection for source review. The browser prototype starts with an empty playlist.

## Run locally

1. From the repository root, run `python -m http.server 8765 --bind 127.0.0.1` with Python 3.
2. Open `http://127.0.0.1:8765/` in a modern browser.
3. Open **Menu → Settings → Cameras** in the lower-right corner. Add a camera with its official watch page, an authorized HTTPS media or player URL, and optional daily live hours in the camera's time zone.
4. Choose collections in **Cameras** and an interval in **Rotation**. Choose **Custom** for an interval of 1 to 7,200 seconds. Short intervals give a video at least 15 seconds to start before skipping it. Use **Menu → Playback** for **Next**, **Back**, and **Stay here**.

Open **Playback → Camera info** for source links and playback status. The on-stream info overlay is optional under **Settings → Display**.

Settings stay in localStorage for that browser profile and origin. Video loads from the publisher. For mute by default, use a direct video URL with a codec and transport the browser supports. Generic iframes require disabling **Require muted playback**, since the app cannot control their audio. User-provided iframe entries from the initial prototype are preserved.

Check [source permissions and Wallpaper Engine compatibility](docs/VALIDATION.md) before adding a camera. Wallpaper mode (`?wallpaper=1`) only accepts direct video sources. Open **Menu → Settings → Cameras** on the wallpaper to configure its sources. Settings are shared within a browser profile and origin. Wallpaper Engine uses a separate browser runtime.

## Windows controls companion

The companion puts a Livestream Roulette icon in the Windows notification area. Click it to open the translucent cascading menus above the taskbar. The popover closes when it loses focus. The companion shares settings with Wallpaper Engine over a loopback-only service.

1. Run `python companion_server.py` from the repository root and leave it running.
2. Run `powershell.exe -NoProfile -STA -ExecutionPolicy RemoteSigned -File .\windows\Start-Controls.ps1` from a second terminal. This uses Windows PowerShell 5.1 and the installed Edge WebView2 Runtime. On first run it downloads Microsoft's WebView2 SDK from NuGet.
3. In Wallpaper Engine, select **Open Wallpaper → Open from URL**. Enter `http://127.0.0.1:8768/?wallpaper=1&companion=1` and enable **Use Livestream Mode**.
4. Click **Livestream Roulette** near the clock. It may appear under **Show hidden icons**. Add a publisher-authorized direct source under **Settings → Cameras**. A direct HLS source can use an HTTPS `.m3u8` URL if its server allows cross-origin playlist and segment requests. The native control and wallpaper read the shared settings from the local service. The settings file is stored in `%LOCALAPPDATA%/Livestream Roulette/settings.json`.

To diagnose the connection, open `http://127.0.0.1:8768/?controls=1` in a regular browser. It uses the same settings and playback controls. Keep one control surface open while editing the camera list.

Companion mode plays direct media while at least half of the primary desktop's working area is visible. When coverage exceeds half, it keeps the last available video frame on screen and stops fetching the stream. HLS resumes through the existing player when possible. Other direct video reconnects to the same camera. The still stays in memory, and playback waits for a fresh Windows coverage sample.

### Optional YouTube sources

In the tray, open **Settings → Cameras** and turn on **Include YouTube sources**. Add an embeddable YouTube video using **YouTube official player** and its watch URL. YouTube is off by default. Turning it off excludes saved YouTube sources from **Next** and automatic rotation.

The official player starts when more than half of the player area is visible and the tray popover is closed. The tray waits for the iframe to be removed before showing the popover. When available, a publisher-provided standby photo fills the wallpaper while a YouTube player is absent. Wallpaper Engine's URL Livestream Mode still limits interaction with the player's built-in controls when desktop icons are visible.

The separate Barn Owl Live trial remains at `http://127.0.0.1:8768/youtube-trial.html`. The regular **Livestream Roulette Companion** wallpaper uses the shared playlist.

## Run tests

- Run `node --test tests/stream-rules.test.mjs` with Node.js 20+ for URL, schedule, and playback eligibility checks.
- Run `python -B -m unittest discover -s tests -p test_companion_server.py` for loopback settings persistence, command sequencing, and request validation.
- Run `powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\tests\desktop-visibility.ps1` for Windows coverage geometry, including overlapping windows and off-screen rectangles.
- With the loopback server running, open `http://127.0.0.1:8765/tests/browser.html` in Chrome or Edge. Use a dedicated profile or private window. The page temporarily replaces this origin's playlist and reports **PASS** or the first failed check. It exercises browser controls with synthetic entries.

See the [product and technical design](docs/DESIGN.md) for the roadmap.
