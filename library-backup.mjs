import { httpsUrl, isYouTube, liveWindow, youtubeVideoId } from './stream-rules.mjs';

export const backupLimit = 128 * 1024;
const format = 'livestream-roulette-library';
const collections = ['Wildlife', 'Space', 'Nature', 'Other'];
const serialize = value => JSON.stringify(value);

export function exportLibrary(settings) {
  const text = serialize({ format, version: 1, streams: settings.streams.filter(Boolean), playlists: settings.playlists });
  if (new TextEncoder().encode(text).length > backupLimit) throw new Error('This library is too large to export.');
  return text;
}

function identifier(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 128) throw new Error('Invalid camera or playlist ID.');
  return value;
}

function label(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid camera or playlist name.');
  return value.trim();
}

function readCamera(camera) {
  const { kind = 'iframe', collection } = camera;
  const embed = httpsUrl(camera.embed);
  const original = httpsUrl(camera.original);
  const donation = camera.donation ? httpsUrl(camera.donation) : null;
  if (!['video', 'youtube', 'iframe'].includes(kind) || !collections.includes(collection) ||
      !embed || !original || (camera.donation && !donation) ||
      (kind === 'youtube' ? !youtubeVideoId(embed) : isYouTube(embed))) {
    throw new Error('A camera has an invalid player, collection, or HTTPS URL.');
  }
  const schedule = camera.schedule
    ? liveWindow(camera.schedule.timezone, camera.schedule.start, camera.schedule.end,
      camera.schedule.repeat ?? 'daily') : null;
  return { id: identifier(camera.id), title: label(camera.title, 100), institution: label(camera.institution, 100),
    kind, collection, embed, original, donation, schedule };
}

function sameCamera(camera, existing) {
  try { return serialize(camera) === serialize({ ...readCamera(existing), id: camera.id }); }
  catch { return false; }
}

export function importLibrary(text, settings) {
  if (new TextEncoder().encode(text).length > backupLimit) throw new Error('This library backup is too large.');
  const backup = JSON.parse(text);
  if (backup?.format !== format || backup.version !== 1 ||
      !Array.isArray(backup.streams) || !Array.isArray(backup.playlists)) {
    throw new Error('Choose a Livestream Roulette library backup.');
  }

  const streams = settings.streams.slice();
  const playlists = settings.playlists.slice();
  const cameraIds = new Map();
  const importedPlaylists = new Set();
  for (const entry of backup.streams) {
    const camera = readCamera(entry ?? {});
    const id = camera.id;
    if (cameraIds.has(id)) throw new Error('The backup contains duplicate camera IDs.');
    if (streams.some(item => item?.id === id)) {
      const matching = streams.find(item => sameCamera(camera, item));
      if (matching) {
        cameraIds.set(id, matching.id);
        continue;
      }
      camera.id = crypto.randomUUID();
    }
    streams.push(camera);
    cameraIds.set(id, camera.id);
  }
  for (const entry of backup.playlists) {
    const id = identifier(entry?.id);
    if (importedPlaylists.has(id)) throw new Error('The backup contains duplicate playlist IDs.');
    importedPlaylists.add(id);
    if (!Array.isArray(entry.cameraIds) || entry.cameraIds.some(cameraId => !cameraIds.has(cameraId))) {
      throw new Error('A playlist references a camera missing from this backup.');
    }
    const list = { id, name: label(entry.name, 80), cameraIds: [...new Set(entry.cameraIds.map(cameraId => cameraIds.get(cameraId)))] };
    if (playlists.some(item => item.id === id)) {
      if (playlists.some(item => item.name === list.name && serialize(item.cameraIds) === serialize(list.cameraIds))) continue;
      list.id = crypto.randomUUID();
    }
    playlists.push(list);
  }
  const merged = { ...settings, streams, playlists };
  if (new TextEncoder().encode(serialize(merged)).length > backupLimit) throw new Error('The merged library is too large.');
  return merged;
}
