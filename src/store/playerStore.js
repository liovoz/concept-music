// ====================
// 文件：src/store/playerStore.js
// ====================
import { defineStore } from 'pinia';
import request from '../utils/request';
import { useUserStore } from './userStore'; 

const audioA = new Audio();
const audioB = new Audio();
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

let audioContext = null;
let audioGraphInitialized = false;
const audioOutputNodes = new WeakMap();

const getStoredBoostLevel = () => {
  const saved = parseFloat(localStorage.getItem(VOLUME_BOOST_LEVEL_KEY));
  return VOLUME_BOOST_LEVELS.includes(saved) ? saved : 1.5;
};

const getInitialBoostEnabled = () => {
  if (localStorage.getItem(VOLUME_BOOST_INITIALIZED_KEY) !== 'true') {
    localStorage.setItem(VOLUME_BOOST_INITIALIZED_KEY, 'true');
    localStorage.setItem(VOLUME_BOOST_ENABLED_KEY, 'false');
    return false;
  }
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

const setAudioSource = (audio, url, useProxy) => {
  const rawUrl = getRawAudioUrl(url);
  audio._rawSourceUrl = rawUrl;
  audio._usingProxy = !!useProxy;
  audio._proxyFallbackAttempted = false;
  audio._proxyRestoreTime = 0;
  audio._proxyResumeOnLoad = false;
  audio.src = useProxy ? buildAudioProxyUrl(rawUrl) : rawUrl;
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

const resetPreloadAudio = () => {
  preloadAudio.pause();
  preloadAudio.removeAttribute('src');
  preloadAudio._rawSourceUrl = '';
  preloadAudio._usingProxy = false;
  preloadAudio._proxyFallbackAttempted = false;
  preloadAudio._proxyRestoreTime = 0;
  preloadAudio._proxyResumeOnLoad = false;
  preloadAudio.load();
  preloadState = {
    hash: null,
    quality: 'standard',
    isPreview: false,
    url: null
  };
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
  { key: 'viper_clear', name: '超清蝰蛇', param: 'viper_clear' },
  { key: 'high', name: '超高无损', param: 'high' },
  { key: 'sq', name: '无损 SQ', param: 'flac' },
  { key: 'hq', name: '高品质 HQ', param: '320' },
  { key: 'standard', name: '标准音质', param: '128' }
];

const extractQualities = (song) => {
  if (!song) return { standard: '', hq: '', sq: '', high: '', viper_clear: '', viper_atmos: '' };
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

const getExpectedDuration = (song) => {
  if (!song || !song._duration) return 0;
  const parts = song._duration.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
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
    playAllHydrationSession: null,
    isPlaylistVisible: false,
    isLyricsVisible: false,
    isDesktopLyricVisible: false, // ✨ 新增：桌面歌词显示状态
    playMode: 'sequence', 
    
    hasReportedCurrentSong: false, 
    
    volume: (() => { const v = parseFloat(localStorage.getItem('kg_desktop_volume')); return (isNaN(v) || v < 0 || v > 1) ? 1 : v; })(),
    volumeBoostEnabled: getInitialBoostEnabled(),
    volumeBoostLevel: getStoredBoostLevel(),
    savedVolume: 1,
    currentQuality: 'standard',
    
    toastMessage: '',
    toastTimeout: null,

    isCurrentSongPreview: false,

    _errorSkipTimer: null,
    _vipActionTimer: null,
    failedSong: null,

    peakMode: false,
    peakStartOffset: 0,
    peakDuration: 30,

    dialogState: {
      visible: false,
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
          this.showToast('音频流发生异常中断，自动为您跳至下一首');
          if (this._errorSkipTimer) clearTimeout(this._errorSkipTimer);
          this._errorSkipTimer = setTimeout(() => { 
            this._errorSkipTimer = null;
            this.currentTime = 0;
            this.playNext(true); 
          }, 2000);
        } else {
          this.currentTime = 0;
          this.playNext(true);
        }
      }
    },

    bindAudioEvents(audioInstance) {
      audioInstance.addEventListener('timeupdate', (e) => { 
        if (e.target !== activeAudio) return;

        if (this.isCurrentSongPreview && activeAudio.currentTime >= 60) {
          if (!activeAudio.paused) {
            activeAudio.pause();
            this.currentTime = 60;
            this.handleSongEnd(false);
          }
        } else {
          this.currentTime = activeAudio.currentTime; 

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
        this.isLoading = false; 
        this.isPlaying = true; 
        this.syncTrayState();
      });
      
      audioInstance.addEventListener('pause', (e) => { 
        if (e.target !== activeAudio) return;
        this.isPlaying = false; 
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

        if (activeAudio._usingProxy && !activeAudio._proxyFallbackAttempted && activeAudio._rawSourceUrl) {
          const savedTime = Number.isFinite(activeAudio._proxyRestoreTime)
            ? activeAudio._proxyRestoreTime
            : (Number.isFinite(activeAudio.currentTime) ? activeAudio.currentTime : this.currentTime);
          const wasPlaying = activeAudio._proxyResumeOnLoad || (this.isPlaying && !activeAudio.paused);
          this.volumeBoostEnabled = false;
          localStorage.setItem(VOLUME_BOOST_ENABLED_KEY, 'false');
          setAudioSource(activeAudio, activeAudio._rawSourceUrl, false);
          activeAudio._proxyFallbackAttempted = true;
          activeAudio._proxyRestoreTime = savedTime;
          activeAudio._proxyResumeOnLoad = wasPlaying;
          this.applyAudioOutputSettings();
          this.showToast('音量增强代理不可用，已恢复普通播放');
          activeAudio.load();
          activeAudio.addEventListener('loadedmetadata', () => {
            if (savedTime > 0) activeAudio.currentTime = savedTime;
            if (wasPlaying) {
              const p = activeAudio.play();
              if (p !== undefined) p.catch(() => { this.isPlaying = false; });
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

    initAudio() {
      this.applyAudioOutputSettings();
      if (!audioEventsBound) {
        this.bindAudioEvents(audioA);
        this.bindAudioEvents(audioB);
        audioEventsBound = true;
      }
      if (this.volumeBoostEnabled) this.ensureBoostAudioOutput();

      if (window.lyricAPI) {
        window.lyricAPI.onControl((cmd) => {
          if (cmd === 'togglePlay') this.togglePlay();
          if (cmd === 'prev') this.playPrev();
          if (cmd === 'next') this.playNext(false);
          if (cmd === 'close') this.toggleDesktopLyric();
        });
        
        // 监听桌面歌词窗口被原生关闭的事件，同步状态
        window.lyricAPI.onClosed(() => {
          this.isDesktopLyricVisible = false;
        });
      }
    },

    showToast(message) {
      this.toastMessage = message;
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => { this.toastMessage = ''; }, 3000);
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
            const p = audio.play();
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
      if (this.volumeBoostEnabled) await this.ensureBoostAudioOutput();
      else this.applyAudioOutputSettings();
    },

    setVolumeBoostLevel(level) {
      const nextLevel = VOLUME_BOOST_LEVELS.includes(Number(level)) ? Number(level) : 1.5;
      this.volumeBoostLevel = nextLevel;
      localStorage.setItem(VOLUME_BOOST_LEVEL_KEY, nextLevel.toString());
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
    toggleLyrics() { this.isLyricsVisible = !this.isLyricsVisible; },

    addToPlaylist(song) {
      if (!song || !song.hash) return;
      const exists = this.playlist.find(s => s.hash === song.hash);
      if (!exists) this.playlist.push(song);
    },

    addSongsToPlaylist(songs = [], options = {}) {
      const incoming = Array.isArray(songs) ? songs.filter(song => song && song.hash) : [];
      let added = 0;
      let skipped = 0;

      incoming.forEach(song => {
        const exists = this.playlist.some(item => item.hash === song.hash);
        if (exists) {
          skipped++;
          return;
        }
        this.playlist.push(song);
        added++;
      });

      if (added > 0) this.triggerPreload();
      if (!options.silent) {
        const skippedText = skipped > 0 ? `，已跳过 ${skipped} 首重复歌曲` : '';
        this.showToast(added > 0 ? `已添加 ${added} 首歌曲${skippedText}` : '歌曲已在播放列表中');
      }
      return { added, skipped, total: incoming.length };
    },

    replacePlaylistAndPlay(songs = [], options = {}) {
      this.cancelPlayAllHydration();
      const incoming = Array.isArray(songs) ? songs.filter(song => song && song.hash) : [];
      const unique = [];
      const seen = new Set();
      incoming.forEach(song => {
        if (seen.has(song.hash)) return;
        seen.add(song.hash);
        unique.push(song);
      });

      if (unique.length === 0) return { added: 0, skipped: incoming.length, total: incoming.length };
      this.playlist = unique;
      const startIndex = Math.max(0, Math.min(options.startIndex || 0, unique.length - 1));
      this.playSong(unique[startIndex]);
      if (!options.silent) this.showToast(`已加入 ${unique.length} 首歌曲并开始播放`);
      return { added: unique.length, skipped: incoming.length - unique.length, total: incoming.length };
    },

    prependPlaylistAndPlay(songs = [], options = {}) {
      if (!options.createHydrationSession) this.cancelPlayAllHydration();
      const incoming = Array.isArray(songs) ? songs.filter(song => song && song.hash) : [];
      const front = [];
      const seen = new Set();

      incoming.forEach(song => {
        if (seen.has(song.hash)) return;
        seen.add(song.hash);
        front.push(song);
      });

      if (front.length === 0) return { added: 0, skipped: incoming.length, total: incoming.length };

      const rest = this.playlist.filter(song => song && song.hash && !seen.has(song.hash));
      this.playlist = [...front, ...rest];
      const sessionId = options.createHydrationSession ? (options.sessionId || `play-all-${Date.now()}-${Math.random().toString(36).slice(2)}`) : null;
      if (sessionId) {
        this.playAllHydrationSession = {
          id: sessionId,
          sourceKey: options.sourceKey || '',
          insertIndex: front.length,
          seenHashes: front.map(song => song.hash),
          startedAt: Date.now()
        };
      }
      this.playSong(front[0]);
      if (!options.silent) {
        const skipped = incoming.length - front.length;
        const skippedText = skipped > 0 ? `，已跳过 ${skipped} 首重复歌曲` : '';
        this.showToast(`优先播放已加载的 ${front.length} 首歌曲${skippedText}`);
      }
      return { added: front.length, skipped: incoming.length - front.length, total: incoming.length, sessionId };
    },

    startPlayAllHydrationSession(songs = [], options = {}) {
      return this.prependPlaylistAndPlay(songs, { ...options, createHydrationSession: true });
    },

    isPlayAllHydrationActive(sessionId) {
      return !!sessionId && this.playAllHydrationSession?.id === sessionId;
    },

    cancelPlayAllHydration(sessionId = null) {
      if (!sessionId || this.playAllHydrationSession?.id === sessionId) {
        this.playAllHydrationSession = null;
      }
    },

    extendPlayAllHydration(sessionId, songs = []) {
      const session = this.playAllHydrationSession;
      if (!session || session.id !== sessionId) {
        return { added: 0, skipped: 0, total: 0, canceled: true };
      }

      const incoming = Array.isArray(songs) ? songs.filter(song => song && song.hash) : [];
      const seen = new Set(session.seenHashes || []);
      const unique = [];

      incoming.forEach(song => {
        if (seen.has(song.hash)) return;
        seen.add(song.hash);
        unique.push(song);
      });

      if (unique.length === 0) {
        this.playAllHydrationSession = { ...session, seenHashes: Array.from(seen) };
        return { added: 0, skipped: incoming.length, total: incoming.length };
      }

      let insertIndex = Math.max(0, Math.min(session.insertIndex || 0, this.playlist.length));
      unique.forEach(song => {
        const existingIndex = this.playlist.findIndex(item => item?.hash === song.hash);
        if (existingIndex !== -1) {
          this.playlist.splice(existingIndex, 1);
          if (existingIndex < insertIndex) insertIndex -= 1;
        }
        this.playlist.splice(insertIndex, 0, song);
        insertIndex += 1;
      });

      this.playAllHydrationSession = {
        ...session,
        insertIndex,
        seenHashes: Array.from(seen)
      };
      this.triggerPreload();
      return { added: unique.length, skipped: incoming.length - unique.length, total: incoming.length };
    },

    appendToPlaylist(song, options = {}) {
      if (!song || !song.hash) return false;
      const exists = this.playlist.some(s => s.hash === song.hash);
      if (exists) {
        if (!options.silent) this.showToast('歌曲已在播放列表中');
        return false;
      }
      this.playlist.push(song);
      if (!options.silent) this.showToast('已添加到播放列表');
      this.triggerPreload();
      return true;
    },

    insertNext(song) {
      if (!song || !song.hash) return false;
      if (this.currentSong?.hash === song.hash) {
        this.showToast('当前歌曲正在播放');
        return false;
      }

      const existingIndex = this.playlist.findIndex(s => s.hash === song.hash);
      if (existingIndex !== -1) this.playlist.splice(existingIndex, 1);

      let currentIndex = this.playlist.findIndex(s => s.hash === this.currentSong?.hash);
      if (this.currentSong && currentIndex === -1) {
        this.playlist.unshift(this.currentSong);
        currentIndex = 0;
      }

      const insertIndex = currentIndex === -1 ? 0 : currentIndex + 1;
      this.playlist.splice(insertIndex, 0, song);
      this.showToast('已添加到下一首播放');
      this.triggerPreload();
      return true;
    },

    async fetchSongQualityInfo(song) {
      if (!song) return;
      if (!song.qualities) song.qualities = extractQualities(song);

      try {
        let info = null;
        if (song.album_audio_id && String(song.album_audio_id) !== '0') {
          const krmRes = await request.get('/krm/audio', { params: { album_audio_id: song.album_audio_id, fields: 'audio_info', timestamp: Date.now() }, silent: true });
          info = krmRes?.data?.audio_info || krmRes?.data?.data?.audio_info || krmRes?.data;
        }
        if (!info && song.hash) {
          const audioRes = await request.get('/audio', { params: { hash: song.hash, timestamp: Date.now() }, silent: true });
          info = audioRes?.data?.audio_info || audioRes?.data?.data?.audio_info || audioRes?.data || audioRes;
        }

        if (info) {
          if (!song.qualities) song.qualities = {};
          if (info.hash_320 && !song.qualities.hq) song.qualities.hq = info.hash_320;
          if (info.hash_flac && !song.qualities.sq) song.qualities.sq = info.hash_flac;
          if (info.hash_high && !song.qualities.high) song.qualities.high = info.hash_high;
          if (info.hash_viper_clear && !song.qualities.viper_clear) song.qualities.viper_clear = info.hash_viper_clear;
          if (info.hash_viper_atmos && !song.qualities.viper_atmos) song.qualities.viper_atmos = info.hash_viper_atmos;

          for (const qKey of Object.keys(song.qualities)) {
            const cacheKey = `${song.hash}_${qKey}`;
            if (urlCache.has(cacheKey)) urlCache.delete(cacheKey);
          }
        }
      } catch (e) {}
    },

    async prepareAutoQuality(song, targetQuality = null) {
      if (!song || targetQuality) return;
      if (!song.qualities) song.qualities = extractQualities(song);

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      const isVipSong = song.is_vip || song.is_paid;
      const hasFullAccess = isVipUser || !isVipSong;
      if (!hasFullAccess) return;

      await this.fetchSongQualityInfo(song);
    },

    getBestAvailableQuality(song) {
      if (!song || !song.qualities) return 'standard';
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
      const modes = ['sequence', 'loop', 'random'];
      const currentIdx = modes.indexOf(this.playMode);
      this.playMode = modes[(currentIdx + 1) % modes.length];
      this.triggerPreload();
      this.syncTrayState();
    },

    async resolveSongUrl(songInfo, targetQuality = null) {
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
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await request.get('/register/dev', { silent: true });
            this.hasDfid = true;
            break;
          } catch (e) {
            if (attempt < 2) await new Promise(r => setTimeout(r, 500));
          }
        }
      }

      let finalResult = { url: null, quality: 'standard', isPreview: false };

      if (isRestrictedSong) {
        try {
           const fallbackHash = songInfo.qualities?.standard || songInfo.hash || songInfo.FileHash || '';
           const reqObject = { hash: fallbackHash, free_part: 1, quality: '128' };
           if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
           if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;

           const res = await request.get('/song/url', { params: reqObject, silent: true });
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
              hash: songInfo.hash,
              album_audio_id: songInfo.album_audio_id,
              album_id: songInfo.album_id || 0,
              timestamp: Date.now()
            },
            silent: true
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

            setCachedUrl(songInfo.hash, q.key, { url: urlMap[paramKey], quality: q.key, isPreview: false });
          }

          for (const q of QUALITY_CONFIG) {
            const paramKey = Object.entries(qualityParamMap).find(([, v]) => v === q.key)?.[0];
            if (!paramKey || !urlMap[paramKey]) continue;
            const isVipQ = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(q.key);
            if (isVipQ && !isVipUser) continue;

            if (!songInfo.qualities) songInfo.qualities = {};
            songInfo.qualities[q.key] = songInfo.qualities[q.key] || urlMap[paramKey];

            finalResult = { url: urlMap[paramKey], quality: q.key, isPreview: false };
            break;
          }

          if (finalResult.url) {
            setCachedUrl(songInfo.hash, cacheQ, finalResult);
            return finalResult;
          }
        } catch (e) {}
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

      const fallbackHash = songInfo.qualities?.standard || songInfo.hash || songInfo.FileHash || '';

      {
          for (const qObj of tryQueue) {
            let hashToTry = songInfo.qualities?.[qObj.key] || fallbackHash;
            if (!hashToTry) continue;

            try {
              const reqObject = { hash: hashToTry, quality: qObj.param };
              if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
              if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;
              
              const res = await request.get('/song/url', { params: reqObject, silent: true });
              const targetObj = res?.data ? res.data : res;
              
              let url = null;
              if (targetObj?.url && targetObj.url.length > 0) {
                url = Array.isArray(targetObj.url) ? targetObj.url[0] : targetObj.url;
              } else if (targetObj?.backupUrl && targetObj.backupUrl.length > 0) {
                url = Array.isArray(targetObj.backupUrl) ? targetObj.backupUrl[0] : targetObj.backupUrl;
              }
              
              if (url && typeof url === 'string' && url.startsWith('http')) {
                finalResult = { url, quality: qObj.key, isPreview: false };
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
           let hashToTry = fallbackHash;
           const reqObject = { hash: hashToTry, free_part: 1, quality: '128' };
           if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
           if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;
           
           const res = await request.get('/song/url', { params: reqObject, silent: true });
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
      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      if (isVipUser) return true;
      if (!(song.is_vip || song.is_paid)) return true;
      const qualities = song.qualities || extractQualities(song);
      return !!(qualities.standard || qualities.hq || song.hash);
    },

    calculateNextSong(isAuto = true) {
      if (this.playlist.length <= 1) return null;
      let nextIndex = this.playlist.findIndex(s => s.hash === this.currentSong?.hash);
      if (nextIndex === -1) return null;

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;

      const playableIndices = [];
      for (let i = 0; i < this.playlist.length; i++) {
        if (i === nextIndex) continue;
        const candidate = this.playlist[i];
        const isVipSong = candidate.is_vip || candidate.is_paid;
        if (!isVipSong || isVipUser || !isAuto || this.canTryFullPlayback(candidate)) playableIndices.push(i);
      }

      if (playableIndices.length === 0) return null;

      if (this.playMode === 'random') {
        const rand = playableIndices[Math.floor(Math.random() * playableIndices.length)];
        return this.playlist[rand];
      } else {
        let sequential = playableIndices.find(i => i > nextIndex);
        if (sequential === undefined) sequential = playableIndices[0];
        return this.playlist[sequential];
      }
    },

    async triggerPreload() {
      const nextSong = this.calculateNextSong();
      if (!nextSong || preloadState.hash === nextSong.hash) return;

      try {
        if (!nextSong.qualities) nextSong.qualities = extractQualities(nextSong);
        await this.prepareAutoQuality(nextSong, null);
        const res = await this.resolveSongUrl(nextSong, null);
        if (res && res.url) {
          setAudioSource(preloadAudio, res.url, shouldUseAudioProxy(this));
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

    async playSong(songInfo, targetQuality = null, maintainTime = 0, autoPlay = true) {
      if (this._errorSkipTimer) { clearTimeout(this._errorSkipTimer); this._errorSkipTimer = null; }
      if (this._vipActionTimer) { clearTimeout(this._vipActionTimer); this._vipActionTimer = null; }
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
      const isSongChange = !previousSong || previousSong.hash !== songInfo.hash;
      
      if (isSongChange && maintainTime === 0) {
        activeAudio.pause();
        this.isPlaying = false;
      } else if (maintainTime === 0) {
        this.currentTime = 0;
        this.isCurrentSongPreview = false;
      }

      if (this.peakMode && songInfo.hash !== this.currentSong?.hash) {
        const isInPlaylist = this.playlist.some(s => s.hash === songInfo.hash);
        if (!isInPlaylist) {
          this.peakMode = false;
          this.peakStartOffset = 0;
          this.peakDuration = 30;
        }
      }

      if (maintainTime === 0 || !this.currentSong || this.currentSong.hash !== songInfo.hash) {
          this.hasReportedCurrentSong = false;
      }

      const exists = this.playlist.find(s => s.hash === songInfo.hash);
      if (!exists) this.playlist.push(songInfo);

      if (!songInfo.qualities) songInfo.qualities = extractQualities(songInfo);

      const userStore = useUserStore();

      const autoTargetQuality = targetQuality;

      if (songInfo.hash === preloadState.hash && preloadAudio.src && (!autoTargetQuality || preloadState.quality === autoTargetQuality) && maintainTime === 0) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          
          const tempAudio = activeAudio;
          activeAudio = preloadAudio;
          preloadAudio = tempAudio;

          this.currentSong = songInfo;
          this.currentQuality = preloadState.quality;
          this.isCurrentSongPreview = preloadState.isPreview;

          if (activeAudio.duration && isFinite(activeAudio.duration)) {
            if (this.isCurrentSongPreview && activeAudio.duration > 60) {
              this.duration = 60;
            } else {
              this.duration = activeAudio.duration;
            }
          }

          if (this.isCurrentSongPreview) this.showToast(getPreviewToastMessage(userStore));

          if (autoPlay) {
             const playPromise = activeAudio.play();
             if (playPromise !== undefined) {
                 playPromise.catch(() => { this.isPlaying = false; });
             }
             this.isPlaying = true;
          } else {
             this.isPlaying = false;
          }
          
          this.clearError();
          this.isLoading = false;

          preloadState.hash = null;
          this.triggerPreload();
          this.syncTrayState();
          return;
      }

      const thisPlayVersion = ++playVersion;

      const triggerFallback = (reason) => {
        this.isLoading = false;
        this.isError = true;
        this.isPlaying = false;
        this.failedSong = songInfo;
        const isVipSong = songInfo.is_vip || songInfo.is_paid;
        const userStore = useUserStore();
        if (isVipSong && !userStore.isLoggedIn) {
          this.errorMessage = 'VIP 歌曲需要登录后播放';
        } else {
          this.errorMessage = '音频获取失败，请尝试其他歌曲';
        }
        if (!previousSong) {
          activeAudio.pause();
          activeAudio.removeAttribute('src');
          activeAudio._rawSourceUrl = '';
          activeAudio._usingProxy = false;
          activeAudio._proxyFallbackAttempted = false;
          activeAudio._proxyRestoreTime = 0;
          activeAudio._proxyResumeOnLoad = false;
          activeAudio.load();
          this.currentSong = null;
          this.currentQuality = 'standard';
          this.currentTime = 0;
          this.duration = 0;
          this.isCurrentSongPreview = false;
        } else {
          this.currentSong = previousSong;
          this.currentQuality = previousPlaybackState.currentQuality;
          this.currentTime = previousPlaybackState.currentTime;
          this.duration = previousPlaybackState.duration;
          this.isCurrentSongPreview = previousPlaybackState.isCurrentSongPreview;
          if (previousPlaybackState.wasPlaying) {
            const resumePromise = activeAudio.play();
            if (resumePromise !== undefined) {
              resumePromise
                .then(() => { this.isPlaying = true; })
                .catch(() => { this.isPlaying = false; });
            }
          }
        }
        setTimeout(() => this.clearError(), 5000);
      };

      try {
        await this.prepareAutoQuality(songInfo, targetQuality);
        const res = await this.resolveSongUrl(songInfo, targetQuality);

        if (thisPlayVersion !== playVersion) {
          this.isLoading = false;
          return;
        }

        if (res?.url) {
          this.failedSong = null;
          this.currentSong = songInfo;
          this.currentQuality = res.quality;
          this.isCurrentSongPreview = res.isPreview; 
          setAudioSource(activeAudio, res.url, shouldUseAudioProxy(this));
          if (maintainTime === 0) this.currentTime = 0;
          if (res.isPreview && autoPlay) this.showToast(getPreviewToastMessage(userStore));
        } else {
          triggerFallback('所有音质接口均拒绝访问');
          return;
        }

        let actualTime = maintainTime;
        if (res.isPreview && actualTime > 59) {
            actualTime = 59.5; 
        }

        if (actualTime > 0) activeAudio.currentTime = actualTime;

        if (autoPlay) {
          const playPromise = activeAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("播放被浏览器打断", error);
              this.isPlaying = false;
              this.isLoading = false;
            });
          }
          this.isPlaying = true;
        } else {
          activeAudio.pause();
          this.isPlaying = false;
        }
        this.clearError();

        this.triggerPreload();
        this.syncTrayState();

      } catch (error) {
        triggerFallback('网络请求异常');
      } finally {
        this.isLoading = false;
      }
    },

    async switchQuality(targetQuality) {
      if (!this.currentSong || this.currentQuality === targetQuality) return;

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;
      const isVipQuality = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(targetQuality);

      if (isVipQuality && !isVipUser) {
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

      await this.fetchSongQualityInfo(this.currentSong);

      for (const q of [...QUALITY_CONFIG, { key: 'best' }, { key: 'hq' }]) {
        const cacheKey = `${this.currentSong.hash}_${q.key}`;
        if (urlCache.has(cacheKey)) urlCache.delete(cacheKey);
      }

      const savedTime = activeAudio.currentTime;
      const wasPlaying = this.isPlaying;

      await this.playSong(this.currentSong, targetQuality, savedTime, wasPlaying);

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
      clearUrlResolutionState();
      this.hasDfid = false;
      
      if (!this.currentSong) return;

      const isVipQuality = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(this.currentQuality);
      const isVipSong = this.currentSong.is_vip || this.currentSong.is_paid;

      if (isVipSong || isVipQuality) {
        this.showToast('✨ 账号已登出，当前歌曲可继续播放，切换歌曲后将恢复试听限制');
      }
    },

    async reloadCurrentSongForVip() {
      if (!this.currentSong) return;
      const savedTime = activeAudio.currentTime;
      const wasPlaying = this.isPlaying;
      const songRef = this.currentSong;
      if (this._vipActionTimer) clearTimeout(this._vipActionTimer);
      this._vipActionTimer = setTimeout(async () => {
         if (this.currentSong !== songRef) return;

         await this.fetchSongQualityInfo(songRef);
         const bestQuality = this.getBestAvailableQuality(songRef);
         if (!this.isCurrentSongPreview && this.currentQuality === bestQuality) return;

         clearUrlResolutionState();

         if (this.isCurrentSongPreview) {
           this.showToast('✨ VIP 身份确认，正在解除限制并为您自动匹配最高音质...');
         } else {
           this.showToast('✨ VIP 身份确认，正在为您升级至最高音质...');
         }

         try {
           const res = await this.resolveSongUrl(songRef, null);
           if (this.currentSong !== songRef) return;

           if (res?.url) {
             const shouldSwapSource = res.quality !== this.currentQuality || res.isPreview !== this.isCurrentSongPreview || activeAudio._rawSourceUrl !== res.url;
             if (!shouldSwapSource) return;

             this.currentQuality = res.quality;
             this.isCurrentSongPreview = res.isPreview;
             setAudioSource(activeAudio, res.url, shouldUseAudioProxy(this));
             if (res.isPreview && savedTime > 59) {
               activeAudio.currentTime = 59.5;
             } else {
               activeAudio.currentTime = savedTime;
             }
             if (wasPlaying) {
               const p = activeAudio.play();
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
        clearUrlResolutionState();
        this.hasDfid = false;
        return;
      }
      if (this.currentSong) {
        this.reloadCurrentSongForVip();
      }
    },

    togglePlay() {
      if (this.isError) {
        const retrySong = this.failedSong || this.currentSong;
        if (retrySong) this.playSong(retrySong);
        else this.clearError();
        return;
      }
      if (!this.currentSong) return;
      if (this.isPlaying) {
        activeAudio.pause();
        this.isPlaying = false;
      } else {
        const playPromise = activeAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => { this.isPlaying = false; });
        }
        this.isPlaying = true;
      }
      this.syncTrayState();
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
      activeAudio.currentTime = time;
      this.currentTime = time;
    },

    clearError() { this.isError = false; this.errorMessage = ''; this.failedSong = null; },

    playPrev() {
      if (this.playlist.length === 0) return;
      if (this.playlist.length === 1) { activeAudio.currentTime = 0; const p = activeAudio.play(); if (p !== undefined) p.catch(() => {}); return; }

      let prevIndex;
      if (this.playMode === 'random') {
        if (this.playlist.length > 1) {
          const currentIndex = this.playlist.findIndex(s => s.hash === this.currentSong?.hash);
          let rand;
          do { rand = Math.floor(Math.random() * this.playlist.length); } while (rand === currentIndex);
          prevIndex = rand;
        } else {
          prevIndex = 0;
        }
      } else {
        const currentIndex = this.playlist.findIndex(s => s.hash === this.currentSong?.hash);
        prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = this.playlist.length - 1;
      }
      this.playSong(this.playlist[prevIndex]);
    },

    playNext(isAuto = false) {
      if (this.playlist.length === 0) return;
      
      if (this.playlist.length === 1) {
         activeAudio.currentTime = 0; const p = activeAudio.play(); if (p !== undefined) p.catch(() => {}); return; 
      }

      if (isAuto && this.playMode === 'loop') {
        activeAudio.currentTime = 0;
        const p = activeAudio.play(); if (p !== undefined) p.catch(() => {});
        return;
      }

      const userStore = useUserStore();
      const isVipUser = userStore.isLoggedIn && userStore.userInfo?.vip > 0;

      let nextIndex = this.playlist.findIndex(s => s.hash === this.currentSong?.hash);
      if (nextIndex === -1) nextIndex = 0;

      if (this.playMode === 'random') {
        const playableIndices = [];
        for (let i = 0; i < this.playlist.length; i++) {
          if (i === nextIndex) continue;
          const candidate = this.playlist[i];
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
        this.playSong(this.playlist[rand]);
        return;
      }

      let attempts = 0;
      let skippedCount = 0;

      while (attempts < this.playlist.length) {
        attempts++;

        nextIndex++;
        if (nextIndex >= this.playlist.length) nextIndex = 0;

        const candidate = this.playlist[nextIndex];
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
      
      this.playSong(this.playlist[nextIndex]);
    },

    removeFromPlaylist(index) {
      const removedSong = this.playlist[index];
      if (!removedSong) return;
      const removedHash = removedSong.hash;
      const isCurrentSong = this.currentSong && this.currentSong.hash === removedHash;
      
      this.playlist.splice(index, 1);
      
      if (isCurrentSong) {
        activeAudio.pause();
        activeAudio.src = '';
        activeAudio._rawSourceUrl = '';
        activeAudio._usingProxy = false;
        activeAudio._proxyFallbackAttempted = false;
        activeAudio._proxyRestoreTime = 0;
        activeAudio._proxyResumeOnLoad = false;
        this.isPlaying = false;
        this.isCurrentSongPreview = false;
        this.currentSong = null;
        this.currentQuality = 'standard';
        this.isError = false;
        this.errorMessage = '';
        this.failedSong = null;
        
        if (this.playlist.length > 0) {
          const nextIndex = Math.min(index, this.playlist.length - 1);
          this.playSong(this.playlist[nextIndex]);
        }
      }
      
      this.triggerPreload();
    },

    clearPlaylist() {
      this.cancelPlayAllHydration();
      this.playlist = [];
      activeAudio.pause();
      preloadAudio.pause();
      activeAudio.removeAttribute('src');
      preloadAudio.removeAttribute('src');
      activeAudio._rawSourceUrl = '';
      activeAudio._usingProxy = false;
      activeAudio._proxyFallbackAttempted = false;
      activeAudio._proxyRestoreTime = 0;
      activeAudio._proxyResumeOnLoad = false;
      preloadAudio._rawSourceUrl = '';
      preloadAudio._usingProxy = false;
      preloadAudio._proxyFallbackAttempted = false;
      preloadAudio._proxyRestoreTime = 0;
      preloadAudio._proxyResumeOnLoad = false;
      this.isPlaying = false;
      this.currentSong = null;
      this.currentTime = 0;
      this.duration = 0;
      this.isLoading = false;
      this.isCurrentSongPreview = false;
      this.isError = false;
      this.errorMessage = '';
      this.failedSong = null;
      this.currentQuality = 'standard';
      this.isPlaylistVisible = false;
      this.peakMode = false;
      this.peakStartOffset = 0;
      this.peakDuration = 30;
      preloadState.hash = null;
      if (this._vipActionTimer) { clearTimeout(this._vipActionTimer); this._vipActionTimer = null; }
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
