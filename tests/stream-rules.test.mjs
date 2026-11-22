import test from 'node:test';
import assert from 'node:assert/strict';
import { httpsUrl, isYouTube, liveWindow, inLiveWindow, canPlay } from '../stream-rules.mjs';

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
