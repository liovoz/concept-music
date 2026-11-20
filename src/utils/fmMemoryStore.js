const DAY_MS = 24 * 60 * 60 * 1000;
const DB_NAME = 'kg_desktop_fm_memory_v2';
const DB_VERSION = 1;

const LEGACY_RECENT_KEY = 'kg_desktop_fm_recent_v1';
const LEGACY_DISLIKE_KEY = 'kg_desktop_fm_dislike_v1';
const FALLBACK_STORAGE_PREFIX = 'kg_desktop_fm_v2_fallback_';

export const FM_MEMORY_LIMITS = {
  RECENT_LIMIT: 3000,
  RECENT_TTL: 30 * DAY_MS,
  DISLIKE_LIMIT: 1500,
  DISLIKE_TTL: 180 * DAY_MS,
  ARTIST_LIMIT: 500,
  ARTIST_BLOCK_TTL: 30 * DAY_MS,
  ARTIST_DECAY_TTL: 7 * DAY_MS,
  BROKEN_LIMIT: 300,
  BROKEN_TTL: 7 * DAY_MS
};

const STORE_NAMES = {
  RECENT: 'recent_tracks',
  DISLIKE: 'disliked_tracks',
  ARTIST: 'artist_suppression',
  BROKEN: 'broken_tracks',
  META: 'mode_meta'
};

const createEmptyMetrics = () => ({
  totalServed: 0,
  repeat14dCount: 0,
  variantBlockedCount: 0,
  quickSkipCount: 0,
  effectiveCompleteCount: 0,
  playlistSavedCount: 0,
  fetchCount: 0,
  fetchSuccessCount: 0,
  fetchLatenciesMs: [],
  modeTrackKeys: {
    familiar: [],
    fresh: [],
    explore: []
  },
  unknownTrackHits: {
    familiar: { unknown: 0, total: 0 },
    fresh: { unknown: 0, total: 0 },
    explore: { unknown: 0, total: 0 }
  },
  updatedAt: Date.now()
});

const createEmptyMeta = () => ({
  channelCursors: {
    familiar: {},
    fresh: {},
    explore: {}
  },
  seedHistory: {
    familiar: [],
    fresh: [],
    explore: []
  },
  channelHealth: {},
  preferences: {
    filterVersionNoise: true
  },
  knownPlaylistKeys: [],
  positiveSeeds: [],
  metrics: createEmptyMetrics(),
  migratedV1: false
});

const createEmptySnapshot = (namespace = 'guest') => ({
  namespace,
  recent: [],
  dislike: [],
  artists: [],
  broken: [],
  meta: createEmptyMeta()
});

let dbPromise = null;
let activeSnapshot = createEmptySnapshot('guest');
let loadedNamespace = '';
let pendingInitPromise = null;
const flushTimers = new Map();

export const resolveAccountNamespace = (userid) => {
  const uid = String(userid || '').trim();
  return uid && uid !== '0' ? `uid_${uid}` : 'guest';
};

const openDatabase = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        Object.values(STORE_NAMES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'pk' });
            store.createIndex('namespace', 'namespace', { unique: false });
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
  return dbPromise;
};

const readFallbackStorage = (namespace) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`${FALLBACK_STORAGE_PREFIX}${namespace}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const writeFallbackStorage = (namespace, snapshot) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const compact = {
      ...snapshot,
      recent: snapshot.recent.slice(0, 600),
      dislike: snapshot.dislike.slice(0, 300),
      artists: snapshot.artists.slice(0, 200),
      broken: snapshot.broken.slice(0, 100)
    };
    window.localStorage.setItem(`${FALLBACK_STORAGE_PREFIX}${namespace}`, JSON.stringify(compact));
  } catch (e) {}
};

const idbGetAllByNamespace = async (db, storeName, namespace) => {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('namespace');
      const req = index.getAll(IDBKeyRange.only(namespace));
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
};

const idbReplaceNamespaceStore = async (db, storeName, namespace, records) => {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('namespace');
      const cursorReq = index.openCursor(IDBKeyRange.only(namespace));
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          records.forEach((rec) => {
            try {
              store.put(JSON.parse(JSON.stringify(rec)));
            } catch (e) {}
          });
        }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
};

const pruneTrackEntries = (entries = [], ttl, limit) => {
  const now = Date.now();
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && entry.key && now - Number(entry.updatedAt || 0) <= ttl)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, limit);
};

const pruneArtistEntries = (entries = []) => {
  const now = Date.now();
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => {
      if (!entry || !entry.artistKey) return false;
      const ttl = entry.blocked ? FM_MEMORY_LIMITS.ARTIST_BLOCK_TTL : FM_MEMORY_LIMITS.ARTIST_DECAY_TTL;
      return now - Number(entry.updatedAt || 0) <= ttl;
    })
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, FM_MEMORY_LIMITS.ARTIST_LIMIT);
};

const normalizeMeta = (rawMeta = {}) => {
  const base = createEmptyMeta();
  return {
    ...base,
    ...rawMeta,
    channelCursors: {
      ...base.channelCursors,
      ...(rawMeta?.channelCursors || {})
    },
    seedHistory: {
      ...base.seedHistory,
      ...(rawMeta?.seedHistory || {})
    },
    channelHealth: {
      ...(rawMeta?.channelHealth || {})
    },
    preferences: {
      ...base.preferences,
      ...(rawMeta?.preferences || {})
    },
    knownPlaylistKeys: Array.isArray(rawMeta?.knownPlaylistKeys) ? rawMeta.knownPlaylistKeys.slice(0, 3000) : [],
    positiveSeeds: Array.isArray(rawMeta?.positiveSeeds) ? rawMeta.positiveSeeds.slice(0, 200) : [],
    metrics: {
      ...base.metrics,
      ...(rawMeta?.metrics || {}),
      modeTrackKeys: {
        ...base.metrics.modeTrackKeys,
        ...(rawMeta?.metrics?.modeTrackKeys || {})
      },
      unknownTrackHits: {
        ...base.metrics.unknownTrackHits,
        ...(rawMeta?.metrics?.unknownTrackHits || {})
      }
    }
  };
};

const readLegacyV1 = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { recent: [], dislike: [] };
  }
  const safeParse = (key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };
  return {
    recent: safeParse(LEGACY_RECENT_KEY),
    dislike: safeParse(LEGACY_DISLIKE_KEY)
  };
};

const schedulePersistStore = (storeKey, namespace, buildRecordsFn) => {
  const timerKey = `${namespace}::${storeKey}`;
  if (flushTimers.has(timerKey)) {
    clearTimeout(flushTimers.get(timerKey));
  }
  const timer = setTimeout(async () => {
    flushTimers.delete(timerKey);
    const db = await openDatabase();
    if (db) {
      await idbReplaceNamespaceStore(db, storeKey, namespace, buildRecordsFn());
    } else if (activeSnapshot.namespace === namespace) {
      writeFallbackStorage(namespace, activeSnapshot);
    }
  }, 120);
  flushTimers.set(timerKey, timer);
};

const buildTrackRecords = (namespace, list) =>
  list.map((entry) => ({
    ...entry,
    namespace,
    pk: `${namespace}::${entry.key}`
  }));

const buildArtistRecords = (namespace, list) =>
  list.map((entry) => ({
    ...entry,
    namespace,
    pk: `${namespace}::${entry.artistKey}`
  }));

const buildMetaRecords = (namespace, meta) => [
  {
    pk: `${namespace}::meta`,
    namespace,
    data: meta
  }
];

/**
 * 初始化并水合指定账号命名空间的 FM 记忆快照
 */
export const initFmMemoryStore = async (userid) => {
  const namespace = resolveAccountNamespace(userid);
  if (loadedNamespace === namespace && activeSnapshot.namespace === namespace) {
    return activeSnapshot;
  }
  if (pendingInitPromise && loadedNamespace === namespace) {
    return pendingInitPromise;
  }

  loadedNamespace = namespace;
  pendingInitPromise = (async () => {
    const db = await openDatabase();
    const snapshot = createEmptySnapshot(namespace);

    if (db) {
      const [recentRows, dislikeRows, artistRows, brokenRows, metaRows] = await Promise.all([
        idbGetAllByNamespace(db, STORE_NAMES.RECENT, namespace),
        idbGetAllByNamespace(db, STORE_NAMES.DISLIKE, namespace),
        idbGetAllByNamespace(db, STORE_NAMES.ARTIST, namespace),
        idbGetAllByNamespace(db, STORE_NAMES.BROKEN, namespace),
        idbGetAllByNamespace(db, STORE_NAMES.META, namespace)
      ]);
      snapshot.recent = pruneTrackEntries(recentRows, FM_MEMORY_LIMITS.RECENT_TTL, FM_MEMORY_LIMITS.RECENT_LIMIT);
      snapshot.dislike = pruneTrackEntries(dislikeRows, FM_MEMORY_LIMITS.DISLIKE_TTL, FM_MEMORY_LIMITS.DISLIKE_LIMIT);
      snapshot.artists = pruneArtistEntries(artistRows);
      snapshot.broken = pruneTrackEntries(brokenRows, FM_MEMORY_LIMITS.BROKEN_TTL, FM_MEMORY_LIMITS.BROKEN_LIMIT);
      const rawMeta = metaRows.find((r) => r.pk === `${namespace}::meta`)?.data || {};
      snapshot.meta = normalizeMeta(rawMeta);
    } else {
      const fallback = readFallbackStorage(namespace);
      if (fallback) {
        snapshot.recent = pruneTrackEntries(fallback.recent, FM_MEMORY_LIMITS.RECENT_TTL, FM_MEMORY_LIMITS.RECENT_LIMIT);
        snapshot.dislike = pruneTrackEntries(fallback.dislike, FM_MEMORY_LIMITS.DISLIKE_TTL, FM_MEMORY_LIMITS.DISLIKE_LIMIT);
        snapshot.artists = pruneArtistEntries(fallback.artists);
        snapshot.broken = pruneTrackEntries(fallback.broken, FM_MEMORY_LIMITS.BROKEN_TTL, FM_MEMORY_LIMITS.BROKEN_LIMIT);
        snapshot.meta = normalizeMeta(fallback.meta);
      }
    }

    // 旧版 localStorage 一次性平滑迁移
    if (!snapshot.meta.migratedV1) {
      const legacy = readLegacyV1();
      if (legacy.recent.length > 0 || legacy.dislike.length > 0) {
        snapshot.recent = pruneTrackEntries(
          [...snapshot.recent, ...legacy.recent],
          FM_MEMORY_LIMITS.RECENT_TTL,
          FM_MEMORY_LIMITS.RECENT_LIMIT
        );
        snapshot.dislike = pruneTrackEntries(
          [...snapshot.dislike, ...legacy.dislike],
          FM_MEMORY_LIMITS.DISLIKE_TTL,
          FM_MEMORY_LIMITS.DISLIKE_LIMIT
        );
      }
      snapshot.meta.migratedV1 = true;
      if (db) {
        await Promise.all([
          idbReplaceNamespaceStore(db, STORE_NAMES.RECENT, namespace, buildTrackRecords(namespace, snapshot.recent)),
          idbReplaceNamespaceStore(db, STORE_NAMES.DISLIKE, namespace, buildTrackRecords(namespace, snapshot.dislike)),
          idbReplaceNamespaceStore(db, STORE_NAMES.META, namespace, buildMetaRecords(namespace, snapshot.meta))
        ]);
      } else {
        writeFallbackStorage(namespace, snapshot);
      }
    }

    activeSnapshot = snapshot;
    return snapshot;
  })();

  try {
    return await pendingInitPromise;
  } finally {
    pendingInitPromise = null;
  }
};

export const getFmMemorySnapshot = () => {
  activeSnapshot.recent = pruneTrackEntries(activeSnapshot.recent, FM_MEMORY_LIMITS.RECENT_TTL, FM_MEMORY_LIMITS.RECENT_LIMIT);
  activeSnapshot.dislike = pruneTrackEntries(activeSnapshot.dislike, FM_MEMORY_LIMITS.DISLIKE_TTL, FM_MEMORY_LIMITS.DISLIKE_LIMIT);
  activeSnapshot.artists = pruneArtistEntries(activeSnapshot.artists);
  activeSnapshot.broken = pruneTrackEntries(activeSnapshot.broken, FM_MEMORY_LIMITS.BROKEN_TTL, FM_MEMORY_LIMITS.BROKEN_LIMIT);
  return activeSnapshot;
};

export const resetInMemorySnapshot = (userid = '') => {
  const ns = resolveAccountNamespace(userid);
  loadedNamespace = '';
  activeSnapshot = createEmptySnapshot(ns);
};

export const persistRecentTracks = (entries) => {
  const ns = activeSnapshot.namespace;
  activeSnapshot.recent = pruneTrackEntries(entries, FM_MEMORY_LIMITS.RECENT_TTL, FM_MEMORY_LIMITS.RECENT_LIMIT);
  schedulePersistStore(STORE_NAMES.RECENT, ns, () => buildTrackRecords(ns, activeSnapshot.recent));
  return activeSnapshot.recent;
};

export const persistDislikedTracks = (entries) => {
  const ns = activeSnapshot.namespace;
  activeSnapshot.dislike = pruneTrackEntries(entries, FM_MEMORY_LIMITS.DISLIKE_TTL, FM_MEMORY_LIMITS.DISLIKE_LIMIT);
  schedulePersistStore(STORE_NAMES.DISLIKE, ns, () => buildTrackRecords(ns, activeSnapshot.dislike));
  return activeSnapshot.dislike;
};

export const persistArtistSuppression = (entries) => {
  const ns = activeSnapshot.namespace;
  activeSnapshot.artists = pruneArtistEntries(entries);
  schedulePersistStore(STORE_NAMES.ARTIST, ns, () => buildArtistRecords(ns, activeSnapshot.artists));
  return activeSnapshot.artists;
};

export const persistBrokenTracks = (entries) => {
  const ns = activeSnapshot.namespace;
  activeSnapshot.broken = pruneTrackEntries(entries, FM_MEMORY_LIMITS.BROKEN_TTL, FM_MEMORY_LIMITS.BROKEN_LIMIT);
  schedulePersistStore(STORE_NAMES.BROKEN, ns, () => buildTrackRecords(ns, activeSnapshot.broken));
  return activeSnapshot.broken;
};

export const persistFmMeta = (updater) => {
  const ns = activeSnapshot.namespace;
  const nextMeta = typeof updater === 'function' ? updater(activeSnapshot.meta) : { ...activeSnapshot.meta, ...updater };
  activeSnapshot.meta = normalizeMeta(nextMeta);
  schedulePersistStore(STORE_NAMES.META, ns, () => buildMetaRecords(ns, activeSnapshot.meta));
  return activeSnapshot.meta;
};

export const clearModeCursors = (modeId) => {
  return persistFmMeta((meta) => ({
    ...meta,
    channelCursors: {
      ...meta.channelCursors,
      [modeId]: {}
    },
    seedHistory: {
      ...meta.seedHistory,
      [modeId]: []
    }
  }));
};

export const unblockArtistFromMemory = (artistKey) => {
  if (!artistKey) return activeSnapshot.artists;
  const next = activeSnapshot.artists.filter((item) => item.artistKey !== artistKey);
  return persistArtistSuppression(next);
};

export const resetFmMetrics = () => {
  return persistFmMeta((meta) => ({
    ...meta,
    metrics: createEmptyMetrics()
  }));
};
