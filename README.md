# Livestream Roulette

Livestream Roulette rotates among publisher-authorized live cameras. Wildlife is the first collection for source review. The browser prototype starts with an empty playlist.

## Run locally

1. From the repository root, run `python -m http.server 8765 --bind 127.0.0.1` with Python 3.
2. Open `http://127.0.0.1:8765/` in a modern browser.
3. In **Settings**, add a camera with its official watch page, an authorized HTTPS media or player URL, and optional daily live hours in the camera's time zone.
4. Choose a collection and interval. Use **Next**, **Back**, and **Stay here** to control rotation.

Settings stay in localStorage for that browser profile and origin. Video loads from the publisher. For mute by default, use a direct video URL with a codec and transport the browser supports. Generic iframes require disabling **Require muted playback**, since the app cannot control their audio. User-provided iframe entries from the initial prototype are preserved.

Check [source permissions and Wallpaper Engine compatibility](docs/VALIDATION.md) before adding a camera. For the quiet layout, append `?wallpaper=1`. It hides the toolbar and only accepts direct video sources. The settings page without the query parameter shares storage within the same browser profile and origin. A separate embedded browser may need its own setup.

## Run tests

- Run `node --test tests/stream-rules.test.mjs` with Node.js 20+ for URL, schedule, and playback eligibility checks.
- With the loopback server running, open `http://127.0.0.1:8765/tests/browser.html` in Chrome or Edge. Use a dedicated profile or private window. The page temporarily replaces this origin's playlist and reports **PASS** or the first failed check. It exercises browser controls with synthetic entries.

See the [product and technical design](docs/DESIGN.md) for the roadmap.
