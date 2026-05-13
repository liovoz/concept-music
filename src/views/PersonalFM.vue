<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="fm-scroll-container">
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-50/60 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">

      <div class="flex items-end justify-between mb-6 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            私人FM <span class="text-lg text-purple-500 font-bold ml-2">Personal FM</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">根据你的口味，无限推荐好音乐</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4 mb-8">
        <div class="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button @click="switchMode('normal')" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="fmMode === 'normal' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">发现</button>
          <button @click="switchMode('small')" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="fmMode === 'small' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">小众</button>
          <button @click="switchMode('peak')" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="fmMode === 'peak' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">30s高潮</button>
        </div>

        <div class="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button @click="switchEngine(0)" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="songPoolId === 0 ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">Alpha</button>
          <button @click="switchEngine(1)" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="songPoolId === 1 ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">Beta</button>
          <button @click="switchEngine(2)" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="songPoolId === 2 ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">Gamma</button>
        </div>

        <div class="flex items-center text-[10px] text-gray-400 font-medium">
          <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Alpha=口味 · Beta=风格 · Gamma=探索</span>
        </div>
      </div>

      <div v-if="isLoading && fmQueue.length === 0" class="flex-1 flex flex-col items-center justify-center py-20">
        <div class="relative w-20 h-20 mb-6">
          <div class="absolute inset-0 rounded-full border-4 border-purple-100"></div>
          <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <svg class="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </div>
        </div>
        <p class="text-sm font-bold text-gray-500">正在为你调频中...</p>
      </div>

      <div v-else-if="isError && fmQueue.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">调频失败，请检查网络</p>
        <button @click="fetchAndShow" class="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新调频</button>
      </div>

      <template v-else-if="currentFMSong">

        <div class="flex flex-col lg:flex-row items-center gap-8 mb-10">

          <div class="flex-shrink-0 p-[4px] bg-white rounded-[28px] shadow-2xl shadow-purple-200/50">
            <div class="w-64 h-64 lg:w-72 lg:h-72 rounded-[22px] overflow-hidden">
              <img :src="currentFMSong._cover" :alt="currentFMSong._name || '电台封面'" class="w-full h-full object-cover" @error="e => e.target.src = defaultImg" />
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h3 class="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2 truncate w-full" v-tooltip="currentFMSong._title">{{ currentFMSong._title }}</h3>
            <div class="items-center flex-wrap justify-center lg:justify-start gap-1 mb-3">
              <SingerLink :singers="currentFMSong._singers" :singer-name="currentFMSong._singer" :singer-id="currentFMSong._singer_id" />
              <span v-if="currentFMSong._is_paid" class="ml-1 bg-orange-50 text-orange-500 border border-orange-200 px-1.5 py-0.5 rounded text-[9px] font-bold">付费</span>
              <span v-else-if="currentFMSong._is_vip" class="ml-1 bg-blue-50 text-blue-500 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-bold">VIP</span>
            </div>
            <p class="text-sm text-gray-400 mb-6 truncate w-full">
              <span @click="goToAlbum(currentFMSong._album_id)" class="transition-colors" :class="currentFMSong._album_id ? 'hover:text-purple-600 cursor-pointer' : ''">
                ♪ {{ currentFMSong._album }}
              </span>
            </p>

            <div v-if="fmMode === 'peak'" class="mb-4 px-3 py-1.5 inline-flex items-center rounded-full text-xs font-bold"
              :class="climaxInfo ? 'bg-purple-50 border border-purple-200 text-purple-600' : 'bg-yellow-50 border border-yellow-200 text-yellow-600'">
              <svg v-if="climaxInfo" class="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <svg v-else class="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span>{{ climaxInfo ? '高潮模式 · 正在播放高潮片段' : '高潮模式 · 正在定位高潮位置...' }}</span>
            </div>

            <div class="flex items-center space-x-4">
              <button @click="handlePlay" class="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 transition-all active:scale-90 no-drag">
                <svg v-if="isCurrentPlaying" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                <svg v-else class="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              </button>

              <button @click="handleNext" class="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-all active:scale-90 no-drag" v-tooltip="'下一首'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11.555 5.168A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"/></svg>
              </button>

              <button @click="handleDislike" :disabled="isDisliking" class="w-11 h-11 rounded-full bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all active:scale-90 no-drag disabled:opacity-50" v-tooltip="'不喜欢，换一首'">
                <svg v-if="!isDisliking" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              </button>

              <button @click="handleLike" class="w-11 h-11 rounded-full transition-all active:scale-90 no-drag flex items-center justify-center"
                :class="isCurrentLiked ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400'"
                v-tooltip="isCurrentLiked ? '取消喜欢' : '喜欢'">
                <svg class="w-[18px] h-[18px]" :fill="isCurrentLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <span class="text-xl mr-2">📻</span> 接下来播放
            </h3>
            <span class="text-xs text-gray-400 font-medium">队列中 {{ remainingCount }} 首</span>
          </div>

          <div v-if="upcomingSongs.length === 0 && isLoadingMore" class="space-y-2">
            <div v-for="i in 3" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
              <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
            </div>
          </div>

          <div v-else-if="upcomingSongs.length === 0" class="py-10 flex flex-col items-center text-gray-300">
            <p class="text-xs font-medium">队列已空，点击下方加载更多</p>
          </div>

          <div v-else class="space-y-1">
            <div v-for="(song, idx) in upcomingSongs" :key="song._hash + idx" @contextmenu="handleSongContextMenu($event, song)" @dblclick="playFromQueue(idx)"
              class="flex items-center px-4 py-3 rounded-xl hover:bg-purple-50/60 group transition-colors cursor-pointer no-drag min-w-0">
              <div class="w-10 text-center text-sm font-bold text-gray-300 group-hover:hidden flex-shrink-0">
                {{ (idx + 1).toString().padStart(2, '0') }}
              </div>
              <div class="w-10 text-center hidden group-hover:flex justify-center text-purple-600 flex-shrink-0" @click.stop="playFromQueue(idx)">
                <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              </div>

              <div class="flex-1 flex items-center pl-2 pr-4 min-w-0">
                <img :src="song._cover" :alt="song._name || '歌曲封面'" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100" @error="e => e.target.src = defaultImg" />
                <span class="truncate text-sm text-gray-800 font-medium min-w-0" v-tooltip="song._title">{{ song._title }}</span>
                <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
                <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
              </div>

              <div class="w-1/4 hidden sm:block text-xs truncate pr-4 min-w-0">
                <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
              </div>
              <div class="w-1/4 hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
                <span @click.stop="goToAlbum(song._album_id || song.album_id)"
                  class="transition-colors"
                  :class="(song._album_id || song.album_id) ? 'hover:text-purple-600 cursor-pointer' : ''">{{ song._album }}</span>
              </div>
              <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
            </div>
          </div>

          <div v-if="fmQueue.length > 0 && remainingCount <= 3 && !isLoadingMore" class="w-full flex justify-center mt-6">
            <button @click="loadMore" :disabled="isLoadingMore" class="px-6 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded-full text-xs font-bold transition-all no-drag flex items-center disabled:opacity-50">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              加载更多推荐
            </button>
          </div>
        </div>

      </template>

      <div v-else class="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
        <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
        <p class="text-sm font-medium mb-2">还没有推荐歌曲</p>
        <button @click="fetchAndShow" class="mt-4 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-bold shadow-md shadow-purple-200 transition-all active:scale-95 no-drag flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          开始调频
        </button>
      </div>
    </div>

    <BackToTop targetId="fm-scroll-container" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';
import { openSongContextMenu } from '../utils/songContextMenu';

defineOptions({ name: 'PersonalFM' });

const router = useRouter();
const userStore = useUserStore();
const playerStore = usePlayerStore();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const fmMode = ref('normal');
const songPoolId = ref(0);
const fmQueue = ref([]);
const currentFMIndex = ref(-1);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const isError = ref(false);
const isDisliking = ref(false);
const isFMActive = ref(false);
const climaxInfo = ref(null);
const fmInitialized = ref(false);
let peakSeekScheduledForHash = null;
let peakTimerId = null;
let peakRetryCount = 0;

const currentFMSong = computed(() => {
  if (currentFMIndex.value >= 0 && currentFMIndex.value < fmQueue.value.length) {
    return fmQueue.value[currentFMIndex.value];
  }
  return null;
});

const upcomingSongs = computed(() => {
  if (currentFMIndex.value < 0) return fmQueue.value;
  return fmQueue.value.slice(currentFMIndex.value + 1);
});

const remainingCount = computed(() => upcomingSongs.value.length);

const isCurrentPlaying = computed(() => {
  if (!currentFMSong.value || !playerStore.currentSong) return false;
  return playerStore.isPlaying && playerStore.currentSong.hash === currentFMSong.value._hash;
});

const isCurrentLiked = computed(() => {
  if (!currentFMSong.value || !userStore.isLoggedIn) return false;
  return userStore.likedHashes && userStore.likedHashes.includes((currentFMSong.value._hash || '').toUpperCase());
});

const extractFMSongs = (res) => {
  const songMap = new Map();
  const getHash = (item) => item.FileHash || item.hash || item.filehash || item.SQFileHash || item.HQFileHash || item.sqhash || item['320hash'] || (item.audio_info && item.audio_info.hash_128) || '';
  const getName = (item) => item.SongName || item.songname || item.name || item.FileName || item.filename || item.title || item.Title;
  const isRealSong = (item) => !!(item && typeof item === 'object' && getHash(item) && getName(item));

  const traverse = (data, depth) => {
    if (depth > 8 || !data) return;
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (isRealSong(item)) {
          const h = getHash(item);
          if (!songMap.has(h)) songMap.set(h, item);
        } else {
          traverse(item, depth + 1);
        }
      });
      return;
    }
    if (typeof data === 'object') {
      Object.values(data).forEach(val => traverse(val, depth + 1));
    }
  };
  traverse(res, 0);
  return Array.from(songMap.values());
};

const syncToPlaylist = () => {
  if (playerStore.playlist.length > 0 && !isFMActive.value) {
    playerStore.showToast('FM 模式已替换当前播放列表');
  }
  playerStore.playlist = fmQueue.value.map(song => buildPlayPayload(song, defaultImg));
};

const fetchFMSongs = async (action = 'play') => {
  const loadingRef = fmQueue.value.length === 0 ? isLoading : isLoadingMore;
  loadingRef.value = true;
  isError.value = false;

  try {
    const params = {
      mode: fmMode.value,
      action,
      song_pool_id: songPoolId.value,
      timestamp: Date.now()
    };

    if (currentFMSong.value) {
      params.hash = currentFMSong.value._hash;
      const songId = currentFMSong.value._album_audio_id || currentFMSong.value.MixSongID || currentFMSong.value.mixsongid || currentFMSong.value.audio_id || '';
      if (songId) params.songid = songId;
      params.playtime = Math.floor(playerStore.currentTime || 0);
    }

    if (fmQueue.value.length > 0) {
      params.remain_songcnt = remainingCount.value;
    }

    const res = await request.get('/personal/fm', { params });
    const rawSongs = extractFMSongs(res);

    if (rawSongs.length > 0) {
      const normalized = normalizeSongs(rawSongs, defaultImg);
      fmQueue.value.push(...normalized);
      syncToPlaylist();
    }
  } catch (error) {
    if (fmQueue.value.length === 0) {
      isError.value = true;
    }
  } finally {
    loadingRef.value = false;
  }
};

const fetchAndShow = async () => {
  isLoading.value = true;
  isError.value = false;
  fmQueue.value = [];
  currentFMIndex.value = -1;
  isFMActive.value = true;
  resetPeakState();

  try {
    const params = {
      mode: fmMode.value,
      action: 'play',
      song_pool_id: songPoolId.value,
      timestamp: Date.now()
    };

    const res = await request.get('/personal/fm', { params });
    const rawSongs = extractFMSongs(res);

    if (rawSongs.length > 0) {
      const normalized = normalizeSongs(rawSongs, defaultImg);
      fmQueue.value = normalized;
      syncToPlaylist();
      currentFMIndex.value = 0;
      fmInitialized.value = true;

      playerStore.playSong(buildPlayPayload(normalized[0], defaultImg));

      if (fmMode.value === 'peak') {
        schedulePeakSeek(normalized[0]._hash);
      }
    } else {
      isError.value = true;
    }
  } catch (error) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const loadMore = () => {
  fetchFMSongs();
};

const handlePlay = () => {
  if (!currentFMSong.value) return;

  if (isCurrentPlaying.value) {
    playerStore.togglePlay();
  } else if (playerStore.currentSong && playerStore.currentSong.hash === currentFMSong.value._hash) {
    playerStore.togglePlay();
  } else {
    playerStore.playSong(buildPlayPayload(currentFMSong.value, defaultImg));
    if (fmMode.value === 'peak' && !climaxInfo.value) {
      schedulePeakSeek(currentFMSong.value._hash);
    }
  }
};

const handleNext = () => {
  if (fmMode.value === 'peak') {
    playerStore.playNext(false);
  } else {
    resetPeakState();
    playerStore.playNext(false);
  }
};

const handleDislike = async () => {
  if (!currentFMSong.value || isDisliking.value) return;
  isDisliking.value = true;

  try {
    const params = {
      mode: fmMode.value,
      action: 'garbage',
      song_pool_id: songPoolId.value,
      hash: currentFMSong.value._hash,
      timestamp: Date.now()
    };
    const songId = currentFMSong.value._album_audio_id || currentFMSong.value.MixSongID || currentFMSong.value.mixsongid || currentFMSong.value.audio_id || '';
    if (songId) params.songid = songId;

    await request.get('/personal/fm', { params });

    resetPeakState();

    const dislikedHash = currentFMSong.value._hash;
    fmQueue.value.splice(currentFMIndex.value, 1);

    const playlistIdx = playerStore.playlist.findIndex(s => s.hash === dislikedHash);
    if (playlistIdx !== -1) {
      playerStore.playlist.splice(playlistIdx, 1);
    }

    if (currentFMIndex.value >= fmQueue.value.length) {
      currentFMIndex.value = Math.max(0, fmQueue.value.length - 1);
    }

    if (fmQueue.value.length === 0) {
      await fetchFMSongs('play');
      currentFMIndex.value = 0;
    }

    if (fmQueue.value.length > 0 && currentFMIndex.value < fmQueue.value.length) {
      playerStore.playSong(buildPlayPayload(fmQueue.value[currentFMIndex.value], defaultImg));
      if (fmMode.value === 'peak') {
        schedulePeakSeek(fmQueue.value[currentFMIndex.value]._hash);
      }
    }

    if (remainingCount.value <= 3) {
      fetchFMSongs();
    }
  } catch (error) {
    playerStore.showToast('操作失败，请重试');
  } finally {
    isDisliking.value = false;
  }
};

const handleLike = async () => {
  if (!currentFMSong.value) return;
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal();
    return;
  }
  await userStore.toggleLikeSong(currentFMSong.value);
};

const playFromQueue = (idx) => {
  const actualIndex = currentFMIndex.value + 1 + idx;
  if (actualIndex < 0 || actualIndex >= fmQueue.value.length) return;
  resetPeakState();
  currentFMIndex.value = actualIndex;
  playerStore.playSong(buildPlayPayload(fmQueue.value[actualIndex], defaultImg));
  if (fmMode.value === 'peak') {
    schedulePeakSeek(fmQueue.value[actualIndex]._hash);
  }
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, defaultImg));
};

const switchMode = (mode) => {
  if (fmMode.value === mode) return;
  fmMode.value = mode;
  if (fmInitialized.value) {
    fetchAndShow();
  }
};

const switchEngine = (id) => {
  if (songPoolId.value === id) return;
  songPoolId.value = id;
  if (fmInitialized.value) {
    fetchAndShow();
  }
};

const goToAlbum = (id) => {
  if (id) router.push(`/album/${id}`);
};

const resetPeakState = () => {
  if (peakTimerId) {
    clearTimeout(peakTimerId);
    peakTimerId = null;
  }
  peakSeekScheduledForHash = null;
  climaxInfo.value = null;
  peakRetryCount = 0;
  playerStore.peakMode = false;
  playerStore.peakStartOffset = 0;
  playerStore.peakDuration = 30;
};

const toSeconds = (val) => {
  if (val == null || val <= 0) return 0;
  if (val > 600) return val / 1000;
  return val;
};

const fetchClimax = async (hash) => {
  try {
    const res = await request.get('/song/climax', { params: { hash, timestamp: Date.now() } });

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

      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === 'object') {
              const s = getVal(startKeys, item);
              const e = getVal(endKeys, item);
              if (s != null && s > 0) return { rawStart: s, rawEnd: (e != null && e > s) ? e : s + 30 };
            }
          }
        } else if (val && typeof val === 'object') {
          const s = getVal(startKeys, val);
          const e = getVal(endKeys, val);
          if (s != null && s > 0) return { rawStart: s, rawEnd: (e != null && e > s) ? e : s + 30 };
          const deep = findTimePair(val);
          if (deep) return deep;
        }
      }
      return null;
    };

    const raw = findTimePair(res);
    if (!raw) return null;

    return {
      start: toSeconds(raw.rawStart),
      end: toSeconds(raw.rawEnd)
    };
  } catch (e) {
    return null;
  }
};

const activatePeakMode = (startSec) => {
  playerStore.peakMode = true;
  playerStore.peakStartOffset = startSec;
  playerStore.peakDuration = 30;
  climaxInfo.value = { start: startSec, end: startSec + 30 };
  playerStore.seek(startSec);
};

const schedulePeakSeek = (hash) => {
  if (peakTimerId) {
    clearTimeout(peakTimerId);
    peakTimerId = null;
  }
  peakSeekScheduledForHash = hash;
  peakRetryCount = 0;
  climaxInfo.value = null;

  playerStore.peakMode = true;
  playerStore.peakStartOffset = 0;
  playerStore.peakDuration = 30;

  const doSeek = async () => {
    if (fmMode.value !== 'peak') return;
    if (!playerStore.currentSong) return;
    if (playerStore.currentSong.hash !== peakSeekScheduledForHash) return;

    if (playerStore.duration <= 0) {
      peakRetryCount++;
      if (peakRetryCount <= 6) {
        peakTimerId = setTimeout(doSeek, 300);
      }
      return;
    }

    const result = await fetchClimax(peakSeekScheduledForHash);

    if (!result || fmMode.value !== 'peak') return;
    if (!playerStore.currentSong || playerStore.currentSong.hash !== peakSeekScheduledForHash) return;

    const startTime = Math.min(result.start, playerStore.duration - 5);

    if (startTime >= 0) {
      activatePeakMode(startTime);
    }
  };

  peakTimerId = setTimeout(doSeek, 400);
};

watch(() => playerStore.currentSong, (newSong) => {
  if (!newSong) return;

  if (isFMActive.value) {
    const fmIndex = fmQueue.value.findIndex(s => s._hash === newSong.hash);
    if (fmIndex !== -1) {
      currentFMIndex.value = fmIndex;

      if (remainingCount.value <= 3 && !isLoadingMore.value) {
        fetchFMSongs();
      }
    }
  }

  if (fmMode.value === 'peak' && fmInitialized.value && newSong.hash !== peakSeekScheduledForHash) {
    const isInQueue = fmQueue.value.some(s => s._hash === newSong.hash);
    if (isInQueue) {
      schedulePeakSeek(newSong.hash);
    } else {
      resetPeakState();
    }
  }
});

onActivated(() => {
  if (fmInitialized.value && fmQueue.value.length > 0) {
    isFMActive.value = true;
    syncToPlaylist();

    if (playerStore.currentSong) {
      const fmIndex = fmQueue.value.findIndex(s => s._hash === playerStore.currentSong.hash);
      if (fmIndex !== -1) {
        currentFMIndex.value = fmIndex;
      }
    }

    if (fmMode.value === 'peak' && currentFMSong.value) {
      if (playerStore.peakMode && playerStore.peakStartOffset > 0) {
        climaxInfo.value = { start: playerStore.peakStartOffset, end: playerStore.peakStartOffset + playerStore.peakDuration };
      } else if (playerStore.currentSong && playerStore.currentSong.hash === currentFMSong.value._hash) {
        schedulePeakSeek(currentFMSong.value._hash);
      }
    }
  }
});

onDeactivated(() => {
  isFMActive.value = false;
});

onMounted(() => {
  if (fmInitialized.value) {
    isFMActive.value = true;
    if (fmQueue.value.length > 0) {
      syncToPlaylist();
    }
  }
});

onUnmounted(() => {
  isFMActive.value = false;
  if (peakTimerId) {
    clearTimeout(peakTimerId);
    peakTimerId = null;
  }
  resetPeakState();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
