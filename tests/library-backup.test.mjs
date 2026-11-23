import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupLimit, exportLibrary, importLibrary } from '../library-backup.mjs';

const camera = {
  id: 'cam', title: 'Reef', institution: 'Test fixture', kind: 'video', collection: 'Wildlife',
  embed: 'https://example.org/stream.m3u8', original: 'https://example.org/camera'
};
const playlist = { id: 'list', name: 'Reefs', cameraIds: ['cam'] };
const empty = { streams: [], playlists: [], activePlaylist: null, muted: true };
const source = { ...empty, streams: [camera], playlists: [playlist], activePlaylist: 'list' };

test('round trips library without changing target preferences and avoids duplicates', () => {
  const backup = exportLibrary(source);
  const received = importLibrary(backup, empty);
  assert.equal(received.activePlaylist, null);
  assert.equal(received.muted, true);
  assert.deepEqual(received.playlists, [playlist]);
  assert.equal(received.streams[0].embed, camera.embed);
  assert.deepEqual(importLibrary(backup, received), received);
});

test('renames colliding IDs and keeps imported membership intact', () => {
  const local = { ...source, streams: [{ ...camera, title: 'Local camera' }] };
  const backup = exportLibrary(source);
  const received = importLibrary(backup, local);
  assert.equal(received.activePlaylist, 'list');
  assert.equal(received.streams[0].title, 'Local camera');
  assert.notEqual(received.streams[1].id, 'cam');
  assert.notEqual(received.playlists[1].id, 'list');
  assert.deepEqual(received.playlists[1].cameraIds, [received.streams[1].id]);
  assert.deepEqual(importLibrary(backup, received), received);
});

test('rejects oversized or invalid backups without changing the library', () => {
  for (const backup of [
    ' '.repeat(backupLimit + 1),
    exportLibrary({ ...source, streams: [{ ...camera, embed: 'http://example.org/video' }] }),
    exportLibrary({ ...source, playlists: [{ ...playlist, cameraIds: ['missing'] }] }),
    exportLibrary({ ...source, streams: [camera, camera] })
  ]) assert.throws(() => importLibrary(backup, empty));
  assert.deepEqual(empty.streams, []);
  assert.deepEqual(empty.playlists, []);
});

test('keeps hourly live windows through a backup round trip', () => {
  const schedule = { timezone: 'UTC', start: '00:00', end: '00:05', repeat: 'hourly' };
  const received = importLibrary(exportLibrary({ ...source, streams: [{ ...camera, schedule }] }), empty);
  assert.deepEqual(received.streams[0].schedule, schedule);
});
