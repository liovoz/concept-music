// ====================
// 文件：src/utils/mediaSessionBridge.js
// 职责：将 playerStore 的播放状态桥接到 Chromium Media Session API，
//       由 Chromium 转发给 Windows SMTC（锁屏 / Win+A 快捷设置媒体卡片 / 键盘媒体键）。
// 原则：
//   1. 单向数据流 —— 状态以 playerStore 为唯一事实来源，SMTC 按钮事件一律转为确定性的 store 动作。
//   2. 双阶段零漏帧同步 —— 切歌 0ms 乐观推送新歌元数据，并在音频流真正起播/加载完成时二次穿透确认，确保锁屏与 Win+A 始终一致。
//   3. 次声波保活锚点 —— 使用 18Hz 极微幅次声波（高于 Chromium -72dBFS 静音挂起阈值、物理上人耳完全不可闻），防止 WebAudio 模式下被系统挂起断连。
//   4. 生命周期绑定进程启动态 —— 开关变更在下次启动生效，本次运行期间不掏空 metadata，彻底杜绝空白控件。
// ====================
import { watch } from 'vue';

const STORAGE_KEY = 'kg_desktop_system_media_controls';
// 与软件内歌单、专辑、底栏封面尺寸保持一致（400），直接命中 Chromium 内存/磁盘图片缓存
const ARTWORK_SIZE = 400;
const POSITION_DRIFT_TOLERANCE = 2; // 秒
const PREWARM_CACHE_LIMIT = 60;

let store = null;
let sessionActive = true;
let stopWatchers = [];
let lastMetadataKey = '';
let lastSongHash = '';
let pendingConfirmHash = '';
let confirmTimer = null;
let lastPosition = null; // { position, duration, at, playing }
let fallbackCoverDataUrl = '';
const registeredActions = new Set();
const prewarmedCoverUrls = new Set();

const isDesktopLyricContext = () =>
  typeof window !== 'undefined' &&
  typeof window.location?.hash === 'string' &&
  window.location.hash.startsWith('#/desktop-lyric');

const clearConfirmTimer = () => {
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
};

// 极轻量内存保活锚点（10 秒 8kHz 16-bit 单声道 18Hz 次声波 WAV）：
// 为什么不能用全 0 PCM：
//   当用户开启音量增强（AudioContext.createMediaElementSource）时，主音频走 WebAudio 管线；
//   若保活流为全 0，Chromium 的 AudioPowerMonitor（阈值 -72dBFS）与 SilentSinkSuspender 会在约 30 秒后将其判定为静音挂起，
//   导致后续切歌时 MediaSession 不再向 Windows Win+A 广播新歌元数据。
//   18Hz（低于人耳 20Hz 下限，10 秒整 180 周期过零无缝循环，幅度 48/32767 ≈ -59.7dBFS RMS）既完全不可闻，又始终高于 -72dBFS 阈值。
let keepAliveAudio = null;
let keepAliveBlobUrl = '';

const ensureKeepAliveAudio = () => {
  if (keepAliveAudio) return keepAliveAudio;
  try {
    const sampleRate = 8000;
    const seconds = 10;
    const freqHz = 18;
    const amplitude = 48;
    const numSamples = sampleRate * seconds;
    const dataBytes = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const writeAscii = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, 'data');
    view.setUint32(40, dataBytes, true);

    for (let i = 0; i < numSamples; i++) {
      const dither = (Math.random() - Math.random()) * 0.5;
      const sample = Math.round(Math.sin((2 * Math.PI * freqHz * i) / sampleRate) * amplitude + dither);
      view.setInt16(44 + i * 2, sample, true);
    }

    keepAliveBlobUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    const audio = new Audio(keepAliveBlobUrl);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 1.0;
    audio.addEventListener('playing', () => {
      if (!sessionActive || !store || !store.currentSong) return;
      pushMetadataToBrowser(store.currentSong, true);
      applyPlaybackState();
      syncPosition();
    });
    audio.load();
    keepAliveAudio = audio;
  } catch (e) {
    keepAliveAudio = null;
  }
  return keepAliveAudio;
};

const syncKeepAlive = (nudgeOnTrackSwitch = false) => {
  if (!sessionActive || !store) {
    if (keepAliveAudio && !keepAliveAudio.paused) {
      try { keepAliveAudio.pause(); } catch (e) {}
    }
    return;
  }
  const shouldKeepRunning = Boolean(store.currentSong) && (store.isPlaying || (store.isLoading && !store.isError));
  const audio = ensureKeepAliveAudio();
  if (!audio) return;

  if (shouldKeepRunning) {
    if (audio.paused) {
      const p = audio.play();
      if (p !== undefined) p.catch(() => {});
    } else if (nudgeOnTrackSwitch) {
      try { audio.currentTime = 0; } catch (e) {}
    }
  } else if (!audio.paused) {
    try { audio.pause(); } catch (e) {}
  }
};

const destroyKeepAliveAudio = () => {
  if (keepAliveAudio) {
    try {
      keepAliveAudio.pause();
      keepAliveAudio.removeAttribute('src');
      keepAliveAudio.load();
    } catch (e) {}
    keepAliveAudio = null;
  }
  if (keepAliveBlobUrl) {
    try { URL.revokeObjectURL(keepAliveBlobUrl); } catch (e) {}
    keepAliveBlobUrl = '';
  }
};

const getMediaSession = () => {
  if (typeof navigator === 'undefined' || !navigator.mediaSession) return null;
  return navigator.mediaSession;
};

export const getSystemMediaControlsPreference = () => localStorage.getItem(STORAGE_KEY) !== 'false';

// ---------- 元数据与封面缓存预热 ----------

const getFallbackCoverDataUrl = () => {
  if (fallbackCoverDataUrl) return fallbackCoverDataUrl;
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 96px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', 128, 132);
      fallbackCoverDataUrl = canvas.toDataURL('image/png');
    }
  } catch (e) {}
  return fallbackCoverDataUrl;
};

const resolveCoverUrl = (rawCover) => {
  if (!rawCover || typeof rawCover !== 'string') return '';
  const src = rawCover.trim().replace(/\{size\}/g, String(ARTWORK_SIZE));
  if (!/^https?:\/\//i.test(src)) return '';
  // 跳过国内网络易超时的 Unsplash 默认占位图，交由本地内存兜底封面立即刷新，防止阻塞缩略图更新
  if (src.includes('images.unsplash.com')) return '';
  return src;
};

const normalizeArtwork = (rawCover, sizeOverride = ARTWORK_SIZE) => {
  const src = resolveCoverUrl(rawCover);
  if (src) {
    const type = /\.png(\?|$)/i.test(src) ? 'image/png' : 'image/jpeg';
    return [{ src, sizes: `${sizeOverride}x${sizeOverride}`, type }];
  }
  const fallback = getFallbackCoverDataUrl();
  if (fallback) {
    return [{ src: fallback, sizes: `${sizeOverride}x${sizeOverride}`, type: 'image/png' }];
  }
  return [];
};

const prewarmCoverUrl = (rawCover) => {
  const src = resolveCoverUrl(rawCover);
  if (!src || prewarmedCoverUrls.has(src)) return;
  if (prewarmedCoverUrls.size >= PREWARM_CACHE_LIMIT) {
    const oldest = prewarmedCoverUrls.values().next().value;
    if (oldest) prewarmedCoverUrls.delete(oldest);
  }
  prewarmedCoverUrls.add(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
};

// 异步预热上一首与下一首封面至浏览器 HTTP 缓存，使锁屏与 Win+A 连续切歌时封面立即可用
const prewarmAdjacentCovers = () => {
  if (!sessionActive || !store || !Array.isArray(store.playlist) || store.playlist.length <= 1) return;
  const curHash = store.currentSong?.hash;
  if (!curHash) return;
  const idx = store.playlist.findIndex(s => s && s.hash === curHash);
  if (idx === -1) return;
  const prevSong = store.playlist[(idx - 1 + store.playlist.length) % store.playlist.length];
  const nextSong = store.playlist[(idx + 1) % store.playlist.length];
  if (prevSong) prewarmCoverUrl(prevSong.cover || prevSong._cover);
  if (nextSong) prewarmCoverUrl(nextSong.cover || nextSong._cover);
};

const resolveArtist = (song) => {
  const singers = Array.isArray(song._singers) ? song._singers : [];
  const names = singers.map(s => (s && s.name ? String(s.name).trim() : '')).filter(Boolean);
  if (names.length > 0) return names.join(' / ');
  return song.singer || song._singer || '未知歌手';
};

const buildMetadataInit = (song, isPreview, sizeOverride = ARTWORK_SIZE) => {
  const baseTitle = song.name || song._title || '未知歌曲';
  return {
    title: isPreview ? `${baseTitle}（试听）` : baseTitle,
    artist: resolveArtist(song),
    album: song.album || song._album || song.album_name || song.albumname || '',
    artwork: normalizeArtwork(song.cover || song._cover, sizeOverride)
  };
};

const pushMetadataToBrowser = (song, bustCache = false) => {
  const ms = getMediaSession();
  if (!ms || !sessionActive || !song) return;
  const isPreview = !!store?.isCurrentSongPreview;
  const rawCover = song.cover || song._cover;
  const init = buildMetadataInit(song, isPreview, ARTWORK_SIZE);
  const key = JSON.stringify([song.hash || '', init.title, init.artist, init.album, init.artwork[0]?.src || '']);
  if (!bustCache && key === lastMetadataKey) return;

  try {
    if (bustCache) {
      // 穿透 Chromium C++ MediaSessionImpl::RebuildAndNotifyMetadataChanged 与 ImagesChanged 的相等性去重缓存：
      // 保持图片 URL 完全不变以 100% 复用缓存，且不置空 metadata 以杜绝锁屏空白闪烁，强制触发 Windows DisplayUpdater.Update()
      const bustInit = {
        title: `${init.title}\u200C`,
        artist: init.artist,
        album: init.album,
        artwork: normalizeArtwork(rawCover, 512)
      };
      ms.metadata = new window.MediaMetadata(bustInit);
    }
    ms.metadata = new window.MediaMetadata(init);
    lastMetadataKey = key;
  } catch (e) {
    console.warn('[MediaSession] set metadata failed:', e);
  }
};

const syncMetadata = (force = false) => {
  const ms = getMediaSession();
  if (!ms || !sessionActive || !store) return;
  const song = store.currentSong;
  if (!song) {
    if (lastMetadataKey !== '') {
      try { ms.metadata = null; } catch (e) {}
      lastMetadataKey = '';
      lastSongHash = '';
      pendingConfirmHash = '';
    }
    return;
  }
  pushMetadataToBrowser(song, force);
};

const schedulePostPlayConfirm = (delayMs = 200) => {
  clearConfirmTimer();
  confirmTimer = setTimeout(() => {
    confirmTimer = null;
    if (!sessionActive || !store || !store.currentSong) return;
    pushMetadataToBrowser(store.currentSong, true);
    applyPlaybackState();
    syncPosition();
  }, delayMs);
};

// ---------- 播放状态 ----------

const computePlaybackState = () => {
  if (!store || !store.currentSong) return 'none';
  if (store.isError) return 'paused';
  // 切歌异步解析（isLoading）期间保持 playing 状态，避免锁屏与 Win+A 按钮出现 Playing -> Paused -> Playing 闪烁
  return (store.isPlaying || store.isLoading) ? 'playing' : 'paused';
};

const applyPlaybackState = () => {
  const ms = getMediaSession();
  if (!ms || !sessionActive) return;
  try {
    ms.playbackState = computePlaybackState();
  } catch (e) {}
};

// ---------- 时间轴 ----------

const clearPosition = () => {
  const ms = getMediaSession();
  lastPosition = null;
  if (!ms || typeof ms.setPositionState !== 'function') return;
  try { ms.setPositionState(); } catch (e) {}
};

const syncPosition = () => {
  const ms = getMediaSession();
  if (!ms || !sessionActive || !store || typeof ms.setPositionState !== 'function') return;
  const duration = Number(store.duration);
  if (!store.currentSong || !Number.isFinite(duration) || duration <= 0) {
    clearPosition();
    return;
  }
  const rawPos = Number(store.currentTime);
  const position = Math.min(Math.max(Number.isFinite(rawPos) ? rawPos : 0, 0), duration);
  try {
    ms.setPositionState({ duration, position, playbackRate: 1 });
    lastPosition = { position, duration, at: performance.now(), playing: Boolean(store.isPlaying) };
  } catch (e) {
    console.warn('[MediaSession] setPositionState failed:', e);
  }
};

// currentTime 随 timeupdate 高频变化：仅当与推算值偏差超过阈值（跳转 / 缓冲卡顿）时才校正
const checkPositionDrift = () => {
  if (!sessionActive || !lastPosition || !store) return;
  const elapsed = lastPosition.playing ? (performance.now() - lastPosition.at) / 1000 : 0;
  const expected = Math.min(lastPosition.position + elapsed, lastPosition.duration);
  const actual = Number(store.currentTime) || 0;
  if (Math.abs(actual - expected) > POSITION_DRIFT_TOLERANCE) syncPosition();
};

// ---------- 按钮动作 ----------

const setAction = (action, handler) => {
  const ms = getMediaSession();
  if (!ms) return;
  try {
    ms.setActionHandler(action, handler);
    if (handler) registeredActions.add(action);
    else registeredActions.delete(action);
  } catch (e) {
    // 当前 Chromium 不支持该 action 时忽略
  }
};

const actionHandlers = {
  play: () => {
    if (!store) return;
    if (typeof store.mediaPlay === 'function') store.mediaPlay();
    else store.togglePlay();
    syncKeepAlive();
    syncMetadata(true);
    applyPlaybackState();
    syncPosition();
  },
  pause: () => {
    if (!store) return;
    if (typeof store.mediaPause === 'function') store.mediaPause();
    else if (store.isPlaying) store.togglePlay();
    syncKeepAlive();
    applyPlaybackState();
    syncPosition();
  },
  stop: () => {
    if (!store) return;
    if (typeof store.mediaPause === 'function') store.mediaPause();
    else if (store.isPlaying) store.togglePlay();
    syncKeepAlive();
    applyPlaybackState();
    syncPosition();
  },
  previoustrack: () => {
    if (!store) return;
    store.playPrev();
  },
  nexttrack: () => {
    if (!store) return;
    store.playNext(false);
  },
  seekto: (details) => {
    if (!store || !details || !Number.isFinite(details.seekTime)) return;
    store.seek(details.seekTime);
    syncPosition();
  }
};

const syncActions = () => {
  if (!sessionActive || !store) return;
  const hasSongOrList = Boolean(store.currentSong) || (Array.isArray(store.playlist) && store.playlist.length > 0);
  const hasList = (Array.isArray(store.playlist) && store.playlist.length > 0) || Boolean(store.isFmModePlaylist && store.currentSong);
  const canSeek = Boolean(store.currentSong) && Number(store.duration) > 0;

  setAction('play', hasSongOrList ? actionHandlers.play : null);
  setAction('pause', hasSongOrList ? actionHandlers.pause : null);
  setAction('stop', hasSongOrList ? actionHandlers.stop : null);
  setAction('previoustrack', hasList ? actionHandlers.previoustrack : null);
  setAction('nexttrack', hasList ? actionHandlers.nexttrack : null);
  setAction('seekto', canSeek ? actionHandlers.seekto : null);
};

const clearAll = () => {
  const ms = getMediaSession();
  if (!ms) return;
  for (const action of Array.from(registeredActions)) setAction(action, null);
  try { ms.metadata = null; } catch (e) {}
  try { ms.playbackState = 'none'; } catch (e) {}
  clearPosition();
  lastMetadataKey = '';
  lastSongHash = '';
  pendingConfirmHash = '';
};

const syncAll = () => {
  syncKeepAlive();
  syncMetadata(true);
  syncActions();
  applyPlaybackState();
  syncPosition();
  prewarmAdjacentCovers();
};

// ---------- 对外接口 ----------

export function initMediaSessionBridge(playerStore) {
  if (isDesktopLyricContext()) return () => {};
  if (!getMediaSession() || typeof window.MediaMetadata !== 'function') return () => {};
  disposeMediaSessionBridge();

  store = playerStore;
  sessionActive = getSystemMediaControlsPreference();
  lastSongHash = store.currentSong?.hash || '';

  stopWatchers = [
    watch(
      () => [
        store.currentSong?.hash,
        store.currentSong?.name,
        store.currentSong?._title,
        store.currentSong?.singer,
        store.currentSong?._singer,
        store.currentSong?.album,
        store.currentSong?._album,
        store.currentSong?.cover,
        store.currentSong?._cover,
        store.isCurrentSongPreview
      ],
      () => {
        if (!sessionActive) return;
        const curHash = store.currentSong?.hash || '';
        const isTrackSwitch = Boolean(curHash) && curHash !== lastSongHash;
        if (isTrackSwitch) {
          lastSongHash = curHash;
          pendingConfirmHash = curHash;
        }
        syncKeepAlive(isTrackSwitch);
        syncMetadata(isTrackSwitch);
        syncActions();
        applyPlaybackState();
        syncPosition();
        prewarmAdjacentCovers();
        if (isTrackSwitch && store.isPlaying && !store.isLoading) {
          // 命中预加载瞬切分支时，延迟一拍二次确认，确保 Win+A 快捷面板收到 MediaPropertiesChanged
          schedulePostPlayConfirm(160);
        }
      },
      { flush: 'sync' }
    ),
    watch(
      () => [store.isPlaying, store.isLoading, store.isError],
      ([playing, loading, hasError], prev) => {
        if (!sessionActive) return;
        syncKeepAlive();
        applyPlaybackState();
        syncPosition();
        const prevPlayingSettled = Array.isArray(prev) ? (prev[0] && !prev[1] && !prev[2]) : false;
        const nowPlayingSettled = Boolean(playing && !loading && !hasError);
        // 异步解析歌曲 URL 结束并真正进入播放态时，强制穿透推送一次当前歌曲元数据，覆盖换源空窗期可能丢失的通知
        if (nowPlayingSettled && (!prevPlayingSettled || pendingConfirmHash)) {
          syncMetadata(true);
          schedulePostPlayConfirm(200);
        }
      },
      { flush: 'sync' }
    ),
    watch(
      () => store.duration,
      (dur) => {
        if (!sessionActive) return;
        syncActions();
        syncPosition();
        if (Number(dur) > 0 && pendingConfirmHash && store.currentSong?.hash === pendingConfirmHash) {
          pendingConfirmHash = '';
          syncMetadata(true);
        }
      }
    ),
    watch(
      () => store.playlist.length,
      () => {
        if (!sessionActive) return;
        syncActions();
        prewarmAdjacentCovers();
      }
    ),
    watch(
      () => store.currentTime,
      () => checkPositionDrift()
    )
  ];

  if (sessionActive) syncAll();

  if (window.settingsAPI?.getSystemMediaControls) {
    window.settingsAPI.getSystemMediaControls()
      .then((val) => localStorage.setItem(STORAGE_KEY, String(!!val)))
      .catch(() => {});
  }

  // 以主进程本次启动时是否启用了 SMTC 为准，防止用户关闭开关后在未重启前出现空白卡片
  if (window.settingsAPI?.getSystemMediaControlsSessionActive) {
    window.settingsAPI.getSystemMediaControlsSessionActive()
      .then((active) => {
        const nextActive = !!active;
        if (nextActive !== sessionActive) {
          sessionActive = nextActive;
          if (sessionActive && store) syncAll();
          else syncKeepAlive();
        }
      })
      .catch(() => {});
  }

  return disposeMediaSessionBridge;
}

// 仅更新本地偏好镜像；不清空当前会话 metadata，避免在重启前产生空白锁屏卡片
export function setMediaSessionEnabled(next) {
  localStorage.setItem(STORAGE_KEY, String(!!next));
}

export function disposeMediaSessionBridge() {
  clearConfirmTimer();
  stopWatchers.forEach(stop => { try { stop(); } catch (e) {} });
  stopWatchers = [];
  destroyKeepAliveAudio();
  if (store) clearAll();
  store = null;
}
