import { getSongArtists, isValidArtistId, isUnknownSinger } from './songHelper';
import request from './request';

const artistIdCache = new Map();
const pendingArtistResolves = new Map();
const ARTIST_CACHE_TTL = 24 * 60 * 60 * 1000;
const ARTIST_MISS_CACHE_TTL = 5 * 60 * 1000;

export const artistSearchTarget = (artist) => ({
  path: '/search',
  query: { keyword: String(artist?.name || '').trim() }
});

const normalizeArtistName = (name) => String(name || '').trim().toLowerCase();

const getArtistCandidateId = (item = {}) => (
  item.singerid || item.singer_id || item.SingerId || item.author_id || item.authorid ||
  item.id || item.ID || item.userid || item.user_id || ''
);

const getArtistCandidateName = (item = {}) => (
  item.singername || item.singer_name || item.SingerName || item.author_name ||
  item.authorname || item.name || item.Name || item.username || ''
);

const collectArtistCandidates = (source, candidates = [], seenObjects = new WeakSet()) => {
  if (!source || typeof source !== 'object') return candidates;
  if (seenObjects.has(source)) return candidates;
  seenObjects.add(source);

  if (Array.isArray(source)) {
    source.forEach(item => collectArtistCandidates(item, candidates, seenObjects));
    return candidates;
  }

  const id = String(getArtistCandidateId(source) || '').trim();
  const name = String(getArtistCandidateName(source) || '').trim();
  if (isValidArtistId(id) && !isUnknownSinger(name)) {
    candidates.push({ id, name });
  }

  Object.values(source).forEach(value => collectArtistCandidates(value, candidates, seenObjects));
  return candidates;
};

const pickExactArtistMatch = (artistName, candidates) => {
  const targetName = normalizeArtistName(artistName);
  const exactMatches = candidates.filter(candidate => normalizeArtistName(candidate.name) === targetName);
  const uniqueById = [];
  const seenIds = new Set();

  exactMatches.forEach(candidate => {
    if (seenIds.has(candidate.id)) return;
    seenIds.add(candidate.id);
    uniqueById.push(candidate);
  });

  return uniqueById.length === 1 ? uniqueById[0] : null;
};

export const resolveArtistByName = async (artistName) => {
  const name = String(artistName || '').trim();
  const cacheKey = normalizeArtistName(name);
  if (!cacheKey || isUnknownSinger(name)) return null;

  const cached = artistIdCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) artistIdCache.delete(cacheKey);
  if (pendingArtistResolves.has(cacheKey)) return pendingArtistResolves.get(cacheKey);

  const resolvePromise = (async () => {
    try {
      const authorRes = await request.get('/search', {
        params: { keywords: name, type: 'author', page: 1, pagesize: 10 },
        silent: true
      });
      let match = pickExactArtistMatch(name, collectArtistCandidates(authorRes));

      if (!match) {
        const complexRes = await request.get('/search/complex', {
          params: { keywords: name, page: 1, pagesize: 10 },
          silent: true
        }).catch(() => null);
        match = pickExactArtistMatch(name, collectArtistCandidates(complexRes));
      }

      artistIdCache.set(cacheKey, {
        value: match,
        expiresAt: Date.now() + (match ? ARTIST_CACHE_TTL : ARTIST_MISS_CACHE_TTL)
      });
      return match;
    } catch (error) {
      return null;
    } finally {
      pendingArtistResolves.delete(cacheKey);
    }
  })();

  pendingArtistResolves.set(cacheKey, resolvePromise);
  return resolvePromise;
};

export const goToArtist = async (router, artist, store) => {
  if (!artist || isUnknownSinger(artist.name)) {
    store?.showToast?.('暂无该歌手详情信息');
    return false;
  }

  if (isValidArtistId(artist.id)) {
    router.push(`/artist/${artist.id}`);
    return true;
  }

  store?.showToast?.('正在查找歌手信息...');
  const resolvedArtist = await resolveArtistByName(artist.name);
  if (resolvedArtist?.id) {
    router.push(`/artist/${resolvedArtist.id}`);
    return true;
  }

  store?.showToast?.('未找到明确歌手，已为你打开搜索结果');
  router.push(artistSearchTarget(artist));
  return false;
};

export const goToSongPrimaryArtist = (router, song, store) => {
  const artists = getSongArtists(song);
  return goToArtist(router, artists[0], store);
};
