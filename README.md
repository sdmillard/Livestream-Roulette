# Livestream Roulette

> **Prototype / pre-alpha.** A living desktop background, not another prerecorded video loop.

Livestream Roulette rotates among user-approved embedded live cameras. The long-term goal is a Wallpaper Engine-compatible wallpaper with **Wildlife** as the first verified camera collection and optional **Space**, **Nature**, and other collections.

## Try the browser prototype

1. Clone/download the repository.
2. From the repository folder, run `python -m http.server 8765` (Python 3).
3. Open `http://localhost:8765` in a modern browser.
4. Open **Settings** and add a camera's authorized **HTTPS embed/player URL**, the institution's official viewing URL, and optionally a direct donation link.
5. Choose enabled collections and rotation interval; use **Next**, **Back**, and **Stay here**.

Settings and the stream list are saved in your browser's localStorage. No server account or public hosting is needed. The server above only serves local app files; video data loads directly from the third-party provider.

**Wallpaper display experiment:** `http://localhost:8765/?wallpaper=1` hides the controls. You need an alternate way to change settings before using that mode. Wallpaper Engine URL livestream mode can be tested against this page, but **compatibility is unverified**.

## Important limitations

- **No playable defaults yet.** The settings panel links to official Monterey Bay Aquarium cameras for discovery. These are not automatically approved for embedding.
- A generic iframe does **not** provide reliable end-of-stream, buffering, or offline signals. Automatic rotation is timer-based; a stream that goes offline may remain visible until the next switch.
- The **mute preference is not enforced** for arbitrary embeds. Providers differ; some allow muted playback parameters or an official API. Test provider by provider. Audio is not controlled by the app yet.
- Some cameras substitute prerecorded footage outside live hours. This prototype does not automatically verify that footage is actually live.
- YouTube and other providers may forbid background playback or restrict embedded viewing. An official camera is not necessarily an approved wallpaper source.
- Ordinary Wallpaper Engine web wallpapers use a different embedded browser from its URL livestream mode. Do not assume Workshop compatibility.
- No built-in clock, weather, source discovery API, live-detection engine, automated health checks, or centralized stream catalog yet.
- The prototype has **not** undergone end-to-end browser/Wallpaper Engine testing; treat it as a starting implementation.

## Design

Read [docs/DESIGN.md](docs/DESIGN.md) for goals, architecture, proposed source metadata, verification rules, copyright considerations, acceptance criteria and milestones.

## Principles

- Actual real-world cameras, not scenic loops.
- Verify institutional provenance **and** actual live hours separately.
- Never bypass a publisher's streaming restrictions.
- No rehosting or redistribution of video footage.
- Quiet interface: optional overlays, hidden by default.
- Donate links go directly to the source institution.
- No tracking or subscriptions.

## Next steps

1. Verify one publisher-authorized real livestream in a browser and in Wallpaper Engine's **URL Livestream Mode**.
2. Replace generic iframe assumptions with a tested player adapter for that provider, including reliable playback error events if available.
3. Add curated verified/default content with clear live/recorded status and time zones.
4. Test true desktop behavior, performance, audio, pause-on-fullscreen, and Workshop feasibility.

Feedback and stream-source suggestions are welcome, but please include the official source page and the institution's embedding terms.
