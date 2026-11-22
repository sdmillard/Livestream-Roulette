# Livestream Roulette

Livestream Roulette rotates among publisher-authorized live cameras. Wildlife is the first collection for source review. The browser prototype starts with an empty playlist.

## Run locally

1. From the repository root, run `python -m http.server 8765 --bind 127.0.0.1` with Python 3.
2. Open `http://127.0.0.1:8765/` in a modern browser.
3. Open **Menu → Settings → Cameras** in the lower-right corner. Add a camera with its official watch page, an authorized HTTPS media or player URL, and optional daily live hours in the camera's time zone.
4. Choose collections in **Cameras** and an interval in **Rotation**. Use **Menu → Playback** for **Next**, **Back**, and **Stay here**.

Open **Playback → Camera info** for source links and playback status. The on-stream info overlay is optional under **Settings → Display**.

Settings stay in localStorage for that browser profile and origin. Video loads from the publisher. For mute by default, use a direct video URL with a codec and transport the browser supports. Generic iframes require disabling **Require muted playback**, since the app cannot control their audio. User-provided iframe entries from the initial prototype are preserved.

Check [source permissions and Wallpaper Engine compatibility](docs/VALIDATION.md) before adding a camera. Wallpaper mode (`?wallpaper=1`) only accepts direct video sources. Open **Menu → Settings → Cameras** on the wallpaper to configure its sources. Settings are shared within a browser profile and origin. Wallpaper Engine uses a separate browser runtime.

## Run tests

- Run `node --test tests/stream-rules.test.mjs` with Node.js 20+ for URL, schedule, and playback eligibility checks.
- With the loopback server running, open `http://127.0.0.1:8765/tests/browser.html` in Chrome or Edge. Use a dedicated profile or private window. The page temporarily replaces this origin's playlist and reports **PASS** or the first failed check. It exercises browser controls with synthetic entries.

See the [product and technical design](docs/DESIGN.md) for the roadmap.
