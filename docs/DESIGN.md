# Livestream Roulette — Product & Technical Design

Status: Draft v0.2 · November 2026

## Vision
A quiet, genuinely live **window into the world** on your desktop. Instead of repeating a rendered animation, Livestream Roulette rotates among permitted, attributed cameras operated by verified institutions. The footage is the product; the UI should disappear.

## Goals
1. Live-first: prefer authentic cameras, not looped scenic videos; never equate an official institution with proof a feed is currently live.
2. Local-first: no user account, telemetry, backend service, or required public hosting.
3. Wallpaper-first: muted by default, unobtrusive, dark controls hidden by default, minimal CPU/memory overhead.
4. User control: collection filters, 15/30/60/120-minute switch, next/previous, stay here, attribution, original-stream and donation links.
5. Extensible: Wildlife initially; future Space, Nature, Cities, Transportation, Science collections and user catalogs.
6. Respect publishers: use authorized embeds; no ripping, proxying, rebroadcasting, or bypassing restrictions.

## Non-goals in v0.1
- Guaranteed continuous playback across YouTube / third-party platforms.
- Proof of liveness from visual content or arbitrary iframes.
- YouTube background-playback workarounds.
- Official Wallpaper Engine Workshop packaging or provider approval.
- Cloud-hosted stream directories, centralized monitoring, ads or donation processing.

## Core UX
- On launch, the default view is full-bleed footage or an empty-state notice if no compatible streams are configured.
- An accessible settings drawer is available by a visible small gear button (can be hidden for wallpaper mode via query parameter).
- **No clock, weather, labels, widgets by default.** Optional camera info overlay and optional clock follow in a later release.
- Rotation is enabled by default at 30 minutes. Don't immediately repeat a stream when another eligible source exists.
- “Stay here” stops the timer; Next forces a new selection. Previous returns to the prior stream.
- Audio off by default. Respect the source's own branding and player controls.
- Empty/unsupported/unavailable sources show a useful fallback and links, not a fake livestream.

## Content model
Each stream record:
```json
{
  "id": "mba-jelly",
  "title": "Jelly Cam",
  "collection": "Wildlife",
  "tags": ["aquarium", "jellyfish"],
  "institution": "Monterey Bay Aquarium",
  "officialUrl": "https://www.montereybayaquarium.org/cams-videos/live-cams/jelly-cam",
  "donateUrl": "https://www.montereybayaquarium.org/support-us/ways-to-give",
  "timezone": "America/Los_Angeles",
  "liveSchedule": {"start": "07:00", "end": "19:00"},
  "playback": {"kind": "youtube", "videoId": "REPLACE_WITH_VERIFIED_ID"},
  "verification": {"publisherVerified": true, "embedApproved": false, "lastChecked": null}
}
```
Here `publisherVerified` means verified institutional ownership, **not** verified frame freshness or permission. A camera's off-hours state may contain prerecorded footage. Playlist selection must require `embedApproved` for any default playable feed. The initial repository includes an *official camera directory* only—not a claim that the linked sites can be embedded.

Later: independent provider/source status (`unknown`, `live`, `offline`, `recorded`), evidence timestamp, rights review, days-of-week schedule, timezone, user-supplied feeds.

## Architecture & constraints
**Stage A: browser prototype** — static HTML/CSS/JS, localStorage settings, manual camera directory and user-configured embedded URLs (subject to provider permissions). Supports timer, no immediate repeat, history, manual skip, and optional overlay. A local HTTP server can serve static files; hosting is not mandatory.

**Stage B: streaming compatibility spike** — test URL livestream mode in Wallpaper Engine, which uses Edge WebView for supported media formats, versus web wallpapers, which use CEF. Do not assume an HTML Workshop wallpaper can play YouTube livestreams. Evaluate if a local hosted URL is required; test autoplay/muting, GPU usage, fullscreen behavior, desktop interaction, window focus, and permissions.

**Stage C: verified catalog** — manually review each default source, institutional ownership, player embedding rights and schedule. Do not scrape arbitrary stream URLs or use unapproved raw streams. A curated catalog can be updated independently later.

**Stage D: public distribution** — test Steam Workshop publishing requirements, licensing, content permissions and takedown process. Avoid bundling video.

The prototype supports native video and a browser-only generic iframe. Future player adapters may have an interface like `mount(record)`, `dispose()`, `onEnded()`, `onError()`, `mute()`. Native HTML5 video can expose end/error/stall, but cross-origin iframe players generally cannot be inspected. YouTube's iframe API provides specific ended/error states but not reliable live-versus-recorded proof and must follow YouTube terms. A timeout alone must never be presented as proof the stream ended.

## Security, privacy, copyright
- Use HTTPS media URLs; validate URLs and do not execute user-supplied HTML or JS.
- Use iframe allowlists/sandboxing as compatible; third-party media players may set cookies and transmit user IP data directly.
- No telemetry, server proxy, account or forced API key.
- An official source and a free stream do **not** constitute redistribution rights. Publishers may prohibit background playback, embedding or automated switching. Obtain authorization where needed before curating defaults.
- Link to official watch and donate pages. Donations go directly to the institution; they do not substitute for rights clearance.
- Minimize background playback when games are running; rely on Wallpaper Engine's pause settings where available.

## Acceptance criteria for first browser prototype
- Opens locally in a normal browser through `python -m http.server 8765`.
- Can add and remove user-authorized HTTPS player URLs and save them locally. Editing existing entries is pending.
- Rotates across enabled sources on an interval without immediate repeats (when more than one source).
- Next, Previous and Stay Here work without navigation away from the page.
- Preserves settings through refresh; supports clearing entries.
- Handles iframe load failures conservatively (can't infer whether remote playback itself is offline).
- Attribution/source/donation links visible on demand.
- Clearly identifies all compatibility and liveness caveats.

See [validation and candidate evidence](VALIDATION.md) for tested behavior, open compatibility checks, and catalog admission criteria.

## Milestones
1. [x] Design and browser prototype scaffolding.
2. [ ] Verify one permitted *genuine live* player end-to-end in Chrome and Wallpaper Engine Livestream Mode.
3. [ ] Add provider adapter and robust ended/error detection for that provider.
4. [ ] Curate 10–20 explicitly embeddable official cameras with schedules and test each.
5. [ ] Complete desktop controls, optional clock, and collection toggles.
6. [ ] Workshop packaging/legal review and beta.

## Research links
- Wallpaper Engine livestream support: https://store.steampowered.com/news/posts/?appgroupname=Wallpaper+Engine&appids=431960&enddate=1638550529&feed=steam_community_announcements
- Wallpaper Engine CEF web debugging: https://docs.wallpaperengine.io/en/web/debug/debug.html
- Monterey Bay Aquarium official cameras: https://www.montereybayaquarium.org/cams-videos/live-cams
- Monterey Bay Aquarium Jelly Cam (may show recorded video off-hours): https://www.montereybayaquarium.org/cams-videos/live-cams/jelly-cam
- YouTube iframe API: https://developers.google.com/youtube/iframe_api_reference
