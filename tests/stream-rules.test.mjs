import test from 'node:test';
import assert from 'node:assert/strict';
import { httpsUrl, isYouTube, youtubeVideoId, liveWindow, inLiveWindow, canPlay, directPlaybackIsVisible, validCustomInterval, rotationDelayMs } from '../stream-rules.mjs';

test('custom rotation accepts whole seconds and preserves minute presets', () => {
  assert.equal(rotationDelayMs(30), 1800000);
  assert.equal(rotationDelayMs('custom', 1), 1000);
  assert.equal(rotationDelayMs('custom', 7200), 7200000);
  for (const value of [0, -1, 1.5, 7201, '1', undefined]) {
    assert.equal(validCustomInterval(value), false);
    assert.equal(rotationDelayMs('custom', value), 1800000);
  }
});

test('YouTube playlist entries are opt-in and use official video IDs', () => {
  const id = 'AorGWrn-vx8';
  for (const base of ['https://www.youtube.com/watch?v=', 'https://youtu.be/', 'https://www.youtube.com/live/']) {
    assert.equal(youtubeVideoId(base + id), id);
  }
  assert.equal(youtubeVideoId('https://youtube.com.example.org/watch?v=' + id), null);
  assert.equal(youtubeVideoId('https://www.youtube.com/channel/' + id), null);
  const stream = { kind: 'youtube', collection: 'Wildlife', embed: 'https://youtu.be/' + id, original: 'https://example.org/owl' };
  const settings = { enabled: ['Wildlife'], muted: true };
  assert.equal(canPlay(stream, settings, true), false);
  assert.equal(canPlay(stream, { ...settings, allowYouTube: true }, true), true);
  assert.equal(canPlay(stream, { ...settings, allowYouTube: true }, false), false);
});

test('direct playback stays active at exactly half visible', () => {
  assert.equal(directPlaybackIsVisible(0.51), true);
  assert.equal(directPlaybackIsVisible(0.5), true);
  assert.equal(directPlaybackIsVisible(0.49), false);
  assert.equal(directPlaybackIsVisible(null), false);
});

test('requires HTTPS URLs without credentials', () => {
  for (const value of ['https://user:pass@example.org', 'http://example.org', 'javascript:alert(1)', null]) {
    assert.equal(httpsUrl(value), null);
  }
  assert.equal(httpsUrl('https://example.org/cam'), 'https://example.org/cam');
});

test('recognizes YouTube player and short-link domains', () => {
  for (const host of ['www.youtube.com', 'www.youtube-nocookie.com', 'youtu.be']) {
    assert.equal(isYouTube('https://' + host), true);
  }
  assert.equal(isYouTube('https://youtube.com.example.org'), false);
});

test('uses camera local time including daylight saving and the closing boundary', () => {
  const hours = liveWindow('America/Los_Angeles', '07:00', '19:00');
  for (const date of ['2026-01-20T15:00:00Z', '2026-07-20T14:00:00Z']) {
    assert.equal(inLiveWindow(hours, new Date(date)), true);
  }
  for (const date of ['2026-01-20T14:59:00Z', '2026-07-20T13:59:00Z', '2026-07-21T02:00:00Z']) {
    assert.equal(inLiveWindow(hours, new Date(date)), false);
  }
});

test('handles overnight windows and rejects invalid schedules', () => {
  const hours = liveWindow('UTC', '22:00', '06:00');
  assert.equal(inLiveWindow(hours, new Date('2026-11-22T01:00:00Z')), true);
  assert.equal(inLiveWindow(hours, new Date('2026-11-22T06:00:00Z')), false);
  assert.equal(liveWindow('', '', ''), null);
  assert.throws(() => liveWindow('Somewhere/Invalid', '07:00', '19:00'));
  assert.throws(() => liveWindow('UTC', '07:00', '07:00'));
  assert.equal(inLiveWindow({ timezone: 'UTC' }), false);
});

test('legacy embeds need audio opt-in and stay out of wallpaper mode', () => {
  const stream = { collection: 'Wildlife', embed: 'https://example.org/embed', original: 'https://example.org/watch' };
  const settings = { enabled: ['Wildlife'], muted: true };
  assert.equal(canPlay(stream, settings, false), false);
  assert.equal(canPlay(stream, { ...settings, muted: false }, false), true);
  assert.equal(canPlay(stream, { ...settings, muted: false }, true), false);
  assert.equal(canPlay({ ...stream, kind: 'video' }, settings, true), true);
  assert.equal(canPlay({ ...stream, kind: 'video' }, { ...settings, enabled: [] }, false), false);
  assert.equal(canPlay({ ...stream, embed: 'https://youtu.be/123' }, { ...settings, muted: false }, false), false);
});

test('hourly windows repeat every hour using only the minutes', () => {
  const hours = liveWindow('America/St_Johns', '00:00', '00:05', 'hourly');
  assert.deepEqual(hours, { timezone: 'America/St_Johns', start: '00:00', end: '00:05', repeat: 'hourly' });
  // St. John's is UTC-3:30 in November, so its hour starts at :30 UTC.
  for (const date of ['2026-11-22T01:30:00Z', '2026-11-22T14:34:59Z']) {
    assert.equal(inLiveWindow(hours, new Date(date)), true);
  }
  for (const date of ['2026-11-22T01:35:00Z', '2026-11-22T02:00:00Z', '2026-11-22T02:29:00Z']) {
    assert.equal(inLiveWindow(hours, new Date(date)), false);
  }
  const wrap = liveWindow('UTC', '00:55', '00:05', 'hourly');
  assert.equal(inLiveWindow(wrap, new Date('2026-11-22T07:58:00Z')), true);
  assert.equal(inLiveWindow(wrap, new Date('2026-11-22T08:03:00Z')), true);
  assert.equal(inLiveWindow(wrap, new Date('2026-11-22T08:30:00Z')), false);
  assert.throws(() => liveWindow('UTC', '01:05', '02:05', 'hourly'));
  assert.throws(() => liveWindow('UTC', '07:00', '19:00', 'weekly'));
  assert.equal(liveWindow('UTC', '07:00', '19:00', 'daily').repeat, undefined);
});
