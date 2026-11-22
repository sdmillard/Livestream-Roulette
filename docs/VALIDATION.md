# Source and runtime validation

## First wildlife candidate

Monterey Bay Aquarium's [official camera directory](https://www.montereybayaquarium.org/cams-videos/live-cams) lists Jelly Cam live daily from 07:00 to 19:00 Pacific. Use `America/Los_Angeles` when evaluating this schedule. The [official Jelly Cam page](https://www.montereybayaquarium.org/cams-videos/live-cams/jelly-cam) identifies an off-hours recording and points to YouTube troubleshooting. The publisher page establishes provenance and the directory supplies the expected schedule. The camera remains a discovery link while a permitted wallpaper player is unconfirmed.

For the first playable default, record the publisher's approval or applicable published terms for each intended use, the official player or direct media endpoint, the local schedule and recorded fallback behavior, and the date of a playback check. Verify the live indication with the publisher during scheduled hours and check the off-hours behavior separately. Recheck after any URL, player, terms, or schedule change. Ask the publisher about an authorized non-YouTube delivery option if the camera is otherwise suitable. No publisher outreach has been sent.

## Playback limits

- The [YouTube developer policy guide](https://developers.google.com/youtube/terms/developer-policies-guide) prohibits background playback through its API player, including continued playback when the service window is minimized or closed. The prototype excludes known YouTube player domains from rotation and leaves official watch links available. Generic iframe redirects and third-party wrapper players are opaque, so users still need to check provider terms.
- The [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) can report state, player errors, and blocked autoplay in supported uses. A state of playing only indicates playback. A generic iframe load event cannot confirm successful playback, liveness, muting, or whether framing was refused.
- Native video starts muted by default and handles media errors and ends. Failed items are skipped for the session until **Next** retries them. **Stay here** stops rotation but drops a source when it becomes ineligible. Autoplay may still require pressing the native Play button. Stalls and source freshness are unverified, and direct playback depends on browser codec and transport support. There is no HLS/DASH adapter.
- Daily schedules use local camera time and support overnight windows and daylight saving. They are checked every 15 seconds while timers run and when visibility returns. Browser throttling can delay a transition. A schedule supplies an eligibility window. Unexpected outages, replays during scheduled hours, special closures, and sources without hours remain unverified.

## Wallpaper Engine URL Livestream Mode

The [official Livestream Mode announcement](https://store.steampowered.com/news/posts/?appgroupname=Wallpaper+Engine&appids=431960&enddate=1638550529&feed=steam_community_announcements) describes **Open Wallpaper → Open from URL → Use Livestream Mode**, which uses Edge WebView with limited desktop input. Imported web wallpapers use [Chromium Embedded Framework](https://docs.wallpaperengine.io/en/web/debug/debug.html), a separate runtime. Support for one path does not establish support for the other.

| Check | Result |
| --- | --- |
| Chrome on Windows, November 22, 2026 | Synthetic browser smoke test passed. |
| Wallpaper Engine URL Livestream Mode | Wallpaper Engine 2.8.42 on Windows accepted `http://127.0.0.1:8767/?wallpaper=1` as a local URL wallpaper on November 22, 2026. Edge WebView fetched the HTML and JavaScript module, and the user saw the app's empty state on the desktop. Playback, storage, and desktop input remain unverified. |
| Imported CEF web wallpaper | Unverified. |
| Permitted wildlife playback and genuine live status | No approved endpoint verified end to end. |

For the Windows runtime test, open the loopback URL with `?wallpaper=1` in Livestream Mode. Follow Wallpaper Engine's desktop mouse interaction instructions if necessary. Open **Menu → Settings → Cameras** and add a publisher-authorized direct source in that runtime. Record Wallpaper Engine and WebView versions, autoplay, initial mute, loss of playback, rotation with a second authorized source, live-hours cutoff, wallpaper pause/resume, and whether settings survive a restart.
