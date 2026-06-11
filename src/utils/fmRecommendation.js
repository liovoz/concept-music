const DAY = 24 * 60 * 60 * 1000;
const RECENT_KEY = 'kg_desktop_fm_recent_v1';
const DISLIKE_KEY = 'kg_desktop_fm_dislike_v1';
const RECENT_LIMIT = 300;
const DISLIKE_LIMIT = 200;
const RECENT_TTL = 14 * DAY;
const DISLIKE_TTL = 90 * DAY;
const SOFT_SKIP_REASONS = new Set(['只是换一首', 'skip']);

export const MIN_FM_BATCH_SIZE = 6;
export const MAX_FM_FETCH_RETRIES = 2;

export const FM_TASTE_PROFILES = {
  familiar: {
    id: 'familiar',
    label: '口味推荐',
    apiMode: 'normal',
    poolId: 0,
    cooldownSize: 3,
    description: '基于常听偏好，优先减少近期重复'
  },
  fresh: {
    id: 'fresh',
    label: '新鲜发现',
    apiMode: 'small',
    poolId: 1,
    cooldownSize: 5,
    description: '优先发现近期未出现的相近风格'
  },
  explore: {
    id: 'explore',
    label: '深度探索',
    apiMode: 'small',
    poolId: 2,
    cooldownSize: 8,
    description: '扩大推荐边界，减少歌手和专辑连续重复'
  }
};

const safeRead = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const safeWrite = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[（(].*?[）)]/g, '')
  .replace(/\s+/g, '');

const getFirstArtist = (song = {}) => {
  const artists = song._singers || song.artists || song.singer_list || song.singerinfo || song.Singers || [];
  if (Array.isArray(artists) && artists.length > 0) {
    const first = artists[0] || {};
    return first.name || first.singer_name || first.singername || first.author_name || '';
  }
  return song._singer || song.singer || song.SingerName || song.singername || song.author_name || song.author || '';
};

const getFirstArtistId = (song = {}) => {
  const artists = song._singers || song.artists || song.singer_list || song.singerinfo || song.Singers || [];
  if (Array.isArray(artists) && artists.length > 0) {
    const first = artists[0] || {};
    return String(first.id || first.singer_id || first.singerid || first.author_id || first.ID || '').trim();
  }
  return String(song._singer_id || song.singer_id || song.SingerId || song.singerid || song.author_id || '').trim();
};

export const getSongIdentity = (song = {}) => {
  const mixId = String(song._album_audio_id || song.album_audio_id || song.MixSongID || song.mixsongid || song.audio_id || '').trim();
  const hash = String(
    song._hash ||
    song.hash ||
    song.FileHash ||
    song.filehash ||
    song._qualities?.standard ||
    song._qualities?.hq ||
    song._qualities?.sq ||
    song.qualities?.standard ||
    song.qualities?.hq ||
    song.qualities?.sq ||
    ''
  ).trim();
  const title = song._title || song.name || song.SongName || song.songname || song.FileName || song.filename || song.title || song.Title || '';
  const artist = getFirstArtist(song);
  const titleKey = normalizeText(title);
  const artistKey = normalizeText(artist);
  const albumId = String(song._album_id || song.album_id || song.AlbumID || song.albumid || '').trim();
  const singerId = getFirstArtistId(song);
  const looseKey = titleKey && artistKey ? `song:${titleKey}:${artistKey}` : '';
  const key = mixId ? `mix:${mixId}` : (hash ? `hash:${hash}` : looseKey);

  return { key, mixId, hash, titleKey, artistKey, looseKey, albumId, singerId };
};

const pruneEntries = (entries, ttl, limit) => {
  const now = Date.now();
  return entries
    .filter(entry => entry && entry.key && now - Number(entry.updatedAt || 0) <= ttl)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, limit);
};

export const loadFmMemory = () => ({
  recent: pruneEntries(safeRead(RECENT_KEY), RECENT_TTL, RECENT_LIMIT),
  dislike: pruneEntries(safeRead(DISLIKE_KEY), DISLIKE_TTL, DISLIKE_LIMIT)
});

export const saveFmMemory = (memory) => {
  safeWrite(RECENT_KEY, pruneEntries(memory?.recent || [], RECENT_TTL, RECENT_LIMIT));
  safeWrite(DISLIKE_KEY, pruneEntries(memory?.dislike || [], DISLIKE_TTL, DISLIKE_LIMIT));
};

const makeMemoryEntry = (song, reason = '') => {
  const id = getSongIdentity(song);
  return {
    ...id,
    title: song?._title || song?.name || song?.SongName || '',
    artist: getFirstArtist(song),
    reason,
    updatedAt: Date.now()
  };
};

const upsertEntry = (entries, nextEntry, limit) => {
  const withoutDuplicate = entries.filter(entry => !identityMatchesEntry(nextEntry, entry));
  return [nextEntry, ...withoutDuplicate].slice(0, limit);
};

export const recordFmServed = (song, reason = 'served') => {
  const entry = makeMemoryEntry(song, reason);
  if (!entry.key) return loadFmMemory();
  const memory = loadFmMemory();
  memory.recent = upsertEntry(memory.recent, entry, RECENT_LIMIT);
  saveFmMemory(memory);
  return memory;
};

export const recordFmDislike = (song, reason = '不喜欢') => {
  const entry = makeMemoryEntry(song, reason);
  if (!entry.key) return loadFmMemory();
  const memory = loadFmMemory();
  memory.recent = upsertEntry(memory.recent, entry, RECENT_LIMIT);
  if (!SOFT_SKIP_REASONS.has(reason)) {
    memory.dislike = upsertEntry(memory.dislike, entry, DISLIKE_LIMIT);
  }
  saveFmMemory(memory);
  return memory;
};

const identityMatchesEntry = (id, entry) => {
  if (!id || !entry) return false;
  if (id.key && entry.key && id.key === entry.key) return true;
  if (id.mixId && entry.mixId && id.mixId === entry.mixId) return true;
  if (id.hash && entry.hash && id.hash === entry.hash) return true;
  if (id.looseKey && entry.looseKey && id.looseKey === entry.looseKey) return true;
  return false;
};

const createEntryIndex = (entries = []) => ({
  entries: entries.filter(Boolean),
  has(id) {
    return this.entries.some(entry => identityMatchesEntry(id, entry));
  }
});

const createSongIndex = (songs = []) => {
  const entries = songs.map(song => makeMemoryEntry(song)).filter(entry => entry.key);
  return createEntryIndex(entries);
};

const getArtistKey = (song) => {
  const id = getSongIdentity(song);
  return id.singerId ? `id:${id.singerId}` : (id.artistKey ? `name:${id.artistKey}` : '');
};

const getAlbumKey = (song) => {
  const id = getSongIdentity(song);
  return id.albumId ? `album:${id.albumId}` : '';
};

const buildCooldownSets = (songs = [], size = 0) => {
  const tail = songs.slice(Math.max(0, songs.length - size));
  return {
    artists: new Set(tail.map(getArtistKey).filter(Boolean)),
    albums: new Set(tail.map(getAlbumKey).filter(Boolean))
  };
};

const scoreSong = (song, tasteMode, context = {}) => {
  const profile = FM_TASTE_PROFILES[tasteMode] || FM_TASTE_PROFILES.familiar;
  const cooldown = buildCooldownSets(context.currentQueue || [], profile.cooldownSize);
  let score = 100 + Math.random() * 8;
  if (cooldown.artists.has(getArtistKey(song))) score -= profile.id === 'familiar' ? 14 : 32;
  if (cooldown.albums.has(getAlbumKey(song))) score -= profile.id === 'familiar' ? 10 : 24;
  if (song._is_paid || song._is_vip) score -= 2;
  if (profile.id === 'explore') score += Math.random() * 8;
  return score;
};

export const rankFmSongs = (songs, tasteMode = 'familiar', context = {}) => {
  return songs
    .map(song => ({ song, score: scoreSong(song, tasteMode, context) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.song);
};

export const filterFreshSongs = (songs, options = {}) => {
  const {
    currentQueue = [],
    memory = loadFmMemory(),
    tasteMode = 'familiar',
    ignoreRecent = false
  } = options;
  const profile = FM_TASTE_PROFILES[tasteMode] || FM_TASTE_PROFILES.familiar;
  const queueIndex = createSongIndex(currentQueue);
  const accepted = [];
  const acceptedIndex = createSongIndex(accepted);
  const recentIndex = createEntryIndex(memory.recent || []);
  const dislikeIndex = createEntryIndex(memory.dislike || []);
  let cooldown = buildCooldownSets(currentQueue, profile.cooldownSize);

  songs.forEach(song => {
    const id = getSongIdentity(song);
    if (!id.key) return;
    if (queueIndex.has(id) || acceptedIndex.has(id) || dislikeIndex.has(id)) return;
    if (!ignoreRecent && recentIndex.has(id)) return;

    const artistKey = getArtistKey(song);
    const albumKey = getAlbumKey(song);
    if (profile.id !== 'familiar' && (cooldown.artists.has(artistKey) || cooldown.albums.has(albumKey))) {
      return;
    }

    accepted.push(song);
    acceptedIndex.entries.push(makeMemoryEntry(song));
    cooldown = buildCooldownSets([...currentQueue, ...accepted], profile.cooldownSize);
  });

  return rankFmSongs(accepted, tasteMode, { currentQueue });
};

export const getFreshnessHint = (tasteMode = 'familiar') => {
  if (tasteMode === 'explore') return '已避开近 14 天听过的歌和连续歌手';
  if (tasteMode === 'fresh') return '已避开近 14 天听过的歌';
  return '已减少近期重复推荐';
};

export const getRecommendationReason = (tasteMode = 'familiar') => {
  if (tasteMode === 'explore') return '推荐理由：拓展到更宽的相近风格，同时限制同歌手和同专辑连续出现。';
  if (tasteMode === 'fresh') return '推荐理由：保留相近口味，但优先挑最近没出现过的歌。';
  return '推荐理由：贴近你的日常口味，并避开近期重复听到的歌曲。';
};
