// ====================
// 文件：src/store/userStore.js
// ====================
import { defineStore } from 'pinia';
import request from '../utils/request';
import { usePlayerStore } from './playerStore';

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: localStorage.getItem('kg_desktop_isLoggedIn') === 'true',
    userInfo: JSON.parse(localStorage.getItem('kg_desktop_userInfo') || '{"nickname":"","avatar":"","vip":0}'),
    showLoginModal: false,
    
    likedPlaylistGlobalId: null, 
    likedListId: null,             
    likedHashes: [],
    likedPlaylistCover: '', 
    likedFilesMap: {},
    
    collectedListIds: [], 
    createdListIds: [],   
    playlistMap: {},      
    collectedMap: JSON.parse(localStorage.getItem('kg_desktop_collected_map') || '{}'),
    
    deletedPlaylistIds: JSON.parse(localStorage.getItem('kg_desktop_deleted_playlists') || '[]'),
    
    vipState: JSON.parse(localStorage.getItem('kg_desktop_vip_state') || '{"date":"","count":0,"lastTime":0}'),
    dayVipState: { date: '', uid: '', claimed: false },
    vipExpirationTime: localStorage.getItem('kg_desktop_vip_expire') || '', 
    vipLevelName: localStorage.getItem('kg_desktop_vip_name') || '普通用户',
    
    localHistory: JSON.parse(localStorage.getItem('kg_desktop_local_history') || '[]'),
    localPlayCounts: JSON.parse(localStorage.getItem('kg_desktop_local_play_counts') || '{}'),
    
    isVipProcessing: false,
    isDayVipProcessing: false
  }),

  actions: {
    openLoginModal() { this.showLoginModal = true; },
    closeLoginModal() { this.showLoginModal = false; },

    addLocalHistory(songObj) {
      const hash = (songObj._hash || '').toUpperCase();
      if (!hash) return;

      this.localHistory = this.localHistory.filter(s => (s._hash || '').toUpperCase() !== hash);
      this.localHistory.unshift(songObj);
      if (this.localHistory.length > 100) this.localHistory.pop();
      localStorage.setItem('kg_desktop_local_history', JSON.stringify(this.localHistory));

      if (!this.localPlayCounts) this.localPlayCounts = {};
      this.localPlayCounts[hash] = (this.localPlayCounts[hash] || 0) + 1;
      localStorage.setItem('kg_desktop_local_play_counts', JSON.stringify(this.localPlayCounts));
    },

    async fetchVipDetail() {
      if (!this.isLoggedIn) return;
      try {
        const res = await request.get('/user/vip/detail', { params: { timestamp: Date.now() }, silent: true });
        if (res && res.data) {
          const data = res.data;
          let isVip = false;
          let expireTime = '';
          let levelName = '普通用户';

          if (data.vip_type > 0 || data.m_vip_type > 0) {
             const now = Date.now();
             const mainExpireTs = new Date((data.vip_end_time || data.m_y_endtime || '').replace(/-/g, '/')).getTime();
             if (mainExpireTs > now) {
                isVip = true;
                expireTime = data.vip_end_time || data.m_y_endtime;
                levelName = data.vip_type > 0 ? '👑 酷狗超级 VIP' : '🎵 酷狗音乐包';
             }
          }

          if (data.busi_vip && Array.isArray(data.busi_vip)) {
             const conceptVips = data.busi_vip.filter(v => v.busi_type === 'concept' && v.is_vip === 1);
             if (conceptVips.length > 0) {
                const latestVip = conceptVips.reduce((latest, current) => {
                   const latestTime = new Date((latest.vip_end_time || '').replace(/-/g, '/')).getTime() || 0;
                   const currentTime = new Date((current.vip_end_time || '').replace(/-/g, '/')).getTime() || 0;
                   return currentTime > latestTime ? current : latest;
                }, conceptVips[0]);

                const now = Date.now();
                const expireTs = new Date((latestVip.vip_end_time || '').replace(/-/g, '/')).getTime();

                if (expireTs > now) {
                    isVip = true;
                    expireTime = latestVip.vip_end_time;
                    levelName = latestVip.product_type === 'svip' ? '🎁 概念版专属 SVIP' : '🎁 概念版白嫖 VIP';
                }
             }
          }

          this.vipExpirationTime = expireTime;
          this.vipLevelName = levelName;
          localStorage.setItem('kg_desktop_vip_expire', expireTime);
          localStorage.setItem('kg_desktop_vip_name', levelName);

          if (this.userInfo) {
             this.userInfo.vip = isVip ? 1 : 0;
             localStorage.setItem('kg_desktop_userInfo', JSON.stringify(this.userInfo));
          }
        }
      } catch (e) {}
    },

    checkVipReset() {
      const today = new Date().toLocaleDateString('zh-CN');
      if (this.vipState.date !== today) {
        this.vipState = { date: today, count: 0, lastTime: 0 };
        this.saveVipState();
      }
    },

    checkDayVipReset() {
      if (!this.isLoggedIn || !this.userInfo) return;
      
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const currentUid = this.userInfo.userid || this.userInfo.nickname || 'unknown_user'; 

      let allStates = {};
      try {
         allStates = JSON.parse(localStorage.getItem('kg_desktop_day_vip_states') || '{}');
      } catch (e) {}

      if (allStates[currentUid] === todayStr) {
        this.dayVipState = { date: todayStr, uid: currentUid, claimed: true };
      } else {
        this.dayVipState = { date: todayStr, uid: currentUid, claimed: false };
      }
    },

    saveVipState() {
      localStorage.setItem('kg_desktop_vip_state', JSON.stringify(this.vipState));
    },

    saveDayVipState() {
      if (this.dayVipState.claimed && this.dayVipState.uid) {
         let allStates = {};
         try {
            allStates = JSON.parse(localStorage.getItem('kg_desktop_day_vip_states') || '{}');
         } catch (e) {}
         allStates[this.dayVipState.uid] = this.dayVipState.date;
         localStorage.setItem('kg_desktop_day_vip_states', JSON.stringify(allStates));
      }
    },

    async claimOneDayVip() {
      if (!this.isLoggedIn) return { success: false, msg: '请先登录' };
      
      this.checkDayVipReset();
      if (this.dayVipState.claimed) return { success: false, msg: '今日已领取，请明日再来' };

      this.isDayVipProcessing = true;
      try {
        const d = new Date();
        const apiDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        let resDay = null;
        try {
           resDay = await request.get('/youth/day/vip', { 
             params: { receive_day: apiDateStr, timestamp: Date.now() } 
           });
        } catch (e) {
           resDay = e; 
        }

        let isSuccess = false;
        let msg = '';

        if (resDay && (resDay.status === 1 || resDay.error_code === 0)) {
           isSuccess = true;
           msg = '🎉 1天 VIP 领取成功！';
        } else {
           const errMsg = resDay?.error_msg || resDay?.message || resDay?.response?.data?.error_msg || '';
           const errCode = resDay?.error_code || resDay?.response?.data?.error_code;

           if (errCode === 131001 || errMsg.includes('上限') || errMsg.includes('完成') || errMsg.includes('领取过') || errMsg.includes('已经')) {
              isSuccess = true; 
              msg = '云端显示今日额度已达上限，本地状态已自动同步修正！';
           } else if (errMsg.includes('502') || errMsg.includes('500') || errMsg.includes('504')) {
              msg = '酷狗服务器繁忙，系统稍后重试';
           } else {
              msg = errMsg || '网络波动或风控拦截，请稍后重试';
           }
        }

        if (isSuccess) {
           await request.get('/youth/day/vip/upgrade', { params: { timestamp: Date.now() } }).catch(() => {});
           
           this.dayVipState.claimed = true;
           this.saveDayVipState();

           await this.fetchVipDetail();
           await this.fetchUserInfo();
           
           return { success: true, msg: `${msg} 预计延期至：${this.vipExpirationTime}` };
        } else {
           return { success: false, msg };
        }

      } catch (error) {
        return { success: false, msg: '发生严重异常，操作被终止' };
      } finally {
        this.isDayVipProcessing = false;
      }
    },

    async claimDailyVip() {
      if (!this.isLoggedIn) return { success: false, msg: '请先登录' };
      this.checkVipReset();
      if (this.vipState.count >= 8) return { success: false, msg: '今日额度已达上限' };
      
      const now = Date.now();
      const COOLDOWN_MS = 60 * 60 * 1000;
      if (now - this.vipState.lastTime < COOLDOWN_MS) return { success: false, msg: '冷却中，请稍后再试' };

      this.isVipProcessing = true;
      try {
        const res = await request.get('/youth/vip');
        
        if (res && (res.status === 1 || res.error_code === 0)) {
          if (res.data && typeof res.data.done === 'number') {
            this.vipState.count = res.data.done; 
          } else {
            this.vipState.count += 1;
          }
          
          if (res.data && typeof res.data.remain === 'number' && res.data.remain === 0) {
            this.vipState.count = res.data.total || 8;
          }

          this.vipState.lastTime = Date.now();
          this.saveVipState();
          
          const oldTime = this.vipExpirationTime;
          await this.fetchVipDetail();
          await this.fetchUserInfo();
          
          let displayTime = this.vipExpirationTime;
          if (displayTime === oldTime) {
            const addHours = res.data?.award_vip_hour || 3;
            const estimate = new Date(Date.now() + addHours * 60 * 60 * 1000);
            displayTime = `预计至 ${estimate.getHours()}:${estimate.getMinutes()}`;
          }

          const total = res.data?.total || 8;
          return { success: true, msg: `🎉 领取成功！VIP 已延期至：${displayTime} (${this.vipState.count}/${total})` };
        } else {
          const errMsg = res?.error_msg || res?.message || '';
          if (errMsg.includes('上限') || errMsg.includes('完成') || errMsg.includes('频繁')) {
            if (errMsg.includes('上限') || errMsg.includes('完成')) {
                this.vipState.count = 8; 
                this.saveVipState();
                return { success: false, msg: '今日额度云端已满，状态已自动修复' };
            }
          }

          this.vipState.lastTime = Date.now() - (50 * 60 * 1000); 
          this.saveVipState();
          return { success: false, msg: errMsg || '操作过于频繁，已进入防风控冷却' };
        }
      } catch (e) {
        this.vipState.lastTime = Date.now() - (55 * 60 * 1000); 
        this.saveVipState();
        return { success: false, msg: '接口网络波动，请稍后再试' };
      } finally {
        this.isVipProcessing = false;
      }
    },

    async fetchLikedPlaylistMeta() {
      try {
        const res = await request.get('/user/playlist', { params: { page: 1, pagesize: 1000, timestamp: Date.now() }, silent: true });
        if (res?.data?.info && Array.isArray(res.data.info)) {
          
          this.collectedListIds = [];
          this.createdListIds = [];
          this.playlistMap = {};
          
          let likedList = res.data.info.find(p => p.name === '默认收藏');
          if (!likedList) likedList = res.data.info.find(p => p.name === '我喜欢');

          const likedGid = likedList ? String(likedList.global_collection_id || likedList.specialid || likedList.listid) : null;

          res.data.info.forEach(p => {
             const gid = String(p.global_collection_id || p.listid || p.specialid);
             const lid = String(p.listid);
             
             if (this.deletedPlaylistIds.includes(gid) || this.deletedPlaylistIds.includes(lid)) return;

             this.playlistMap[gid] = p.listid;
             const isCollected = p.source === 1;
             
             if (gid === likedGid) {
                 this.createdListIds.push(gid);
             } else if (!isCollected) {
                 this.createdListIds.push(gid);
             } else {
                 this.collectedListIds.push(gid);
             }
          });

          if (likedList) {
            this.likedPlaylistGlobalId = likedList.global_collection_id || likedList.listid;
            this.likedListId = likedList.listid;
            try {
              const tracksRes = await request.get('/playlist/track/all', {
                params: { id: this.likedPlaylistGlobalId, page: 1, pagesize: 1000, timestamp: Date.now() },
                silent: true
              });
              if (tracksRes && (tracksRes.status === 1 || tracksRes.error_code === 0)) {
                 this.likedHashes = [];
                 this.likedFilesMap = {}; 
                 let firstCover = ''; 

                 const validArr = [];
                 const traverse = (d, depth) => {
                   if (depth > 6 || !d || validArr.length > 0) return;
                   if (Array.isArray(d)) { if (d.length > 0 && (d[0].hash || d[0].filehash)) validArr.push(...d); return; }
                   if (typeof d === 'object') Object.values(d).forEach(v => traverse(v, depth+1));
                 };
                 traverse(tracksRes, 0);

                 validArr.forEach(s => {
                    const h = (s.hash || s.FileHash || s.filehash || '').toUpperCase();
                    if (h) { 
                      this.likedHashes.push(h); 
                      this.likedFilesMap[h] = s.fileid || s.id || ''; 
                      
                      if (!firstCover) {
                          let c = s.cover || s.Image || s.pic || s.union_cover || '';
                          if (!c && s.albuminfo && s.albuminfo.cover) c = s.albuminfo.cover;
                          if (c && typeof c === 'string') firstCover = c.replace(/\{size\}/g, '400');
                      }
                    }
                 });
                 if (firstCover) this.likedPlaylistCover = firstCover;
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    },

    async toggleLikeSong(song) {
      if (!this.isLoggedIn) return this.openLoginModal();
      const playerStore = usePlayerStore();
      
      if (!this.likedListId) {
        playerStore.showToast('未能获取到默认收藏夹，请重新登录同步数据');
        return;
      }
      
      const hash = (song.hash || '').toUpperCase();
      if (!hash) return;
      
      const isLiked = this.likedHashes.includes(hash);
      
      try {
        if (isLiked) {
          const fileid = this.likedFilesMap[hash];
          if (!fileid) throw new Error('缺失文件唯一标识，请刷新页面重试');
          
          const res = await request.get('/playlist/tracks/del', {
            params: { listid: this.likedListId, fileids: fileid, timestamp: Date.now() }
          });
          if (res && (res.status === 1 || res.error_code === 0)) {
            this.likedHashes = this.likedHashes.filter(h => h !== hash);
            delete this.likedFilesMap[hash];
            playerStore.showToast('已取消喜欢');
            this.fetchLikedPlaylistMeta(); 
          } else {
            throw new Error('取消喜欢失败');
          }
        } else {
          const name = (song.name || '未知歌曲').replace(/\|/g, '').replace(/,/g, '');
          const albumId = song.album_id || '';
          const mixId = song.album_audio_id || '';
          const dataStr = `${name}|${hash}|${albumId}|${mixId}`;
          
          const res = await request.get('/playlist/tracks/add', {
            params: { listid: this.likedListId, data: dataStr, timestamp: Date.now() }
          });
          
          if (res && (res.status === 1 || res.error_code === 0)) {
            this.likedHashes.push(hash);
            if (song.cover) this.likedPlaylistCover = song.cover.replace(/\{size\}/g, '400');
            playerStore.showToast('已添加到我喜欢的音乐');
            this.fetchLikedPlaylistMeta();
          } else {
            throw new Error('添加喜欢失败');
          }
        }
      } catch (e) {
        playerStore.showToast(e.message || '操作失败，请检查网络');
      }
    },

    async fetchUserInfo() {
      try {
        await request.get('/register/dev', { silent: true }).catch(() => {});

        const res = await request.get('/user/detail', { params: { timestamp: Date.now() }, silent: true });
        let info = null;
        const traverse = (data) => {
          if (info) return;
          if (data && (data.nickname || data.username)) { info = data; return; }
          if (data && typeof data === 'object') Object.values(data).forEach(traverse);
        }
        traverse(res);

        if (info) {
          const isVip = (info.vip_type > 0 || info.m_vip_type > 0) || 
            (this.vipExpirationTime && new Date(this.vipExpirationTime.replace(/-/g, '/')).getTime() > Date.now());
          this.userInfo = {
            userid: String(info.userid || info.uid || info.id || ''),
            nickname: info.nickname || info.username || '概念版用户',
            avatar: info.pic || info.avatar || info.head_img || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&q=80',
            vip: isVip ? 1 : 0
          };
          this.isLoggedIn = true;
          localStorage.setItem('kg_desktop_isLoggedIn', 'true');
          localStorage.setItem('kg_desktop_userInfo', JSON.stringify(this.userInfo));
          
          this.fetchLikedPlaylistMeta(); 
          await this.fetchVipDetail(); 
          
          this.checkVipReset();
          this.checkDayVipReset();
          
          const playerStore = usePlayerStore();
          if (playerStore.isCurrentSongPreview && this.userInfo.vip > 0) {
             playerStore.reloadCurrentSongForVip();
          }
          
        } else {
          throw new Error('用户失效');
        }
      } catch (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('502') || msg.includes('500') || msg.includes('503') || msg.includes('504') || msg.includes('network error')) {
          console.warn('网络波动导致鉴权失败，已拦截误杀，保留用户登录状态');
        } else {
          this.logout();
        }
      }
    },

    async verifySession() {
      try {
        await request.get('/register/dev', { silent: true });
        const playerStore = usePlayerStore();
        playerStore.hasDfid = true;
      } catch (e) {}

      if (this.isLoggedIn) {
        await new Promise(resolve => setTimeout(resolve, 600)); 
        await this.fetchUserInfo();
      }
    },

    logout() {
      try {
        const playerStore = usePlayerStore();
        playerStore.downgradeForLogout();

        localStorage.removeItem('kg_desktop_isLoggedIn');
        localStorage.removeItem('kg_desktop_userInfo');
        localStorage.removeItem('kg_desktop_vip_state');
        localStorage.removeItem('kg_desktop_vip_expire');
        localStorage.removeItem('kg_desktop_vip_name');
        localStorage.removeItem('kg_desktop_collected_map');
        localStorage.removeItem('kg_desktop_deleted_playlists');
        localStorage.removeItem('kg_desktop_local_history');
        localStorage.removeItem('kg_desktop_local_play_counts'); 
        localStorage.removeItem('kg_desktop_has_dfid');
        localStorage.removeItem('kg_desktop_day_vip_states');
      } catch (e) {}
      
      this.isLoggedIn = false;
      this.userInfo = { userid: '', nickname: '', avatar: '', vip: 0 }; 
      this.likedHashes = [];
      this.likedPlaylistCover = ''; 
      this.vipExpirationTime = '';
      this.vipLevelName = '普通用户';
      this.dayVipState = { date: '', uid: '', claimed: false }; 
      this.localHistory = [];
      this.localPlayCounts = {}; 
      
      this.collectedListIds = [];
      this.createdListIds = [];
      this.playlistMap = {};
      this.collectedMap = {};
      this.deletedPlaylistIds = [];

      if (window.updaterAPI && window.updaterAPI.clearVault) {
         window.updaterAPI.clearVault();
      }

      if (typeof window !== 'undefined') window.location.hash = '#/';
    }
  }
});