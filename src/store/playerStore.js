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

const resetPreloadAudio = () => {
  preloadAudio.pause();
  preloadAudio.removeAttribute('src');
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
    isPlaylistVisible: false,
    isLyricsVisible: false,
    isDesktopLyricVisible: false, // ✨ 新增：桌面歌词显示状态
    playMode: 'sequence', 
    
    hasReportedCurrentSong: false, 
    
    volume: (() => { const v = parseFloat(localStorage.getItem('kg_desktop_volume')); return (isNaN(v) || v < 0 || v > 1) ? 1 : v; })(),
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
      audioA.volume = this.volume;
      audioB.volume = this.volume;
      if (!audioEventsBound) {
        this.bindAudioEvents(audioA);
        this.bindAudioEvents(audioB);
        audioEventsBound = true;
      }

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
      audioA.volume = v;
      audioB.volume = v;
      localStorage.setItem('kg_desktop_volume', v.toString());
      if (v > 0) this.savedVolume = v;
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

    async _doResolveSongUrl(songInfo, targetQuality, cacheQ, hasFullAccess, isVipUser) {
      const cached = getCachedUrl(songInfo.hash, cacheQ);
      
      if (cached) {
          if (hasFullAccess && cached.isPreview) {
              urlCache.delete(`${songInfo.hash}_${cacheQ}`);
          } else {
              return cached;
          }
      }

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
        if (!isVipSong || isVipUser || !isAuto) playableIndices.push(i);
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
          preloadAudio.src = res.url;
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

          if (this.isCurrentSongPreview) this.showToast('正在试听 VIP 歌曲片段，登录解锁完整版');

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
          activeAudio.src = res.url;
          if (maintainTime === 0) this.currentTime = 0;
          if (res.isPreview && autoPlay) this.showToast('正在试听 VIP 歌曲片段，登录解锁完整版');
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
      clearUrlResolutionState();
      
      if (this.isCurrentSongPreview) {
        this.showToast('✨ VIP 身份确认，正在解除限制并为您自动匹配最高音质...');
      } else {
        this.showToast('✨ VIP 身份确认，正在为您升级至最高音质...');
      }
      
      const songRef = this.currentSong;
      if (this._vipActionTimer) clearTimeout(this._vipActionTimer);
      this._vipActionTimer = setTimeout(async () => {
         if (this.currentSong !== songRef) return;

         await this.fetchSongQualityInfo(songRef);

         try {
           const res = await this.resolveSongUrl(songRef, null);
           if (this.currentSong !== songRef) return;

           if (res?.url) {
             this.currentQuality = res.quality;
             this.isCurrentSongPreview = res.isPreview;
             activeAudio.src = res.url;
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
      clearUrlResolutionState();
      if (reason === 'logout' || reason === 'vip-downgrade') {
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
      this.playlist = [];
      activeAudio.pause();
      preloadAudio.pause();
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
