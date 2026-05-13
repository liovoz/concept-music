<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="newsongs-scroll-container">
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-emerald-50/60 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">

      <div class="flex items-end justify-between mb-6 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            新歌速递 <span class="text-lg text-emerald-500 font-bold ml-2">New Releases</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">发现最新上架的好音乐</p>
        </div>
        <button v-if="songs.length > 0" @click="playAll" class="flex-shrink-0 px-5 py-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 border border-gray-100 rounded-full text-xs font-bold transition-colors no-drag flex items-center">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
          播放全部
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-4 mb-6">
        <div class="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button v-for="cat in CATEGORIES" :key="cat.key" @click="switchCategory(cat.key)"
            class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag"
            :class="activeCategory === cat.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            {{ cat.label }}
          </button>
        </div>
      </div>

      <div v-if="isLoading && songs.length === 0" class="space-y-4 w-full mt-2">
        <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
          <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
        </div>
      </div>

      <div v-else-if="isError && songs.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 mt-4">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">获取新歌失败</p>
        <button @click="fetchSongs()" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="songs.length === 0 && !isLoading" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
        <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
        <p class="text-sm font-medium tracking-widest">暂无新歌数据</p>
      </div>

      <div v-else class="w-full flex-1 flex flex-col min-w-0">
        <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 mb-2 min-w-0">
          <div class="w-10 text-center flex-shrink-0">#</div>
          <div class="flex-1 pl-2 min-w-0">音乐标题</div>
          <div class="w-1/4 hidden sm:block pr-4 min-w-0">歌手</div>
          <div class="w-1/4 hidden md:block pr-4 min-w-0">专辑</div>
          <div class="w-16 text-right pr-4 flex-shrink-0">时长</div>
        </div>

        <div class="space-y-1">
          <div v-for="(song, index) in songs" :key="song._hash + index" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)"
            class="flex items-center px-4 py-3 rounded-xl hover:bg-emerald-50/60 group transition-colors cursor-pointer no-drag min-w-0">
            <div class="w-10 text-center text-sm font-bold group-hover:hidden flex-shrink-0 flex flex-col items-center justify-center"
              :class="index === 0 ? 'text-emerald-500' : index === 1 ? 'text-teal-500' : index === 2 ? 'text-cyan-500' : 'text-gray-400'">
              {{ (index + 1).toString().padStart(2, '0') }}
            </div>
            <div class="w-10 text-center hidden group-hover:flex justify-center text-emerald-600 flex-shrink-0" @click.stop="handlePlay(song)">
              <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            </div>

            <div class="flex-1 flex items-center pl-2 pr-4 min-w-0" v-tooltip="song._title">
              <img :src="song._cover" :alt="song._name || '歌曲封面'" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100" @error="e => e.target.src = defaultImg" />
              <span class="truncate text-sm text-gray-800 font-medium min-w-0">{{ song._title }}</span>
              <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
              <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
            </div>

            <div class="w-1/4 hidden sm:block text-xs truncate pr-4 min-w-0">
              <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
            </div>
            <div class="w-1/4 hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
              <span @click.stop="goToAlbum(song._album_id || song.album_id)"
                class="transition-colors"
                :class="(song._album_id || song.album_id) ? 'hover:text-emerald-600 cursor-pointer' : ''">{{ song._album }}</span>
            </div>
            <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
          <div v-if="isLoadingMore" class="flex items-center text-emerald-500">
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            正在获取更多新歌...
          </div>
          <div v-else-if="!hasMore && songs.length > 0" class="text-gray-300 flex items-center space-x-2">
            <span class="w-8 h-px bg-gray-200"></span><span>已经到底了 · 没有更多新歌了</span><span class="w-8 h-px bg-gray-200"></span>
          </div>
        </div>
      </div>

    </div>

    <BackToTop targetId="newsongs-scroll-container" />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import { openSongContextMenu } from '../utils/songContextMenu';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';

defineOptions({ name: 'NewSongs' });

const router = useRouter();
const playerStore = usePlayerStore();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const CATEGORIES = [
  { key: 'all', label: '全部', api: 'topSong', rankId: 21608 },
  { key: 'cn', label: '华语', api: 'rankAudio', rankId: 31308 },
  { key: 'eu', label: '欧美', api: 'rankAudio', rankId: 31310 },
  { key: 'kr', label: '韩国', api: 'rankAudio', rankId: 31311 },
  { key: 'jp', label: '日本', api: 'rankAudio', rankId: 31312 },
];

const activeCategory = ref('all');
const songs = ref([]);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const isError = ref(false);
const page = ref(1);
const hasMore = ref(true);

const loadMoreTrigger = ref(null);
let observer = null;
let switchTimer = null;

const extractSongs = (res) => {
  const songMap = new Map();
  const getHash = (item) => item.FileHash || item.hash || item.filehash || item.SQFileHash || item.HQFileHash || item.sqhash || item['320hash'] || (item.audio_info && item.audio_info.hash_128) || item.audio_id || item.mixsongid;
  const getName = (item) => item.SongName || item.songname || item.name || item.FileName || item.filename || item.title || item.Title;
  const isRealSong = (item) => !!(item && typeof item === 'object' && getHash(item) && getName(item));

  const traverse = (data, depth, visited) => {
    if (depth > 8 || !data) return;
    if (typeof data === 'object' && visited.has(data)) return;
    if (typeof data === 'object') visited.add(data);
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (isRealSong(item)) {
          const h = getHash(item);
          if (!songMap.has(h)) songMap.set(h, item);
        } else {
          traverse(item, depth + 1, visited);
        }
      });
      return;
    }
    if (typeof data === 'object') {
      Object.values(data).forEach(val => traverse(val, depth + 1, visited));
    }
  };
  traverse(res, 0, new WeakSet());
  return Array.from(songMap.values());
};

const fetchSongs = async (isLoadMore = false) => {
  if (!isLoadMore) {
    songs.value = [];
    page.value = 1;
    hasMore.value = true;
    isLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }
  isError.value = false;

  try {
    const currentCategory = CATEGORIES.find(c => c.key === activeCategory.value);
    let rawSongs = [];

    if (currentCategory.api === 'topSong') {
      const res = await request.get('/top/song', {
        params: {
          type: currentCategory.rankId,
          page: page.value,
          pagesize: 30,
          timestamp: Date.now(),
        }
      });
      rawSongs = extractSongs(res);
    } else {
      const res = await request.get('/rank/audio', {
        params: {
          rankid: currentCategory.rankId,
          page: page.value,
          pagesize: 30,
          timestamp: Date.now(),
        }
      });
      const songlist = res?.data?.songlist || [];
      rawSongs = songlist.filter(s => s && typeof s === 'object');
    }

    if (rawSongs.length > 0) {
      const normalized = normalizeSongs(rawSongs, defaultImg);
      if (isLoadMore) {
        songs.value.push(...normalized);
      } else {
        songs.value = normalized;
      }
      hasMore.value = rawSongs.length >= 30;
    } else {
      hasMore.value = false;
    }
  } catch (error) {
    if (!isLoadMore) isError.value = true;
    hasMore.value = false;
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
    nextTick(() => {
      if (observer && loadMoreTrigger.value) {
        observer.disconnect();
        observer.observe(loadMoreTrigger.value);
      }
    });
  }
};

const switchCategory = (key) => {
  if (activeCategory.value === key) return;
  activeCategory.value = key;

  clearTimeout(switchTimer);
  switchTimer = setTimeout(() => {
    fetchSongs(false);
    const container = document.getElementById('newsongs-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }, 150);
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading.value && !isLoadingMore.value && hasMore.value) {
      page.value++;
      fetchSongs(true);
    }
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};

const handlePlay = (song) => {
  if (!song._hash) return;
  playerStore.playSong(buildPlayPayload(song, defaultImg));
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, defaultImg));
};

const playAll = () => {
  if (songs.value.length === 0) return;
  playerStore.clearPlaylist();
  songs.value.forEach(song => {
    if (song._hash) playerStore.playlist.push(buildPlayPayload(song, defaultImg));
  });
  if (playerStore.playlist.length > 0) playerStore.playSong(playerStore.playlist[0]);
};

const goToAlbum = (id) => {
  if (id) router.push(`/album/${id}`);
};

watch(() => loadMoreTrigger.value, (el) => {
  if (el && observer) {
    observer.unobserve(el);
    observer.observe(el);
  }
});

onMounted(() => {
  fetchSongs();
  setupObserver();
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  clearTimeout(switchTimer);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
