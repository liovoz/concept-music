// ====================
// 文件：src/store/userStore.js
// ====================
import { defineStore } from 'pinia';
import request from '../utils/request';
import { usePlayerStore } from './playerStore';
import { isDefaultPlaylistName, isFavoritePlaylistName, getFirstSongCover } from '../utils/songHelper';

const VIP_DETAIL_PROBE_ENABLED = false;
const VIP_DETAIL_PROBE_REDACT_KEYS = /token|cookie|authorization|password|secret|dfid|mid/i;
const AUTH_TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;

let authTokenRefreshPromise = null;
let autoVipTimer = null;
let autoVipNextHourlyTime = 0;

const sanitizeVipProbePayload = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => sanitizeVipProbePayload(item, seen));
  }

  return Object.fromEntries(Object.entries(value).map(([key, val]) => [
    key,
    VIP_DETAIL_PROBE_REDACT_KEYS.test(key) ? '[REDACTED]' : sanitizeVipProbePayload(val, seen)
  ]));
};

const logVipDetailProbe = (label, payload) => {
  if (!VIP_DETAIL_PROBE_ENABLED) return;
  try {
    console.groupCollapsed(`[VIP API Probe] ${label}`);
    console.log('time:', new Date().toISOString());
    console.log(sanitizeVipProbePayload(payload));
    console.groupEnd();
  } catch (error) {
    console.log('[VIP API Probe]', label, payload);
  }
};

const pickVipProbeFields = (vip, index) => ({
  index,
  busi_type: vip?.busi_type,
  product_type: vip?.product_type,
  is_vip: vip?.is_vip,
  is_paid_vip: vip?.is_paid_vip,
  purchased_type: vip?.purchased_type,
  purchased_ios_type: vip?.purchased_ios_type,
  vip_begin_time: vip?.vip_begin_time,
  vip_clearday: vip?.vip_clearday,
  vip_end_time: vip?.vip_end_time,
  paid_vip_expire_time: vip?.paid_vip_expire_time,
  vip_limit_quota_total: vip?.vip_limit_quota?.total
});

const DEFAULT_VIP_STATUS = {
  isVip: false,
  level: 'normal',
  productType: '',
  source: 'none',
  displayName: '普通用户',
  expireTime: '',
  quotaTotal: 0,
  isPaidVip: false
};

const CONCEPT_VIP_LEVELS = {
  svip: { rank: 40, level: 'concept_svip', displayName: '畅听版VIP' },
  tvip: { rank: 30, level: 'concept_tvip', displayName: '概念版VIP' }
};

const loadVipStatus = () => {
  try {
    return { ...DEFAULT_VIP_STATUS, ...JSON.parse(localStorage.getItem('kg_desktop_vip_status') || '{}') };
  } catch (e) {
    return { ...DEFAULT_VIP_STATUS };
  }
};

const parseVipTime = (value) => {
  if (!value) return 0;
  const ts = new Date(String(value).replace(/-/g, '/')).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const isActiveVipTime = (value, now = Date.now()) => {
  const ts = parseVipTime(value);
  return ts > now;
};

const pickBetterVip = (current, candidate) => {
  if (!current) return candidate;
  if (candidate.rank !== current.rank) return candidate.rank > current.rank ? candidate : current;
  return parseVipTime(candidate.expireTime) > parseVipTime(current.expireTime) ? candidate : current;
};

const resolveVipStatusFromDetail = (data, now = Date.now()) => {
  let selected = null;

  if (Array.isArray(data?.busi_vip)) {
    data.busi_vip.forEach((vip) => {
      if (vip?.busi_type !== 'concept' || Number(vip?.is_vip) !== 1 || !isActiveVipTime(vip?.vip_end_time, now)) return;

      const productType = String(vip.product_type || '').toLowerCase();
      const levelMeta = CONCEPT_VIP_LEVELS[productType] || {
        rank: 20,
        level: 'concept_vip',
        displayName: '概念版VIP'
      };

      selected = pickBetterVip(selected, {
        ...levelMeta,
        isVip: true,
        productType,
        source: 'concept',
        expireTime: vip.vip_end_time || '',
        quotaTotal: Number(vip?.vip_limit_quota?.total || 0),
        isPaidVip: Number(vip?.is_paid_vip || 0) === 1,
        raw: vip
      });
    });
  }

  const rootVipExpireTime = data?.vip_end_time || data?.vip_y_endtime || '';
  if (Number(data?.vip_type || 0) > 0 && isActiveVipTime(rootVipExpireTime, now)) {
    selected = pickBetterVip(selected, {
      isVip: true,
      rank: 10,
      level: 'kugou_vip',
      productType: String(data.vip_type),
      source: 'kugou',
      displayName: '酷狗VIP',
      expireTime: rootVipExpireTime,
      quotaTotal: 0,
      isPaidVip: true,
      raw: data
    });
  }

  const musicVipType = Number(data?.m_vip_type ?? data?.m_type ?? 0);
  const musicVipExpireTime = data?.m_y_endtime || data?.m_end_time || '';
  if (musicVipType > 0 && isActiveVipTime(musicVipExpireTime, now)) {
    selected = pickBetterVip(selected, {
      isVip: true,
      rank: 5,
      level: 'kugou_music_pack',
      productType: String(musicVipType),
      source: 'kugou_music_pack',
      displayName: '酷狗音乐包',
      expireTime: musicVipExpireTime,
      quotaTotal: 0,
      isPaidVip: true,
      raw: data
    });
  }

  if (!selected) return { ...DEFAULT_VIP_STATUS };
  const { rank, raw, ...status } = selected;
  return status;
};

const findLikedPlaylist = (list) => {
  if (!Array.isArray(list)) return null;
  let found = list.find(p => p.name === '我喜欢' || p.name === '我喜欢的音乐');
  if (!found) {
    found = list.find(p => (p.name?.includes('喜欢的音乐') || p.name?.includes('我喜欢')) && (p.count > 0 || p.m_count > 0));
  }
  if (!found) {
    found = list.find(p => p.name?.includes('喜欢的音乐') || p.name?.includes('我喜欢'));
  }
  if (!found) {
    found = list.find(p => p.name === '默认收藏' && (p.count > 0 || p.m_count > 0));
  }
  if (!found) {
    found = list.find(p => p.name === '默认收藏');
  }
  if (!found) {
    found = list.find(p => isDefaultPlaylistName(p.name));
  }
  return found;
};

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: localStorage.getItem('kg_desktop_isLoggedIn') === 'true',
    userInfo: JSON.parse(localStorage.getItem('kg_desktop_userInfo') || '{"nickname":"","avatar":"","vip":0}'),
    showLoginModal: false,
    showVipUpgradeModal: false,
    
    likedPlaylistGlobalId: null, 
    likedListId: null,             
    likedHashes: [],
    likedPlaylistCover: '', 
    likedFilesMap: {},
    
    collectedListIds: [], 
    createdListIds: [],   
    userCreatedPlaylists: [],
    isFetchingPlaylists: false,
    playlistMap: {},      
    collectedMap: JSON.parse(localStorage.getItem('kg_desktop_collected_map') || '{}'),
    customPlaylistCovers: JSON.parse(localStorage.getItem('kg_desktop_playlist_covers') || '{}'),
    
    deletedPlaylistIds: JSON.parse(localStorage.getItem('kg_desktop_deleted_playlists') || '[]'),
    
    vipState: JSON.parse(localStorage.getItem('kg_desktop_vip_state') || '{"date":"","count":0,"lastTime":0}'),
    dayVipState: { date: '', uid: '', claimed: false },
    vipExpirationTime: localStorage.getItem('kg_desktop_vip_expire') || '', 
    vipLevelName: localStorage.getItem('kg_desktop_vip_name') || '普通用户',
    vipStatus: loadVipStatus(),
    
    localHistory: JSON.parse(localStorage.getItem('kg_desktop_local_history') || '[]'),
    localPlayCounts: JSON.parse(localStorage.getItem('kg_desktop_local_play_counts') || '{}'),
    
    isVipProcessing: false,
    isDayVipProcessing: false,
    _lastVipPollTime: 0,
    _lastAuthTokenRefreshTime: 0,
    autoClaimVip: localStorage.getItem('kg_desktop_auto_claim_vip') === 'true'
  }),

  actions: {
    openLoginModal() { this.showLoginModal = true; },
    closeLoginModal() { this.showLoginModal = false; },
    openVipUpgradeModal() { this.showVipUpgradeModal = true; },
    closeVipUpgradeModal() { this.showVipUpgradeModal = false; },

    setAutoClaimVip(enable) {
      this.autoClaimVip = Boolean(enable);
      try {
        localStorage.setItem('kg_desktop_auto_claim_vip', String(this.autoClaimVip));
      } catch (e) {}
      if (this.autoClaimVip) {
        this.startAutoVipScheduler();
        this.triggerAutoClaimCheck(true);
      } else {
        this.stopAutoVipScheduler();
      }
    },

    _calculateNextVipTriggerTime(baseLastTime = 0, isCooldown = true) {
      const COOLDOWN_MS = 60 * 60 * 1000;
      // 15 到 60 秒随机抖动延时，打乱请求特征，防平台风控
      const randomJitter = Math.floor(Math.random() * 45000 + 15000);
      if (isCooldown && baseLastTime > 0) {
        return baseLastTime + COOLDOWN_MS + randomJitter;
      }
      return Date.now() + Math.floor(Math.random() * 7000 + 3000);
    },

    startAutoVipScheduler() {
      if (autoVipTimer) return;
      if (!this.autoClaimVip || !this.isLoggedIn) return;

      const now = Date.now();
      const COOLDOWN_MS = 60 * 60 * 1000;
      const lastTime = Number(this.vipState?.lastTime || 0);
      if (lastTime > 0 && (now - lastTime < COOLDOWN_MS)) {
        autoVipNextHourlyTime = this._calculateNextVipTriggerTime(lastTime, true);
      } else {
        autoVipNextHourlyTime = this._calculateNextVipTriggerTime(0, false);
      }

      autoVipTimer = setInterval(() => {
        this.checkAndExecuteAutoClaim();
      }, 10000);
    },

    stopAutoVipScheduler() {
      if (autoVipTimer) {
        clearInterval(autoVipTimer);
        autoVipTimer = null;
      }
      autoVipNextHourlyTime = 0;
    },

    triggerAutoClaimCheck(immediate = false) {
      if (!this.autoClaimVip || !this.isLoggedIn) return;
      if (immediate) {
        autoVipNextHourlyTime = Date.now() + 1000;
      }
      setTimeout(() => {
        if (this.autoClaimVip && this.isLoggedIn) {
          this.checkAndExecuteAutoClaim();
        }
      }, immediate ? 600 : 3500);
    },

    async checkAndExecuteAutoClaim() {
      if (!this.autoClaimVip || !this.isLoggedIn) {
        this.stopAutoVipScheduler();
        return;
      }

      try {
        // 1. 跨天重置检测
        this.checkVipReset();
        this.checkDayVipReset();

        const now = Date.now();

        // 2. 自动领取 1 天 VIP (每日 1 次)
        if (!this.dayVipState?.claimed && !this.isDayVipProcessing) {
          try {
            await this.claimOneDayVip({ silent: true });
          } catch (e) {}
        }

        // 3. 自动领取 3 小时 VIP (每日最多 8 次，间隔 60m + 随机抖动)
        const count = Number(this.vipState?.count || 0);
        if (count < 8 && !this.isVipProcessing) {
          const COOLDOWN_MS = 60 * 60 * 1000;
          const lastTime = Number(this.vipState?.lastTime || 0);
          const timeSinceLast = now - lastTime;

          if (timeSinceLast >= COOLDOWN_MS && now >= autoVipNextHourlyTime) {
            try {
              await this.claimDailyVip({ silent: true });
            } catch (e) {
            } finally {
              autoVipNextHourlyTime = this._calculateNextVipTriggerTime(this.vipState?.lastTime || Date.now(), true);
            }
          }
        }
      } catch (err) {}
    },

    async refreshAuthTokens(options = {}) {
      const { force = false, allowLoggedOut = false } = options;
      if (!allowLoggedOut && !this.isLoggedIn) return false;

      const now = Date.now();
      if (!force && now - this._lastAuthTokenRefreshTime < AUTH_TOKEN_REFRESH_INTERVAL) {
        return true;
      }

      if (authTokenRefreshPromise) return authTokenRefreshPromise;

      authTokenRefreshPromise = request.get('/login/token', {
        params: { timestamp: now },
        silent: true
      }).then((res) => {
        const ok = !!(res && (res.status === 1 || res.error_code === 0 || res.data));
        if (ok) this._lastAuthTokenRefreshTime = Date.now();
        return ok;
      }).catch(() => {
        this._lastAuthTokenRefreshTime = 0;
        return false;
      }).finally(() => {
        authTokenRefreshPromise = null;
      });

      return authTokenRefreshPromise;
    },

    checkVipExpiration() {
      if (!this.isLoggedIn || this.userInfo.vip <= 0 || !this.vipExpirationTime) return;
      const expireTs = new Date(this.vipExpirationTime.replace(/-/g, '/')).getTime();
      if (isNaN(expireTs)) return;
      if (Date.now() >= expireTs) {
        this.userInfo.vip = 0;
        this.vipLevelName = '普通用户';
        this.vipExpirationTime = '';
        this.vipStatus = { ...DEFAULT_VIP_STATUS };
        localStorage.setItem('kg_desktop_userInfo', JSON.stringify(this.userInfo));
        localStorage.setItem('kg_desktop_vip_name', '普通用户');
        localStorage.setItem('kg_desktop_vip_status', JSON.stringify(this.vipStatus));
        localStorage.removeItem('kg_desktop_vip_expire');
        this._lastVipPollTime = 0;
        this.maybePollVipDetail();
      }
    },

    maybePollVipDetail() {
      const now = Date.now();
      if (now - this._lastVipPollTime >= 10 * 60 * 1000) {
        this._lastVipPollTime = now;
        this.fetchVipDetail();
      }
    },

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

    async fetchVipDetail(options = {}) {
      if (!this.isLoggedIn) return;
      try {
        const { notifyPlayer = true } = options;
        const oldVip = this.userInfo?.vip > 0;
        const res = await request.get('/user/vip/detail', { params: { timestamp: Date.now() }, silent: true });
        logVipDetailProbe('/user/vip/detail raw response', res);
        if (res && res.data) {
          const data = res.data;
          const now = Date.now();
          const conceptVips = Array.isArray(data.busi_vip)
            ? data.busi_vip.filter(v => v.busi_type === 'concept' && Number(v.is_vip) === 1)
            : [];
          const resolvedVipStatus = resolveVipStatusFromDetail(data, now);
          const isVip = resolvedVipStatus.isVip;
          const expireTime = resolvedVipStatus.expireTime;
          const levelName = resolvedVipStatus.displayName;
          const selectedConceptVip = resolvedVipStatus.source === 'concept'
            ? conceptVips.find(v => String(v.product_type || '').toLowerCase() === resolvedVipStatus.productType
                && v.vip_end_time === resolvedVipStatus.expireTime) || null
            : null;

          logVipDetailProbe('/user/vip/detail parsed summary', {
            rawVipType: data.vip_type,
            rawMusicVipType: data.m_vip_type ?? data.m_type,
            rawVipEndTime: data.vip_end_time,
            rawMusicVipEndTime: data.m_y_endtime,
            busiVipCount: Array.isArray(data.busi_vip) ? data.busi_vip.length : 0,
            busiVipSummary: Array.isArray(data.busi_vip) ? data.busi_vip.map(pickVipProbeFields) : [],
            conceptVipCount: conceptVips.length,
            conceptVipSummary: conceptVips.map(pickVipProbeFields),
            conceptVips,
            selectedConceptVip: selectedConceptVip ? pickVipProbeFields(selectedConceptVip, conceptVips.indexOf(selectedConceptVip)) : null,
            resolved: {
              isVip,
              expireTime,
              levelName,
              vipStatus: resolvedVipStatus,
              previousVip: oldVip,
              notifyPlayer
            }
          });

          this.vipExpirationTime = expireTime;
          this.vipLevelName = levelName;
          this.vipStatus = resolvedVipStatus;
          localStorage.setItem('kg_desktop_vip_expire', expireTime);
          localStorage.setItem('kg_desktop_vip_name', levelName);
          localStorage.setItem('kg_desktop_vip_status', JSON.stringify(resolvedVipStatus));

          if (this.userInfo) {
             this.userInfo.vip = isVip ? 1 : 0;
             localStorage.setItem('kg_desktop_userInfo', JSON.stringify(this.userInfo));
              if (notifyPlayer && oldVip !== isVip) {
                const playerStore = usePlayerStore();
                if (playerStore.isPlaying) {
                  playerStore.handleAuthCapabilityChanged(isVip ? 'vip-upgrade' : 'vip-downgrade');
                }
              }
          }
        } else {
          logVipDetailProbe('/user/vip/detail empty data', res);
        }
      } catch (e) {
        logVipDetailProbe('/user/vip/detail request error', {
          message: e?.message,
          status: e?.response?.status,
          responseData: e?.response?.data,
          error: e
        });
      }
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

    async claimOneDayVip(options = {}) {
      if (!this.isLoggedIn) return { success: false, msg: '请先登录' };
      
      this.checkDayVipReset();
      if (this.dayVipState.claimed) return { success: false, msg: '今日已领取，请明日再来' };

      this.isDayVipProcessing = true;
      try {
        const wasVip = this.userInfo?.vip > 0;
        const d = new Date();
        const apiDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        let resDay = null;
        let isRequestError = false;
        try {
           resDay = await request.get('/youth/day/vip', { 
             params: { receive_day: apiDateStr, timestamp: Date.now() },
             silent: true
           });
        } catch (e) {
           if (e.response?.data) {
             resDay = e.response.data;
           } else {
             isRequestError = true;
             resDay = null;
           }
        }

        if (isRequestError) {
           try {
             resDay = await request.get('/youth/day/vip', { 
               params: { receive_day: apiDateStr, timestamp: Date.now() },
               silent: true
             });
             isRequestError = false;
           } catch (e) {
             if (e.response?.data) {
               resDay = e.response.data;
               isRequestError = false;
             } else {
               return { success: false, msg: '网络连接不稳定，请检查网络后重试' };
             }
           }
        }

        let isSuccess = false;
        let isAlreadyClaimed = false;
        let msg = '';

        if (!isRequestError && resDay && (resDay.status === 1 || resDay.error_code === 0)) {
           isSuccess = true;
           msg = '🎉 1天 VIP 领取成功！';
        } else {
           const errMsg = resDay?.error_msg || resDay?.message || resDay?.response?.data?.error_msg || '';
           const errCode = resDay?.error_code || resDay?.response?.data?.error_code;

           if (errCode === 131001 || errCode === 131003 || errCode === 131004
               || errMsg.includes('上限') || errMsg.includes('完成')
               || errMsg.includes('领取过') || errMsg.includes('已经')
               || errMsg.includes('已领取') || errMsg.includes('今日已')) {
              isSuccess = true;
              isAlreadyClaimed = true;
              msg = '云端显示今日额度已达上限，本地状态已自动同步修正！';
           } else if (errMsg.includes('502') || errMsg.includes('500') || errMsg.includes('504')) {
              msg = '酷狗服务器繁忙，系统稍后重试';
           } else if (errMsg) {
              msg = `领取失败：${errMsg}`;
           } else {
              msg = '领取失败，请稍后重试';
           }
        }

        if (isSuccess) {
           if (!isAlreadyClaimed) {
             try {
               await request.get('/youth/day/vip/upgrade', { params: { timestamp: Date.now() }, silent: true });
             } catch (e) {}
           }
           
           this.dayVipState.claimed = true;
           this.saveDayVipState();

           await this.refreshAuthTokens({ force: true });
           await this.fetchVipDetail({ notifyPlayer: false });
           await this.fetchUserInfo({ notifyPlayer: false, skipSchedulerTrigger: true });

           const isVip = this.userInfo?.vip > 0;
           if (!wasVip && isVip) {
             const playerStore = usePlayerStore();
             playerStore.handleAuthCapabilityChanged('vip-upgrade');
           }
           
           return { success: true, becameVip: !wasVip && isVip, msg: `${msg} 预计延期至：${this.vipExpirationTime || '同步中...'}` };
        } else {
           return { success: false, msg };
        }

      } catch (error) {
        return { success: false, msg: '发生严重异常，操作被终止' };
      } finally {
        this.isDayVipProcessing = false;
      }
    },

    async claimDailyVip(options = {}) {
      if (!this.isLoggedIn) return { success: false, msg: '请先登录' };
      this.checkVipReset();
      if (this.vipState.count >= 8) return { success: false, msg: '今日额度已达上限' };
      
      const now = Date.now();
      const COOLDOWN_MS = 60 * 60 * 1000;
      if (now - this.vipState.lastTime < COOLDOWN_MS) return { success: false, msg: '冷却中，请稍后再试' };

      this.isVipProcessing = true;
      try {
        const wasVip = this.userInfo?.vip > 0;
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
          await this.refreshAuthTokens({ force: true });
          await this.fetchVipDetail({ notifyPlayer: false });
          await this.fetchUserInfo({ notifyPlayer: false, skipSchedulerTrigger: true });

          const isVip = this.userInfo?.vip > 0;
          if (!wasVip && isVip) {
            const playerStore = usePlayerStore();
            playerStore.handleAuthCapabilityChanged('vip-upgrade');
          }
          
          let displayTime = this.vipExpirationTime;
          if (displayTime === oldTime) {
            const addHours = res.data?.award_vip_hour || 3;
            const estimate = new Date(Date.now() + addHours * 60 * 60 * 1000);
            displayTime = `预计至 ${estimate.getHours()}:${estimate.getMinutes()}`;
          }

          const total = res.data?.total || 8;
          return { success: true, becameVip: !wasVip && isVip, msg: `🎉 领取成功！VIP 已延期至：${displayTime} (${this.vipState.count}/${total})` };
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

    setCustomPlaylistCover(key, coverUrl) {
      if (!key) return;
      const k = String(key);
      const c = String(coverUrl || '').replace(/\{size\}/g, '400');
      this.customPlaylistCovers[k] = c;
      try {
        localStorage.setItem('kg_desktop_playlist_covers', JSON.stringify(this.customPlaylistCovers));
      } catch (e) {}

      const p = this.userCreatedPlaylists.find(item => String(item.listid) === k || String(item.gid) === k);
      if (p) {
        p.cover = c;
      }
    },

    async fetchPlaylistLatestCover(id) {
      if (!id) return '';
      try {
        const res = await request.get('/playlist/track/all', {
          params: { id: String(id), page: 1, pagesize: 5, timestamp: Date.now() },
          silent: true
        });
        return getFirstSongCover(res);
      } catch (e) {
        return '';
      }
    },

    syncPlaylistsFromRaw(rawInfoList) {
      if (!Array.isArray(rawInfoList)) return;
      const currentUserId = String(this.userInfo?.userid || '');
      const likedList = findLikedPlaylist(rawInfoList);
      const likedGid = likedList ? String(likedList.global_collection_id || likedList.specialid || likedList.listid) : this.likedPlaylistGlobalId;
      const likedLid = likedList ? String(likedList.listid) : this.likedListId;

      if (likedList && (!this.likedPlaylistGlobalId || !this.likedListId)) {
        this.likedPlaylistGlobalId = likedGid;
        this.likedListId = likedLid;
      }

      rawInfoList.forEach(p => {
        const gid = String(p.global_collection_id || p.listid || p.specialid);
        const lid = String(p.listid);

        if (this.deletedPlaylistIds.includes(gid) || this.deletedPlaylistIds.includes(lid)) return;

        this.playlistMap[gid] = p.listid;
        const creatorId = String(p.list_create_userid || p.userid || '');
        const isOwner = Boolean(currentUserId && creatorId && creatorId === currentUserId);
        const isCreated = isOwner || p.type === 0 || p.source === 0 || (p.type !== 1 && p.source !== 1);
        const isFav = isFavoritePlaylistName(p.name) || ((gid === String(likedGid) || lid === String(likedLid)) && !p.name?.includes('默认收藏') && !p.name?.includes('默认列表'));
        const isDefault = isDefaultPlaylistName(p.name) || isFav;

        if (gid === String(likedGid) || isCreated) {
          if (!this.createdListIds.includes(gid)) this.createdListIds.push(gid);
          let cachedCover = this.customPlaylistCovers[gid] || this.customPlaylistCovers[lid] || '';
          let cover = cachedCover || p.pic || '';
          const userPic = p.create_user_pic || '';
          const isAvatar = (userPic && cover === userPic) || (typeof cover === 'string' && cover.includes('/avatar/'));
          if (isCreated && isAvatar) {
            cover = cachedCover || '';
          }
          if (cover && typeof cover === 'string') cover = cover.replace(/\{size\}/g, '400');

          const entry = {
            listid: lid,
            gid,
            name: p.name || p.title || '未命名歌单',
            count: p.count || p.m_count || 0,
            cover,
            isDefault,
            isFavorite: isFav,
            isPrivate: p.is_pri === 1
          };

          const existingIdx = this.userCreatedPlaylists.findIndex(item => item.listid === lid || item.gid === gid || item.name === entry.name);
          if (existingIdx >= 0) {
            this.userCreatedPlaylists[existingIdx] = entry;
          } else {
            this.userCreatedPlaylists.push(entry);
          }
        } else {
          if (!this.collectedListIds.includes(gid)) this.collectedListIds.push(gid);
        }
      });
    },

    async fetchLikedPlaylistMeta() {
      this.isFetchingPlaylists = true;
      try {
        const res = await request.get('/user/playlist', { params: { page: 1, pagesize: 1000, total_ver: 0, timestamp: Date.now() }, silent: true });
        if (res?.data?.info && Array.isArray(res.data.info)) {
          
          this.collectedListIds = [];
          this.createdListIds = [];
          this.playlistMap = {};
          
          const likedList = findLikedPlaylist(res.data.info);
          const likedGid = likedList ? String(likedList.global_collection_id || likedList.specialid || likedList.listid) : null;
          const likedLid = likedList ? String(likedList.listid) : null;
          const currentUserId = String(this.userInfo?.userid || '');

          const createdLists = [];
          res.data.info.forEach(p => {
             const gid = String(p.global_collection_id || p.listid || p.specialid);
             const lid = String(p.listid);
             
             if (this.deletedPlaylistIds.includes(gid) || this.deletedPlaylistIds.includes(lid)) return;

             this.playlistMap[gid] = p.listid;
             const creatorId = String(p.list_create_userid || p.userid || '');
             const isOwner = Boolean(currentUserId && creatorId && creatorId === currentUserId);
             const isCreated = isOwner || p.type === 0 || p.source === 0 || (p.type !== 1 && p.source !== 1);
             const isFav = isFavoritePlaylistName(p.name) || ((gid === String(likedGid) || lid === String(likedLid)) && !p.name?.includes('默认收藏') && !p.name?.includes('默认列表'));
             const isDefault = isDefaultPlaylistName(p.name) || isFav;
             
             if (gid === String(likedGid) || isCreated) {
                 this.createdListIds.push(gid);
             } else {
                 this.collectedListIds.push(gid);
             }

             if (isCreated || gid === String(likedGid)) {
                let cachedCover = this.customPlaylistCovers[gid] || this.customPlaylistCovers[lid] || '';
                let cover = cachedCover || p.pic || '';
                const userPic = p.create_user_pic || '';
                const isAvatar = (userPic && cover === userPic) || (typeof cover === 'string' && cover.includes('/avatar/'));
                if (isCreated && isAvatar) {
                  cover = cachedCover || '';
                }
                if (cover && typeof cover === 'string') cover = cover.replace(/\{size\}/g, '400');
               createdLists.push({
                 listid: lid,
                 gid,
                 name: p.name || p.title || '未命名歌单',
                 count: p.count || p.m_count || 0,
                 cover,
                 isDefault,
                 isFavorite: isFav,
                 isPrivate: p.is_pri === 1
               });
             }
          });
          this.userCreatedPlaylists = createdLists;

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
      } catch (e) {
      } finally {
        this.isFetchingPlaylists = false;
      }
    },

    async toggleLikeSong(song) {
      if (!song) return;
      const playerStore = usePlayerStore();
      if (song.source === 'netease-import' || song.source === 'qq-import' || String(song.hash || '').startsWith('netease:') || String(song.hash || '').startsWith('qq:')) {
        playerStore.showToast(song.source === 'qq-import' || String(song.hash || '').startsWith('qq:') ? '企鹅导入歌曲暂不支持添加到我喜欢' : '网易导入歌曲暂不支持添加到我喜欢');
        return;
      }
      if (!this.isLoggedIn) return this.openLoginModal();
      
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

    async createCustomPlaylist(options = {}) {
      if (!this.isLoggedIn) {
        this.openLoginModal();
        return { success: false, msg: '请先登录' };
      }
      const title = (options.name || '').trim();
      if (!title) return { success: false, msg: '歌单名称不能为空' };

      const playerStore = usePlayerStore();
      try {
        const isPri = options.isPrivate ? 1 : 0;
        const res = await request.get('/playlist/add', {
          params: {
            name: title,
            type: 0,
            source: 0,
            is_pri: isPri,
            timestamp: Date.now()
          }
        });

        if (res && (res.status === 1 || res.error_code === 0 || res.data)) {
          playerStore.showToast('🎉 新建歌单成功');

          const newListId = String(res?.data?.info?.listid || res?.data?.listid || Date.now());
          const newGid = String(res?.data?.info?.global_collection_id || res?.data?.global_collection_id || newListId);
          const optimisticEntry = {
            listid: newListId,
            gid: newGid,
            name: title,
            count: 0,
            cover: '',
            isDefault: false,
            isPrivate: isPri === 1
          };
          if (!this.userCreatedPlaylists.some(p => p.name === title || (p.listid && p.listid === newListId))) {
            this.userCreatedPlaylists.unshift(optimisticEntry);
          }
          if (!this.createdListIds.includes(newGid)) {
            this.createdListIds.unshift(newGid);
          }
          this.playlistMap[newGid] = newListId;

          await this.fetchLikedPlaylistMeta();
          return { success: true, data: res.data };
        } else {
          const errMsg = res?.error_msg || res?.message || '新建歌单失败';
          playerStore.showToast(errMsg);
          return { success: false, msg: errMsg };
        }
      } catch (e) {
        const errMsg = e.message || '网络异常，新建歌单失败';
        playerStore.showToast(errMsg);
        return { success: false, msg: errMsg };
      }
    },

    async deleteCustomPlaylist(playlist = {}) {
      if (!this.isLoggedIn) {
        this.openLoginModal();
        return { success: false, msg: '请先登录' };
      }
      const listid = String(playlist.listid || '');
      const gid = String(playlist.gid || playlist.global_collection_id || playlist._id || '');
      if (!listid && !gid) return { success: false, msg: '未获取到歌单ID' };

      const playerStore = usePlayerStore();
      if (
        (gid && (gid === String(this.likedPlaylistGlobalId) || gid === String(this.likedListId))) ||
        (listid && (listid === String(this.likedPlaylistGlobalId) || listid === String(this.likedListId))) ||
        isDefaultPlaylistName(playlist.name)
      ) {
        playerStore.showToast('系统默认歌单不可删除');
        return { success: false, msg: '系统默认歌单不可删除' };
      }

      const targetListId = listid || this.playlistMap[gid] || gid;
      const isCreated = this.createdListIds.includes(gid) || this.createdListIds.includes(listid) ||
        this.userCreatedPlaylists.some(p => p.listid === listid || p.gid === gid);
      const isCollected = !isCreated && Boolean(
        playlist.isCollected !== undefined
          ? playlist.isCollected
          : (this.collectedListIds.includes(gid) || this.collectedListIds.includes(listid))
      );
      try {
        const res = await request.get('/playlist/del', {
          params: {
            listid: targetListId,
            type: isCollected ? 1 : 0,
            timestamp: Date.now()
          }
        });

        if (res && (res.status === 1 || res.error_code === 0)) {
          playerStore.showToast(isCollected ? '已取消收藏' : '已删除歌单');

          const idsToNuke = [String(targetListId)];
          if (gid) idsToNuke.push(gid);
          if (listid) idsToNuke.push(listid);

          idsToNuke.forEach(id => {
            if (!this.deletedPlaylistIds.includes(id)) {
              this.deletedPlaylistIds.push(id);
            }
            delete this.customPlaylistCovers[id];
          });
          localStorage.setItem('kg_desktop_deleted_playlists', JSON.stringify(this.deletedPlaylistIds));
          try {
            localStorage.setItem('kg_desktop_playlist_covers', JSON.stringify(this.customPlaylistCovers));
          } catch (e) {}

          this.createdListIds = this.createdListIds.filter(id => !idsToNuke.includes(id));
          this.collectedListIds = this.collectedListIds.filter(id => !idsToNuke.includes(id));
          this.userCreatedPlaylists = this.userCreatedPlaylists.filter(p => !idsToNuke.includes(p.listid) && !idsToNuke.includes(p.gid));

          Object.keys(this.collectedMap).forEach(key => {
            if (idsToNuke.includes(key) || idsToNuke.includes(this.collectedMap[key])) {
              delete this.collectedMap[key];
            }
          });
          localStorage.setItem('kg_desktop_collected_map', JSON.stringify(this.collectedMap));

          return { success: true };
        } else {
          const errMsg = res?.error_msg || res?.message || '删除歌单失败';
          playerStore.showToast(errMsg);
          return { success: false, msg: errMsg };
        }
      } catch (e) {
        const errMsg = e.message || '网络异常，删除歌单失败';
        playerStore.showToast(errMsg);
        return { success: false, msg: errMsg };
      }
    },

    async addSongToCustomPlaylist(target = {}) {
      if (!this.isLoggedIn) {
        this.openLoginModal();
        return { success: false, msg: '请先登录' };
      }
      const { listid, song, playlistName = '' } = target;
      if (!listid || !song) return { success: false, msg: '缺少参数' };

      const playerStore = usePlayerStore();
      const hash = (song.hash || song._hash || '').toUpperCase();
      if (!hash) return { success: false, msg: '歌曲标识不存在' };

      try {
        const name = (song.name || song._title || '未知歌曲').replace(/\|/g, '').replace(/,/g, '');
        const albumId = song.album_id || song._album_id || 0;
        const mixId = song.album_audio_id || song._album_audio_id || 0;
        const dataStr = `${name}|${hash}|${albumId}|${mixId}`;

        const res = await request.get('/playlist/tracks/add', {
          params: { listid, data: dataStr, timestamp: Date.now() }
        });

        if (res && (res.status === 1 || res.error_code === 0)) {
          const toastMsg = playlistName ? `已添加到「${playlistName}」` : '已添加到歌单';
          playerStore.showToast(toastMsg);

          const songCover = (song._cover || song.cover || song.pic || '').replace(/\{size\}/g, '400');
          if (songCover) {
            this.setCustomPlaylistCover(listid, songCover);
            const found = this.userCreatedPlaylists.find(p => String(p.listid) === String(listid) || String(p.gid) === String(listid));
            if (found) {
              if (found.gid) this.setCustomPlaylistCover(found.gid, songCover);
              found.cover = songCover;
              found.count = (found.count || 0) + 1;
            }
          }

          if (String(listid) === String(this.likedListId)) {
            if (!this.likedHashes.includes(hash)) this.likedHashes.push(hash);
            this.fetchLikedPlaylistMeta();
          }

          window.dispatchEvent(new CustomEvent('song-context-menu:song-added', {
            detail: { listid, song }
          }));

          return { success: true };
        } else {
          const errMsg = res?.error_msg || res?.message || '添加歌曲失败';
          playerStore.showToast(errMsg);
          return { success: false, msg: errMsg };
        }
      } catch (e) {
        const errMsg = e.message || '网络异常，添加歌曲失败';
        playerStore.showToast(errMsg);
        return { success: false, msg: errMsg };
      }
    },

    async removeSongFromCustomPlaylist(target = {}) {
      if (!this.isLoggedIn) {
        this.openLoginModal();
        return { success: false, msg: '请先登录' };
      }
      const { listid, fileid, hash = '' } = target;
      if (!listid || !fileid) return { success: false, msg: '缺少歌曲唯一标识' };

      const playerStore = usePlayerStore();
      try {
        const res = await request.get('/playlist/tracks/del', {
          params: { listid, fileids: fileid, timestamp: Date.now() }
        });

        if (res && (res.status === 1 || res.error_code === 0)) {
          playerStore.showToast('已从歌单中移除');
          if (String(listid) === String(this.likedListId) && hash) {
            const normalizedHash = hash.toUpperCase();
            this.likedHashes = this.likedHashes.filter(h => h !== normalizedHash);
            delete this.likedFilesMap[normalizedHash];
          }
          return { success: true };
        } else {
          const errMsg = res?.error_msg || res?.message || '移除歌曲失败';
          playerStore.showToast(errMsg);
          return { success: false, msg: errMsg };
        }
      } catch (e) {
        const errMsg = e.message || '网络异常，移除歌曲失败';
        playerStore.showToast(errMsg);
        return { success: false, msg: errMsg };
      }
    },

    async fetchUserInfo(options = {}) {
      try {
        const { notifyPlayer = true, forceAuthRefresh = false, skipSchedulerTrigger = false } = options;
        await request.get('/register/dev', { silent: true }).catch(() => {});
        await this.refreshAuthTokens({ allowLoggedOut: true, force: forceAuthRefresh });

        const res = await request.get('/user/detail', { params: { timestamp: Date.now() }, silent: true });
        let info = null;
        const traverse = (data, depth = 0) => {
          if (info || depth > 8 || !data || typeof data !== 'object') return;
          if (data.nickname || data.username) { info = data; return; }
          Object.values(data).forEach(val => traverse(val, depth + 1));
        }
        traverse(res);

        if (info) {
          const isVip = (info.vip_type > 0 || (info.m_vip_type ?? info.m_type ?? 0) > 0) || 
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
          await this.fetchVipDetail({ notifyPlayer }); 
          
          this.checkVipReset();
          this.checkDayVipReset();
          
          const playerStore = usePlayerStore();
          if (notifyPlayer && playerStore.currentSong && playerStore.isPlaying && this.userInfo.vip > 0) {
             playerStore.handleAuthCapabilityChanged('login');
          }

          if (!skipSchedulerTrigger && this.autoClaimVip) {
             this.startAutoVipScheduler();
             this.triggerAutoClaimCheck(false);
          }
          
        } else {
          throw new Error('用户失效');
        }
      } catch (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('network error') || msg.includes('timeout') || msg.includes('request failed')) {
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
        await this.fetchUserInfo({ notifyPlayer: false });
      }
    },

    logout() {
      try {
        this.stopAutoVipScheduler();
        const playerStore = usePlayerStore();
        playerStore.downgradeForLogout();

        localStorage.removeItem('kg_desktop_isLoggedIn');
        localStorage.removeItem('kg_desktop_userInfo');
        localStorage.removeItem('kg_desktop_vip_state');
        localStorage.removeItem('kg_desktop_vip_expire');
        localStorage.removeItem('kg_desktop_vip_name');
        localStorage.removeItem('kg_desktop_vip_status');
        localStorage.removeItem('kg_desktop_collected_map');
        localStorage.removeItem('kg_desktop_deleted_playlists');
        localStorage.removeItem('kg_desktop_local_history');
        localStorage.removeItem('kg_desktop_local_play_counts'); 
        localStorage.removeItem('kg_desktop_has_dfid');
        localStorage.removeItem('kg_desktop_daily_rec_home');
        localStorage.removeItem('kg_desktop_daily_date');
        localStorage.removeItem('kg_desktop_cookies');
      } catch (e) {}
      
      this.isLoggedIn = false;
      this.userInfo = { userid: '', nickname: '', avatar: '', vip: 0 }; 
      this.likedPlaylistGlobalId = null;
      this.likedListId = null;
      this.likedHashes = [];
      this.likedPlaylistCover = ''; 
      this.likedFilesMap = {};
      this.vipExpirationTime = '';
      this.vipLevelName = '普通用户';
      this.vipStatus = { ...DEFAULT_VIP_STATUS };
      this.vipState = { date: '', count: 0, lastTime: 0 };
      this.dayVipState = { date: '', uid: '', claimed: false }; 
      this.localHistory = [];
      this.localPlayCounts = {}; 
      this.isVipProcessing = false;
      this.isDayVipProcessing = false;
      this._lastVipPollTime = 0;
      this._lastAuthTokenRefreshTime = 0;
      
      this.collectedListIds = [];
      this.createdListIds = [];
      this.userCreatedPlaylists = [];
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
