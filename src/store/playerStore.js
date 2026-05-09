// ====================
// 文件：src/store/playerStore.js
// ====================
import { defineStore } from 'pinia';
import request from '../utils/request';
import { useUserStore } from './userStore'; 

const restoreCookies = () => {
  const savedCookies = localStorage.getItem('kg_desktop_cookies');
  if (savedCookies) {
    savedCookies.split(';').forEach(c => {
      if (c.trim()) document.cookie = `${c.trim()}; path=/; max-age=31536000`;
    });
  }
};
if (typeof document !== 'undefined') restoreCookies();

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
  if (urlCache.size > 80) urlCache.delete(urlCache.keys().next().value);
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
    high: '', viper_clear: '', viper_atmos: ''
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
    
    volume: Number(localStorage.getItem('kg_desktop_volume') ?? 1),
    savedVolume: 1,
    currentQuality: 'standard',
    
    toastMessage: '',
    toastTimeout: null,

    isCurrentSongPreview: false,

    _errorSkipTimer: null,

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
      if (isConfirm && this.dialogState.onConfirm) {
        this.dialogState.onConfirm();
      } else if (!isConfirm && this.dialogState.onCancel) {
        this.dialogState.onCancel();
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

      const cacheQ = targetQuality || this.currentQuality;
      const cached = getCachedUrl(songInfo.hash, cacheQ);
      
      if (cached) {
          if (hasFullAccess && cached.isPreview) {
              urlCache.delete(`${songInfo.hash}_${cacheQ}`);
          } else {
              return cached;
          }
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

      let finalResult = { url: null, quality: 'standard', isPreview: false };

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

      if (hasFullAccess) {
          for (const qObj of tryQueue) {
            let hashToTry = songInfo.qualities?.[qObj.key];

            if (!hashToTry) hashToTry = songInfo.qualities?.standard || songInfo.hash || songInfo.FileHash;
            if (!hashToTry) continue; 

            try {
              const reqObject = { hash: hashToTry, quality: qObj.param };
              if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
              if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;
              
              const res = await request.get('/song/url', { params: reqObject });
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
           let hashToTry = songInfo.qualities?.standard || songInfo.hash;
           const reqObject = { hash: hashToTry, free_part: 1, quality: '128' };
           if (songInfo.album_id) reqObject.album_id = songInfo.album_id;
           if (songInfo.album_audio_id) reqObject.album_audio_id = songInfo.album_audio_id;
           
           const res = await request.get('/song/url', { params: reqObject });
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

    calculateNextSong() {
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
        if (!isVipSong || isVipUser) playableIndices.push(i);
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
        const res = await this.resolveSongUrl(nextSong);
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
      this.isLoading = true;
      this.isError = false;        
      this.errorMessage = '';
      
      if (maintainTime === 0) {
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

      if (songInfo.hash === preloadState.hash && preloadAudio.src && !targetQuality && maintainTime === 0) {
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
                 playPromise.catch(error => { console.warn("秒播被浏览器打断", error); });
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

      this.currentSong = songInfo;

      const triggerFallback = (reason) => {
        this.isError = true;
        this.errorMessage = `获取失败，已切至兜底音源`;
        activeAudio.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        if (maintainTime > 0) activeAudio.currentTime = maintainTime;
        if (autoPlay) activeAudio.play();
        setTimeout(() => this.clearError(), 5000);
      };

      try {
        const res = await this.resolveSongUrl(songInfo, targetQuality);

        if (res.url) {
          this.currentQuality = res.quality;
          this.isCurrentSongPreview = res.isPreview; 
          activeAudio.src = res.url;
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
          activeAudio.play();
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
        if (!autoPlay) this.isLoading = false;
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

      if (!this.currentSong.qualities || !this.currentSong.qualities[targetQuality]) {
          try {
              let info = null;
              if (this.currentSong.album_audio_id) {
                  const krmRes = await request.get('/krm/audio', { params: { album_audio_id: this.currentSong.album_audio_id, fields: 'audio_info', timestamp: Date.now() }, silent: true });
                  info = krmRes?.data?.audio_info || krmRes?.data?.data?.audio_info;
              } else if (this.currentSong.hash) {
                  const audioRes = await request.get('/audio', { params: { hash: this.currentSong.hash, timestamp: Date.now() }, silent: true });
                  info = audioRes?.data?.audio_info || audioRes?.data || audioRes;
              }

              if (info) {
                  if (!this.currentSong.qualities) this.currentSong.qualities = {};
                  this.currentSong.qualities.hq = info.hash_320 || this.currentSong.qualities.hq;
                  this.currentSong.qualities.sq = info.hash_flac || info.hash_high || this.currentSong.qualities.sq;
                  this.currentSong.qualities.high = info.hash_high || this.currentSong.qualities.high;
                  this.currentSong.qualities.viper_clear = info.hash_viper_clear || this.currentSong.qualities.viper_clear;
                  this.currentSong.qualities.viper_atmos = info.hash_viper_atmos || this.currentSong.qualities.viper_atmos;
              }
          } catch(e) {}
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
      preloadState.hash = null;
      urlCache.clear();
      
      if (!this.currentSong) return;

      const isVipQuality = ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(this.currentQuality);
      const isVipSong = this.currentSong.is_vip || this.currentSong.is_paid;

      if (isVipSong || isVipQuality) {
        this.showToast('✨ 账号已登出，已为您恢复试听限制及标准音质');
        const savedTime = activeAudio.currentTime;
        const wasPlaying = this.isPlaying;
        
        setTimeout(async () => {
           await this.playSong(this.currentSong, 'standard', savedTime, wasPlaying);
        }, 150);
      }
    },

    async reloadCurrentSongForVip() {
      if (!this.currentSong || !this.isCurrentSongPreview) return;
      const savedTime = activeAudio.currentTime;
      const wasPlaying = this.isPlaying;
      
      this.showToast('✨ VIP 身份确认，正在解除限制并为您自动匹配最高音质...');
      
      setTimeout(async () => {
         try {
              let info = null;
              if (this.currentSong.album_audio_id) {
                  const krmRes = await request.get('/krm/audio', { params: { album_audio_id: this.currentSong.album_audio_id, fields: 'audio_info', timestamp: Date.now() }, silent: true });
                  info = krmRes?.data?.audio_info || krmRes?.data?.data?.audio_info;
              } else if (this.currentSong.hash) {
                  const audioRes = await request.get('/audio', { params: { hash: this.currentSong.hash, timestamp: Date.now() }, silent: true });
                  info = audioRes?.data?.audio_info || audioRes?.data || audioRes;
              }

              if (info) {
                  if (!this.currentSong.qualities) this.currentSong.qualities = {};
                  this.currentSong.qualities.hq = info.hash_320 || this.currentSong.qualities.hq;
                  this.currentSong.qualities.sq = info.hash_flac || info.hash_high || this.currentSong.qualities.sq;
                  this.currentSong.qualities.high = info.hash_high || this.currentSong.qualities.high;
                  this.currentSong.qualities.viper_clear = info.hash_viper_clear || this.currentSong.qualities.viper_clear;
                  this.currentSong.qualities.viper_atmos = info.hash_viper_atmos || this.currentSong.qualities.viper_atmos;
              }
         } catch(e) {}

         let bestQuality = 'standard';
         for (const q of QUALITY_CONFIG) {
            if (this.currentSong.qualities && this.currentSong.qualities[q.key]) {
                bestQuality = q.key;
                break;
            }
         }

         await this.playSong(this.currentSong, bestQuality, savedTime, wasPlaying);

         const actualQName = QUALITY_CONFIG.find(q => q.key === this.currentQuality)?.name || '标准音质';
         if (this.currentQuality !== 'standard') {
             this.showToast(`✨ 已成功解锁完整版，并自动为您升级至【${actualQName}】`);
         } else {
             this.showToast(`✨ 已为您无缝解锁完整版音乐`);
         }
      }, 150);
    },

    togglePlay() {
      if (!this.currentSong) return;
      if (this.isPlaying) {
        activeAudio.pause();
        this.isPlaying = false;
      } else {
        activeAudio.play();
        this.isPlaying = true;
      }
      this.syncTrayState();
    },

    seek(time) {
      if (!this.currentSong) return;
      if (this.isCurrentSongPreview && time > 60) {
        time = 60;
      }
      activeAudio.currentTime = time;
      this.currentTime = time;
    },

    clearError() { this.isError = false; this.errorMessage = ''; },

    playPrev() {
      if (this.playlist.length === 0) return;
      if (this.playlist.length === 1) { activeAudio.currentTime = 0; activeAudio.play(); return; }

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
         activeAudio.currentTime = 0; activeAudio.play(); return; 
      }

      if (isAuto && this.playMode === 'loop') {
        activeAudio.currentTime = 0;
        activeAudio.play();
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
      this.playlist.splice(index, 1);
      
      this.triggerPreload();

      if (this.currentSong && this.currentSong.hash === removedSong.hash) {
        activeAudio.pause();
        this.isPlaying = false;
        this.currentSong = null;
        if (this.playlist.length > 0) this.playNext(); 
      }
    },

    clearPlaylist() {
      this.playlist = [];
      activeAudio.pause();
      preloadAudio.pause();
      this.isPlaying = false;
      this.currentSong = null;
      this.isPlaylistVisible = false;
      this.peakMode = false;
      this.peakStartOffset = 0;
      this.peakDuration = 30;
      preloadState.hash = null;
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