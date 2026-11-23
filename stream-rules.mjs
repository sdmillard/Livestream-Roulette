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

// repeat 'daily' compares HH:MM; 'hourly' compares only the minutes, so 00:00–00:05
// means the first five minutes of every hour.
export function liveWindow(timezone, start, end, repeat = 'daily') {
  if (!timezone && !start && !end) return null;
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const hourly = repeat === 'hourly';
  if (!['daily', 'hourly'].includes(repeat) || !timezone || !time.test(start) || !time.test(end)
      || (hourly ? start.slice(3) === end.slice(3) : start === end)) {
    throw new Error('Enter an IANA time zone and two different live times.');
  }
  new Intl.DateTimeFormat('en', { timeZone: timezone });
  return hourly ? { timezone, start, end, repeat } : { timezone, start, end };
}

export function inLiveWindow(schedule, now = new Date()) {
  if (!schedule) return true;
  try {
    const window = liveWindow(schedule.timezone, schedule.start, schedule.end, schedule.repeat ?? 'daily');
    if (!window) return false;
    let clock = new Intl.DateTimeFormat('en-GB', {
      timeZone: window.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(now);
    let { start, end } = window;
    if (window.repeat === 'hourly') [clock, start, end] = [clock, start, end].map(value => value.slice(3));
    return start < end
      ? clock >= start && clock < end
      : clock >= start || clock < end;
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

export function validCustomInterval(seconds) {
  return Number.isInteger(seconds) && seconds >= 1 && seconds <= 7200;
}

export function rotationDelayMs(interval, customSeconds) {
  if (interval === 'custom' && validCustomInterval(customSeconds)) return customSeconds * 1000;
  return ([15, 30, 60, 120].includes(interval) ? interval : 30) * 60000;
}
