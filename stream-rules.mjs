export function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function isYouTube(value) {
  const host = new URL(value).hostname;
  return ['youtube.com', 'youtube-nocookie.com', 'youtu.be'].some(
    domain => host === domain || host.endsWith('.' + domain)
  );
}

export function youtubeVideoId(value) {
  const url = httpsUrl(value);
  if (!url || !isYouTube(url)) return null;
  const parsed = new URL(url);
  const [first, second] = parsed.pathname.split('/').filter(Boolean);
  const id = parsed.hostname === 'youtu.be' ? first
    : first === 'watch' ? parsed.searchParams.get('v')
    : ['embed', 'live', 'shorts'].includes(first) ? second : null;
  return /^[A-Za-z0-9_-]{11}$/.test(id ?? '') ? id : null;
}

export function liveWindow(timezone, start, end) {
  if (!timezone && !start && !end) return null;
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!timezone || !time.test(start) || !time.test(end) || start === end) {
    throw new Error('Enter an IANA time zone and two different live times.');
  }
  new Intl.DateTimeFormat('en', { timeZone: timezone });
  return { timezone, start, end };
}

export function inLiveWindow(schedule, now = new Date()) {
  if (!schedule) return true;
  try {
    const window = liveWindow(schedule.timezone, schedule.start, schedule.end);
    if (!window) return false;
    const clock = new Intl.DateTimeFormat('en-GB', {
      timeZone: window.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(now);
    return window.start < window.end
      ? clock >= window.start && clock < window.end
      : clock >= window.start || clock < window.end;
  } catch {
    return false;
  }
}

export function canPlay(stream, settings, wallpaper, now) {
  if (!stream || !settings.enabled.includes(stream.collection)) return false;
  const url = httpsUrl(stream.embed);
  if (stream.kind === 'youtube') {
    return Boolean(wallpaper && settings.allowYouTube === true && youtubeVideoId(url)
      && httpsUrl(stream.original) && inLiveWindow(stream.schedule, now));
  }
  return Boolean(url && httpsUrl(stream.original) && !isYouTube(url)
    && (stream.kind === 'video' || (!settings.muted && !wallpaper))
    && inLiveWindow(stream.schedule, now));
}
export function directPlaybackIsVisible(fraction) {
  return Number.isFinite(fraction) && fraction >= 0.5;
}
