# Source and runtime validation

## First wildlife candidate

See the [wildlife feed shortlist](FEED-RESEARCH.md) for other publishers, policy evidence, and delivery options.

Monterey Bay Aquarium's [official camera directory](https://www.montereybayaquarium.org/cams-videos/live-cams) lists Jelly Cam live daily from 07:00 to 19:00 Pacific. Use `America/Los_Angeles` when evaluating this schedule. The [official Jelly Cam page](https://www.montereybayaquarium.org/cams-videos/live-cams/jelly-cam) identifies an off-hours recording and points to YouTube troubleshooting. The publisher page establishes provenance and the directory supplies the expected schedule. The camera remains a discovery link while a permitted wallpaper player is unconfirmed.

For the first playable default, record the publisher's approval or applicable published terms for each intended use, the official player or direct media endpoint, the local schedule and recorded fallback behavior, and the date of a playback check. Verify the live indication with the publisher during scheduled hours and check the off-hours behavior separately. Recheck after any URL, player, terms, or schedule change. Ask the publisher about an authorized non-YouTube delivery option if the camera is otherwise suitable. No publisher outreach has been sent.

## Playback limits

- The [YouTube developer policy guide](https://developers.google.com/youtube/terms/developer-policies-guide) prohibits background playback through its API player, including continued playback when the service window is minimized or closed. The companion playlist uses its visibility-gated official player for explicitly enabled YouTube entries. Known YouTube URLs are excluded from the direct-video and generic iframe paths. Generic iframe redirects and third-party wrapper players are opaque, so users still need to check provider terms.
- The [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) can report state, player errors, and blocked autoplay in supported uses. A state of playing only indicates playback. A generic iframe load event cannot confirm successful playback, liveness, muting, or whether framing was refused.
- Direct video starts muted by default and handles media errors and ends. Direct `.m3u8` sources use native HLS when available or load a pinned, integrity-checked hls.js player. The playlist and segment server must allow cross-origin requests. Failed items are skipped for the session until **Next** retries them. **Stay here** stops rotation but drops a source when it becomes ineligible. Autoplay may still require pressing the native Play button. Stalls and source freshness are unverified, and direct playback depends on browser codec and transport support. DASH is unsupported.
- Daily schedules use local camera time and support overnight windows and daylight saving. They are checked every 15 seconds while timers run and when visibility returns. Browser throttling can delay a transition. A schedule supplies an eligibility window. Unexpected outages, replays during scheduled hours, special closures, and sources without hours remain unverified.

## Wallpaper Engine URL Livestream Mode

The [official Livestream Mode announcement](https://store.steampowered.com/news/posts/?appgroupname=Wallpaper+Engine&appids=431960&enddate=1638550529&feed=steam_community_announcements) describes **Open Wallpaper → Open from URL → Use Livestream Mode**, which uses Edge WebView with limited desktop input. Imported web wallpapers use [Chromium Embedded Framework](https://docs.wallpaperengine.io/en/web/debug/debug.html), a separate runtime. Support for one path does not establish support for the other.

| Check | Result |
| --- | --- |
| Chrome on Windows, November 22, 2026 | Synthetic browser smoke test passed. |
| Wallpaper Engine URL Livestream Mode | Wallpaper Engine 2.8.42 on Windows accepted `http://127.0.0.1:8767/?wallpaper=1` as a local URL wallpaper on November 22, 2026. Edge WebView fetched the HTML and JavaScript module, and the user saw the app's empty state on the desktop. The user confirmed the gear responded after Wallpaper Engine hid desktop icons. Playback and settings persistence remain unverified. |
| Imported CEF web wallpaper | Unverified. |
| Permitted wildlife playback and genuine live status | No approved endpoint verified end to end. |

For the Windows runtime test, open the loopback URL with `?wallpaper=1` in Livestream Mode. Follow Wallpaper Engine's desktop mouse interaction instructions if necessary. Open **Menu → Settings → Cameras** and add a publisher-authorized direct source in that runtime. Record Wallpaper Engine and WebView versions, autoplay, initial mute, loss of playback, rotation with a second authorized source, live-hours cutoff, wallpaper pause/resume, and whether settings survive a restart.

The Windows companion puts the controls in a separate WebView2 popover and syncs settings and playback commands over the loopback service. On November 22, 2026, the Wallpaper Engine runtime reported playing the MDN flower MP4 after it was added through the companion controls page, and **Next** replayed it. The test clip was removed afterward. The native popover starts and loads its control page. Clicking its gear with visible icons and visually confirming its transparency still need a desktop check.

On the same date, Wallpaper Engine reported playback for both Unified Streaming test signals with the mute preference enabled. Switching between the [color bars](https://docs.unified-streaming.com/documentation/virtual-channel/userguide/index.html) and [broadcast demo](https://docs.unified-streaming.com/best-practice/dai.html) worked through the companion. These entries were saved locally for testing. The test demonstrates HLS transport and playback, while a wildlife source remains a separate acceptance check.

The Windows companion estimates visibility from the union of visible, non-minimized window rectangles on the primary monitor's working area. It excludes the companion and transparent click-through layered surfaces. On November 22, 2026, Wallpaper Engine reported a pause with 12.2% of that area visible and resumed the same Color Bars HLS feed at 73.7%. A fully maximized window produced 0% coverage visibility, but the wallpaper status initially remained stale. Partial-coverage behavior was confirmed directly. This is a window-geometry estimate rather than a pixel-level check. YouTube support still requires a separate test of its official player, including the [visibility, player controls, and overlay requirements](https://developers.google.com/youtube/terms/required-minimum-functionality).

A follow-up HLS test reported a retained frame at 19.8% visibility and resumed the same feed at 73.7%. The retention path draws one available direct-video frame to an in-memory canvas before unloading the media. If coverage changes before a frame is available, the app shows its waiting state.

After a buffering report, HLS suspension was changed to pause video and stop loading segments while retaining the player. Wallpaper Engine resumed the same Color Bars feed about 0.6 seconds after the test observed uncovering and reported continuous playback for the following six seconds. Prolonged media waits now appear as buffering in Camera info.

## Windows tray and YouTube trial

The user confirmed that the Windows notification-area icon opens the companion controls and that opening them hides the Barn Owl player. The trial now uses the full desktop working area. The local service grants either the player or the controls access to that space. The helper waits for iframe removal before showing the menu. The official YouTube iframe retains its branding and controls. The trial mounts it only with fresh geometry, a closed popover, and more than 50% measured visibility.

Wallpaper Engine 2.8.42 reported playing the Barn Owl Live embed at 100% player visibility, removing the player at 12.2%, and playing again when uncovered. The regular playlist subsequently verified **Next** from the direct kestrel camera to Barn Owl Live, then returned to the direct camera and removed the YouTube iframe when **Include YouTube sources** was turned off. Full occlusion timing and mixed-DPI or additional monitors remain unverified. The user reported that the native YouTube controls do not receive clicks with Windows icons visible.
