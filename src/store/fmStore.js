import { defineStore } from 'pinia';
import request from '../utils/request.js';
import { useUserStore } from './userStore.js';
import { usePlayerStore, MAX_FM_QUEUE_SIZE } from './playerStore.js';
import { buildPlayPayload, normalizeSongKey } from '../utils/songHelper.js';
import {
  FM_TASTE_PROFILES,
  MIN_FM_BATCH_SIZE,
  TARGET_FM_BATCH_SIZE,
  filterFreshSongs,
  getArtistKey,
  getFreshnessHint,
  getRecommendationReason,
  getSongIdentity,
  loadFmMemory,
  recordFmArtistSuppression,
  recordFmBrokenTrack,
  recordFmDislike,
  recordFmServed,
  recordPositiveAssetSeed
} from '../utils/fmRecommendation.js';
import { fetchModeRecallBatch } from '../utils/fmRecallProviders.js';
import {
  clearModeCursors,
  getFmMemorySnapshot,
  initFmMemoryStore,
  persistFmMeta,
  resetFmMetrics,
  resetInMemorySnapshot,
  unblockArtistFromMemory
} from '../utils/fmMemoryStore.js';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';
const MODE_RESUME_TTL_MS = 30 * 60 * 1000;
const PLAYED_HISTORY_LIMIT = 20;

const createEmptyModeSlice = () => ({
  queue: [],
  cursorIndex: -1,
  playedHistory: [],
  lastUpdatedAt: 0,
  lastLevelUsed: 0,
  degradedNotice: ''
});

let peakTimerId = null;
let peakRetryCount = 0;
let peakSeekScheduledForKey = '';
let fetchLocks = new Map();

export const useFmStore = defineStore('fm', {
  state: () => ({
    activeMode: 'familiar',
    modes: {
      familiar: createEmptyModeSlice(),
      fresh: createEmptyModeSlice(),
      explore: createEmptyModeSlice()
    },
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    isDisliking: false,
    isPeakPreview: false,
    climaxInfo: null,
    isInitialized: false,
    currentUserNamespace: '',
    quickSkipStreak: 0,
    activeTrackStartedAt: 0,
    activeTrackKey: '',
    preferences: {
      filterVersionNoise: true
    },
    suppressedArtists: [],
    metricsSnapshot: null
  }),

  getters: {
    activeProfile: (state) => FM_TASTE_PROFILES[state.activeMode] || FM_TASTE_PROFILES.familiar,
    activeSlice: (state) => state.modes[state.activeMode] || state.modes.familiar,
    currentSong() {
      const slice = this.activeSlice;
      if (slice.cursorIndex >= 0 && slice.cursorIndex < slice.queue.length) {
        return slice.queue[slice.cursorIndex];
      }
      return null;
    },
    upcomingSongs() {
      const slice = this.activeSlice;
      if (slice.cursorIndex < 0) return slice.queue;
      return slice.queue.slice(slice.cursorIndex + 1);
    },
    remainingCount() {
      return this.upcomingSongs.length;
    },
    playedHistoryList() {
      return this.activeSlice.playedHistory || [];
    },
    freshnessHint: (state) => getFreshnessHint(state.activeMode),
    recommendationReason() {
      return getRecommendationReason(this.activeMode, this.currentSong);
    }
  },

  actions: {
    _syncStateFromMemory() {
      const snap = getFmMemorySnapshot();
      this.preferences = {
        filterVersionNoise: snap.meta?.preferences?.filterVersionNoise !== false
      };
      this.suppressedArtists = (snap.artists || []).filter((a) => a.blocked);
      this.metricsSnapshot = snap.meta?.metrics ? { ...snap.meta.metrics } : null;
    },

    async ensureAccountContext() {
      const userStore = useUserStore();
      if (!userStore.isLoggedIn) {
        return false;
      }
      const uid = String(userStore.userInfo?.userid || localStorage.getItem('kg_desktop_userid') || '').trim() || 'auth';
      if (this.currentUserNamespace && this.currentUserNamespace !== uid) {
        this._resetSessionStateOnly();
      }
      this.currentUserNamespace = uid;
      await initFmMemoryStore(uid);
      this._syncStateFromMemory();
      this.registerPlayerController();
      return true;
    },

    _resetSessionStateOnly() {
      this.resetPeakState();
      this.modes = {
        familiar: createEmptyModeSlice(),
        fresh: createEmptyModeSlice(),
        explore: createEmptyModeSlice()
      };
      this.isLoading = false;
      this.isLoadingMore = false;
      this.isError = false;
      this.isDisliking = false;
      this.isInitialized = false;
      this.quickSkipStreak = 0;
      this.activeTrackStartedAt = 0;
      this.activeTrackKey = '';
      fetchLocks.clear();
    },

    resetOnLogout() {
      const playerStore = usePlayerStore();
      this.resetPeakState();
      if (playerStore.isFmModePlaylist) {
        playerStore.restoreRegularPlaylistFromFm({
          autoPlay: false,
          silent: true,
          navigateBack: false
        });
      }
      playerStore.registerFmController(null);
      this._resetSessionStateOnly();
      this.currentUserNamespace = '';
      resetInMemorySnapshot('');
      this.suppressedArtists = [];
      this.metricsSnapshot = null;
    },

    registerPlayerController() {
      const playerStore = usePlayerStore();
      playerStore.registerFmController({
        playNext: (opts) => this.advanceNext(opts),
        playPrev: () => this.stepPrev(),
        peekNextSong: () => this.peekNextSong(),
        onExitFm: () => {
          this.resetPeakState();
        },
        onRestoreRegular: () => {
          this.resetPeakState();
        },
        onTrackError: (failedSong) => {
          this.handleTrackPlaybackError(failedSong);
        },
        onLogout: () => {
          this._resetSessionStateOnly();
          this.currentUserNamespace = '';
          resetInMemorySnapshot('');
          this.suppressedArtists = [];
          this.metricsSnapshot = null;
        }
      });
    },

    peekNextSong() {
      const slice = this.activeSlice;
      if (slice.cursorIndex >= 0 && slice.cursorIndex + 1 < slice.queue.length) {
        return buildPlayPayload(slice.queue[slice.cursorIndex + 1], DEFAULT_COVER);
      }
      return null;
    },

    _collectKnownAssets() {
      const userStore = useUserStore();
      const snap = getFmMemorySnapshot();
      return {
        likedHashes: userStore.likedHashes || [],
        localHistory: userStore.localHistory || [],
        knownPlaylistKeys: snap.meta?.knownPlaylistKeys || []
      };
    },

    _buildSeedsForMode(modeId) {
      const userStore = useUserStore();
      const snap = getFmMemorySnapshot();
      const positiveSeeds = snap.meta?.positiveSeeds || [];
      const historyCandidates = (userStore.localHistory || [])
        .map((item) => {
          const id = getSongIdentity(item);
          return {
            key: id.key,
            album_audio_id: id.mixId,
            hash: id.hash,
            title: item._title || item.name || '',
            artist: item._singer || item.singer || '',
            singerId: id.singerId
          };
        })
        .filter((s) => s.album_audio_id || s.hash);

      let pool = [];
      if (modeId === 'fresh') {
        pool = [...positiveSeeds, ...historyCandidates];
      } else if (modeId === 'familiar') {
        pool = [...positiveSeeds, ...historyCandidates];
      } else {
        // 深度探索仅用本模式二跳新歌，不拿老歌作种子
        const recentExplore = (this.modes.explore.playedHistory || [])
          .filter((s) => s?._album_audio_id)
          .slice(0, 5)
          .map((s) => ({
            key: getSongIdentity(s).key,
            album_audio_id: s._album_audio_id,
            hash: s._hash,
            title: s._title || s.name || '',
            artist: s._singer || s.singer || '',
            singerId: s._singer_id || ''
          }));
        return recentExplore;
      }

      const usedHistory = snap.meta?.seedHistory?.[modeId] || [];
      const deduped = [];
      const seenKey = new Set();
      const seenSinger = new Set();

      pool.forEach((s) => {
        if (!s?.key || seenKey.has(s.key)) return;
        seenKey.add(s.key);
        deduped.push(s);
      });

      const freshFirst = deduped.filter((s) => !usedHistory.includes(s.key));
      const ordered = freshFirst.length >= 2 ? freshFirst : deduped;

      const selected = [];
      for (const s of ordered) {
        const artistTag = s.singerId || s.artist;
        if (artistTag && seenSinger.has(artistTag) && selected.length < ordered.length - 1) continue;
        if (artistTag) seenSinger.add(artistTag);
        selected.push(s);
        if (selected.length >= 3) break;
      }

      if (selected.length > 0) {
        persistFmMeta((meta) => ({
          ...meta,
          seedHistory: {
            ...meta.seedHistory,
            [modeId]: [...selected.map((s) => s.key), ...(meta.seedHistory?.[modeId] || [])].slice(0, 30)
          }
        }));
      }
      return selected;
    },

    _trimQueueWindow(modeId) {
      const slice = this.modes[modeId];
      if (!slice || slice.queue.length <= MAX_FM_QUEUE_SIZE) return;
      const excess = slice.queue.length - MAX_FM_QUEUE_SIZE;
      const removableBeforeCurrent = Math.max(0, slice.cursorIndex);
      const trimFront = Math.min(excess, removableBeforeCurrent);
      if (trimFront > 0) {
        slice.queue.splice(0, trimFront);
        slice.cursorIndex = Math.max(0, slice.cursorIndex - trimFront);
      }
      if (slice.queue.length > MAX_FM_QUEUE_SIZE) {
        slice.queue = slice.queue.slice(0, MAX_FM_QUEUE_SIZE);
        if (slice.cursorIndex >= slice.queue.length) {
          slice.cursorIndex = Math.max(0, slice.queue.length - 1);
        }
      }
    },

    _recordBatchMetrics({ modeId, latencyMs, success, stats, batchSongs }) {
      const knownAssets = this._collectKnownAssets();
      const knownHashes = new Set((knownAssets.likedHashes || []).map((h) => String(h).toUpperCase()));
      (knownAssets.localHistory || []).forEach((s) => {
        const h = String(s?._hash || s?.hash || '').toUpperCase();
        if (h) knownHashes.add(h);
      });

      persistFmMeta((meta) => {
        const m = { ...(meta.metrics || {}) };
        m.fetchCount = Number(m.fetchCount || 0) + 1;
        if (success) m.fetchSuccessCount = Number(m.fetchSuccessCount || 0) + 1;
        if (Number.isFinite(latencyMs)) {
          m.fetchLatenciesMs = [Math.round(latencyMs), ...(m.fetchLatenciesMs || [])].slice(0, 50);
        }
        if (stats) {
          m.variantBlockedCount = Number(m.variantBlockedCount || 0) + Number(stats.variantBlocked || 0);
        }
        if (Array.isArray(batchSongs) && batchSongs.length > 0) {
          const prevKeys = m.modeTrackKeys?.[modeId] || [];
          const newKeys = batchSongs.map((s) => getSongIdentity(s).canonicalWorkKey || getSongIdentity(s).key).filter(Boolean);
          m.modeTrackKeys = {
            ...(m.modeTrackKeys || {}),
            [modeId]: Array.from(new Set([...newKeys, ...prevKeys])).slice(0, 50)
          };

          const curHits = m.unknownTrackHits?.[modeId] || { unknown: 0, total: 0 };
          let unknownInc = 0;
          batchSongs.forEach((s) => {
            const h = String(s._hash || s.hash || '').toUpperCase();
            if (h && !knownHashes.has(h)) unknownInc++;
          });
          m.unknownTrackHits = {
            ...(m.unknownTrackHits || {}),
            [modeId]: {
              unknown: Number(curHits.unknown || 0) + unknownInc,
              total: Number(curHits.total || 0) + batchSongs.length
            }
          };
        }
        m.updatedAt = Date.now();
        return { ...meta, metrics: m };
      });
      this._syncStateFromMemory();
    },

    async fetchBatchForMode(modeId = this.activeMode, { reset = false } = {}) {
      const ok = await this.ensureAccountContext();
      if (!ok) return { songs: [], levelUsed: 0 };

      if (fetchLocks.has(modeId)) {
        return fetchLocks.get(modeId);
      }

      const task = (async () => {
        const startTs = performance.now();
        const userStore = useUserStore();
        const slice = this.modes[modeId];
        const isVipUser = Boolean(userStore.vipStatus?.isVip);
        const isInitial = reset || slice.queue.length === 0;
        if (isInitial) this.isLoading = true;
        else this.isLoadingMore = true;
        this.isError = false;

        const baseQueue = reset ? [] : [...slice.queue];
        const collected = [];
        let maxLevelUsed = 0;
        let sawAnyRaw = false;
        let aggregateStats = { variantBlocked: 0, knownBlocked: 0, recentBlocked: 0, dislikedBlocked: 0 };

        try {
          for (let level = 0; level <= 3; level++) {
            maxLevelUsed = level;
            const snap = getFmMemorySnapshot();
            const seeds = this._buildSeedsForMode(modeId);
            const exploreJumpSeed = modeId === 'explore' ? (seeds[0] || null) : null;
            const anchorSong = modeId === 'familiar' ? (this.currentSong || null) : null;

            const recallRes = await fetchModeRecallBatch({
              modeId,
              degradationLevel: level,
              seeds,
              exploreJumpSeed,
              anchorSong,
              remainCount: Math.max(0, baseQueue.length - slice.cursorIndex - 1),
              channelCursors: snap.meta?.channelCursors?.[modeId] || {},
              channelHealth: snap.meta?.channelHealth || {}
            });

            persistFmMeta((meta) => ({
              ...meta,
              channelCursors: {
                ...meta.channelCursors,
                [modeId]: recallRes.nextCursors
              },
              channelHealth: recallRes.nextHealth
            }));

            if (recallRes.songs.length > 0) sawAnyRaw = true;

            const filtered = filterFreshSongs(recallRes.songs, {
              currentQueue: [...baseQueue, ...collected],
              memory: loadFmMemory(),
              tasteMode: modeId,
              knownAssets: this._collectKnownAssets(),
              isVipUser,
              degradationLevel: level,
              ignoreRecent: false
            });

            if (filtered._filterStats) {
              aggregateStats.variantBlocked += filtered._filterStats.variantBlocked || 0;
              aggregateStats.knownBlocked += filtered._filterStats.knownBlocked || 0;
              aggregateStats.recentBlocked += filtered._filterStats.recentBlocked || 0;
              aggregateStats.dislikedBlocked += filtered._filterStats.dislikedBlocked || 0;
            }

            for (const s of filtered) {
              if (collected.length < TARGET_FM_BATCH_SIZE) {
                collected.push(s);
              }
            }

            if (collected.length >= MIN_FM_BATCH_SIZE) break;
            if (level >= 2 && collected.length >= 2) break;
          }

          if (collected.length > 0) {
            if (reset) {
              slice.queue = collected.slice(0, MAX_FM_QUEUE_SIZE);
              slice.cursorIndex = 0;
            } else {
              slice.queue.push(...collected);
              this._trimQueueWindow(modeId);
            }
            slice.lastUpdatedAt = Date.now();
            slice.lastLevelUsed = maxLevelUsed;
            slice.degradedNotice = maxLevelUsed >= 3
              ? '当前波段新歌较少，已为你自动拓展新歌来源'
              : '';
            this.isInitialized = true;
          } else if (reset && slice.queue.length === 0) {
            this.isError = true;
            slice.degradedNotice = sawAnyRaw
              ? '近期新歌与过滤条件较严，可点击换一批或管理已屏蔽歌手'
              : '调频失败，请检查网络连接后重试';
          }

          this._recordBatchMetrics({
            modeId,
            latencyMs: performance.now() - startTs,
            success: collected.length > 0,
            stats: aggregateStats,
            batchSongs: collected
          });

          return { songs: collected, levelUsed: maxLevelUsed, sawAnyRaw };
        } catch (err) {
          if (reset && slice.queue.length === 0) {
            this.isError = true;
          }
          this._recordBatchMetrics({
            modeId,
            latencyMs: performance.now() - startTs,
            success: false
          });
          return { songs: [], levelUsed: maxLevelUsed, sawAnyRaw: false };
        } finally {
          if (isInitial) this.isLoading = false;
          else this.isLoadingMore = false;
        }
      })();

      fetchLocks.set(modeId, task);
      try {
        return await task;
      } finally {
        fetchLocks.delete(modeId);
      }
    },

    async startOrResumeFM({ forceRefresh = false } = {}) {
      const ok = await this.ensureAccountContext();
      if (!ok) return;
      const modeId = this.activeMode;
      const slice = this.modes[modeId];
      const isFreshCache = !forceRefresh &&
        slice.queue.length > 0 &&
        slice.cursorIndex >= 0 &&
        slice.cursorIndex < slice.queue.length &&
        Date.now() - Number(slice.lastUpdatedAt || 0) < MODE_RESUME_TTL_MS;

      if (isFreshCache) {
        this.isError = false;
        this.isInitialized = true;
        this.playSongAtCursor(modeId, slice.cursorIndex);
        return;
      }

      const res = await this.fetchBatchForMode(modeId, { reset: true });
      if (res.songs.length > 0) {
        this.playSongAtCursor(modeId, 0);
      } else if (res.sawAnyRaw) {
        usePlayerStore().showToast('当前波段过滤条件较严格，请稍后重试或调整偏好');
      }
    },

    async switchMode(modeId, { forceRefresh = false } = {}) {
      if (!FM_TASTE_PROFILES[modeId]) return;
      if (this.activeMode === modeId && !forceRefresh) return;
      const ok = await this.ensureAccountContext();
      if (!ok) return;

      this.resetPeakState();
      this.activeMode = modeId;
      this.isError = false;

      if (this.isInitialized || forceRefresh) {
        await this.startOrResumeFM({ forceRefresh });
      }
    },

    playSongAtCursor(modeId = this.activeMode, idx = 0) {
      const slice = this.modes[modeId];
      if (!slice || idx < 0 || idx >= slice.queue.length) return;
      const song = slice.queue[idx];
      if (!song) return;

      const playerStore = usePlayerStore();
      slice.cursorIndex = idx;
      slice.lastUpdatedAt = Date.now();

      // 写入已播回顾（去重后置顶，最多保留 20 首）
      const key = normalizeSongKey(buildPlayPayload(song, DEFAULT_COVER));
      slice.playedHistory = [
        song,
        ...(slice.playedHistory || []).filter((s) => normalizeSongKey(buildPlayPayload(s, DEFAULT_COVER)) !== key)
      ].slice(0, PLAYED_HISTORY_LIMIT);

      // 统计 14 天内是否重复曝光
      const snap = getFmMemorySnapshot();
      const songId = getSongIdentity(song);
      const isRepeat14d = (snap.recent || []).some((entry) => {
        if (Date.now() - Number(entry.updatedAt || 0) > 14 * 24 * 60 * 60 * 1000) return false;
        if (songId.key && entry.key === songId.key) return true;
        if (songId.canonicalWorkKey && entry.canonicalWorkKey === songId.canonicalWorkKey) return true;
        return false;
      });

      persistFmMeta((meta) => {
        const m = { ...(meta.metrics || {}) };
        m.totalServed = Number(m.totalServed || 0) + 1;
        if (isRepeat14d) m.repeat14dCount = Number(m.repeat14dCount || 0) + 1;
        return { ...meta, metrics: m };
      });

      recordFmServed(song);
      this.activeTrackStartedAt = Date.now();
      this.activeTrackKey = key;
      this._syncStateFromMemory();

      this.registerPlayerController();
      playerStore.playFmSong(buildPlayPayload(song, DEFAULT_COVER));

      if (this.isPeakPreview) {
        this.schedulePeakSeek(key);
      }

      if (this.remainingCount <= 4 && !this.isLoadingMore) {
        this.fetchBatchForMode(modeId, { reset: false });
      }
    },

    togglePlayCurrent() {
      const song = this.currentSong;
      if (!song) return;
      const playerStore = usePlayerStore();
      const targetKey = normalizeSongKey(buildPlayPayload(song, DEFAULT_COVER));
      if (playerStore.currentSong && normalizeSongKey(playerStore.currentSong) === targetKey && playerStore.isFmModePlaylist) {
        playerStore.togglePlay();
      } else {
        this.playSongAtCursor(this.activeMode, this.activeSlice.cursorIndex);
      }
    },

    playFromQueue(upcomingIdx) {
      const actualIndex = this.activeSlice.cursorIndex + 1 + upcomingIdx;
      if (actualIndex < 0 || actualIndex >= this.activeSlice.queue.length) return;
      this.resetPeakState();
      this.playSongAtCursor(this.activeMode, actualIndex);
    },

    _evaluateImplicitBehavior(song, { isAuto = false, triggerSource = '' } = {}) {
      if (!song) return;
      const playerStore = usePlayerStore();
      const duration = Math.max(1, Number(playerStore.duration || song.duration || 0));
      const playedSec = Math.max(0, Number(playerStore.currentTime || 0));
      const channel = song._fmMeta?.sourceChannel || '';

      // 30s 速听自动切歌受保护，绝不计入秒切
      if (triggerSource === 'peak_auto_next' || (this.isPeakPreview && isAuto)) {
        return;
      }

      if (isAuto || playedSec / duration >= 0.75) {
        // 有效完播 -> 提升通道健康分 + 候选正向种子
        this.quickSkipStreak = 0;
        persistFmMeta((meta) => {
          const prev = meta.channelHealth?.[channel] || {};
          const m = { ...(meta.metrics || {}) };
          m.effectiveCompleteCount = Number(m.effectiveCompleteCount || 0) + 1;
          return {
            ...meta,
            channelHealth: {
              ...(meta.channelHealth || {}),
              [channel]: {
                ...prev,
                scoreOffset: Math.min(12, Number(prev.scoreOffset || 0) + 2)
              }
            },
            metrics: m
          };
        });
        recordPositiveAssetSeed(song);
        return;
      }

      // 非速听手动切歌且播放 < 10 秒 -> 极速秒切
      if (!isAuto && !this.isPeakPreview && playedSec < 10) {
        this.quickSkipStreak += 1;
        recordFmArtistSuppression(song, { blocked: false, reason: 'quick_skip', penaltyDelta: 10 });
        persistFmMeta((meta) => {
          const prev = meta.channelHealth?.[channel] || {};
          const m = { ...(meta.metrics || {}) };
          m.quickSkipCount = Number(m.quickSkipCount || 0) + 1;
          return {
            ...meta,
            channelHealth: {
              ...(meta.channelHealth || {}),
              [channel]: {
                ...prev,
                scoreOffset: Math.max(-20, Number(prev.scoreOffset || 0) - 4)
              }
            },
            metrics: m
          };
        });

        // 连续 2 次极速秒切 -> 实时重排尾部队列，压后同通道/同歌手曲目
        if (this.quickSkipStreak >= 2) {
          this.quickSkipStreak = 0;
          this._rearrangeTailOnSkipStreak(this.activeMode, channel, getArtistKey(song));
        }
      } else {
        this.quickSkipStreak = 0;
      }
    },

    _rearrangeTailOnSkipStreak(modeId, skippedChannel, skippedArtistKey) {
      const slice = this.modes[modeId];
      if (!slice || slice.cursorIndex < 0) return;
      const head = slice.queue.slice(0, slice.cursorIndex + 1);
      const tail = slice.queue.slice(slice.cursorIndex + 1);
      if (tail.length <= 1) return;

      const prioritized = [];
      const demoted = [];
      tail.forEach((s) => {
        const sameChannel = skippedChannel && s._fmMeta?.sourceChannel === skippedChannel;
        const sameArtist = skippedArtistKey && getArtistKey(s) === skippedArtistKey;
        if (sameChannel || sameArtist) demoted.push(s);
        else prioritized.push(s);
      });
      slice.queue = [...head, ...prioritized, ...demoted];
    },

    async advanceNext({ isAuto = false, triggerSource = '' } = {}) {
      const ok = await this.ensureAccountContext();
      if (!ok) return;

      const prevSong = this.currentSong;
      this._evaluateImplicitBehavior(prevSong, { isAuto, triggerSource });
      this.resetPeakState();

      const slice = this.activeSlice;
      if (slice.cursorIndex + 1 < slice.queue.length) {
        this.playSongAtCursor(this.activeMode, slice.cursorIndex + 1);
        return;
      }

      await this.fetchBatchForMode(this.activeMode, { reset: false });
      if (slice.cursorIndex + 1 < slice.queue.length) {
        this.playSongAtCursor(this.activeMode, slice.cursorIndex + 1);
      } else {
        usePlayerStore().showToast('私人FM 正在为你扩展更多新鲜曲目...');
      }
    },

    stepPrev() {
      this.resetPeakState();
      const slice = this.activeSlice;
      if (slice.cursorIndex > 0) {
        this.playSongAtCursor(this.activeMode, slice.cursorIndex - 1);
      } else if (this.currentSong) {
        const playerStore = usePlayerStore();
        playerStore.seek(0);
        playerStore.mediaPlay();
        playerStore.showToast('已是当前波段第一首');
      }
    },

    handleTrackPlaybackError(failedSong) {
      if (!failedSong) return;
      recordFmBrokenTrack(failedSong, 'play_error');
      const failedKey = normalizeSongKey(failedSong);
      Object.values(this.modes).forEach((slice) => {
        for (let i = slice.queue.length - 1; i > slice.cursorIndex; i--) {
          const itemKey = normalizeSongKey(buildPlayPayload(slice.queue[i], DEFAULT_COVER));
          if (itemKey === failedKey) {
            slice.queue.splice(i, 1);
          }
        }
      });
    },

    async dislikeCurrent(reason = '不喜欢') {
      const song = this.currentSong;
      if (!song || this.isDisliking) return;
      this.isDisliking = true;

      try {
        recordFmDislike(song, reason);
        const modeId = this.activeMode;
        const slice = this.modes[modeId];

        if (reason !== '只是换一首') {
          const params = {
            mode: this.activeProfile.apiMode,
            action: 'garbage',
            song_pool_id: this.activeProfile.poolId,
            hash: song._hash,
            playtime: Math.floor(usePlayerStore().currentTime || 0),
            remain_songcnt: this.remainingCount,
            timestamp: Date.now()
          };
          const songId = song._album_audio_id || song.MixSongID || song.mixsongid || song.audio_id || '';
          if (songId) params.songid = songId;
          request.get('/personal/fm', { params, silent: true }).catch(() => {});
        }

        this.resetPeakState();
        slice.queue.splice(slice.cursorIndex, 1);

        // 即时队列手术 (Queue Surgery)
        if (reason === '不想听这个歌手') {
          const blockedArtist = getArtistKey(song);
          Object.values(this.modes).forEach((mSlice) => {
            for (let i = mSlice.queue.length - 1; i >= 0; i--) {
              if (getArtistKey(mSlice.queue[i]) === blockedArtist) {
                mSlice.queue.splice(i, 1);
                if (i < mSlice.cursorIndex) {
                  mSlice.cursorIndex = Math.max(0, mSlice.cursorIndex - 1);
                }
              }
            }
          });
        } else if (reason === '风格不对' || reason === '太吵' || reason === '太慢') {
          const targetChannel = song._fmMeta?.sourceChannel;
          if (targetChannel) {
            persistFmMeta((meta) => {
              const prev = meta.channelHealth?.[targetChannel] || {};
              return {
                ...meta,
                channelHealth: {
                  ...(meta.channelHealth || {}),
                  [targetChannel]: {
                    ...prev,
                    scoreOffset: Math.max(-20, Number(prev.scoreOffset || 0) - 8)
                  }
                }
              };
            });
            for (let i = slice.queue.length - 1; i >= slice.cursorIndex; i--) {
              if (slice.queue[i]?._fmMeta?.sourceChannel === targetChannel) {
                slice.queue.splice(i, 1);
              }
            }
          }
        }

        this._syncStateFromMemory();

        if (slice.cursorIndex >= slice.queue.length) {
          slice.cursorIndex = Math.max(0, slice.queue.length - 1);
        }

        if (slice.queue.length === 0) {
          await this.fetchBatchForMode(modeId, { reset: true });
          slice.cursorIndex = 0;
        }

        if (slice.queue.length > 0 && slice.cursorIndex < slice.queue.length) {
          this.playSongAtCursor(modeId, slice.cursorIndex);
        }

        if (this.remainingCount <= 4) {
          this.fetchBatchForMode(modeId, { reset: false });
        }
      } catch (e) {
        usePlayerStore().showToast('操作失败，请重试');
      } finally {
        this.isDisliking = false;
      }
    },

    onSongSavedToPlaylist(song) {
      if (!song) return;
      recordPositiveAssetSeed(song);
      const channel = song._fmMeta?.sourceChannel;
      persistFmMeta((meta) => {
        const m = { ...(meta.metrics || {}) };
        m.playlistSavedCount = Number(m.playlistSavedCount || 0) + 1;
        const nextHealth = { ...(meta.channelHealth || {}) };
        if (channel) {
          const prev = nextHealth[channel] || {};
          nextHealth[channel] = {
            ...prev,
            scoreOffset: Math.min(12, Number(prev.scoreOffset || 0) + 4)
          };
        }
        return { ...meta, channelHealth: nextHealth, metrics: m };
      });
      this._syncStateFromMemory();
    },

    unblockArtist(artistKey) {
      unblockArtistFromMemory(artistKey);
      this._syncStateFromMemory();
    },

    async resetCurrentModeBand() {
      clearModeCursors(this.activeMode);
      this.modes[this.activeMode] = createEmptyModeSlice();
      this._syncStateFromMemory();
      await this.startOrResumeFM({ forceRefresh: true });
    },

    setFilterVersionNoise(enabled) {
      const nextVal = Boolean(enabled);
      persistFmMeta((meta) => ({
        ...meta,
        preferences: {
          ...(meta.preferences || {}),
          filterVersionNoise: nextVal
        }
      }));
      this._syncStateFromMemory();
    },

    resetMetrics() {
      resetFmMetrics();
      this._syncStateFromMemory();
    },

    // ============ 30s 高潮速听控制 ============
    togglePeakPreview() {
      this.isPeakPreview = !this.isPeakPreview;
      const playerStore = usePlayerStore();
      if (
        this.isPeakPreview &&
        this.currentSong &&
        playerStore.currentSong &&
        normalizeSongKey(playerStore.currentSong) === normalizeSongKey(buildPlayPayload(this.currentSong, DEFAULT_COVER))
      ) {
        this.schedulePeakSeek(normalizeSongKey(buildPlayPayload(this.currentSong, DEFAULT_COVER)));
      } else {
        this.resetPeakState();
      }
    },

    resetPeakState() {
      if (peakTimerId) {
        clearTimeout(peakTimerId);
        peakTimerId = null;
      }
      peakSeekScheduledForKey = '';
      this.climaxInfo = null;
      peakRetryCount = 0;
      const playerStore = usePlayerStore();
      playerStore.peakMode = false;
      playerStore.peakStartOffset = 0;
      playerStore.peakDuration = 30;
    },

    schedulePeakSeek(songKey) {
      if (peakTimerId) {
        clearTimeout(peakTimerId);
        peakTimerId = null;
      }
      peakSeekScheduledForKey = songKey;
      peakRetryCount = 0;
      this.climaxInfo = null;

      const playerStore = usePlayerStore();
      playerStore.peakMode = true;
      playerStore.peakStartOffset = 0;
      playerStore.peakDuration = 30;

      const toSeconds = (val) => {
        if (val == null || val <= 0) return 0;
        return val > 600 ? val / 1000 : val;
      };

      const fetchClimax = async (hash) => {
        try {
          const res = await request.get('/song/climax', { params: { hash, timestamp: Date.now() }, silent: true });
          const findTimePair = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            const startKeys = ['start', 'begin', 'start_time', 'begin_time', 'climax_start', 'startTime', 'beginTime'];
            const endKeys = ['end', 'stop', 'end_time', 'stop_time', 'climax_end', 'endTime'];
            const getVal = (keys, target) => {
              for (const k of keys) {
                if (target[k] != null) return Number(target[k]);
              }
              return null;
            };
            for (const val of Object.values(obj)) {
              if (Array.isArray(val)) {
                for (const item of val) {
                  if (item && typeof item === 'object') {
                    const s = getVal(startKeys, item);
                    const e = getVal(endKeys, item);
                    if (s != null && s > 0) return { rawStart: s, rawEnd: e != null && e > s ? e : s + 30 };
                  }
                }
              } else if (val && typeof val === 'object') {
                const s = getVal(startKeys, val);
                const e = getVal(endKeys, val);
                if (s != null && s > 0) return { rawStart: s, rawEnd: e != null && e > s ? e : s + 30 };
                const deep = findTimePair(val);
                if (deep) return deep;
              }
            }
            return null;
          };
          const raw = findTimePair(res);
          return raw ? { start: toSeconds(raw.rawStart), end: toSeconds(raw.rawEnd) } : null;
        } catch (e) {
          return null;
        }
      };

      const doSeek = async () => {
        if (!this.isPeakPreview || !playerStore.currentSong) return;
        if (normalizeSongKey(playerStore.currentSong) !== peakSeekScheduledForKey) return;

        if (playerStore.duration <= 0) {
          peakRetryCount++;
          if (peakRetryCount <= 6) {
            peakTimerId = setTimeout(doSeek, 300);
          }
          return;
        }

        const result = await fetchClimax(peakSeekScheduledForKey);
        if (!result || !this.isPeakPreview || !playerStore.currentSong) return;
        if (normalizeSongKey(playerStore.currentSong) !== peakSeekScheduledForKey) return;

        const startTime = Math.min(result.start, Math.max(0, playerStore.duration - 5));
        if (startTime >= 0) {
          playerStore.peakMode = true;
          playerStore.peakStartOffset = startTime;
          playerStore.peakDuration = 30;
          this.climaxInfo = { start: startTime, end: startTime + 30 };
          playerStore.seek(startTime);
        }
      };

      peakTimerId = setTimeout(doSeek, 400);
    }
  }
});
