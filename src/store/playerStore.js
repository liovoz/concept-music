// ====================
// 文件：src/store/playerStore.js
// ====================
import { defineStore } from 'pinia';
import request from '../utils/request';
import { useUserStore } from './userStore'; 
import { normalizeSongKey, compactQueueSong } from '../utils/songHelper';

let audioA = new Audio();
let audioB = new Audio();
audioA.preload = 'auto';
audioB.preload = 'auto';
audioA.crossOrigin = 'anonymous';
audioB.crossOrigin = 'anonymous';

let activeAudio = audioA;    
let preloadAudio = audioB;   

let preloadState = {
  hash: null,
  quality: 'standard',
  isPreview: false,
  url: null
};

const urlCache = new Map(); 
const getCachedUrl = (hash, quality) => {
  const key = `${hash}_${quality}`;
  if (urlCache.has(key)) {
    const item = urlCache.get(key);
    if (Date.now() - item.time < 3600000) return item; 
    urlCache.delete(key);
  }
  return null;
};
const setCachedUrl = (hash, quality, data) => {
  const key = `${hash}_${quality}`;
  urlCache.set(key, { ...data, time: Date.now() });
  if (urlCache.size > 80) {
    const now = Date.now();
    const expired = [];
    for (const [k, v] of urlCache) {
      if (now - v.time >= 3600000) expired.push(k);
    }
    if (expired.length > 0) {
      expired.forEach(k => urlCache.delete(k));
    } else {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of urlCache) {
        if (v.time < oldestTime) { oldestTime = v.time; oldestKey = k; }
      }
      if (oldestKey) urlCache.delete(oldestKey);
    }
  }
};

const pendingResolves = new Map();
let playVersion = 0;

const VOLUME_BOOST_LEVELS = [1.25, 1.5, 2];
const VOLUME_BOOST_ENABLED_KEY = 'kg_desktop_volume_boost_enabled';
const VOLUME_BOOST_LEVEL_KEY = 'kg_desktop_volume_boost_level';
const VOLUME_BOOST_INITIALIZED_KEY = 'kg_desktop_volume_boost_initialized';
const LOCAL_AUDIO_PROXY_BASE = 'http://127.0.0.1:10420';
const NETEASE_IMPORT_SOURCE = 'netease-import';
const QQ_IMPORT_SOURCE = 'qq-import';

const PLAY_MODES = ['sequence', 'loop', 'random'];
const PLAY_MODE_KEY = 'kg_play_mode';
const getStoredPlayMode = () => {
  const saved = localStorage.getItem(PLAY_MODE_KEY);
  return PLAY_MODES.includes(saved) ? saved : 'sequence';
};

export const PLAYLIST_MAX_SIZE_OPTIONS = [1000, 1500, 2000];
export const DEFAULT_MAX_PLAYLIST_SIZE = 1500;
export const PLAY_ALL_BEHAVIORS = ['replace', 'prepend'];
export const DEFAULT_PLAY_ALL_BEHAVIOR = 'replace';
export const MAX_FM_QUEUE_SIZE = 50;

const AUTO_SKIP_KEY = 'kg_desktop_auto_skip';
const REMEMBER_STATE_KEY = 'kg_desktop_remember_state';
const MAX_PLAYLIST_SIZE_KEY = 'kg_desktop_max_playlist_size';
const PLAY_ALL_BEHAVIOR_KEY = 'kg_desktop_play_all_behavior';
const PLAYER_STATE_STORAGE_KEY = 'kg_desktop_player_state';
const PLAYER_QUEUE_STORAGE_KEY = 'kg_desktop_player_queue';
const PLAYER_PROGRESS_STORAGE_KEY = 'kg_desktop_player_progress';
const REGULAR_BACKUP_STORAGE_KEY = 'kg_desktop_regular_playlist_backup';

const getInitialAutoSkip = () => {
  return localStorage.getItem(AUTO_SKIP_KEY) !== 'false';
};

const getInitialRememberState = () => {
  return localStorage.getItem(REMEMBER_STATE_KEY) === 'true';
};

const getInitialMaxPlaylistSize = () => {
  const saved = Number(localStorage.getItem(MAX_PLAYLIST_SIZE_KEY));
  return PLAYLIST_MAX_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_MAX_PLAYLIST_SIZE;
};

const getInitialPlayAllBehavior = () => {
  const saved = localStorage.getItem(PLAY_ALL_BEHAVIOR_KEY);
  return PLAY_ALL_BEHAVIORS.includes(saved) ? saved : DEFAULT_PLAY_ALL_BEHAVIOR;
};

const syncAudioSettingsToNative = (patch) => {
  if (typeof window !== 'undefined' && window.settingsAPI?.setAudioSettings) {
    window.settingsAPI.setAudioSettings(patch).catch(() => {});
  }
};

const playlistKeyMap = new Map();
let hydrationSeenSet = new Set();
let undoPlaylistSnapshot = null;
let regularPlaylistSavedState = null;
let fmController = null;
let currentToastAction = null;
let toastSeq = 0;

let persistQueueTimer = null;
let persistQueueIdleId = null;
let persistProgressTimer = null;
let lastPersistProgressTime = 0;

const rebuildPlaylistKeyMap = (playlist = []) => {
  playlistKeyMap.clear();
  if (!Array.isArray(playlist)) return;
  for (let i = 0; i < playlist.length; i++) {
    const key = normalizeSongKey(playlist[i]);
    if (key && !playlistKeyMap.has(key)) {
      playlistKeyMap.set(key, i);
    }
  }
};

const getFastSongIndex = (playlist, songOrHash) => {
  if (!Array.isArray(playlist) || playlist.length === 0 || !songOrHash) return -1;
  const key = normalizeSongKey(songOrHash);
  if (!key) return -1;
  const cachedIdx = playlistKeyMap.get(key);
  if (cachedIdx !== undefined && cachedIdx >= 0 && cachedIdx < playlist.length) {
    if (normalizeSongKey(playlist[cachedIdx]) === key) {
      return cachedIdx;
    }
  }
  rebuildPlaylistKeyMap(playlist);
  const rebuiltIdx = playlistKeyMap.get(key);
  return rebuiltIdx !== undefined ? rebuiltIdx : -1;
};

const sanitizeSongForStorage = (song) => {
  if (!song || typeof song !== 'object') return null;
  const canonicalKey = normalizeSongKey(song);
  if (!canonicalKey) return null;
  const isNetease = song.source === NETEASE_IMPORT_SOURCE || canonicalKey.startsWith('netease:');
  const isQQ = song.source === QQ_IMPORT_SOURCE || canonicalKey.startsWith('qq:');
  const item = {
    hash: canonicalKey,
    fileid: song.fileid || song._fileid || '',
    name: song.name || song._title || '',
    singer: song.singer || song._singer || '',
    singer_id: song.singer_id || song._singer_id || '',
    _singers: song._singers || song.artists || (song.singer ? [{ id: String(song.singer_id || ''), name: song.singer }] : []),
    album: song.album || song._album || '',
    album_id: song.album_id || song._album_id || '',
    album_audio_id: song.album_audio_id || song._album_audio_id || '',
    cover: song.cover || song._cover || '',
    duration: song.duration || 0,
    _duration: song._duration || '--:--',
    is_vip: !!(song.is_vip || song._is_vip),
    is_paid: !!(song.is_paid || song._is_paid),
    qualities: song.qualities || null,
    source: isNetease ? NETEASE_IMPORT_SOURCE : (isQQ ? QQ_IMPORT_SOURCE : (song.source || song._source || ''))
  };
  if (isNetease) {
    const id = canonicalKey.slice(8);
    item.neteaseId = id;
    item.id = id;
    item.songId = id;
    item.interval = item.duration;
  } else if (isQQ) {
    const mid = canonicalKey.slice(3);
    item.qqMid = mid;
    item.songmid = mid;
    item.id = mid;
    item.songId = mid;
    item.strMediaMid = song.strMediaMid || mid;
    item.interval = item.duration;
  }
  return item;
};

const schedulePersistQueue = (store, delay = 600) => {
  if (!store || !store.rememberState) return;
  if (persistQueueTimer) clearTimeout(persistQueueTimer);
  if (persistQueueIdleId && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(persistQueueIdleId);
    persistQueueIdleId = null;
  }
  persistQueueTimer = setTimeout(() => {
    persistQueueTimer = null;
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      persistQueueIdleId = window.requestIdleCallback(() => {
        persistQueueIdleId = null;
        store.persistQueueState();
      }, { timeout: 1500 });
    } else {
      store.persistQueueState();
    }
  }, delay);
};

const schedulePersistProgress = (store, delay = 300) => {
  if (!store || !store.rememberState) return;
  if (persistProgressTimer) clearTimeout(persistProgressTimer);
  persistProgressTimer = setTimeout(() => {
    persistProgressTimer = null;
    store.persistProgressState();
  }, delay);
};

let audioContext = null;
let audioGraphInitialized = false;
const audioOutputNodes = new WeakMap();

const getStoredBoostLevel = () => {
  const saved = parseFloat(localStorage.getItem(VOLUME_BOOST_LEVEL_KEY));
  return VOLUME_BOOST_LEVELS.includes(saved) ? saved : 1.5;
};

const getInitialBoostEnabled = () => {
  return localStorage.getItem(VOLUME_BOOST_ENABLED_KEY) === 'true';
};

const getRawAudioUrl = (url = '') => {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.href);
    const proxied = parsed.searchParams.get('url');
    if (parsed.pathname === '/audio/proxy' && proxied) return proxied;
  } catch (e) {}
  return url;
};

const buildAudioProxyUrl = (url) => {
  if (!url) return '';
  const rawUrl = getRawAudioUrl(url);
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return rawUrl;
  } catch (e) {
    return rawUrl;
  }
  const base = typeof window !== 'undefined' && window.apiBridge ? LOCAL_AUDIO_PROXY_BASE : '/api';
  return `${base}/audio/proxy?url=${encodeURIComponent(rawUrl)}`;
};

const shouldUseAudioProxy = (store) => store.volumeBoostEnabled || audioGraphInitialized;

const setAudioSource = (audio, url, useProxy, songHash = '') => {
  const rawUrl = getRawAudioUrl(url);
  audio._rawSourceUrl = rawUrl;
  audio._usingProxy = !!useProxy;
  audio._proxyFallbackAttempted = false;
  audio._proxyRestoreTime = 0;
  audio._proxyResumeOnLoad = false;
  audio._intendToPlay = false;
  if (songHash) audio._songHash = songHash;
  if (useProxy) {
    audio.crossOrigin = 'anonymous';
    audio.src = buildAudioProxyUrl(rawUrl);
  } else {
    audio.removeAttribute('crossOrigin');
    audio.src = rawUrl;
  }
};

const ensureAudioContext = () => {
  if (audioContext) return audioContext;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = new AudioContextCtor();
  return audioContext;
};

const configureCompressor = (compressor, enabled) => {
  if (!audioContext || !compressor) return;
  const now = audioContext.currentTime;
  if (enabled) {
    compressor.threshold.setValueAtTime(-3, now);
    compressor.knee.setValueAtTime(8, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
  } else {
    compressor.threshold.setValueAtTime(0, now);
    compressor.knee.setValueAtTime(0, now);
    compressor.ratio.setValueAtTime(1, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
  }
};

const ensureAudioOutputNode = (audio) => {
  if (audioOutputNodes.has(audio)) return audioOutputNodes.get(audio);
  const ctx = ensureAudioContext();
  if (!ctx) return null;

  const source = ctx.createMediaElementSource(audio);
  const gain = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  source.connect(gain);
  gain.connect(compressor);
  compressor.connect(ctx.destination);

  const nodes = { source, gain, compressor };
  audioOutputNodes.set(audio, nodes);
  return nodes;
};

const ensureAudioOutputGraph = () => {
  if (audioGraphInitialized) return true;
  const nodeA = ensureAudioOutputNode(audioA);
  const nodeB = ensureAudioOutputNode(audioB);
  audioGraphInitialized = !!(nodeA && nodeB);
  return audioGraphInitialized;
};

const recreateAudioInstances = (store) => {
  if (audioGraphInitialized) {
    audioOutputNodes.forEach((nodes) => {
      try { nodes.source?.disconnect(); } catch (e) {}
      try { nodes.gain?.disconnect(); } catch (e) {}
      try { nodes.compressor?.disconnect(); } catch (e) {}
    });
    audioOutputNodes.clear();
    audioGraphInitialized = false;
  }

  try { audioA.pause(); audioA.removeAttribute('src'); audioA.load(); } catch (e) {}
  try { audioB.pause(); audioB.removeAttribute('src'); audioB.load(); } catch (e) {}

  audioA = new Audio();
  audioB = new Audio();
  audioA.preload = 'auto';
  audioB.preload = 'auto';
  audioA.crossOrigin = 'anonymous';
  audioB.crossOrigin = 'anonymous';

  activeAudio = audioA;
  preloadAudio = audioB;

  if (store) {
    store.bindAudioEvents(audioA);
    store.bindAudioEvents(audioB);
    audioA.volume = store.volume;
    audioB.volume = store.volume;
  }
};

const hasLoadedAudioSource = (audio) => {
  if (!audio || !audio._rawSourceUrl) return false;
  if (typeof audio.getAttribute === 'function') {
    const attrSrc = audio.getAttribute('src');
    if (attrSrc !== null && attrSrc !== undefined) {
      return Boolean(String(attrSrc).trim());
    }
  }
  return Boolean(audio.src && String(audio.src).trim());
};

const isValidKugouHash = (val) => {
  return typeof val === 'string' && /^[0-9a-fA-F]{32}$/.test(val.trim());
};

const resetAudioElementSource = (audio) => {
  if (!audio) return;
  audio._intendToPlay = false;
  audio._songHash = '';
  try { audio.pause(); } catch (e) {}
  if (typeof audio.removeAttribute === 'function') {
    audio.removeAttribute('src');
  } else {
    audio.src = '';
  }
  audio._rawSourceUrl = '';
  audio._usingProxy = false;
  audio._proxyFallbackAttempted = false;
  audio._proxyRestoreTime = 0;
  audio._proxyResumeOnLoad = false;
  try { audio.load(); } catch (e) {}
};

const safePlayAudio = (audio) => {
  if (!audio) return undefined;
  audio._intendToPlay = true;
  if (audioContext && audioContext.state === 'suspended') {
    try { audioContext.resume().catch(() => {}); } catch (e) {}
  }
  return audio.play();
};

const safePauseAudio = (audio) => {
  if (!audio) return;
  audio._intendToPlay = false;
  try { audio.pause(); } catch (e) {}
};

const resetPreloadAudio = () => {
  resetAudioElementSource(preloadAudio);
  preloadState = {
    hash: null,
    quality: 'standard',
    isPreview: false,
    url: null
  };
};

const abortActivePlayback = (store, { resetPreload = false } = {}) => {
  playVersion++;
  pendingResolves.clear();
  if (store) {
    if (store._errorSkipTimer) { clearTimeout(store._errorSkipTimer); store._errorSkipTimer = null; }
    if (store._vipActionTimer) { clearTimeout(store._vipActionTimer); store._vipActionTimer = null; }
    if (store._playWatchdogTimer) { clearTimeout(store._playWatchdogTimer); store._playWatchdogTimer = null; }
    if (store._playbackProgressTimer) { clearTimeout(store._playbackProgressTimer); store._playbackProgressTimer = null; }
    store._pendingRestoreSeekTime = 0;
    store.isLoading = false;
    store.isPlaying = false;
  }
  safePauseAudio(activeAudio);
  resetAudioElementSource(activeAudio);
  if (resetPreload) {
    resetPreloadAudio();
  }
};

const clearUrlResolutionState = () => {
  playVersion++;
  pendingResolves.clear();
  urlCache.clear();
  resetPreloadAudio();
};

const clearSongUrlCache = (hash) => {
  if (!hash) return;
  const prefix = `${hash}_`;
  for (const key of urlCache.keys()) {
    if (key.startsWith(prefix)) urlCache.delete(key);
  }
};

export const QUALITY_CONFIG = [
  { key: 'viper_atmos', name: '全景声', param: 'viper_atmos' },
  { key: 'viper_clear', name: '超清母带', param: 'viper_clear' },
  { key: 'high', name: '超高无损', param: 'high' },
  { key: 'sq', name: '无损 SQ', param: 'flac' },
  { key: 'hq', name: '高品质 HQ', param: '320' },
  { key: 'standard', name: '标准音质', param: '128' }
];

const hasNeteaseQualityInfo = (quality) => {
  if (!quality || typeof quality !== 'object') return false;
  if (quality.br && Number(quality.br) > 0) return true;
  if (quality.bitrate && Number(quality.bitrate) > 0) return true;
  if (quality.size && Number(quality.size) > 0) return true;
  return Boolean(quality.level || quality.type || quality.name);
};

const getMaxNeteaseBitrate = (song = {}) => {
  const privilege = song.privilege || {};
  const chargeRates = Array.isArray(privilege.chargeInfoList)
    ? privilege.chargeInfoList.map(c => Number(c.rate || 0))
    : [];
  return Math.max(
    0,
    Number(song.m?.br || song.mMusic?.bitrate || 0),
    Number(song.h?.br || song.hMusic?.bitrate || 0),
    Number(song.sq?.br || song.sqMusic?.bitrate || 0),
    Number(song.hr?.br || song.hrMusic?.bitrate || 0),
    Number(privilege.maxbr || 0),
    Number(privilege.playMaxbr || 0),
    Number(privilege.pl || 0),
    Number(privilege.fl || 0),
    Number(privilege.dl || 0),
    ...chargeRates
  );
};

const getNeteaseImportId = (song = {}) => {
  return String(song.neteaseId || song.songId || song.id || song.hash || song._hash || '')
    .replace(/^netease:/, '')
    .trim();
};

const buildNeteaseImportQualities = (song = {}) => {
  const detail = song.sourceSongInfo || song;
  const id = getNeteaseImportId(song) || getNeteaseImportId(detail);
  if (!id) return { standard: '' };

  if (song.qualities && Object.keys(song.qualities).length > 0) return song.qualities;
  if (detail.qualities && Object.keys(detail.qualities).length > 0) return detail.qualities;
  if (detail._qualities && Object.keys(detail._qualities).length > 0) return detail._qualities;

  const qualities = { standard: id };
  const maxBitrate = getMaxNeteaseBitrate(detail);
  const privilege = detail.privilege || song.privilege || {};
  const maxBrLevel = String(privilege.maxBrLevel || privilege.playMaxBrLevel || privilege.downloadMaxBrLevel || '').toLowerCase();

  const hrObj = detail.hr || detail.hrMusic;
  const sqObj = detail.sq || detail.sqMusic;
  const hObj = detail.h || detail.hMusic;
  const jmObj = detail.jm || detail.jmMusic;
  const skObj = detail.sk || detail.skMusic;

  // HQ (320k)
  if (
    hasNeteaseQualityInfo(hObj) ||
    hasNeteaseQualityInfo(sqObj) ||
    hasNeteaseQualityInfo(hrObj) ||
    maxBitrate >= 320000 ||
    ['exhigh', 'lossless', 'hires', 'jymaster', 'sky', 'jyeffect'].includes(maxBrLevel)
  ) {
    qualities.hq = id;
  }

  // SQ (无损 16bit)
  if (
    hasNeteaseQualityInfo(sqObj) ||
    hasNeteaseQualityInfo(hrObj) ||
    maxBitrate >= 999000 ||
    ['lossless', 'hires', 'jymaster', 'sky', 'jyeffect'].includes(maxBrLevel)
  ) {
    qualities.sq = id;
  }

  // High (超高无损 Hi-Res / 24bit)
  if (
    hasNeteaseQualityInfo(hrObj) ||
    maxBitrate >= 1000000 ||
    ['hires', 'jymaster', 'sky', 'jyeffect'].includes(maxBrLevel)
  ) {
    qualities.high = id;
  }

  // Viper Clear (超清母带 Master)
  if (
    hasNeteaseQualityInfo(jmObj) ||
    maxBrLevel === 'jymaster'
  ) {
    qualities.viper_clear = id;
    qualities.high = id;
  }

  // Viper Atmos (全景声 / 沉浸声)
  if (
    hasNeteaseQualityInfo(skObj) ||
    ['sky', 'jyeffect'].includes(maxBrLevel)
  ) {
    qualities.viper_atmos = id;
  }

  return qualities;
};

const getQQImportId = (song = {}) => {
  return String(song.qqMid || song.songmid || song.mid || song.id || song.songId || song.hash || song._hash || '')
    .replace(/^qq:/, '')
    .trim();
};

const buildQQImportQualities = (song = {}) => {
  const detail = song.sourceSongInfo || song;
  const id = getQQImportId(song) || getQQImportId(detail);
  if (!id) return { standard: '' };

  if (song.qualities && Object.keys(song.qualities).length > 0) return song.qualities;
  if (detail.qualities && Object.keys(detail.qualities).length > 0) return detail.qualities;
  if (detail._qualities && Object.keys(detail._qualities).length > 0) return detail._qualities;

  const file = detail.file || {};
  const qualities = { standard: id };

  if (Number(file.size_320mp3 || file.size320 || 0) > 0) qualities.hq = id;
  if (Number(file.size_flac || file.sizeflac || 0) > 0) qualities.sq = id;
  if (Number(file.size_hires || 0) > 0) qualities.high = id;

  return qualities;
};

const extractQualities = (song) => {
  if (!song) return { standard: '', hq: '', sq: '', high: '', viper_clear: '', viper_atmos: '' };
  if (song.source === NETEASE_IMPORT_SOURCE) {
    return buildNeteaseImportQualities(song);
  }
  if (song.source === QQ_IMPORT_SOURCE || isQQImportSong(song)) {
    return buildQQImportQualities(song);
  }
  if (song.qualities && Object.keys(song.qualities).length > 0) return song.qualities;
  return {
    standard: song.hash || song.FileHash || song.filehash || '',
    hq: song['320hash'] || song.hash_320 || song.HQFileHash || '',
    sq: song.sqhash || song.hash_flac || song.SQFileHash || song.al8hash || '',
    high: song.hash_high || song.HighFileHash || '',
    viper_clear: song.hash_viper_clear || '',
    viper_atmos: song.hash_viper_atmos || ''
  };
};

const prepareQueueSong = (song) => {
  if (!song || typeof song !== 'object') return null;
  if (song._isCompact) return song;
  const compact = compactQueueSong(song);
  if (!compact) return null;
  if (!compact.qualities || Object.keys(compact.qualities).length === 0) {
    compact.qualities = extractQualities(song);
  }
  Object.defineProperty(compact, '_isCompact', {
    value: true,
    enumerable: false,
    configurable: true
  });
  return compact;
};

const toReactiveCurrentSong = (song) => {
  if (!song || typeof song !== 'object') return null;
  const prepared = prepareQueueSong(song) || song;
  const rawQualities = prepared.qualities && typeof prepared.qualities === 'object'
    ? { ...prepared.qualities }
    : extractQualities(prepared);
  return {
    ...prepared,
    _singers: Array.isArray(prepared._singers) ? [...prepared._singers] : [],
    qualities: rawQualities
  };
};

const getExpectedDuration = (song) => {
  if (!song || !song._duration) return 0;
  const parts = song._duration.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
};

const isNeteaseImportSong = (song) => {
  return song?.source === NETEASE_IMPORT_SOURCE || String(song?.hash || '').startsWith('netease:');
};

const isQQImportSong = (song) => {
  return song?.source === QQ_IMPORT_SOURCE || String(song?.hash || '').startsWith('qq:') || Boolean(song?.qqMid);
};

const isExternalImportSong = (song) => {
  return isNeteaseImportSong(song) || isQQImportSong(song);
};

const getPreviewToastMessage = (userStore) => {
  if (userStore.isLoggedIn && userStore.userInfo?.vip > 0) {
    return '正在试听 VIP 歌曲片段，播放授权未能获取完整版，请稍后重试';
  }
  if (userStore.isLoggedIn) {
    return '正在试听 VIP 歌曲片段，开通 VIP 解锁完整版';
  }
  return '正在试听 VIP 歌曲片段，登录解锁完整版';
};

let audioEventsBound = false;

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSong: null, 
    isPlaying: false,  
    isLoading: false,  
    isError: false,    
    errorMessage: '',  
    currentTime: 0,    
    duration: 0,       
    hasDfid: false,
    playlist: [],
    playbackHistory: [], // 随机模式下的历史播放回溯栈
    playAllHydrationSession: null,
    isPlaylistVisible: false,
    isLyricsVisible: false,
    isImmersiveLyrics: false,
    immersiveLyricMode: (() => {
      const mode = localStorage.getItem('kg_immersive_lyric_mode');
      return ['vinyl', 'fluid', 'poster', 'cinematic'].includes(mode) ? mode : 'vinyl';
    })(),
    immersiveFontSize: localStorage.getItem('kg_immersive_font_size') || 'lg',
    immersiveShowTranslation: localStorage.getItem('kg_immersive_translation') !== 'false',
    immersiveBgMode: (() => {
      const mode = localStorage.getItem('kg_immersive_bg_mode');
      return ['fluid', 'starry', 'pure'].includes(mode) ? mode : 'fluid';
    })(),
    isDesktopLyricVisible: false, // ✨ 新增：桌面歌词显示状态
    playMode: getStoredPlayMode(), 
    
    hasReportedCurrentSong: false, 
    
    volume: (() => { const v = parseFloat(localStorage.getItem('kg_desktop_volume')); return (isNaN(v) || v < 0 || v > 1) ? 1 : v; })(),
    volumeBoostEnabled: getInitialBoostEnabled(),
    volumeBoostLevel: getStoredBoostLevel(),
    savedVolume: 1,
    currentQuality: 'standard',
    
    toastMessage: '',
    toastState: {
      visible: false,
      message: '',
      type: 'info',
      actionText: '',
      id: 0
    },
    toastTimeout: null,

    isCurrentSongPreview: false,

    _errorSkipTimer: null,
    _vipActionTimer: null,
    _playWatchdogTimer: null,
    failedSong: null,
    autoSkipOnError: getInitialAutoSkip(),
    rememberState: getInitialRememberState(),
    maxPlaylistSize: getInitialMaxPlaylistSize(),
    playAllBehavior: getInitialPlayAllBehavior(),
    isFmModePlaylist: false,
    hasRegularPlaylistBackup: false,
    regularPlaylistBackupCount: 0,
    consecutiveErrorCount: 0,
    _pendingRestoreSeekTime: 0,

    peakMode: false,
    peakStartOffset: 0,
    peakDuration: 30,

    dialogState: {
      visible: false,
      type: 'info',
      title: '',
      message: '',
      confirmText: '确定',
      cancelText: '取消',
      countdown: 0,
      onConfirm: null,
      onCancel: null
    },
    dialogInterval: null
  }),

  actions: {
    showDialog(options) {
      this.dialogState.type = options.type || 'info';
      this.dialogState.title = options.title || '提示';
      this.dialogState.message = options.message || '';
      this.dialogState.confirmText = options.confirmText || '确定';
      this.dialogState.cancelText = options.cancelText || '取消';
      this.dialogState.countdown = options.countdown || 0;
      this.dialogState.onConfirm = options.onConfirm || null;
      this.dialogState.onCancel = options.onCancel || null;
      this.dialogState.visible = true;

      if (this.dialogInterval) clearInterval(this.dialogInterval);
      if (this.dialogState.countdown > 0) {
        this.dialogInterval = setInterval(() => {
          this.dialogState.countdown--;
          if (this.dialogState.countdown <= 0) {
            clearInterval(this.dialogInterval);
            this.closeDialog(true);
          }
        }, 1000);
      }
    },

    closeDialog(isConfirm = false) {
      if (this.dialogInterval) clearInterval(this.dialogInterval);
      this.dialogState.visible = false;
      const confirmCb = this.dialogState.onConfirm;
      const cancelCb = this.dialogState.onCancel;
      this.dialogState.onConfirm = null;
      this.dialogState.onCancel = null;
      this.dialogState.type = 'info';
      if (isConfirm && confirmCb) {
        confirmCb();
      } else if (!isConfirm && cancelCb) {
        cancelCb();
      }
    },

    handleSongEnd(isErrorEnd = false) {
      this.isPlaying = false;
      const userStore = useUserStore();
      
      if (this.isCurrentSongPreview) {
        if (userStore.isLoggedIn) {
          this.showDialog({
            title: '试听结束',
            message: '当前歌曲为VIP专享，试听片段已播放完毕。\n开通 VIP 即可畅听完整版及无损音质。',
            confirmText: '继续下一首',
            cancelText: '开通 VIP',
            countdown: 5,
            onConfirm: () => {
              this.currentTime = 0;
              this.playNext(true); 
            },
            onCancel: () => {
              this.currentTime = 0;
              userStore.openVipUpgradeModal();
            }
          });
        } else {
          this.showDialog({
            title: '试听结束',
            message: '当前歌曲为付费或VIP专享，试听片段已播放完毕。\n登录并开通 VIP 即可畅听完整版及无损音质。',
            confirmText: '继续下一首',
            cancelText: '登录解锁',
            countdown: 5,
            onConfirm: () => {
              this.currentTime = 0;
              this.playNext(true); 
            },
            onCancel: () => {
              this.currentTime = 0;
              userStore.openLoginModal();
            }
          });
        }
      } else {
        if (isErrorEnd) {
          if (this.autoSkipOnError) {
            this.consecutiveErrorCount = (this.consecutiveErrorCount || 0) + 1;
            const maxErrors = this.isFmModePlaylist ? 5 : Math.min(Math.max(3, this.playlist.length), 5);
            if (this.consecutiveErrorCount >= maxErrors) {
              this.consecutiveErrorCount = 0;
              this.showToast('连续多首歌曲播放故障，已停止自动跳过');
              this.isPlaying = false;
              return;
            }
            this.showToast('音频流发生异常中断，自动为您跳至下一首');
            if (this._errorSkipTimer) clearTimeout(this._errorSkipTimer);
            this._errorSkipTimer = setTimeout(() => { 
              this._errorSkipTimer = null;
              this.currentTime = 0;
              this.playNext(true); 
            }, 1500);
          } else {
            this.showToast('音频流发生异常中断，已暂停播放');
            this.isPlaying = false;
          }
        } else {
          this.consecutiveErrorCount = 0;
          this.currentTime = 0;
          this.playNext(true);
        }
      }
    },

    bindAudioEvents(audioInstance) {
      audioInstance.addEventListener('timeupdate', (e) => { 
        if (e.target !== activeAudio) return;

        if (this._playbackProgressTimer && activeAudio.currentTime > 0) {
          clearTimeout(this._playbackProgressTimer);
          this._playbackProgressTimer = null;
        }

        if (this.isCurrentSongPreview && activeAudio.currentTime >= 60) {
          if (!activeAudio.paused) {
            activeAudio.pause();
            this.currentTime = 60;
            this.handleSongEnd(false);
          }
        } else {
          if (activeAudio.currentTime > 0 || !this._pendingRestoreSeekTime) {
            this.currentTime = activeAudio.currentTime; 
          } 

          if (this.rememberState && this.isPlaying) {
            const now = Date.now();
            if (now - lastPersistProgressTime > 3000) {
              lastPersistProgressTime = now;
              this.persistProgressState();
            }
          }

          if (this.peakMode && this.peakStartOffset > 0 && this.peakDuration > 0) {
            const elapsed = this.currentTime - this.peakStartOffset;
            if (elapsed >= this.peakDuration) {
              this.peakMode = false;
              this.peakStartOffset = 0;
              this.peakDuration = 30;
              this.currentTime = 0;
              this.playNext(true);
              return;
            }
          }
          
          if (!this.hasReportedCurrentSong && this.currentTime >= 3 && this.currentSong) {
              this.hasReportedCurrentSong = true;
              const userStore = useUserStore();
              const mixid = this.currentSong.album_audio_id || this.currentSong.mixsongid || this.currentSong.audio_id || '';
              const hash = this.currentSong.hash || this.currentSong._hash || '';

              if (userStore.isLoggedIn) {
                  if (mixid && String(mixid) !== '0') {
                      // 携带 silent: true 的后台静默上报
                      request.get('/playhistory/upload', { params: { mxid: mixid, hash: hash, timestamp: Date.now() }, silent: true }).catch(()=>{});
                  }
                  
                  let dur = Math.floor(this.duration || 0);
                  let mins = Math.floor(dur / 60).toString().padStart(2, '0');
                  let secs = Math.floor(dur % 60).toString().padStart(2, '0');
                  
                  userStore.addLocalHistory({
                      _hash: hash,
                      _title: this.currentSong.name,
                      _singer: this.currentSong.singer,
                      _singer_id: this.currentSong.singer_id,
                      _singers: this.currentSong._singers || (this.currentSong.singer ? [{ id: String(this.currentSong.singer_id || ''), name: this.currentSong.singer }] : []),
                      _album: this.currentSong.album,
                      _cover: this.currentSong.cover,
                      _duration: dur > 0 ? `${mins}:${secs}` : '--:--',
                      _is_vip: this.currentSong.is_vip,
                      _is_paid: this.currentSong.is_paid,
                      _album_id: this.currentSong.album_id,
                      _album_audio_id: this.currentSong.album_audio_id,
                      _qualities: this.currentSong.qualities
                  });
              }
          }
        }
      });
      
      audioInstance.addEventListener('loadedmetadata', (e) => { 
        if (e.target !== activeAudio) return;

        let actualAudioDuration = activeAudio.duration;
        let expectedDuration = getExpectedDuration(this.currentSong);
        console.log('[Audio] loadedmetadata fired: actualAudioDuration=', actualAudioDuration, 'expectedDuration=', expectedDuration);

        if (!this.isCurrentSongPreview) {
          if (expectedDuration > 0 && actualAudioDuration > 0) {
            if (actualAudioDuration <= 70 && (expectedDuration - actualAudioDuration > 15)) {
              this.isCurrentSongPreview = true;
            }
          }
        }

        if (this.isCurrentSongPreview && actualAudioDuration > 60) {
          this.duration = 60;
        } else {
          this.duration = actualAudioDuration;
        }
      });
      
      audioInstance.addEventListener('playing', (e) => { 
        if (e.target !== activeAudio) return;
        if (this._playbackProgressTimer && activeAudio.currentTime > 0) {
          clearTimeout(this._playbackProgressTimer);
          this._playbackProgressTimer = null;
        }
        this.isLoading = false; 
        this.isPlaying = true; 
        this.consecutiveErrorCount = 0;
        this.syncTrayState();
      });
      
      audioInstance.addEventListener('pause', (e) => { 
        if (e.target !== activeAudio || !activeAudio.paused) return;
        if (this._playbackProgressTimer) {
          clearTimeout(this._playbackProgressTimer);
          this._playbackProgressTimer = null;
        }
        this.isPlaying = false; 
        if (this.rememberState) this.persistProgressState();
        this.syncTrayState();
      });
      
      audioInstance.addEventListener('ended', (e) => {
        if (e.target !== activeAudio) return;
        this.handleSongEnd(false);
      });
      
      audioInstance.addEventListener('error', (e) => {
        if (e.target !== activeAudio) {
           preloadState.hash = null;
           return;
        }
        if (!hasLoadedAudioSource(activeAudio)) return;
        console.error('[Audio error event]', activeAudio.error?.code, activeAudio.error?.message, 'src:', activeAudio.src);

        if (activeAudio._usingProxy && !activeAudio._proxyFallbackAttempted && activeAudio._rawSourceUrl) {
          const savedTime = Number.isFinite(activeAudio._proxyRestoreTime)
            ? activeAudio._proxyRestoreTime
            : (Number.isFinite(activeAudio.currentTime) ? activeAudio.currentTime : this.currentTime);
          const wasPlaying = Boolean(activeAudio._intendToPlay || activeAudio._proxyResumeOnLoad || this.isPlaying);
          const rawUrl = activeAudio._rawSourceUrl;
          const ownerHash = activeAudio._songHash || this.currentSong?.hash || '';
          activeAudio._proxyFallbackAttempted = true;
          activeAudio._proxyRestoreTime = savedTime;
          activeAudio._proxyResumeOnLoad = wasPlaying;

          if (audioGraphInitialized) {
            this.volumeBoostEnabled = false;
            localStorage.setItem(VOLUME_BOOST_ENABLED_KEY, 'false');
            recreateAudioInstances(this);
          }

          setAudioSource(activeAudio, rawUrl, false, ownerHash);
          activeAudio._proxyFallbackAttempted = true;
          activeAudio._proxyRestoreTime = savedTime;
          activeAudio._proxyResumeOnLoad = wasPlaying;
          activeAudio._intendToPlay = wasPlaying;
          this.applyAudioOutputSettings();
          if (!isExternalImportSong(this.currentSong)) {
            this.showToast('音量增强代理暂时不可用，已恢复普通播放');
          }
          activeAudio.load();
          activeAudio.addEventListener('loadedmetadata', () => {
            if (savedTime > 0) activeAudio.currentTime = savedTime;
            if (wasPlaying) {
              const p = safePlayAudio(activeAudio);
              if (p !== undefined) p.catch(() => { this.isPlaying = false; });
              this.isPlaying = true;
            } else {
              this.isPlaying = false;
            }
            activeAudio._proxyRestoreTime = 0;
            activeAudio._proxyResumeOnLoad = false;
          }, { once: true });
          return;
        }

        if (!activeAudio._usingProxy && !activeAudio._proxyFallbackAttempted && activeAudio._rawSourceUrl) {
          const savedTime = Number.isFinite(activeAudio._proxyRestoreTime)
            ? activeAudio._proxyRestoreTime
            : (Number.isFinite(activeAudio.currentTime) ? activeAudio.currentTime : this.currentTime);
          const wasPlaying = Boolean(activeAudio._intendToPlay || activeAudio._proxyResumeOnLoad || this.isPlaying);
          const rawUrl = activeAudio._rawSourceUrl;
          const ownerHash = activeAudio._songHash || this.currentSong?.hash || '';
          setAudioSource(activeAudio, rawUrl, true, ownerHash);
          activeAudio._proxyFallbackAttempted = true;
          activeAudio._proxyRestoreTime = savedTime;
          activeAudio._proxyResumeOnLoad = wasPlaying;
          activeAudio._intendToPlay = wasPlaying;
          activeAudio.load();
          activeAudio.addEventListener('loadedmetadata', () => {
            if (savedTime > 0) activeAudio.currentTime = savedTime;
            if (wasPlaying) {
              const p = safePlayAudio(activeAudio);
              if (p !== undefined) p.catch(() => { this.isPlaying = false; });
              this.isPlaying = true;
            } else {
              this.isPlaying = false;
            }
            activeAudio._proxyRestoreTime = 0;
            activeAudio._proxyResumeOnLoad = false;
          }, { once: true });
          return;
        }

        this.isLoading = false;
        this.isPlaying = false;
        
        const isNearRealEnd = this.duration > 0 && this.currentTime > 0 && (this.duration - this.currentTime < 5);
        const isPreviewNearEnd = this.isCurrentSongPreview && this.currentTime > 25; 
        
        if (isNearRealEnd || isPreviewNearEnd) {
          this.handleSongEnd(false); 
        } else {
          this.handleSongEnd(true); 
        }
      });
    },

    async initAudioSettings() {
      if (typeof window !== 'undefined' && window.settingsAPI?.getAudioSettings) {
        try {
          const nativeSettings = await window.settingsAPI.getAudioSettings();
          if (nativeSettings) {
            if (typeof nativeSettings.autoSkipOnError === 'boolean') {
              this.autoSkipOnError = nativeSettings.autoSkipOnError;
              localStorage.setItem(AUTO_SKIP_KEY, String(this.autoSkipOnError));
            }
            if (typeof nativeSettings.rememberState === 'boolean') {
              this.rememberState = nativeSettings.rememberState;
              localStorage.setItem(REMEMBER_STATE_KEY, String(this.rememberState));
              if (!this.rememberState) {
                this.clearPersistedState();
              }
            }
            if (typeof nativeSettings.volumeBoostEnabled === 'boolean') {
              this.volumeBoostEnabled = nativeSettings.volumeBoostEnabled;
              localStorage.setItem(VOLUME_BOOST_ENABLED_KEY, this.volumeBoostEnabled ? 'true' : 'false');
              if (!this.volumeBoostEnabled) {
                this.applyAudioOutputSettings();
              }
            }
            if (typeof nativeSettings.volumeBoostLevel === 'number' && VOLUME_BOOST_LEVELS.includes(nativeSettings.volumeBoostLevel)) {
              this.volumeBoostLevel = nativeSettings.volumeBoostLevel;
              localStorage.setItem(VOLUME_BOOST_LEVEL_KEY, String(this.volumeBoostLevel));
            }
            if (typeof nativeSettings.maxPlaylistSize === 'number' && PLAYLIST_MAX_SIZE_OPTIONS.includes(nativeSettings.maxPlaylistSize)) {
              this.maxPlaylistSize = nativeSettings.maxPlaylistSize;
              localStorage.setItem(MAX_PLAYLIST_SIZE_KEY, String(this.maxPlaylistSize));
            }
            if (typeof nativeSettings.playAllBehavior === 'string' && PLAY_ALL_BEHAVIORS.includes(nativeSettings.playAllBehavior)) {
              this.playAllBehavior = nativeSettings.playAllBehavior;
              localStorage.setItem(PLAY_ALL_BEHAVIOR_KEY, this.playAllBehavior);
            }
          }
        } catch (e) {}
      }
    },

    async initAudio() {
      // 1. 优先前置完成原生磁盘配置同步，杜绝异步竞态
      await this.initAudioSettings();

      // 2. 根据对齐后的增益状态配置输出
      if (this.volumeBoostEnabled) {
        await this.ensureBoostAudioOutput();
      } else {
        this.applyAudioOutputSettings();
      }

      if (!audioEventsBound) {
        this.bindAudioEvents(audioA);
        this.bindAudioEvents(audioB);
        audioEventsBound = true;
      }

      // 3. 严格遵循 rememberState：若为 true 才恢复，若为 false 确保清理残留
      if (this.rememberState && this.playlist.length === 0 && !this.currentSong) {
        this.restorePlaybackState();
      } else if (!this.rememberState) {
        this.clearPersistedState();
      }

      if (typeof window !== 'undefined' && !window.__kg_beforeunload_bound) {
        window.__kg_beforeunload_bound = true;
        window.addEventListener('beforeunload', () => {
          if (this.rememberState) {
            this.persistPlaybackState();
          } else {
            this.clearPersistedState();
          }
        });
      }

      if (window.lyricAPI) {
        window.lyricAPI.onControl((cmd) => {
          if (cmd === 'togglePlay') this.togglePlay();
          if (cmd === 'prev') this.playPrev();
          if (cmd === 'next') this.playNext(false);
          if (cmd === 'close') this.toggleDesktopLyric();
        });
        
        // 监听桌面歌词窗口被原生开启/关闭的事件，同步状态
        window.lyricAPI.onReady?.(() => {
          this.isDesktopLyricVisible = true;
          this.syncTrayState();
        });
        window.lyricAPI.onClosed?.(() => {
          this.isDesktopLyricVisible = false;
          this.syncTrayState();
        });
      }
    },

    setAutoSkipOnError(enabled) {
      this.autoSkipOnError = !!enabled;
      localStorage.setItem(AUTO_SKIP_KEY, String(this.autoSkipOnError));
      syncAudioSettingsToNative({ autoSkipOnError: this.autoSkipOnError });
    },

    setRememberState(enabled) {
      this.rememberState = !!enabled;
      localStorage.setItem(REMEMBER_STATE_KEY, String(this.rememberState));
      syncAudioSettingsToNative({ rememberState: this.rememberState });
      if (!this.rememberState) {
        this.clearPersistedState();
      } else {
        this.persistPlaybackState();
      }
    },

    persistQueueState() {
      if (!this.rememberState) {
        this.clearPersistedState();
        return;
      }
      try {
        const sanitizedPlaylist = (this.playlist || [])
          .map(sanitizeSongForStorage)
          .filter(Boolean);
        const queueToSave = {
          playlist: sanitizedPlaylist,
          isFmModePlaylist: false,
          savedAt: Date.now()
        };
        localStorage.setItem(PLAYER_QUEUE_STORAGE_KEY, JSON.stringify(queueToSave));
        if (this.isFmModePlaylist && regularPlaylistSavedState?.currentSong) {
          const savedRegularProgress = {
            currentSong: sanitizeSongForStorage(regularPlaylistSavedState.currentSong),
            currentTime: Number.isFinite(regularPlaylistSavedState.currentTime) ? Math.max(0, regularPlaylistSavedState.currentTime) : 0,
            duration: Number.isFinite(regularPlaylistSavedState.duration) ? Math.max(0, regularPlaylistSavedState.duration) : 0,
            currentQuality: regularPlaylistSavedState.currentQuality || 'standard',
            isCurrentSongPreview: !!regularPlaylistSavedState.isCurrentSongPreview,
            savedAt: Date.now()
          };
          localStorage.setItem(REGULAR_BACKUP_STORAGE_KEY, JSON.stringify(savedRegularProgress));
        } else {
          localStorage.removeItem(REGULAR_BACKUP_STORAGE_KEY);
        }
        localStorage.removeItem(PLAYER_STATE_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to persist player queue:', e);
      }
    },

    persistProgressState() {
      if (!this.rememberState) {
        this.clearPersistedState();
        return;
      }
      try {
        const sourceState = (this.isFmModePlaylist && regularPlaylistSavedState?.currentSong)
          ? regularPlaylistSavedState
          : {
              currentSong: this.currentSong,
              currentTime: this.currentTime,
              duration: this.duration,
              currentQuality: this.currentQuality,
              isCurrentSongPreview: this.isCurrentSongPreview
            };
        const sanitizedCurrentSong = sanitizeSongForStorage(sourceState.currentSong);
        const progressToSave = {
          currentSong: sanitizedCurrentSong,
          currentTime: Number.isFinite(sourceState.currentTime) ? Math.max(0, sourceState.currentTime) : 0,
          duration: Number.isFinite(sourceState.duration) ? Math.max(0, sourceState.duration) : 0,
          currentQuality: sourceState.currentQuality || 'standard',
          isCurrentSongPreview: !!sourceState.isCurrentSongPreview,
          savedAt: Date.now()
        };
        localStorage.setItem(PLAYER_PROGRESS_STORAGE_KEY, JSON.stringify(progressToSave));
      } catch (e) {
        console.warn('Failed to persist player progress:', e);
      }
    },

    persistPlaybackState() {
      if (!this.rememberState) {
        this.clearPersistedState();
        return;
      }
      if (persistQueueTimer) { clearTimeout(persistQueueTimer); persistQueueTimer = null; }
      if (persistProgressTimer) { clearTimeout(persistProgressTimer); persistProgressTimer = null; }
      this.persistQueueState();
      this.persistProgressState();
    },

    clearPersistedState() {
      if (persistQueueTimer) { clearTimeout(persistQueueTimer); persistQueueTimer = null; }
      if (persistProgressTimer) { clearTimeout(persistProgressTimer); persistProgressTimer = null; }
      if (persistQueueIdleId && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(persistQueueIdleId);
        persistQueueIdleId = null;
      }
      try {
        localStorage.removeItem(PLAYER_QUEUE_STORAGE_KEY);
        localStorage.removeItem(PLAYER_PROGRESS_STORAGE_KEY);
        localStorage.removeItem(REGULAR_BACKUP_STORAGE_KEY);
        localStorage.removeItem(PLAYER_STATE_STORAGE_KEY);
      } catch (e) {}
    },

    restorePlaybackState() {
      if (!this.rememberState) return false;
      try {
        let rawQueueData = null;
        let rawProgressData = null;
        let migratedFromLegacy = false;

        const queueRaw = localStorage.getItem(PLAYER_QUEUE_STORAGE_KEY);
        if (queueRaw) {
          rawQueueData = JSON.parse(queueRaw);
          const progressRaw = localStorage.getItem(PLAYER_PROGRESS_STORAGE_KEY);
          if (progressRaw) {
            try { rawProgressData = JSON.parse(progressRaw); } catch (e) {}
          }
        } else {
          const legacyRaw = localStorage.getItem(PLAYER_STATE_STORAGE_KEY);
          if (!legacyRaw) return false;
          const legacyData = JSON.parse(legacyRaw);
          if (!legacyData || !Array.isArray(legacyData.playlist) || legacyData.playlist.length === 0) return false;
          rawQueueData = { playlist: legacyData.playlist, isFmModePlaylist: false };
          rawProgressData = legacyData;
          migratedFromLegacy = true;
        }

        const backupRaw = localStorage.getItem(REGULAR_BACKUP_STORAGE_KEY);
        if (backupRaw) {
          try {
            const parsedBackup = JSON.parse(backupRaw);
            if (rawQueueData?.isFmModePlaylist && Array.isArray(parsedBackup?.playlist) && parsedBackup.playlist.length > 0) {
              rawQueueData = { playlist: parsedBackup.playlist, isFmModePlaylist: false };
              rawProgressData = parsedBackup;
              migratedFromLegacy = true;
            } else if (!rawProgressData?.currentSong && parsedBackup?.currentSong) {
              rawProgressData = parsedBackup;
            }
          } catch (e) {}
          localStorage.removeItem(REGULAR_BACKUP_STORAGE_KEY);
        }

        if (!rawQueueData || !Array.isArray(rawQueueData.playlist) || rawQueueData.playlist.length === 0) return false;

        regularPlaylistSavedState = null;
        this.isFmModePlaylist = false;
        this.hasRegularPlaylistBackup = false;
        this.regularPlaylistBackupCount = 0;

        const seenKeys = new Set();
        const restoredQueue = [];
        for (const item of rawQueueData.playlist) {
          const prepared = prepareQueueSong(item);
          if (!prepared || seenKeys.has(prepared.hash)) continue;
          seenKeys.add(prepared.hash);
          restoredQueue.push(prepared);
          if (restoredQueue.length >= this.maxPlaylistSize) break;
        }
        if (restoredQueue.length === 0) return false;

        this.playlist = restoredQueue;
        rebuildPlaylistKeyMap(this.playlist);

        const savedCurrent = rawProgressData?.currentSong ? prepareQueueSong(rawProgressData.currentSong) : null;
        if (savedCurrent && savedCurrent.hash) {
          const matchedIdx = getFastSongIndex(this.playlist, savedCurrent.hash);
          const matched = matchedIdx !== -1 ? this.playlist[matchedIdx] : savedCurrent;
          this.currentSong = toReactiveCurrentSong(matched);
          this.currentTime = Math.max(0, Number(rawProgressData.currentTime) || 0);
          this.duration = Math.max(0, Number(rawProgressData.duration) || getExpectedDuration(matched) || Number(matched.duration) || 0);
          this.currentQuality = rawProgressData.currentQuality || 'standard';
          this.isCurrentSongPreview = !!rawProgressData.isCurrentSongPreview;
        } else {
          this.currentSong = toReactiveCurrentSong(this.playlist[0]);
          this.currentTime = 0;
          this.duration = getExpectedDuration(this.playlist[0]) || Number(this.playlist[0].duration) || 0;
          this.currentQuality = 'standard';
          this.isCurrentSongPreview = false;
        }

        this.isPlaying = false;
        this.syncTrayState();
        if (migratedFromLegacy) {
          this.persistPlaybackState();
        }
        return true;
      } catch (e) {
        console.warn('Failed to restore player state:', e);
        return false;
      }
    },

    showToast(messageOrOpts, options = {}) {
      const isObj = messageOrOpts && typeof messageOrOpts === 'object';
      const message = String(isObj ? (messageOrOpts.message || '') : (messageOrOpts || '')).trim();
      const opts = isObj ? messageOrOpts : (options || {});
      if (!message) {
        this.dismissToast();
        return;
      }
      const validTypes = ['info', 'success', 'warning', 'error'];
      const type = validTypes.includes(opts.type) ? opts.type : 'info';
      const actionText = String(opts.actionText || '').trim();
      currentToastAction = typeof opts.onAction === 'function' ? opts.onAction : null;
      const duration = Number(opts.duration) > 0 ? Number(opts.duration) : (actionText ? 5000 : 3000);

      this.toastMessage = message;
      this.toastState = {
        visible: true,
        message,
        type,
        actionText,
        id: ++toastSeq
      };
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.dismissToast();
      }, duration);
    },

    dismissToast() {
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      currentToastAction = null;
      this.toastMessage = '';
      this.toastState = {
        ...this.toastState,
        visible: false,
        message: '',
        actionText: ''
      };
    },

    triggerToastAction() {
      const fn = currentToastAction;
      this.dismissToast();
      if (typeof fn === 'function') {
        fn();
      }
    },

    setVolume(val) {
      const v = Math.max(0, Math.min(1, val));
      this.volume = v;
      localStorage.setItem('kg_desktop_volume', v.toString());
      if (v > 0) this.savedVolume = v;
      this.applyAudioOutputSettings();
    },

    applyAudioOutputSettings() {
      const multiplier = this.volumeBoostEnabled ? this.volumeBoostLevel : 1;
      const outputGain = this.volume * multiplier;

      if (!audioGraphInitialized) {
        audioA.volume = this.volume;
        audioB.volume = this.volume;
        return;
      }

      audioA.volume = 1;
      audioB.volume = 1;
      [audioA, audioB].forEach(audio => {
        const nodes = audioOutputNodes.get(audio);
        if (!nodes?.gain || !audioContext) return;
        nodes.gain.gain.setValueAtTime(outputGain, audioContext.currentTime);
        configureCompressor(nodes.compressor, this.volumeBoostEnabled);
      });
    },

    async ensureBoostAudioOutput() {
      if (!ensureAudioOutputGraph()) {
        this.volumeBoostEnabled = false;
        localStorage.setItem(VOLUME_BOOST_ENABLED_KEY, 'false');
        this.showToast('当前环境不支持音量增强，已保持普通播放');
        this.applyAudioOutputSettings();
        return false;
      }

      if (audioContext?.state === 'suspended') {
        try { await audioContext.resume(); } catch (e) {}
      }
      this.applyAudioOutputSettings();

      [activeAudio, preloadAudio].forEach(audio => {
        if (!audio._rawSourceUrl || audio._usingProxy) return;
        const isActive = audio === activeAudio;
        const savedTime = isActive && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        const wasPlaying = isActive && this.isPlaying && !audio.paused;
        setAudioSource(audio, audio._rawSourceUrl, true);
        audio._proxyRestoreTime = savedTime;
        audio._proxyResumeOnLoad = wasPlaying;
        audio.load();
        if (!isActive) return;
        audio.addEventListener('loadedmetadata', () => {
          if (savedTime > 0) audio.currentTime = savedTime;
          if (wasPlaying) {
            const p = safePlayAudio(audio);
            if (p !== undefined) p.catch(() => { this.isPlaying = false; });
          }
          audio._proxyRestoreTime = 0;
          audio._proxyResumeOnLoad = false;
        }, { once: true });
      });
      return true;
    },

    async setVolumeBoostEnabled(enabled) {
      this.volumeBoostEnabled = !!enabled;
      localStorage.setItem(VOLUME_BOOST_ENABLED_KEY, this.volumeBoostEnabled ? 'true' : 'false');
      syncAudioSettingsToNative({ volumeBoostEnabled: this.volumeBoostEnabled });
      if (this.volumeBoostEnabled) await this.ensureBoostAudioOutput();
      else this.applyAudioOutputSettings();
    },

    setVolumeBoostLevel(level) {
      const nextLevel = VOLUME_BOOST_LEVELS.includes(Number(level)) ? Number(level) : 1.5;
      this.volumeBoostLevel = nextLevel;
      localStorage.setItem(VOLUME_BOOST_LEVEL_KEY, nextLevel.toString());
      syncAudioSettingsToNative({ volumeBoostLevel: this.volumeBoostLevel });
      if (this.volumeBoostEnabled) this.ensureBoostAudioOutput();
      else this.applyAudioOutputSettings();
    },

    toggleVolumeBoost() {
      return this.setVolumeBoostEnabled(!this.volumeBoostEnabled);
    },

    toggleMute() {
      if (this.volume > 0) {
        this.savedVolume = this.volume;
        this.setVolume(0);
      } else {
        this.setVolume(this.savedVolume > 0 ? this.savedVolume : 1);
      }
    },

    togglePlaylist() { this.isPlaylistVisible = !this.isPlaylistVisible; },
    toggleLyrics() { 
      this.isLyricsVisible = !this.isLyricsVisible; 
      if (!this.isLyricsVisible && this.isImmersiveLyrics) {
        this.exitImmersiveLyrics();
      }
    },

    toggleImmersiveLyrics() {
      if (this.isImmersiveLyrics) {
        this.exitImmersiveLyrics();
      } else {
        this.enterImmersiveLyrics();
      }
    },

    enterImmersiveLyrics() {
      this.isLyricsVisible = true;
      this.isImmersiveLyrics = true;
      if (window.windowControls?.setFullScreen) {
        window.windowControls.setFullScreen(true);
      } else if (document.documentElement?.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    },

    exitImmersiveLyrics() {
      this.isImmersiveLyrics = false;
      this.isLyricsVisible = false;
      if (window.windowControls?.setFullScreen) {
        window.windowControls.setFullScreen(false);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    },

    setImmersiveLyricMode(mode) {
      if (['vinyl', 'fluid', 'poster', 'cinematic'].includes(mode)) {
        this.immersiveLyricMode = mode;
        localStorage.setItem('kg_immersive_lyric_mode', mode);
      }
    },

    setImmersiveFontSize(size) {
      if (['md', 'lg', 'xl'].includes(size)) {
        this.immersiveFontSize = size;
        localStorage.setItem('kg_immersive_font_size', size);
      }
    },

    toggleImmersiveTranslation() {
      this.immersiveShowTranslation = !this.immersiveShowTranslation;
      localStorage.setItem('kg_immersive_translation', this.immersiveShowTranslation ? 'true' : 'false');
    },

    setImmersiveBgMode(mode) {
      const validModes = ['fluid', 'starry', 'pure'];
      if (validModes.includes(mode)) {
        this.immersiveBgMode = mode;
        localStorage.setItem('kg_immersive_bg_mode', mode);
      }
    },

    cycleImmersiveBgMode() {
      const modes = ['fluid', 'starry', 'pure'];
      const idx = modes.indexOf(this.immersiveBgMode);
      const nextMode = modes[(idx + 1) % modes.length];
      this.setImmersiveBgMode(nextMode);
    },

    getCurrentSongIndex() {
      return getFastSongIndex(this.playlist, this.currentSong);
    },

    findSongIndex(songOrHash) {
      return getFastSongIndex(this.playlist, songOrHash);
    },

    applyMaxPlaylistSize(size, options = {}) {
      const prevSize = this.maxPlaylistSize;
      const nextSize = PLAYLIST_MAX_SIZE_OPTIONS.includes(Number(size))
        ? Number(size)
        : DEFAULT_MAX_PLAYLIST_SIZE;
      this.maxPlaylistSize = nextSize;
      localStorage.setItem(MAX_PLAYLIST_SIZE_KEY, String(nextSize));
      syncAudioSettingsToNative({ maxPlaylistSize: nextSize });

      let truncated = 0;
      if (this.playlist.length > nextSize) {
        this.saveUndoSnapshot('cap-truncate');
        const prevLen = this.playlist.length;
        const refSong = (this.isFmModePlaylist && regularPlaylistSavedState?.currentSong)
          ? regularPlaylistSavedState.currentSong
          : this.currentSong;
        const curIdx = getFastSongIndex(this.playlist, refSong);
        if (curIdx <= 0) {
          this.playlist = this.playlist.slice(0, nextSize);
        } else {
          const after = this.playlist.slice(curIdx, curIdx + nextSize);
          const needBefore = Math.max(0, nextSize - after.length);
          const before = needBefore > 0 ? this.playlist.slice(Math.max(0, curIdx - needBefore), curIdx) : [];
          this.playlist = [...before, ...after];
        }
        truncated = Math.max(0, prevLen - this.playlist.length);
        if (this.playAllHydrationSession && (this.playAllHydrationSession.insertIndex || 0) >= nextSize) {
          this.cancelPlayAllHydration();
        }
        rebuildPlaylistKeyMap(this.playlist);
        if (!this.isFmModePlaylist) this.triggerPreload();
      }
      if (this.isFmModePlaylist) {
        this._syncFmBackupFlags();
      }

      if (this.rememberState) schedulePersistQueue(this, 200);
      if (!options.silent) {
        if (truncated > 0) {
          this.showToast(`播放列表上限已设为 ${nextSize} 首，已裁剪 ${truncated} 首超出歌曲`, {
            type: 'info',
            duration: 5000,
            actionText: '撤销',
            onAction: () => {
              this.maxPlaylistSize = prevSize;
              localStorage.setItem(MAX_PLAYLIST_SIZE_KEY, String(prevSize));
              syncAudioSettingsToNative({ maxPlaylistSize: prevSize });
              this.restoreUndoSnapshot();
            }
          });
        } else {
          this.showToast(`播放列表容量上限已设为 ${nextSize} 首`, { type: 'success' });
        }
      }
      return { truncated, total: this.playlist.length, maxPlaylistSize: nextSize };
    },

    setPlayAllBehavior(behavior, options = {}) {
      const nextBehavior = PLAY_ALL_BEHAVIORS.includes(behavior) ? behavior : DEFAULT_PLAY_ALL_BEHAVIOR;
      this.playAllBehavior = nextBehavior;
      localStorage.setItem(PLAY_ALL_BEHAVIOR_KEY, nextBehavior);
      syncAudioSettingsToNative({ playAllBehavior: nextBehavior });
      if (!options.silent) {
        const label = nextBehavior === 'replace' ? '替换当前播放列表' : '合并到队首';
        this.showToast(`「播放全部」默认行为已切换为：${label}`, { type: 'success' });
      }
      return nextBehavior;
    },

    saveUndoSnapshot(reason = 'clear') {
      if (!Array.isArray(this.playlist) || this.playlist.length === 0) return;
      const progressSource = (this.isFmModePlaylist && regularPlaylistSavedState)
        ? regularPlaylistSavedState
        : {
            currentSong: this.currentSong,
            currentTime: this.currentTime,
            duration: this.duration,
            currentQuality: this.currentQuality,
            isCurrentSongPreview: this.isCurrentSongPreview,
            wasPlaying: Boolean(this.isPlaying || this.isLoading)
          };
      undoPlaylistSnapshot = {
        playlist: [...this.playlist],
        currentSong: progressSource.currentSong ? toReactiveCurrentSong(progressSource.currentSong) : null,
        currentTime: progressSource.currentTime || 0,
        duration: progressSource.duration || 0,
        currentQuality: progressSource.currentQuality || 'standard',
        isCurrentSongPreview: !!progressSource.isCurrentSongPreview,
        wasPlaying: !!progressSource.wasPlaying,
        isFmModePlaylist: false,
        playbackHistory: Array.isArray(this.playbackHistory) ? [...this.playbackHistory] : [],
        reason,
        createdAt: Date.now()
      };
    },

    restoreUndoSnapshot() {
      if (!undoPlaylistSnapshot || !Array.isArray(undoPlaylistSnapshot.playlist) || undoPlaylistSnapshot.playlist.length === 0) {
        return false;
      }
      const snap = undoPlaylistSnapshot;
      undoPlaylistSnapshot = null;
      this.cancelPlayAllHydration();
      if (this.isFmModePlaylist) {
        this._exitFmModeSilent({ keepCurrentFmSong: false });
      }

      this.isFmModePlaylist = false;
      this.playlist = snap.playlist.slice(0, this.maxPlaylistSize);
      this.playbackHistory = snap.playbackHistory || [];
      rebuildPlaylistKeyMap(this.playlist);

      const isSameSongStillActive = !this.isFmModePlaylist
        && snap.currentSong
        && this.currentSong
        && normalizeSongKey(snap.currentSong) === normalizeSongKey(this.currentSong);

      let triggeredPlay = false;
      if (!isSameSongStillActive) {
        if (snap.currentSong) {
          if (snap.wasPlaying) {
            triggeredPlay = true;
            this.playSong(snap.currentSong, null, snap.currentTime || 0, true, { silentQueueToast: true });
          } else {
            abortActivePlayback(this, { resetPreload: true });
            this.currentSong = toReactiveCurrentSong(snap.currentSong);
            this.currentTime = snap.currentTime || 0;
            this.duration = snap.duration || getExpectedDuration(snap.currentSong) || Number(snap.currentSong.duration) || 0;
            this.currentQuality = snap.currentQuality || 'standard';
            this.isCurrentSongPreview = !!snap.isCurrentSongPreview;
            this.clearError();
            this.syncTrayState();
          }
        } else {
          abortActivePlayback(this, { resetPreload: true });
          this.currentSong = null;
          this.currentTime = 0;
          this.duration = 0;
          this.clearError();
          this.syncTrayState();
        }
      }

      if (!triggeredPlay) {
        this.triggerPreload();
      }
      if (this.rememberState) {
        schedulePersistQueue(this, 200);
        schedulePersistProgress(this, 200);
      }
      this.showToast(`已恢复原播放列表 (${this.playlist.length}首)`, { type: 'success' });
      return true;
    },

    registerFmController(controller = null) {
      fmController = controller || null;
    },

    _syncFmBackupFlags() {
      this.regularPlaylistBackupCount = this.isFmModePlaylist ? this.playlist.length : 0;
      this.hasRegularPlaylistBackup = Boolean(this.isFmModePlaylist && this.playlist.length > 0);
    },

    enterFmMode(options = {}) {
      if (!this.isFmModePlaylist) {
        this.cancelPlayAllHydration();
        const fallbackRegularSong = this.currentSong || this.playlist[0] || null;
        regularPlaylistSavedState = fallbackRegularSong
          ? {
              currentSong: toReactiveCurrentSong(fallbackRegularSong),
              currentTime: Math.max(0, Number(this.currentTime) || 0),
              duration: Math.max(0, Number(this.duration) || getExpectedDuration(fallbackRegularSong) || Number(fallbackRegularSong.duration) || 0),
              currentQuality: this.currentQuality || 'standard',
              isCurrentSongPreview: !!this.isCurrentSongPreview,
              wasPlaying: Boolean(this.isPlaying || this.isLoading)
            }
          : null;
        this.isFmModePlaylist = true;
        this._syncFmBackupFlags();
        if (this.playlist.length > 0 && !options.silent) {
          this.showToast(`已进入私人FM，原播放列表 (${this.playlist.length}首) 已保留`, {
            type: 'info',
            duration: 5000,
            actionText: '恢复原列表',
            onAction: () => this.restoreRegularPlaylistFromFm({ navigateBack: true })
          });
        }
        if (this.rememberState) schedulePersistQueue(this, 200);
      } else {
        this._syncFmBackupFlags();
      }
    },

    playFmSong(rawSong, options = {}) {
      if (!rawSong) return Promise.resolve();
      this.enterFmMode(options);
      return this.playSong(rawSong, null, 0, true, {
        isFmTrack: true,
        silentQueueToast: true
      });
    },

    _exitFmModeSilent({ keepCurrentFmSong = false } = {}) {
      if (!this.isFmModePlaylist) return;
      const fmSong = keepCurrentFmSong && this.currentSong ? prepareQueueSong(this.currentSong) : null;
      this.isFmModePlaylist = false;
      regularPlaylistSavedState = null;
      this._syncFmBackupFlags();
      if (fmSong && getFastSongIndex(this.playlist, fmSong.hash) === -1) {
        if (this.playlist.length >= this.maxPlaylistSize) {
          this.playlist.pop();
        }
        this.playlist.unshift(fmSong);
        rebuildPlaylistKeyMap(this.playlist);
      }
      try { fmController?.onExitFm?.(); } catch (e) {}
    },

    restoreRegularPlaylistFromFm(options = {}) {
      if (!this.isFmModePlaylist && !regularPlaylistSavedState) {
        return false;
      }
      const snap = regularPlaylistSavedState;
      regularPlaylistSavedState = null;
      this.isFmModePlaylist = false;
      this._syncFmBackupFlags();
      this.peakMode = false;
      this.peakStartOffset = 0;
      this.peakDuration = 30;

      if (this.playlist.length === 0 && !snap?.currentSong) {
        abortActivePlayback(this, { resetPreload: true });
        this.currentSong = null;
        this.currentTime = 0;
        this.duration = 0;
        this.clearError();
        this.syncTrayState();
        try { fmController?.onRestoreRegular?.({ navigateBack: options.navigateBack !== false }); } catch (e) {}
        return false;
      }

      rebuildPlaylistKeyMap(this.playlist);
      const matchedIdx = snap?.currentSong ? getFastSongIndex(this.playlist, snap.currentSong) : -1;
      const targetSong = (matchedIdx !== -1 ? this.playlist[matchedIdx] : snap?.currentSong) || this.playlist[0] || null;
      const savedTime = Math.max(0, Number(snap?.currentTime) || 0);
      const shouldPlay = options.autoPlay !== undefined
        ? !!options.autoPlay
        : Boolean(this.isPlaying || this.isLoading || snap?.wasPlaying);

      if (targetSong) {
        if (shouldPlay) {
          this.playSong(targetSong, null, savedTime, true, { silentQueueToast: true });
        } else {
          abortActivePlayback(this, { resetPreload: true });
          this.currentSong = toReactiveCurrentSong(targetSong);
          this.currentTime = savedTime;
          this.duration = snap?.duration || getExpectedDuration(targetSong) || Number(targetSong.duration) || 0;
          this.currentQuality = snap?.currentQuality || 'standard';
          this.isCurrentSongPreview = !!snap?.isCurrentSongPreview;
          this.clearError();
          this.syncTrayState();
          this.triggerPreload();
        }
      }

      if (this.rememberState) {
        schedulePersistQueue(this, 200);
        schedulePersistProgress(this, 200);
      }
      if (!options.silent && this.playlist.length > 0) {
        this.showToast(`已恢复原播放列表 (${this.playlist.length}首)`, { type: 'success' });
      }
      try { fmController?.onRestoreRegular?.({ navigateBack: options.navigateBack !== false }); } catch (e) {}
      return true;
    },

    addToPlaylist(song) {
      const prepared = prepareQueueSong(song);
      if (!prepared) return false;
      if (getFastSongIndex(this.playlist, prepared.hash) !== -1) return false;
      if (this.playlist.length >= this.maxPlaylistSize) return false;
      this.playlist.push(prepared);
      playlistKeyMap.set(prepared.hash, this.playlist.length - 1);
      if (this.isFmModePlaylist) this._syncFmBackupFlags();
      if (this.rememberState) schedulePersistQueue(this);
      return true;
    },

    addSongsToPlaylist(songs = [], options = {}) {
      const rawIncoming = Array.isArray(songs) ? songs : [];

      rebuildPlaylistKeyMap(this.playlist);
      const accepted = [];
      let skipped = 0;
      let dropped = 0;
      let validIncomingCount = 0;
      const localSeen = new Set();

      for (const rawSong of rawIncoming) {
        const prepared = prepareQueueSong(rawSong);
        if (!prepared) continue;
        validIncomingCount++;
        if (playlistKeyMap.has(prepared.hash) || localSeen.has(prepared.hash)) {
          skipped++;
          continue;
        }
        if (this.playlist.length + accepted.length >= this.maxPlaylistSize) {
          dropped++;
          continue;
        }
        localSeen.add(prepared.hash);
        accepted.push(prepared);
      }

      if (accepted.length > 0) {
        const startIdx = this.playlist.length;
        this.playlist.push(...accepted);
        for (let i = 0; i < accepted.length; i++) {
          playlistKeyMap.set(accepted[i].hash, startIdx + i);
        }
        if (this.isFmModePlaylist) {
          this._syncFmBackupFlags();
        } else if (!preloadState.hash || startIdx <= this.getCurrentSongIndex() + 1) {
          this.triggerPreload();
        }
        if (this.rememberState) schedulePersistQueue(this);
      }

      const full = this.playlist.length >= this.maxPlaylistSize;
      if (!options.silent) {
        if (accepted.length === 0 && dropped > 0) {
          this.showToast(`播放列表已达上限 (${this.maxPlaylistSize}首)，请先清理部分歌曲`, {
            type: 'warning',
            actionText: '打开列表',
            onAction: () => { this.isPlaylistVisible = true; }
          });
        } else if (accepted.length === 0 && skipped > 0) {
          this.showToast('所选歌曲已在播放列表中', { type: 'info' });
        } else if (dropped > 0) {
          const skippedText = skipped > 0 ? `（跳过 ${skipped} 首重复）` : '';
          this.showToast(`已添加 ${accepted.length} 首${skippedText}，达 ${this.maxPlaylistSize} 首上限剩余 ${dropped} 首未加入`, {
            type: 'warning',
            duration: 4500
          });
        } else if (accepted.length > 0) {
          const skippedText = skipped > 0 ? `，已跳过 ${skipped} 首重复` : '';
          this.showToast(`已添加 ${accepted.length} 首歌曲${skippedText}`, { type: 'success' });
        }
      }
      return { added: accepted.length, skipped, dropped, full, total: validIncomingCount };
    },

    playAllSongs(songs = [], options = {}) {
      const mode = PLAY_ALL_BEHAVIORS.includes(options.mode) ? options.mode : this.playAllBehavior;
      if (mode === 'prepend') {
        return this.prependPlaylistAndPlay(songs, { ...options, createHydrationSession: false });
      }
      return this.replacePlaylistAndPlay(songs, { ...options, createHydrationSession: false });
    },

    replacePlaylistAndPlay(songs = [], options = {}) {
      this.cancelPlayAllHydration();
      const rawIncoming = Array.isArray(songs) ? songs : [];
      const unique = [];
      const seen = new Set();
      let validCount = 0;

      for (const rawSong of rawIncoming) {
        const prepared = prepareQueueSong(rawSong);
        if (!prepared) continue;
        validCount++;
        if (seen.has(prepared.hash)) continue;
        seen.add(prepared.hash);
        unique.push(prepared);
      }

      if (unique.length === 0) {
        return { added: 0, skipped: validCount, dropped: 0, full: false, total: validCount, sessionId: null };
      }

      let hadPrevQueue = false;
      let prevCount = 0;
      if (this.playlist.length > 0) {
        hadPrevQueue = true;
        prevCount = this.playlist.length;
        this.saveUndoSnapshot('replace');
      }
      if (this.isFmModePlaylist) {
        this._exitFmModeSilent({ keepCurrentFmSong: false });
      }

      const accepted = unique.slice(0, this.maxPlaylistSize);
      const dropped = Math.max(0, unique.length - accepted.length);
      const skipped = Math.max(0, validCount - unique.length);
      const isFull = accepted.length >= this.maxPlaylistSize;
      const isHydrating = Boolean(options.createHydrationSession && options.hasMore !== false && !isFull);
      const expectedTotal = Math.max(0, Number(options.expectedTotal || 0));

      this.playlist = accepted;
      rebuildPlaylistKeyMap(this.playlist);

      const sessionId = isHydrating
        ? (options.sessionId || `play-all-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        : null;
      if (sessionId) {
        hydrationSeenSet = new Set(accepted.map(song => song.hash));
        this.playAllHydrationSession = {
          id: sessionId,
          mode: 'replace',
          sourceKey: options.sourceKey || '',
          insertIndex: accepted.length,
          expectedTotal,
          notifiedCapUpfront: expectedTotal > this.maxPlaylistSize,
          startedAt: Date.now()
        };
      }

      if (this.rememberState) schedulePersistQueue(this);
      const startIndex = Math.max(0, Math.min(options.startIndex || 0, accepted.length - 1));
      this.playSong(accepted[startIndex], null, 0, true, { silentQueueToast: true });

      if (!options.silent) {
        const canShowUndo = hadPrevQueue && prevCount > 1;
        const undoOpts = canShowUndo
          ? { actionText: '撤销', onAction: () => this.restoreUndoSnapshot() }
          : {};

        if (dropped > 0) {
          this.showToast(`歌单超出上限，已为您载入前 ${this.maxPlaylistSize} 首歌曲`, {
            type: 'warning',
            duration: 5000,
            ...(hadPrevQueue ? { actionText: '撤销', onAction: () => this.restoreUndoSnapshot() } : {})
          });
        } else if (isHydrating) {
          if (expectedTotal > this.maxPlaylistSize) {
            const msg = canShowUndo
              ? `已替换为新播放列表 (前 ${this.maxPlaylistSize} 首，已优先载入 ${accepted.length} 首，其余后台同步中)`
              : `开始播放，将载入前 ${this.maxPlaylistSize} 首歌曲 (已优先载入 ${accepted.length} 首，其余后台同步中)`;
            this.showToast(msg, { type: 'info', duration: 5000, ...undoOpts });
          } else if (expectedTotal > accepted.length) {
            const msg = canShowUndo
              ? `已替换为新播放列表 (共 ${expectedTotal} 首，已优先载入 ${accepted.length} 首，其余后台同步中)`
              : `开始播放 (共 ${expectedTotal} 首，已优先载入 ${accepted.length} 首，其余后台同步中)`;
            this.showToast(msg, { type: canShowUndo ? 'info' : 'success', duration: 5000, ...undoOpts });
          } else {
            const msg = canShowUndo
              ? `已替换为新播放列表 (已优先载入 ${accepted.length} 首，其余后台同步中)`
              : `开始播放，已优先载入 ${accepted.length} 首歌曲，其余后台同步中`;
            this.showToast(msg, { type: canShowUndo ? 'info' : 'success', duration: 5000, ...undoOpts });
          }
        } else if (canShowUndo) {
          this.showToast(`已替换为新播放列表 (${accepted.length}首)`, {
            type: 'info',
            duration: 5000,
            actionText: '撤销',
            onAction: () => this.restoreUndoSnapshot()
          });
        } else {
          const skippedText = skipped > 0 ? `，已跳过 ${skipped} 首重复` : '';
          this.showToast(`已载入 ${accepted.length} 首歌曲并开始播放${skippedText}`, { type: 'success' });
        }
      }

      return { added: accepted.length, skipped, dropped, full: isFull, total: validCount, sessionId };
    },

    prependPlaylistAndPlay(songs = [], options = {}) {
      this.cancelPlayAllHydration();
      const rawIncoming = Array.isArray(songs) ? songs : [];
      const unique = [];
      const seen = new Set();
      let validCount = 0;

      for (const rawSong of rawIncoming) {
        const prepared = prepareQueueSong(rawSong);
        if (!prepared) continue;
        validCount++;
        if (seen.has(prepared.hash)) continue;
        seen.add(prepared.hash);
        unique.push(prepared);
      }

      if (unique.length === 0) {
        return { added: 0, skipped: validCount, dropped: 0, full: false, total: validCount, sessionId: null };
      }

      const hadPrevQueue = this.playlist.length > 0;
      if (hadPrevQueue) {
        this.saveUndoSnapshot('prepend');
      }
      if (this.isFmModePlaylist) {
        this._exitFmModeSilent({ keepCurrentFmSong: false });
      }
      const baseQueue = this.playlist;

      const front = unique.slice(0, this.maxPlaylistSize);
      const dropped = Math.max(0, unique.length - front.length);
      const skipped = Math.max(0, validCount - unique.length);
      const frontKeys = new Set(front.map(song => song.hash));
      const remainingSlots = Math.max(0, this.maxPlaylistSize - front.length);
      const rest = remainingSlots > 0
        ? baseQueue.filter(song => song && song.hash && !frontKeys.has(normalizeSongKey(song))).slice(0, remainingSlots)
        : [];

      this.playlist = [...front, ...rest];
      rebuildPlaylistKeyMap(this.playlist);

      const isFrontFull = front.length >= this.maxPlaylistSize;
      const isHydrating = Boolean(options.createHydrationSession && options.hasMore !== false && !isFrontFull);
      const expectedTotal = Math.max(0, Number(options.expectedTotal || 0));
      const sessionId = isHydrating
        ? (options.sessionId || `play-all-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        : null;
      if (sessionId) {
        hydrationSeenSet = new Set(frontKeys);
        this.playAllHydrationSession = {
          id: sessionId,
          mode: 'prepend',
          sourceKey: options.sourceKey || '',
          insertIndex: front.length,
          expectedTotal,
          notifiedCapUpfront: expectedTotal > this.maxPlaylistSize,
          startedAt: Date.now()
        };
      }

      if (this.rememberState) schedulePersistQueue(this);
      const startIndex = Math.max(0, Math.min(options.startIndex || 0, front.length - 1));
      this.playSong(front[startIndex], null, 0, true, { silentQueueToast: true });

      if (!options.silent) {
        const undoOpts = hadPrevQueue
          ? { actionText: '撤销', onAction: () => this.restoreUndoSnapshot() }
          : {};
        if (dropped > 0) {
          this.showToast(`歌单超出上限，已合并前 ${this.maxPlaylistSize} 首歌曲到队首`, {
            type: 'warning',
            duration: 5000,
            ...undoOpts
          });
        } else if (isHydrating) {
          if (expectedTotal > this.maxPlaylistSize) {
            this.showToast(`已合并到队首 (前 ${this.maxPlaylistSize} 首，已优先载入 ${front.length} 首，其余后台同步中)`, {
              type: 'info',
              duration: 5000,
              ...undoOpts
            });
          } else if (expectedTotal > front.length) {
            this.showToast(`已合并到队首 (共 ${expectedTotal} 首，已优先载入 ${front.length} 首，其余后台同步中)`, {
              type: 'success',
              duration: 5000,
              ...undoOpts
            });
          } else {
            this.showToast(`已合并到队首，已优先载入 ${front.length} 首歌曲，其余后台同步中`, {
              type: 'success',
              duration: 5000,
              ...undoOpts
            });
          }
        } else {
          const skippedText = skipped > 0 ? `，已跳过 ${skipped} 首重复` : '';
          this.showToast(`已合并到队首，优先播放 ${front.length} 首歌曲${skippedText}`, {
            type: 'success',
            duration: 4500,
            ...undoOpts
          });
        }
      }
      return { added: front.length, skipped, dropped, full: isFrontFull, total: validCount, sessionId };
    },

    startPlayAllHydrationSession(songs = [], options = {}) {
      const mode = PLAY_ALL_BEHAVIORS.includes(options.mode) ? options.mode : this.playAllBehavior;
      if (mode === 'prepend') {
        return this.prependPlaylistAndPlay(songs, { ...options, createHydrationSession: true });
      }
      return this.replacePlaylistAndPlay(songs, { ...options, createHydrationSession: true });
    },

    isPlayAllHydrationActive(sessionId) {
      return !!sessionId && this.playAllHydrationSession?.id === sessionId;
    },

    cancelPlayAllHydration(sessionId = null) {
      if (!sessionId || this.playAllHydrationSession?.id === sessionId) {
        this.playAllHydrationSession = null;
        hydrationSeenSet.clear();
      }
    },

    finishPlayAllHydration(sessionId, { notifyDifference = true } = {}) {
      const session = this.playAllHydrationSession;
      if (!session || session.id !== sessionId) return;
      const expectedTotal = session.expectedTotal || 0;
      const actualCount = this.playlist.length;
      const notifiedCap = !!session.notifiedCapUpfront;
      this.cancelPlayAllHydration(sessionId);

      if (notifyDifference && expectedTotal > 0 && !notifiedCap) {
        const diff = expectedTotal - actualCount;
        if (diff > 0 && actualCount > 0) {
          this.showToast(`歌单已同步完成，共 ${actualCount} 首歌曲（已自动跳过 ${diff} 首重复或失效歌曲）`, {
            type: 'info',
            duration: 4500
          });
        }
      }
    },

    extendPlayAllHydration(sessionId, songs = []) {
      const session = this.playAllHydrationSession;
      if (!session || session.id !== sessionId) {
        return { added: 0, skipped: 0, dropped: 0, full: false, total: 0, canceled: true };
      }

      const rawIncoming = Array.isArray(songs) ? songs : [];
      let insertIndex = Math.max(0, Math.min(session.insertIndex || 0, this.playlist.length));
      const remainingSessionSlots = Math.max(0, this.maxPlaylistSize - insertIndex);
      if (remainingSessionSlots <= 0) {
        const alreadyNotified = !!session.notifiedCapUpfront;
        this.cancelPlayAllHydration(sessionId);
        if (!alreadyNotified) {
          this.showToast(`歌单较长，已达到播放列表上限 (${this.maxPlaylistSize}首)`, { type: 'warning', duration: 4500 });
        }
        return { added: 0, skipped: 0, dropped: rawIncoming.length, full: true, total: rawIncoming.length, canceled: true };
      }

      const unique = [];
      let validCount = 0;
      for (const rawSong of rawIncoming) {
        const prepared = prepareQueueSong(rawSong);
        if (!prepared) continue;
        validCount++;
        if (hydrationSeenSet.has(prepared.hash)) continue;
        hydrationSeenSet.add(prepared.hash);
        unique.push(prepared);
      }

      if (unique.length === 0) {
        return { added: 0, skipped: validCount, dropped: 0, full: false, total: validCount };
      }

      const accepted = unique.slice(0, remainingSessionSlots);
      const dropped = Math.max(0, unique.length - accepted.length);
      const skipped = Math.max(0, validCount - unique.length);
      const acceptedKeys = new Set(accepted.map(s => s.hash));

      const before = [];
      const after = [];
      for (let i = 0; i < this.playlist.length; i++) {
        const item = this.playlist[i];
        const key = normalizeSongKey(item);
        if (!key || acceptedKeys.has(key)) continue;
        if (i < insertIndex) before.push(item);
        else after.push(item);
      }

      const nextPlaylist = [...before, ...accepted, ...after].slice(0, this.maxPlaylistSize);
      const nextInsertIndex = Math.min(before.length + accepted.length, this.maxPlaylistSize);
      this.playlist = nextPlaylist;
      rebuildPlaylistKeyMap(this.playlist);

      const reachedLimit = nextInsertIndex >= this.maxPlaylistSize;
      if (reachedLimit) {
        const alreadyNotified = !!session.notifiedCapUpfront;
        this.cancelPlayAllHydration(sessionId);
        if (dropped > 0 && !alreadyNotified) {
          this.showToast(`歌单较长，已为您载入前 ${this.maxPlaylistSize} 首歌曲`, { type: 'warning', duration: 4500 });
        }
      } else {
        this.playAllHydrationSession = {
          ...session,
          insertIndex: nextInsertIndex
        };
      }

      const curIdx = this.getCurrentSongIndex();
      if (!this.isFmModePlaylist && !preloadState.hash && this.playlist.length > curIdx + 1) {
        this.triggerPreload();
      }
      if (this.rememberState) schedulePersistQueue(this);
      return { added: accepted.length, skipped, dropped, full: reachedLimit, canceled: reachedLimit, total: validCount };
    },

    appendToPlaylist(song, options = {}) {
      const prepared = prepareQueueSong(song);
      if (!prepared) return false;
      const exists = getFastSongIndex(this.playlist, prepared.hash) !== -1;
      if (exists) {
        if (!options.silent) {
          const isPlayingNow = !this.isFmModePlaylist && this.currentSong && normalizeSongKey(this.currentSong) === prepared.hash;
          this.showToast(isPlayingNow ? `「${prepared.name}」正在播放中` : `「${prepared.name}」已在播放列表中`, {
            type: 'info',
            actionText: isPlayingNow ? '' : '移至下一首',
            onAction: isPlayingNow ? null : () => this.insertNext(prepared)
          });
        }
        return false;
      }
      if (this.playlist.length >= this.maxPlaylistSize) {
        if (!options.silent) {
          this.showToast(`播放列表已达上限 (${this.maxPlaylistSize}首)，请先清理部分歌曲`, {
            type: 'warning',
            actionText: '打开列表',
            onAction: () => { this.isPlaylistVisible = true; }
          });
        }
        return false;
      }
      this.playlist.push(prepared);
      playlistKeyMap.set(prepared.hash, this.playlist.length - 1);
      if (this.isFmModePlaylist) {
        this._syncFmBackupFlags();
      } else if (!preloadState.hash || this.playlist.length <= 2) {
        this.triggerPreload();
      }
      if (!options.silent) this.showToast('已添加到播放列表', { type: 'success' });
      if (this.rememberState) schedulePersistQueue(this);
      return true;
    },

    insertNext(song) {
      const prepared = prepareQueueSong(song);
      if (!prepared) return false;
      if (this.isFmModePlaylist) {
        this._exitFmModeSilent({ keepCurrentFmSong: true });
      }
      if (this.currentSong && normalizeSongKey(this.currentSong) === prepared.hash) {
        this.showToast('当前歌曲正在播放', { type: 'info' });
        return false;
      }

      const existingIndex = getFastSongIndex(this.playlist, prepared.hash);
      let evicted = false;
      if (existingIndex !== -1) {
        this.playlist.splice(existingIndex, 1);
      } else if (this.playlist.length >= this.maxPlaylistSize) {
        const curIdxBefore = getFastSongIndex(this.playlist, this.currentSong);
        if (curIdxBefore > 0) {
          this.playlist.shift();
        } else {
          this.playlist.pop();
        }
        evicted = true;
      }

      let currentIndex = this.playlist.findIndex(s => normalizeSongKey(s) === normalizeSongKey(this.currentSong));
      if (this.currentSong && currentIndex === -1) {
        const curPrepared = prepareQueueSong(this.currentSong) || this.currentSong;
        if (this.playlist.length >= this.maxPlaylistSize) {
          this.playlist.pop();
          evicted = true;
        }
        this.playlist.unshift(curPrepared);
        currentIndex = 0;
      }

      const insertIndex = currentIndex === -1 ? 0 : currentIndex + 1;
      this.playlist.splice(insertIndex, 0, prepared);
      rebuildPlaylistKeyMap(this.playlist);
      this.showToast(
        evicted ? '已设为下一首播放（队列已满，自动移除 1 首边缘歌曲）' : '已添加到下一首播放',
        { type: evicted ? 'info' : 'success' }
      );
      this.triggerPreload();
      if (this.rememberState) schedulePersistQueue(this);
      return true;
    },

    removeSongsByHashes(hashes = [], options = {}) {
      const keySet = new Set((Array.isArray(hashes) ? hashes : []).map(normalizeSongKey).filter(Boolean));
      if (keySet.size === 0 || this.playlist.length === 0) return 0;

      if (options.withUndo !== false) {
        this.saveUndoSnapshot('batch-remove');
      }

      const currentKey = !this.isFmModePlaylist ? normalizeSongKey(this.currentSong) : '';
      const currentIdxBefore = !this.isFmModePlaylist ? this.getCurrentSongIndex() : -1;
      const removingCurrent = Boolean(currentKey && keySet.has(currentKey));

      let nextFallbackIndex = 0;
      if (removingCurrent && currentIdxBefore !== -1) {
        let removedBeforeCurrent = 0;
        for (let i = 0; i < currentIdxBefore; i++) {
          if (keySet.has(normalizeSongKey(this.playlist[i]))) removedBeforeCurrent++;
        }
        nextFallbackIndex = Math.max(0, currentIdxBefore - removedBeforeCurrent);
      }

      const prevLen = this.playlist.length;
      this.playlist = this.playlist.filter(s => !keySet.has(normalizeSongKey(s)));
      const removedCount = prevLen - this.playlist.length;
      if (removedCount === 0) return 0;

      rebuildPlaylistKeyMap(this.playlist);
      if (this.isFmModePlaylist) this._syncFmBackupFlags();
      if (this.rememberState) schedulePersistQueue(this);

      if (removingCurrent) {
        abortActivePlayback(this);
        this.isCurrentSongPreview = false;
        this.currentSong = null;
        this.currentQuality = 'standard';
        this.clearError();
        if (this.playlist.length > 0) {
          const targetIdx = Math.min(nextFallbackIndex, this.playlist.length - 1);
          this.playSong(this.playlist[targetIdx], null, 0, true, { silentQueueToast: true });
        } else {
          this.currentTime = 0;
          this.duration = 0;
          this.syncTrayState();
        }
      } else if (!this.isFmModePlaylist) {
        this.triggerPreload();
      }

      if (!options.silent) {
        this.showToast(`已移除 ${removedCount} 首歌曲`, {
          type: 'info',
          duration: 5000,
          actionText: options.withUndo !== false ? '撤销' : '',
          onAction: options.withUndo !== false ? () => this.restoreUndoSnapshot() : null
        });
      }
      return removedCount;
    },

    clearPlayedSongs() {
      const curIdx = this.getCurrentSongIndex();
      if (curIdx <= 0) {
        this.showToast('当前歌曲前没有可清理的已播歌曲', { type: 'info' });
        return 0;
      }
      this.saveUndoSnapshot('clear-played');
      const removedCount = curIdx;
      this.playlist = this.playlist.slice(curIdx);
      if (this.playAllHydrationSession) {
        const nextIns = Math.max(0, (this.playAllHydrationSession.insertIndex || 0) - removedCount);
        this.playAllHydrationSession = { ...this.playAllHydrationSession, insertIndex: nextIns };
      }
      rebuildPlaylistKeyMap(this.playlist);
      if (this.rememberState) schedulePersistQueue(this);
      this.showToast(`已清理 ${removedCount} 首已播歌曲`, {
        type: 'success',
        duration: 5000,
        actionText: '撤销',
        onAction: () => this.restoreUndoSnapshot()
      });
      return removedCount;
    },

    async fetchSongQualityInfo(song, options = {}) {
      if (!song) return;
      if (isExternalImportSong(song)) {
        song.qualities = extractQualities(song);
        return;
      }
      if (!song.qualities) song.qualities = extractQualities(song);
      if (song._qualityInfoFetched && !options.force) return;

      try {
        let info = null;
        if (song.album_audio_id && String(song.album_audio_id) !== '0') {
          const krmRes = await request.get('/krm/audio', {
            params: { album_audio_id: song.album_audio_id, fields: 'audio_info', timestamp: Date.now() },
            silent: true,
            timeout: 8000,
            maxRetries: 1
          });
          info = krmRes?.data?.audio_info || krmRes?.data?.data?.audio_info || krmRes?.data;
        }
        if (!info && song.hash) {
          const audioRes = await request.get('/audio', {
            params: { hash: song.hash, timestamp: Date.now() },
            silent: true,
            timeout: 8000,
            maxRetries: 1
          });
          info = audioRes?.data?.audio_info || audioRes?.data?.data?.audio_info || audioRes?.data || audioRes;
        }

        if (info) {
          song._qualityInfoFetched = true;
          if (!song.qualities) song.qualities = {};
          let addedNewQuality = false;
          const assignIfMissing = (key, val) => {
            if (isValidKugouHash(val) && !isValidKugouHash(song.qualities[key])) {
              song.qualities[key] = val;
              addedNewQuality = true;
            }
          };
          assignIfMissing('hq', info.hash_320);
          assignIfMissing('sq', info.hash_flac);
          assignIfMissing('high', info.hash_high);
          assignIfMissing('viper_clear', info.hash_viper_clear);
          assignIfMissing('viper_atmos', info.hash_viper_atmos);

          if (options.force || addedNewQuality) {
            for (const qKey of Object.keys(song.qualities)) {
              const cacheKey = `${song.hash}_${qKey}`;
              if (urlCache.has(cacheKey)) urlCache.delete(cacheKey);
            }
          }
        }
      } catch (e) {}
    },

    async prepareAutoQuality(song, targetQuality = null) {
      if (!song || targetQuality) return;
      if (isExternalImportSong(song)) {
        song.qualities = extractQualities(song);
        return;
      }
      if (!song.qualities) song.qualities = extractQualities(song);

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      const isVipSong = song.is_vip || song.is_paid;
      const hasFullAccess = isVipUser || !isVipSong;
      if (!hasFullAccess) return;

      const cacheQ = hasFullAccess ? 'best' : 'hq';
      if (getCachedUrl(song.hash, cacheQ)) return;
      // 带有 album_audio_id 的歌曲直接走 /song/url/new 一次返回全音质，无需前置串行请求 /krm/audio
      if (song.album_audio_id && String(song.album_audio_id) !== '0') return;

      await this.fetchSongQualityInfo(song);
    },

    getBestAvailableQuality(song) {
      if (!song || !song.qualities) return 'standard';
      if (isExternalImportSong(song)) {
        for (const q of QUALITY_CONFIG) {
          if (song.qualities[q.key]) return q.key;
        }
        return 'standard';
      }

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      const isVipSong = song.is_vip || song.is_paid;
      const hasFullAccess = isVipUser || !isVipSong;

      for (const q of QUALITY_CONFIG) {
        if (!song.qualities[q.key]) continue;
        const isVipQuality = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(q.key);
        if (isVipQuality && !hasFullAccess) continue;
        return q.key;
      }
      return 'standard';
    },
    
    // ✨ 新增：开关桌面歌词
    toggleDesktopLyric() {
      this.isDesktopLyricVisible = !this.isDesktopLyricVisible;
      if (window.lyricAPI) window.lyricAPI.toggle();
      this.syncTrayState();
    },

    togglePlayMode() {
      const currentIdx = PLAY_MODES.indexOf(this.playMode);
      this.setPlayMode(PLAY_MODES[(currentIdx + 1) % PLAY_MODES.length]);
    },

    setPlayMode(mode) {
      if (!PLAY_MODES.includes(mode)) return;
      this.playMode = mode;
      localStorage.setItem(PLAY_MODE_KEY, mode);
      this.triggerPreload();
      this.syncTrayState();
    },

    async resolveSongUrl(songInfo, targetQuality = null) {
      if (isNeteaseImportSong(songInfo)) {
        songInfo.qualities = extractQualities(songInfo);
        const cacheQ = targetQuality && songInfo.qualities?.[targetQuality]
          ? targetQuality
          : this.getBestAvailableQuality(songInfo);
        const dedupeKey = `${songInfo.hash}_${cacheQ}_${NETEASE_IMPORT_SOURCE}`;

        if (pendingResolves.has(dedupeKey)) {
          return pendingResolves.get(dedupeKey);
        }

        const promise = this._resolveNeteaseImportSongUrl(songInfo, cacheQ);
        pendingResolves.set(dedupeKey, promise);
        try {
          return await promise;
        } finally {
          pendingResolves.delete(dedupeKey);
        }
      }

      if (isQQImportSong(songInfo)) {
        songInfo.qualities = extractQualities(songInfo);
        const cacheQ = targetQuality && songInfo.qualities?.[targetQuality]
          ? targetQuality
          : this.getBestAvailableQuality(songInfo);
        const dedupeKey = `${songInfo.hash}_${cacheQ}_${QQ_IMPORT_SOURCE}`;

        if (pendingResolves.has(dedupeKey)) {
          return pendingResolves.get(dedupeKey);
        }

        const promise = this._resolveQQImportSongUrl(songInfo, cacheQ);
        pendingResolves.set(dedupeKey, promise);
        try {
          return await promise;
        } finally {
          pendingResolves.delete(dedupeKey);
        }
      }

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      const isVipSong = songInfo.is_vip || songInfo.is_paid;
      const hasFullAccess = isVipUser || !isVipSong;

      if (!songInfo.qualities) songInfo.qualities = extractQualities(songInfo);

      const cacheQ = targetQuality || (hasFullAccess ? 'best' : 'hq');
      const dedupeKey = `${songInfo.hash}_${cacheQ}_${hasFullAccess}`;

      if (pendingResolves.has(dedupeKey)) {
        return pendingResolves.get(dedupeKey);
      }

      const promise = this._doResolveSongUrl(songInfo, targetQuality, cacheQ, hasFullAccess, isVipUser);
      pendingResolves.set(dedupeKey, promise);
      try {
        return await promise;
      } finally {
        pendingResolves.delete(dedupeKey);
      }
    },

    async _resolveNeteaseImportSongUrl(songInfo, quality) {
      const cached = getCachedUrl(songInfo.hash, quality);
      if (cached) return cached;

      try {
        const res = await request.post('/source/resolve', {
          song: songInfo,
          quality,
          subDir: 'Netease',
          platform: 'wy'
        }, {
          silent: true,
          timeout: 10000,
          maxRetries: 0,
          headers: { 'x-apicache-bypass': '1' }
        });

        if (res?.url && typeof res.url === 'string' && res.url.startsWith('http')) {
          const finalResult = {
            url: res.url,
            quality: quality === 'best' ? (res.quality || 'standard') : quality,
            isPreview: false,
            sourceInfo: res.source || null
          };
          setCachedUrl(songInfo.hash, quality, finalResult);
          return finalResult;
        }
      } catch (e) {}

      return { url: null, quality: 'standard', isPreview: false };
    },

    async _resolveQQImportSongUrl(songInfo, quality) {
      const cached = getCachedUrl(songInfo.hash, quality);
      if (cached) return cached;

      try {
        const res = await request.post('/source/resolve', {
          song: songInfo,
          quality,
          subDir: 'QQ',
          platform: 'tx'
        }, {
          silent: true,
          timeout: 10000,
          maxRetries: 0,
          headers: { 'x-apicache-bypass': '1' }
        });

        if (res?.url && typeof res.url === 'string' && res.url.startsWith('http')) {
          const finalResult = {
            url: res.url,
            quality: quality === 'best' ? (res.quality || 'standard') : quality,
            isPreview: false,
            sourceInfo: res.source || null
          };
          setCachedUrl(songInfo.hash, quality, finalResult);
          return finalResult;
        }
      } catch (e) {}

      return { url: null, quality: 'standard', isPreview: false };
    },

    async _doResolveSongUrl(songInfo, targetQuality, cacheQ, hasFullAccess, isVipUser, authRefreshAttempted = false) {
      const cached = getCachedUrl(songInfo.hash, cacheQ);
      
      if (cached) {
          if (hasFullAccess && cached.isPreview) {
              urlCache.delete(`${songInfo.hash}_${cacheQ}`);
          } else {
              return cached;
          }
      }

      const isVipSong = songInfo.is_vip || songInfo.is_paid;
      const isRestrictedSong = !hasFullAccess && isVipSong;

      if (!this.hasDfid) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await request.get('/register/dev', { silent: true, timeout: 6000, maxRetries: 1 });
            this.hasDfid = true;
            break;
          } catch (e) {
            if (attempt < 1) await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      let finalResult = { url: null, quality: 'standard', isPreview: false };
      const cleanFallbackHash = [songInfo.qualities?.standard, songInfo.hash, songInfo.FileHash]
        .find(isValidKugouHash) || songInfo.hash || songInfo.FileHash || '';

      if (isRestrictedSong) {
        try {
           const reqObject = { hash: cleanFallbackHash, free_part: 1, quality: '128' };
           if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
           if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;

           const res = await request.get('/song/url', { params: reqObject, silent: true, timeout: 8000, maxRetries: 1 });
           const targetObj = res?.data ? res.data : res;
           if (targetObj?.url && targetObj.url.length > 0) {
             const previewUrl = Array.isArray(targetObj.url) ? targetObj.url[0] : targetObj.url;
             finalResult = { url: previewUrl, quality: 'standard', isPreview: true };
           }
        } catch(e) {}

        if (finalResult.url) setCachedUrl(songInfo.hash, cacheQ, finalResult);
        return finalResult;
      }

      if (hasFullAccess && songInfo.album_audio_id && String(songInfo.album_audio_id) !== '0') {
        try {
          const newRes = await request.get('/song/url/new', {
            params: {
              hash: cleanFallbackHash,
              album_audio_id: songInfo.album_audio_id,
              album_id: songInfo.album_id || 0,
              timestamp: Date.now()
            },
            silent: true,
            timeout: 8000,
            maxRetries: 1
          });

          const urlData = newRes?.data?.url || newRes?.data || newRes;
          const urlMap = {};

          const extractUrl = (val) => {
            if (!val) return null;
            if (typeof val === 'string' && val.startsWith('http')) return val;
            if (Array.isArray(val) && val.length > 0) {
              const first = val[0];
              if (typeof first === 'string' && first.startsWith('http')) return first;
            }
            return null;
          };

          if (Array.isArray(urlData)) {
            for (const item of urlData) {
              if (!item?.quality) continue;
              const url = extractUrl(item.url) || extractUrl(item.backupUrl);
              if (url) urlMap[item.quality] = url;
            }
          } else if (typeof urlData === 'object' && urlData !== null) {
            for (const [qKey, val] of Object.entries(urlData)) {
              const url = extractUrl(val);
              if (url) urlMap[qKey] = url;
            }
          }

          const qualityParamMap = {
            '128': 'standard', '320': 'hq', 'flac': 'sq',
            'high': 'high', 'viper_atmos': 'viper_atmos',
            'viper_clear': 'viper_clear', 'super': 'high'
          };

          for (const q of QUALITY_CONFIG) {
            const paramKey = Object.entries(qualityParamMap).find(([, v]) => v === q.key)?.[0];
            if (!paramKey || !urlMap[paramKey]) continue;
            const isVipQ = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(q.key);
            if (isVipQ && !isVipUser) continue;

            if (!songInfo.qualities) songInfo.qualities = {};
            if (!isValidKugouHash(songInfo.qualities[q.key]) && isValidKugouHash(cleanFallbackHash)) {
              songInfo.qualities[q.key] = cleanFallbackHash;
            }
            setCachedUrl(songInfo.hash, q.key, { url: urlMap[paramKey], quality: q.key, isPreview: false });
          }

          const startIdx = targetQuality ? Math.max(0, QUALITY_CONFIG.findIndex(q => q.key === targetQuality)) : 0;
          for (const q of QUALITY_CONFIG.slice(startIdx)) {
            const paramKey = Object.entries(qualityParamMap).find(([, v]) => v === q.key)?.[0];
            if (!paramKey || !urlMap[paramKey]) continue;
            const isVipQ = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(q.key);
            if (isVipQ && !isVipUser) continue;

            finalResult = { url: urlMap[paramKey], quality: q.key, isPreview: false };
            break;
          }

          if (finalResult.url) {
            setCachedUrl(songInfo.hash, cacheQ, finalResult);
            return finalResult;
          }
        } catch (e) {}
      }

      if (hasFullAccess && !songInfo._qualityInfoFetched) {
        await this.fetchSongQualityInfo(songInfo);
      }

      let tryQueue = [...QUALITY_CONFIG];
      if (targetQuality) {
        const targetIdx = tryQueue.findIndex(q => q.key === targetQuality);
        if (targetIdx !== -1) tryQueue = tryQueue.slice(targetIdx);
      }
      if (!isVipUser) {
        const vipQualities = ['viper_atmos', 'viper_clear', 'high', 'sq'];
        tryQueue = tryQueue.filter(q => !vipQualities.includes(q.key));
      }

      {
          for (const qObj of tryQueue) {
            const cachedPerQ = getCachedUrl(songInfo.hash, qObj.key);
            if (cachedPerQ && !cachedPerQ.isPreview && cachedPerQ.url) {
              finalResult = cachedPerQ;
              break;
            }
            const rawCandidateHash = songInfo.qualities?.[qObj.key];
            const hashToTry = isValidKugouHash(rawCandidateHash) ? rawCandidateHash : cleanFallbackHash;
            if (!hashToTry) continue;

            try {
              const reqObject = { hash: hashToTry, quality: qObj.param };
              if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
              if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;
              
              const res = await request.get('/song/url', { params: reqObject, silent: true, timeout: 8000, maxRetries: 1 });
              const targetObj = res?.data ? res.data : res;
              
              let url = null;
              if (targetObj?.url && targetObj.url.length > 0) {
                url = Array.isArray(targetObj.url) ? targetObj.url[0] : targetObj.url;
              } else if (targetObj?.backupUrl && targetObj.backupUrl.length > 0) {
                url = Array.isArray(targetObj.backupUrl) ? targetObj.backupUrl[0] : targetObj.backupUrl;
              }
              
              if (url && typeof url === 'string' && url.startsWith('http')) {
                finalResult = { url, quality: qObj.key, isPreview: false };
                setCachedUrl(songInfo.hash, qObj.key, finalResult);
                break; 
              }
            } catch (e) { continue; }
          }
      }

      if (!finalResult.url && hasFullAccess && isVipSong && isVipUser && !authRefreshAttempted) {
        const userStore = useUserStore();
        const refreshed = await userStore.refreshAuthTokens({ force: true });
        if (refreshed) {
          clearSongUrlCache(songInfo.hash);
          return this._doResolveSongUrl(songInfo, targetQuality, cacheQ, hasFullAccess, isVipUser, true);
        }
      }

      if (!finalResult.url) {
        try {
           const reqObject = { hash: cleanFallbackHash, free_part: 1, quality: '128' };
           if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
           if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;
           
           const res = await request.get('/song/url', { params: reqObject, silent: true, timeout: 8000, maxRetries: 1 });
           const targetObj = res?.data ? res.data : res;
           if (targetObj?.url && targetObj.url.length > 0) {
             let previewUrl = Array.isArray(targetObj.url) ? targetObj.url[0] : targetObj.url;
             finalResult = { url: previewUrl, quality: 'standard', isPreview: true };
           }
        } catch(e) {}
      }

      if (finalResult.url) setCachedUrl(songInfo.hash, cacheQ, finalResult);

      return finalResult;
    },

    canTryFullPlayback(song) {
      if (!song) return false;
      if (isExternalImportSong(song)) return true;
      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      if (isVipUser) return true;
      if (!(song.is_vip || song.is_paid)) return true;
      const qualities = song.qualities || extractQualities(song);
      return !!(qualities.standard || qualities.hq || song.hash);
    },

    calculateNextSong(isAuto = true) {
      if (this.isFmModePlaylist) {
        const fmNext = fmController?.peekNextSong?.();
        return fmNext ? (prepareQueueSong(fmNext) || fmNext) : null;
      }
      if (this.playlist.length <= 1) return null;
      const nextIndex = this.getCurrentSongIndex();
      if (nextIndex === -1) return null;

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;

      if (this.playMode !== 'random') {
        for (let offset = 1; offset < this.playlist.length; offset++) {
          const idx = (nextIndex + offset) % this.playlist.length;
          const candidate = this.playlist[idx];
          const isVipSong = candidate.is_vip || candidate.is_paid;
          if (!isVipSong || isVipUser || !isAuto || this.canTryFullPlayback(candidate)) {
            return candidate;
          }
        }
        return null;
      }

      const playableIndices = [];
      for (let i = 0; i < this.playlist.length; i++) {
        if (i === nextIndex) continue;
        const candidate = this.playlist[i];
        const isVipSong = candidate.is_vip || candidate.is_paid;
        if (!isVipSong || isVipUser || !isAuto || this.canTryFullPlayback(candidate)) playableIndices.push(i);
      }

      if (playableIndices.length === 0) return null;
      const rand = playableIndices[Math.floor(Math.random() * playableIndices.length)];
      return this.playlist[rand];
    },

    async triggerPreload() {
      const nextSong = this.calculateNextSong();
      if (!nextSong || preloadState.hash === nextSong.hash) return;
      if (isExternalImportSong(nextSong)) {
        resetPreloadAudio();
        return;
      }

      try {
        if (!nextSong.qualities) nextSong.qualities = extractQualities(nextSong);
        await this.prepareAutoQuality(nextSong, null);
        const res = await this.resolveSongUrl(nextSong, null);
        if (res && res.url) {
          setAudioSource(preloadAudio, res.url, shouldUseAudioProxy(this), nextSong.hash);
          preloadAudio.load(); 
          
          preloadState = {
             hash: nextSong.hash,
             quality: res.quality,
             isPreview: res.isPreview,
             url: res.url
          };
        }
      } catch (e) {
        preloadState.hash = null;
      }
    },

    async playSong(rawSongInfo, targetQuality = null, maintainTime = 0, autoPlay = true, options = {}) {
      if (!rawSongInfo) return;
      const isFmTrack = !!options.isFmTrack;
      const silentQueueToast = !!options.silentQueueToast;
      const songInfo = prepareQueueSong(rawSongInfo) || rawSongInfo;
      if (this._errorSkipTimer) { clearTimeout(this._errorSkipTimer); this._errorSkipTimer = null; }
      if (this._vipActionTimer) { clearTimeout(this._vipActionTimer); this._vipActionTimer = null; }
      if (this._playWatchdogTimer) { clearTimeout(this._playWatchdogTimer); this._playWatchdogTimer = null; }
      if (this._playbackProgressTimer) { clearTimeout(this._playbackProgressTimer); this._playbackProgressTimer = null; }

      const thisPlayVersion = ++playVersion;
      this.isLoading = true;
      this.isError = false;        
      this.errorMessage = '';

      const previousSong = this.currentSong;
      const previousPlaybackState = {
        currentQuality: this.currentQuality,
        currentTime: this.currentTime,
        duration: this.duration,
        isCurrentSongPreview: this.isCurrentSongPreview,
        wasPlaying: this.isPlaying
      };
      const isSongChange = !previousSong || normalizeSongKey(previousSong) !== normalizeSongKey(songInfo);

      if (!isFmTrack && this.isFmModePlaylist) {
        this._exitFmModeSilent({ keepCurrentFmSong: false });
      }

      if (this.peakMode && isSongChange) {
        if (!isFmTrack) {
          this.peakMode = false;
          this.peakStartOffset = 0;
          this.peakDuration = 30;
        }
      }

      if (isSongChange && previousSong && previousSong.hash && !this.isFmModePlaylist && !isFmTrack) {
        if (!Array.isArray(this.playbackHistory)) this.playbackHistory = [];
        const prevPrepared = prepareQueueSong(previousSong) || previousSong;
        this.playbackHistory.push(prevPrepared);
        if (this.playbackHistory.length > 50) this.playbackHistory.shift();
      }

      if (maintainTime === 0 || isSongChange) {
        this.hasReportedCurrentSong = false;
      }

      let queueMutated = false;
      let evictedEdgeSong = false;
      if (!isFmTrack) {
        const existingIdx = getFastSongIndex(this.playlist, songInfo);
        if (existingIdx === -1) {
          if (this.playlist.length >= this.maxPlaylistSize) {
            const curIdx = this.getCurrentSongIndex();
            if (curIdx > 0) {
              this.playlist.shift();
            } else {
              this.playlist.pop();
            }
            evictedEdgeSong = true;
          }
          this.playlist.push(songInfo);
          rebuildPlaylistKeyMap(this.playlist);
          queueMutated = true;
          if (!silentQueueToast) {
            if (evictedEdgeSong) {
              this.showToast(`队列已满 (${this.maxPlaylistSize}首)，已淘汰 1 首边缘歌曲并开始播放`, { type: 'info' });
            } else {
              this.showToast('已加入播放列表并开始播放', { type: 'success' });
            }
          }
        }
      }

      if (isExternalImportSong(songInfo)) {
        songInfo.qualities = extractQualities(songInfo);
      } else if (!songInfo.qualities) {
        songInfo.qualities = extractQualities(songInfo);
      }

      const reactiveSong = toReactiveCurrentSong(songInfo);
      const userStore = useUserStore();
      const autoTargetQuality = targetQuality;

      // 1. 优先命中预加载实例：0ms 瞬切音频流与歌曲元数据
      if (!isExternalImportSong(songInfo) && songInfo.hash === preloadState.hash && hasLoadedAudioSource(preloadAudio) && (!autoTargetQuality || preloadState.quality === autoTargetQuality) && maintainTime === 0) {
          safePauseAudio(activeAudio);
          activeAudio.currentTime = 0;
          
          const tempAudio = activeAudio;
          activeAudio = preloadAudio;
          preloadAudio = tempAudio;
          activeAudio._songHash = songInfo.hash;

          this.currentSong = reactiveSong;
          this.currentQuality = preloadState.quality;
          this.isCurrentSongPreview = preloadState.isPreview;
          this.currentTime = 0;

          if (activeAudio.duration && isFinite(activeAudio.duration)) {
            if (this.isCurrentSongPreview && activeAudio.duration > 60) {
              this.duration = 60;
            } else {
              this.duration = activeAudio.duration;
            }
          } else {
            this.duration = getExpectedDuration(songInfo) || Number(songInfo.duration) || 0;
          }

          if (this.isCurrentSongPreview) this.showToast(getPreviewToastMessage(userStore));

          if (autoPlay) {
             const playPromise = safePlayAudio(activeAudio);
             if (playPromise !== undefined) {
                 playPromise.catch(() => {
                   if (thisPlayVersion !== playVersion) return;
                   this.isPlaying = false;
                   this.syncTrayState();
                 });
             }
             this.isPlaying = true;
          } else {
             this.isPlaying = false;
          }
          
          this.clearError();
          this.isLoading = false;
          this.consecutiveErrorCount = 0;

          preloadState.hash = null;
          this.triggerPreload();
          this.syncTrayState();
          if (this.rememberState) {
            this.persistProgressState();
            if (queueMutated) schedulePersistQueue(this);
          }
          return;
      }

      // 2. 未命中预加载时：无论 maintainTime 是否大于 0，只要切歌就立即停止旧音频源并更新 currentSong，杜绝旧流串音与假死
      if (isSongChange) {
        resetAudioElementSource(activeAudio);
        this.isPlaying = false;
        this.currentSong = reactiveSong;
        this.currentTime = maintainTime > 0 ? maintainTime : 0;
        this.duration = getExpectedDuration(songInfo) || Number(songInfo.duration) || 0;
        this.isCurrentSongPreview = false;
        this.syncTrayState();
      } else if (maintainTime === 0) {
        this.currentTime = 0;
        this.isCurrentSongPreview = false;
      }

      const triggerFallback = (reasonText = '') => {
        if (thisPlayVersion !== playVersion) return;
        if (this._playWatchdogTimer) { clearTimeout(this._playWatchdogTimer); this._playWatchdogTimer = null; }
        this.isLoading = false;
        this.isError = true;
        this.isPlaying = false;
        this.failedSong = reactiveSong;
        const isVipSong = songInfo.is_vip || songInfo.is_paid;
        const currentUserStore = useUserStore();
        if (isVipSong && !currentUserStore.isLoggedIn) {
          this.errorMessage = 'VIP 歌曲需要登录后播放';
        } else {
          this.errorMessage = reasonText === '播放请求超时' ? '音频请求超时，请检查网络或重试' : '音频获取失败，请尝试其他歌曲';
        }

        if (!isSongChange && previousSong && hasLoadedAudioSource(activeAudio) && activeAudio._songHash === previousSong.hash) {
          // 同一首歌切换音质失败时，保留原播放流继续播放
          this.currentSong = previousSong;
          this.currentQuality = previousPlaybackState.currentQuality;
          this.currentTime = previousPlaybackState.currentTime;
          this.duration = previousPlaybackState.duration;
          this.isCurrentSongPreview = previousPlaybackState.isCurrentSongPreview;
          if (previousPlaybackState.wasPlaying) {
            const resumePromise = safePlayAudio(activeAudio);
            if (resumePromise !== undefined) {
              resumePromise
                .then(() => { if (thisPlayVersion === playVersion) this.isPlaying = true; })
                .catch(() => { if (thisPlayVersion === playVersion) this.isPlaying = false; });
            }
          }
        } else {
          // 切歌失败：保持 currentSong 在当前目标歌曲（不回退到更早歌曲造成连切死循环），清空无效流等待自动跳过或手动重试
          resetAudioElementSource(activeAudio);
          this.currentSong = reactiveSong;
          this.currentTime = 0;
          this.duration = getExpectedDuration(songInfo) || Number(songInfo.duration) || 0;
          this.isCurrentSongPreview = false;
        }
        this.syncTrayState();

        setTimeout(() => {
          if (thisPlayVersion === playVersion) this.clearError();
        }, 5000);

        const canSkipNext = (this.playlist && this.playlist.length > 1) || Boolean(this.isFmModePlaylist && fmController);
        if (this.autoSkipOnError && autoPlay && canSkipNext) {
          this.consecutiveErrorCount = (this.consecutiveErrorCount || 0) + 1;
          const maxErrors = this.isFmModePlaylist ? 5 : Math.min(Math.max(3, this.playlist.length), 5);
          if (this.consecutiveErrorCount >= maxErrors) {
            this.consecutiveErrorCount = 0;
            this.showToast('连续多首歌曲资源失效，已停止自动跳过');
            return;
          }
          this.showToast('当前歌曲资源失效，自动为您播放下一首');
          if (this._errorSkipTimer) clearTimeout(this._errorSkipTimer);
          this._errorSkipTimer = setTimeout(() => {
            this._errorSkipTimer = null;
            if (thisPlayVersion !== playVersion) return;
            this.playNext(true, songInfo);
          }, 1500);
        } else {
          this.consecutiveErrorCount = 0;
        }
      };

      this._playWatchdogTimer = setTimeout(() => {
        this._playWatchdogTimer = null;
        if (thisPlayVersion !== playVersion || !this.isLoading) return;
        pendingResolves.clear();
        triggerFallback('播放请求超时');
        playVersion++;
      }, 15000);

      try {
        await this.prepareAutoQuality(songInfo, targetQuality);
        if (thisPlayVersion !== playVersion) return;

        const res = await this.resolveSongUrl(songInfo, targetQuality);
        if (thisPlayVersion !== playVersion) return;

        if (res?.url) {
          this.failedSong = null;
          this.consecutiveErrorCount = 0;
          reactiveSong.qualities = { ...(songInfo.qualities || {}) };
          this.currentSong = reactiveSong;
          this.currentQuality = res.quality;
          this.isCurrentSongPreview = res.isPreview; 
          setAudioSource(activeAudio, res.url, shouldUseAudioProxy(this), songInfo.hash);
          console.log('[Player playSong] res:', JSON.stringify(res), 'activeAudio.src:', activeAudio.src);
          if (maintainTime === 0) this.currentTime = 0;
          if (res.isPreview && autoPlay) this.showToast(getPreviewToastMessage(userStore));
          if (this.rememberState) {
            this.persistProgressState();
            if (queueMutated) schedulePersistQueue(this);
          }
        } else {
          triggerFallback('所有音质接口均拒绝访问');
          return;
        }

        let actualTime = maintainTime;
        if (res.isPreview && actualTime > 59) {
            actualTime = 59.5; 
        }

        if (actualTime > 0) {
          this.currentTime = actualTime;
          this._pendingRestoreSeekTime = actualTime;
          const targetSeek = actualTime;
          let seekApplied = false;
          const applySeek = () => {
            if (seekApplied) return;
            try {
              if (Number.isFinite(activeAudio.duration) && activeAudio.duration > 0) {
                activeAudio.currentTime = Math.min(targetSeek, Math.max(0, activeAudio.duration - 0.5));
              } else {
                activeAudio.currentTime = targetSeek;
              }
              seekApplied = true;
              this._pendingRestoreSeekTime = 0;
            } catch (e) {}
          };

          if (activeAudio.readyState >= 1) {
            applySeek();
          } else {
            activeAudio.addEventListener('loadedmetadata', applySeek, { once: true });
            activeAudio.addEventListener('canplay', applySeek, { once: true });
            activeAudio.addEventListener('playing', applySeek, { once: true });
          }
          activeAudio.addEventListener('seeked', () => { this._pendingRestoreSeekTime = 0; }, { once: true });
          try { activeAudio.currentTime = targetSeek; } catch (e) {}
        } else {
          this._pendingRestoreSeekTime = 0;
        }

        if (autoPlay) {
          const playPromise = safePlayAudio(activeAudio);
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              if (thisPlayVersion !== playVersion) return;
              console.warn("播放被浏览器打断", error);
              this.isPlaying = false;
              this.isLoading = false;
              this.syncTrayState();
            });
          }
          this.isPlaying = true;
          this._startPlaybackProgressWatchdog(thisPlayVersion, songInfo);
        } else {
          safePauseAudio(activeAudio);
          this.isPlaying = false;
        }
        this.clearError();

        this.triggerPreload();
        this.syncTrayState();

      } catch (error) {
        if (thisPlayVersion !== playVersion) return;
        triggerFallback('网络请求异常');
      } finally {
        if (this._playWatchdogTimer && thisPlayVersion === playVersion) {
          clearTimeout(this._playWatchdogTimer);
          this._playWatchdogTimer = null;
        }
        if (thisPlayVersion === playVersion) {
          this.isLoading = false;
        }
      }
    },

    async switchQuality(targetQuality) {
      if (!this.currentSong || this.currentQuality === targetQuality) return;

      if (isNeteaseImportSong(this.currentSong)) {
        this.currentSong.qualities = extractQualities(this.currentSong);
        if (!this.currentSong.qualities?.[targetQuality]) {
          this.showToast('当前网易歌曲未提供该音质');
          return;
        }
      } else if (isQQImportSong(this.currentSong)) {
        this.currentSong.qualities = extractQualities(this.currentSong);
        if (!this.currentSong.qualities?.[targetQuality]) {
          this.showToast('当前企鹅歌曲未提供该音质');
          return;
        }
      }

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      const isVipQuality = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(targetQuality);

      if (isVipQuality && !isVipUser && !isExternalImportSong(this.currentSong)) {
        if (userStore.isLoggedIn) {
          this.showDialog({
            title: 'VIP 专属音质',
            message: '【无损 SQ】及以上极高音质为 VIP 专享特权。\n您当前非会员，开通 VIP 即可解锁。',
            confirmText: '开通 VIP',
            cancelText: '继续听标准音质',
            onConfirm: () => { userStore.openVipUpgradeModal(); }
          });
        } else {
          this.showDialog({
            title: 'VIP 专属音质',
            message: '【无损 SQ】及以上极高音质为 VIP 专享特权。\n登录并开通 VIP 即可解锁。',
            confirmText: '去登录',
            cancelText: '继续听标准音质',
            onConfirm: () => { userStore.openLoginModal(); }
          });
        }
        return;
      }

      this.isLoading = true;
      const targetQName = QUALITY_CONFIG.find(q => q.key === targetQuality)?.name || '未知音质';

      if (!this.currentSong.qualities) this.currentSong.qualities = extractQualities(this.currentSong);

      await this.fetchSongQualityInfo(this.currentSong, { force: true });

      for (const q of [...QUALITY_CONFIG, { key: 'best' }, { key: 'hq' }]) {
        const cacheKey = `${this.currentSong.hash}_${q.key}`;
        if (urlCache.has(cacheKey)) urlCache.delete(cacheKey);
      }

      const savedTime = activeAudio.currentTime;
      const wasPlaying = this.isPlaying;

      await this.playSong(this.currentSong, targetQuality, savedTime, wasPlaying, {
        silentQueueToast: true,
        isFmTrack: this.isFmModePlaylist
      });

      if (!this.isError) {
        if (this.currentQuality !== targetQuality) {
           const actualQName = QUALITY_CONFIG.find(q => q.key === this.currentQuality)?.name || '标准音质';
           this.showToast(`受限无法提供【${targetQName}】，已为您寻得【${actualQName}】`);
        } else {
           this.showToast(`已为您切换至【${targetQName}】`);
        }
      }
    },

    async downgradeForLogout() {
      pendingResolves.clear();
      urlCache.clear();
      resetPreloadAudio();
      this.hasDfid = false;
      
      if (!this.currentSong) return;

      const isVipQuality = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(this.currentQuality);
      const isVipSong = this.currentSong.is_vip || this.currentSong.is_paid;

      if (isVipSong || isVipQuality) {
        this.showToast('✨ 账号已登出，当前歌曲可继续播放，切换歌曲后将恢复试听限制');
      }
    },

    async reloadCurrentSongForVip() {
      if (!this.currentSong || this.isLoading) return;
      const wasPlaying = this.isPlaying;
      if (!wasPlaying && !hasLoadedAudioSource(activeAudio)) {
        const bestQuality = this.getBestAvailableQuality(this.currentSong);
        if (bestQuality) this.currentQuality = bestQuality;
        return;
      }
      const savedTime = (Number.isFinite(activeAudio.currentTime) && activeAudio.currentTime > 0)
        ? activeAudio.currentTime
        : (Number.isFinite(this.currentTime) ? this.currentTime : 0);
      const songRef = this.currentSong;
      if (this._vipActionTimer) clearTimeout(this._vipActionTimer);
      this._vipActionTimer = setTimeout(async () => {
         if (this.currentSong !== songRef || this.isLoading) return;

         await this.fetchSongQualityInfo(songRef);
         if (this.currentSong !== songRef || this.isLoading) return;
         const bestQuality = this.getBestAvailableQuality(songRef);
         if (!this.isCurrentSongPreview && this.currentQuality === bestQuality) return;

         // 仅清理 URL 缓存与预加载流，绝对不递增 playVersion，避免将并发中的 playSong 变为死锁孤儿
         pendingResolves.clear();
         urlCache.clear();
         resetPreloadAudio();

         if (this.isCurrentSongPreview) {
           this.showToast('✨ VIP 身份确认，正在解除限制并为您自动匹配最高音质...');
         } else {
           this.showToast('✨ VIP 身份确认，正在为您升级至最高音质...');
         }

         try {
           const res = await this.resolveSongUrl(songRef, null);
           if (this.currentSong !== songRef || this.isLoading) return;

           if (res?.url) {
             const shouldSwapSource = res.quality !== this.currentQuality || res.isPreview !== this.isCurrentSongPreview || activeAudio._rawSourceUrl !== res.url;
             if (!shouldSwapSource) return;

             this.currentQuality = res.quality;
             this.isCurrentSongPreview = res.isPreview;
             setAudioSource(activeAudio, res.url, shouldUseAudioProxy(this), songRef.hash || '');
             const targetTime = res.isPreview && savedTime > 59 ? 59.5 : savedTime;
             if (targetTime > 0) {
               const applySeek = () => {
                 try { activeAudio.currentTime = targetTime; } catch (e) {}
               };
               if (activeAudio.readyState >= 1) {
                 applySeek();
               } else {
                 activeAudio.addEventListener('loadedmetadata', applySeek, { once: true });
                 activeAudio.addEventListener('canplay', applySeek, { once: true });
               }
               try { activeAudio.currentTime = targetTime; } catch (e) {}
             }
             if (wasPlaying) {
               const p = safePlayAudio(activeAudio);
               if (p !== undefined) p.catch(() => { this.isPlaying = false; });
             }
           }
         } catch (e) {}

         const actualQName = QUALITY_CONFIG.find(q => q.key === this.currentQuality)?.name || '标准音质';
         if (this.isCurrentSongPreview) {
           this.showToast(`✨ 已为您无缝解锁完整版音乐`);
         } else if (this.currentQuality !== 'standard') {
           this.showToast(`✨ 已成功升级至【${actualQName}】`);
         }
      }, 150);
    },

    handleAuthCapabilityChanged(reason = 'auth') {
      if (reason === 'logout' || reason === 'vip-downgrade') {
        pendingResolves.clear();
        urlCache.clear();
        resetPreloadAudio();
        this.hasDfid = false;
        return;
      }
      if (this.currentSong && !this.isLoading && (this.isPlaying || hasLoadedAudioSource(activeAudio))) {
        this.reloadCurrentSongForVip();
      }
    },

    _startPlaybackProgressWatchdog(version, songInfo) {
      if (this._playbackProgressTimer) {
        clearTimeout(this._playbackProgressTimer);
        this._playbackProgressTimer = null;
      }
      this._playbackProgressTimer = setTimeout(() => {
        this._playbackProgressTimer = null;
        if (version !== playVersion || !this.isPlaying) return;
        if (activeAudio.currentTime === 0 && activeAudio.readyState <= 1 && hasLoadedAudioSource(activeAudio)) {
          console.warn('[Player Watchdog] Audio stalled at 00:00, attempting auto recovery...', activeAudio.src);
          if (activeAudio._usingProxy && !activeAudio._proxyFallbackAttempted && activeAudio._rawSourceUrl) {
            activeAudio.dispatchEvent(new Event('error'));
          } else if (songInfo) {
            this.playSong(songInfo, null, 0, true, { silentQueueToast: true, isFmTrack: this.isFmModePlaylist });
          }
        }
      }, 6000);
    },

    mediaPlay() {
      if (!this.currentSong) {
        if (this.playlist.length > 0) this.playSong(this.playlist[0], null, 0, true, { silentQueueToast: true });
        return;
      }
      if (this.isLoading) return;
      if (this.isError) {
        const retrySong = this.failedSong || this.currentSong;
        this.clearError();
        if (retrySong) {
          this.playSong(retrySong, null, 0, true, {
            silentQueueToast: true,
            isFmTrack: this.isFmModePlaylist
          });
        }
        return;
      }
      const isSourceDeadOrStalled = activeAudio.currentTime === 0 && activeAudio.readyState <= 1;
      if (!hasLoadedAudioSource(activeAudio) || (activeAudio._songHash && activeAudio._songHash !== this.currentSong.hash) || isSourceDeadOrStalled) {
        this.playSong(this.currentSong, null, this.currentTime, true, {
          silentQueueToast: true,
          isFmTrack: this.isFmModePlaylist
        });
        return;
      }
      const playPromise = safePlayAudio(activeAudio);
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.isPlaying = false;
          this.syncTrayState();
        });
      }
      this.isPlaying = true;
      this.syncTrayState();
      this._startPlaybackProgressWatchdog(playVersion, this.currentSong);
    },

    mediaPause() {
      if (this._errorSkipTimer) { clearTimeout(this._errorSkipTimer); this._errorSkipTimer = null; }
      if (this._playbackProgressTimer) { clearTimeout(this._playbackProgressTimer); this._playbackProgressTimer = null; }
      if (this.isLoading) {
        abortActivePlayback(this);
      } else {
        safePauseAudio(activeAudio);
        this.isPlaying = false;
      }
      if (this.rememberState) this.persistProgressState();
      this.syncTrayState();
    },

    togglePlay() {
      if (this.isError) {
        this.mediaPlay();
        return;
      }
      if (!this.currentSong) {
        if (this.playlist.length > 0) this.playSong(this.playlist[0], null, 0, true, { silentQueueToast: true });
        return;
      }
      const isActuallyActive = this.isLoading || (this.isPlaying && !activeAudio.paused && hasLoadedAudioSource(activeAudio));
      if (isActuallyActive) {
        this.mediaPause();
      } else {
        this.mediaPlay();
      }
    },

    seek(time) {
      if (!this.currentSong) return;
      time = Math.max(0, time);
      if (this.isCurrentSongPreview && time > 60) {
        time = 60;
      }
      if (this.duration > 0 && time > this.duration) {
        time = this.duration;
      }
      if (hasLoadedAudioSource(activeAudio)) {
        activeAudio.currentTime = time;
      }
      this.currentTime = time;
      if (this.rememberState) schedulePersistProgress(this, 300);
    },

    clearError() { this.isError = false; this.errorMessage = ''; this.failedSong = null; },

    playPrev() {
      this.consecutiveErrorCount = 0;
      if (this.isFmModePlaylist) {
        if (this.playMode === 'loop' && this.currentSong) {
          if (!hasLoadedAudioSource(activeAudio) || (activeAudio._songHash && activeAudio._songHash !== this.currentSong.hash)) {
            this.playSong(this.currentSong, null, 0, true, { silentQueueToast: true, isFmTrack: true });
            return;
          }
          activeAudio.currentTime = 0;
          this.currentTime = 0;
          const p = safePlayAudio(activeAudio);
          if (p !== undefined) p.catch(() => { this.isPlaying = false; });
          this.isPlaying = true;
          this.syncTrayState();
          return;
        }
        if (fmController?.playPrev) {
          fmController.playPrev();
          return;
        }
      }
      if (this.playlist.length === 0) return;
      if (this.playlist.length === 1 || this.playMode === 'loop') {
        const target = this.currentSong || this.playlist[0];
        if (!hasLoadedAudioSource(activeAudio) || (target && activeAudio._songHash && activeAudio._songHash !== target.hash)) {
          if (target) this.playSong(target, null, 0, true, { silentQueueToast: true });
          return;
        }
        activeAudio.currentTime = 0;
        this.currentTime = 0;
        const p = safePlayAudio(activeAudio);
        if (p !== undefined) p.catch(() => { this.isPlaying = false; });
        this.isPlaying = true;
        this.syncTrayState();
        return;
      }

      let prevIndex;
      if (this.playMode === 'random') {
        if (Array.isArray(this.playbackHistory) && this.playbackHistory.length > 0) {
          const lastSong = this.playbackHistory.pop();
          const foundIndex = getFastSongIndex(this.playlist, lastSong);
          if (foundIndex !== -1) {
            this.playSong(this.playlist[foundIndex], null, 0, true, { silentQueueToast: true });
            return;
          }
        }
        if (this.playlist.length > 1) {
          const currentIndex = this.getCurrentSongIndex();
          let rand;
          do { rand = Math.floor(Math.random() * this.playlist.length); } while (rand === currentIndex);
          prevIndex = rand;
        } else {
          prevIndex = 0;
        }
      } else {
        const currentIndex = this.getCurrentSongIndex();
        prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = this.playlist.length - 1;
      }
      this.playSong(this.playlist[prevIndex], null, 0, true, { silentQueueToast: true });
    },

    playNext(isAuto = false, baseSong = null) {
      if (!isAuto) this.consecutiveErrorCount = 0;
      if (this.isFmModePlaylist) {
        if (this.playMode === 'loop' && !baseSong && this.currentSong) {
          if (!hasLoadedAudioSource(activeAudio) || (activeAudio._songHash && activeAudio._songHash !== this.currentSong.hash)) {
            this.playSong(this.currentSong, null, 0, true, { silentQueueToast: true, isFmTrack: true });
            return;
          }
          activeAudio.currentTime = 0;
          this.currentTime = 0;
          const p = safePlayAudio(activeAudio);
          if (p !== undefined) p.catch(() => { this.isPlaying = false; });
          this.isPlaying = true;
          this.syncTrayState();
          return;
        }
        if (fmController?.playNext) {
          fmController.playNext({ isAuto, baseSong });
          return;
        }
      }
      if (this.playlist.length === 0) return;
      
      if (this.playlist.length === 1 || this.playMode === 'loop') {
        const target = this.currentSong || this.playlist[0];
        if (!hasLoadedAudioSource(activeAudio) || (target && activeAudio._songHash && activeAudio._songHash !== target.hash)) {
          if (target) this.playSong(target, null, 0, true, { silentQueueToast: true });
          return;
        }
        activeAudio.currentTime = 0;
        this.currentTime = 0;
        const p = safePlayAudio(activeAudio);
        if (p !== undefined) p.catch(() => { this.isPlaying = false; });
        this.isPlaying = true;
        this.syncTrayState();
        return;
      }

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;

      const refSong = baseSong || this.currentSong;
      const baseKey = baseSong ? normalizeSongKey(baseSong) : '';
      let nextIndex = getFastSongIndex(this.playlist, refSong);
      if (nextIndex === -1 && this.currentSong) {
        nextIndex = this.getCurrentSongIndex();
      }
      if (nextIndex === -1) nextIndex = 0;

      if (this.playMode === 'random') {
        const playableIndices = [];
        for (let i = 0; i < this.playlist.length; i++) {
          if (i === nextIndex) continue;
          const candidate = this.playlist[i];
          if (baseKey && normalizeSongKey(candidate) === baseKey) continue;
          const isVipSong = candidate.is_vip || candidate.is_paid;
          if (!isVipSong || isVipUser || !isAuto) playableIndices.push(i);
        }

        if (playableIndices.length === 0) {
          this.showDialog({
            title: '播放队列中断',
            message: '队列中剩余歌曲均为 VIP 专享，自动播放已停止。\n开通 VIP 即可畅听全部内容。',
            confirmText: userStore.isLoggedIn ? '开通 VIP' : '去登录',
            cancelText: '知道了',
            onConfirm: () => { userStore.isLoggedIn ? userStore.openVipUpgradeModal() : userStore.openLoginModal(); }
          });
          this.isPlaying = false;
          return;
        }

        const skippedCount = this.playlist.length - 1 - playableIndices.length;
        if (skippedCount > 0) this.showToast(`已为您自动跳过 ${skippedCount} 首 VIP 专属歌曲`);

        const rand = playableIndices[Math.floor(Math.random() * playableIndices.length)];
        this.playSong(this.playlist[rand], null, 0, true, { silentQueueToast: true });
        return;
      }

      let attempts = 0;
      let skippedCount = 0;

      while (attempts < this.playlist.length) {
        attempts++;

        nextIndex++;
        if (nextIndex >= this.playlist.length) nextIndex = 0;

        const candidate = this.playlist[nextIndex];
        if (baseKey && normalizeSongKey(candidate) === baseKey) continue;
        const isVipSong = candidate.is_vip || candidate.is_paid;

        if (isAuto && isVipSong && !isVipUser) {
           skippedCount++;
           continue; 
        } else {
           break; 
        }
      }

      if (skippedCount > 0 && attempts < this.playlist.length) {
        this.showToast(`已为您自动跳过 ${skippedCount} 首 VIP 专属歌曲`);
      } else if (skippedCount > 0 && attempts >= this.playlist.length) {
        this.showDialog({
          title: '播放队列中断',
          message: '队列中剩余歌曲均为 VIP 专享，自动播放已停止。\n开通 VIP 即可畅听全部内容。',
          confirmText: userStore.isLoggedIn ? '开通 VIP' : '去登录',
          cancelText: '知道了',
          onConfirm: () => { userStore.isLoggedIn ? userStore.openVipUpgradeModal() : userStore.openLoginModal(); }
        });
        this.isPlaying = false;
        return;
      }
      
      this.playSong(this.playlist[nextIndex], null, 0, true, { silentQueueToast: true });
    },

    removeFromPlaylist(index, expectedHash = null) {
      let targetIndex = index;
      if (expectedHash) {
        const matched = getFastSongIndex(this.playlist, expectedHash);
        if (matched !== -1) targetIndex = matched;
      }
      const removedSong = this.playlist[targetIndex];
      if (!removedSong) return;
      const removedKey = normalizeSongKey(removedSong);
      const isCurrentSong = !this.isFmModePlaylist && Boolean(this.currentSong && normalizeSongKey(this.currentSong) === removedKey);
      
      this.playlist.splice(targetIndex, 1);
      if (this.playAllHydrationSession && targetIndex < (this.playAllHydrationSession.insertIndex || 0)) {
        this.playAllHydrationSession = {
          ...this.playAllHydrationSession,
          insertIndex: Math.max(0, (this.playAllHydrationSession.insertIndex || 1) - 1)
        };
      }
      rebuildPlaylistKeyMap(this.playlist);
      if (this.isFmModePlaylist) this._syncFmBackupFlags();
      if (this.rememberState) schedulePersistQueue(this);
      
      if (isCurrentSong) {
        abortActivePlayback(this);
        this.isCurrentSongPreview = false;
        this.currentSong = null;
        this.currentQuality = 'standard';
        this.clearError();
        
        if (this.playlist.length > 0) {
          const nextIndex = Math.min(targetIndex, this.playlist.length - 1);
          this.playSong(this.playlist[nextIndex], null, 0, true, { silentQueueToast: true });
          return;
        } else {
          this.currentTime = 0;
          this.duration = 0;
          this.syncTrayState();
        }
      }
      
      if (!this.isFmModePlaylist) {
        this.triggerPreload();
      }
    },

    clearPlaylist(options = {}) {
      const prevCount = this.playlist.length;
      const canUndo = options.withUndo !== false && prevCount > 0;
      if (canUndo) {
        this.saveUndoSnapshot('clear');
      }
      this.cancelPlayAllHydration();
      if (this.isFmModePlaylist) {
        this._exitFmModeSilent({ keepCurrentFmSong: false });
      }
      this.playlist = [];
      this.isFmModePlaylist = false;
      regularPlaylistSavedState = null;
      this._syncFmBackupFlags();
      rebuildPlaylistKeyMap(this.playlist);
      this.playbackHistory = [];
      abortActivePlayback(this, { resetPreload: true });
      this.currentSong = null;
      this.currentTime = 0;
      this.duration = 0;
      this.isCurrentSongPreview = false;
      this.clearError();
      this.currentQuality = 'standard';
      this.isPlaylistVisible = false;
      this.peakMode = false;
      this.peakStartOffset = 0;
      this.peakDuration = 30;
      this.syncTrayState();
      if (this.rememberState) {
        this.persistQueueState();
        this.persistProgressState();
      } else {
        this.clearPersistedState();
      }
      if (canUndo && !options.silent) {
        this.showToast(`已清空播放列表 (共 ${prevCount} 首)`, {
          type: 'info',
          duration: 5000,
          actionText: '撤销',
          onAction: () => this.restoreUndoSnapshot()
        });
      }
    },

    clearNeteaseImportPlaybackState() {
      this.cancelPlayAllHydration();
      clearUrlResolutionState();
      this.playlist = this.playlist.filter(song => !isNeteaseImportSong(song));
      rebuildPlaylistKeyMap(this.playlist);
      if (this.isFmModePlaylist) this._syncFmBackupFlags();
      if (this.rememberState) schedulePersistQueue(this);

      if (!isNeteaseImportSong(this.currentSong)) {
        if (!this.isFmModePlaylist) this.triggerPreload();
        this.syncTrayState();
        return;
      }

      abortActivePlayback(this, { resetPreload: true });
      this.currentSong = null;
      this.currentTime = 0;
      this.duration = 0;
      this.isCurrentSongPreview = false;
      this.clearError();
      this.currentQuality = 'standard';
      this.peakMode = false;
      this.peakStartOffset = 0;
      this.peakDuration = 30;
      if (this.rememberState) this.persistProgressState();
      this.syncTrayState();
    },

    clearQQImportPlaybackState() {
      this.cancelPlayAllHydration();
      clearUrlResolutionState();
      this.playlist = this.playlist.filter(song => !isQQImportSong(song));
      rebuildPlaylistKeyMap(this.playlist);
      if (this.isFmModePlaylist) this._syncFmBackupFlags();
      if (this.rememberState) schedulePersistQueue(this);

      if (!isQQImportSong(this.currentSong)) {
        if (!this.isFmModePlaylist) this.triggerPreload();
        this.syncTrayState();
        return;
      }

      abortActivePlayback(this, { resetPreload: true });
      this.currentSong = null;
      this.currentTime = 0;
      this.duration = 0;
      this.isCurrentSongPreview = false;
      this.clearError();
      this.currentQuality = 'standard';
      this.peakMode = false;
      this.peakStartOffset = 0;
      this.peakDuration = 30;
      if (this.rememberState) this.persistProgressState();
      this.syncTrayState();
    },

    syncTrayState() {
      if (!window.trayAPI) return;
      if (this.currentSong) {
        window.trayAPI.updateTooltip({
          name: this.currentSong.name || this.currentSong._title || '',
          singer: this.currentSong.singer || this.currentSong._singer || ''
        });
      }
      window.trayAPI.updatePlayState(this.isPlaying);
      window.trayAPI.updatePlayMode(this.playMode);
      window.trayAPI.updateLyricState(this.isDesktopLyricVisible);
    }
  }
});
