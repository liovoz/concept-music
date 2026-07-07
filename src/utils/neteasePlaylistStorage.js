const SAVED_PLAYLISTS_KEY = 'kg_desktop_netease_imported_playlists';
const LAST_PLAYLIST_ID_KEY = 'kg_desktop_netease_last_playlist_id';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const sortSavedPlaylists = (items = []) => {
  return [...items].sort((a, b) => Number(a.importedAt || 0) - Number(b.importedAt || 0));
};

const normalizeSavedPlaylist = (item = {}) => {
  const id = String(item.id || '').trim();
  if (!id) return null;

  return {
    id,
    name: String(item.name || '网易歌单'),
    cover: String(item.cover || ''),
    intro: String(item.intro || ''),
    trackCount: Number(item.trackCount || 0),
    creator: String(item.creator || ''),
    importedAt: Number(item.importedAt || Date.now()),
    updatedAt: Number(item.updatedAt || item.importedAt || Date.now()),
  };
};

export const loadSavedNeteasePlaylists = () => {
  if (!canUseStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_PLAYLISTS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return sortSavedPlaylists(parsed.map(normalizeSavedPlaylist).filter(Boolean));
  } catch (e) {
    return [];
  }
};

export const saveNeteasePlaylistSummary = (playlistInfo = {}) => {
  if (!canUseStorage()) return [];

  const id = String(playlistInfo.id || '').trim();
  if (!id) return loadSavedNeteasePlaylists();

  const now = Date.now();
  const saved = loadSavedNeteasePlaylists();
  const existing = saved.find(item => item.id === id);
  const nextItem = normalizeSavedPlaylist({
    id,
    name: playlistInfo.name,
    cover: playlistInfo.cover,
    intro: playlistInfo.intro,
    trackCount: playlistInfo.trackCount,
    creator: playlistInfo.creator,
    importedAt: existing?.importedAt || now,
    updatedAt: now,
  });

  const next = sortSavedPlaylists([
    nextItem,
    ...saved.filter(item => item.id !== id),
  ]);

  try {
    window.localStorage.setItem(SAVED_PLAYLISTS_KEY, JSON.stringify(next));
  } catch (e) {}

  return next;
};

export const removeSavedNeteasePlaylist = (id) => {
  if (!canUseStorage()) return [];

  const targetId = String(id || '').trim();
  const next = loadSavedNeteasePlaylists().filter(item => item.id !== targetId);

  try {
    window.localStorage.setItem(SAVED_PLAYLISTS_KEY, JSON.stringify(next));
  } catch (e) {}

  if (getLastNeteasePlaylistId() === targetId) {
    setLastNeteasePlaylistId(next[0]?.id || '');
  }

  return next;
};

export const setLastNeteasePlaylistId = (id) => {
  if (!canUseStorage()) return;

  const nextId = String(id || '').trim();
  try {
    if (nextId) window.localStorage.setItem(LAST_PLAYLIST_ID_KEY, nextId);
    else window.localStorage.removeItem(LAST_PLAYLIST_ID_KEY);
  } catch (e) {}
};

export const getLastNeteasePlaylistId = () => {
  if (!canUseStorage()) return '';

  try {
    return String(window.localStorage.getItem(LAST_PLAYLIST_ID_KEY) || '').trim();
  } catch (e) {
    return '';
  }
};
