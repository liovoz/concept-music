// ====================
// 文件：src/views/Search.vue
// ====================
<template>
  <div class="h-full flex flex-col relative overflow-hidden min-w-0">
    <div class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-gray-50 to-white -z-10"></div>

    <div id="search-scroll-container" class="p-8 z-10 flex-1 flex flex-col overflow-y-auto custom-scrollbar min-w-0">
      
      <div class="flex items-end justify-between mb-8 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            搜索结果 <span v-if="currentKeyword" class="text-lg text-gray-400 font-normal ml-2">"{{ currentKeyword }}"</span>
          </h2>
          <p v-if="!isLoading && !isError && songs.length > 0" class="text-xs text-gray-500 mt-2">已为您找到相关单曲</p>
        </div>
        
        <button v-if="songs.length > 0" @click="playAll" class="flex-shrink-0 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-all transform active:scale-95 flex items-center no-drag">
          <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
          播放当前结果
        </button>
      </div>

      <div v-if="isError" class="flex flex-col items-center justify-center py-20 text-red-500 bg-red-50 rounded-2xl border border-red-100 shadow-inner">
        <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-sm font-bold">{{ errorMessage }}</p>
        <p class="text-xs text-red-400 mt-2 max-w-sm text-center">系统尝试了多种通道仍被服务端拦截，这通常是因为网络波动。</p>
        <button @click="fetchSearch" class="mt-6 px-8 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md shadow-red-200 transition-all active:scale-95 no-drag flex items-center">
          重新尝试
        </button>
      </div>

      <div v-else-if="!isLoading && songs.length === 0 && page === 1 && isDrmRestricted" class="flex flex-col items-center justify-center py-28 text-gray-600 bg-blue-50/50 rounded-3xl border border-blue-100/50">
        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-5">
           <svg class="w-10 h-10 text-blue-500 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <p class="text-base font-bold text-gray-800 tracking-wide">版权风控保护</p>
        <p class="text-sm text-gray-500 mt-2 max-w-md text-center leading-relaxed">服务端已对匿名用户隐藏了“{{ currentKeyword }}”的搜索结果。<br>请安全登录后解锁完整曲库与版权资源。</p>
        <button @click="userStore.openLoginModal()" class="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag flex items-center">
          立即安全登录
        </button>
      </div>

      <div v-else-if="!isLoading && songs.length === 0 && page === 1" class="flex flex-col items-center justify-center py-32 text-gray-400">
        <svg class="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <p class="text-sm font-medium">很抱歉，全网均未找到与“{{ currentKeyword }}”相关的歌曲</p>
        <p class="text-xs mt-2">请尝试更换搜索词，或检查输入是否有误</p>
      </div>

      <div v-else-if="isLoading && page === 1" class="space-y-4">
        <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
          <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
        </div>
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
          <div v-for="(song, index) in songs" :key="song._hash || index" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 group transition-colors cursor-pointer no-drag min-w-0">
            <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
            <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 flex-shrink-0" @click.stop="handlePlay(song)">
               <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            </div>
            
            <div class="flex-1 flex items-center pl-2 pr-4 min-w-0" v-tooltip="song._title">
              <span class="truncate text-sm text-gray-800 font-medium min-w-0">{{ song._title }}</span>
              <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none">付费</span>
              <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none">VIP</span>
            </div>
            
            <div class="w-1/4 hidden sm:block text-xs truncate pr-4 min-w-0">
              <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
            </div>

            <div class="w-1/4 hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
              <span
                @click.stop="goToAlbum(song._album_id || song.album_id, song._album)"
                class="transition-colors"
                :class="(song._album_id || song.album_id) ? 'hover:text-blue-600 cursor-pointer' : 'hover:text-gray-700 cursor-pointer'"
              >
                {{ song._album }}
              </span>
            </div>
            
            <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
          <div v-if="isLoadingMore" class="flex items-center text-blue-500">
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            正在获取更多结果...
          </div>
          <div v-else-if="!hasMore && songs.length > 0" class="text-gray-300 flex items-center space-x-2">
            <span class="w-8 h-px bg-gray-200"></span>
            <span>库中已无更多数据</span>
            <span class="w-8 h-px bg-gray-200"></span>
          </div>
        </div>
      </div>

    </div>

    <BackToTop targetId="search-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import { useUserStore } from '../store/userStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';
import { openSongContextMenu } from '../utils/songContextMenu';

const route = useRoute();
const router = useRouter(); 
const store = usePlayerStore();
const userStore = useUserStore();

const currentKeyword = ref('');
const songs = ref([]);
const totalCount = ref(0);
const isLoading = ref(false);
const isError = ref(false);
const errorMessage = ref('');

const isDrmRestricted = ref(false);

const page = ref(1);
const pageSize = 30;
const hasMore = ref(true);
const isLoadingMore = ref(false);
const loadMoreTrigger = ref(null);
let observer = null;

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const goToArtist = (id, name) => {
  if (id && id !== '0') {
    router.push(`/artist/${id}`);
  } else if (name && name.trim() && name !== '未知歌手') {
    router.push({ path: '/search', query: { keyword: name.trim() } });
  } else {
    store.showToast('暂无该歌手详情信息');
  }
};

const goToAlbum = (id, name) => {
  if (id && id !== '0') {
    router.push(`/album/${id}`);
  } else if (name && name.trim() && name !== '未知专辑' && name !== '单曲') {
    router.push({ path: '/search', query: { keyword: name.trim() } });
  } else {
    store.showToast('暂无该专辑详情信息');
  }
};

const extractSongs = (res) => {
  const songMap = new Map();

  const getHash = (item) => {
    return item.FileHash || item.hash || item.filehash || item.SQFileHash || item.HQFileHash || item.sqhash || item['320hash'] || (item.audio_info && item.audio_info.hash_128) || item.audio_id || item.mixsongid;
  };

  const getName = (item) => {
    return item.SongName || item.songname || item.name || item.FileName || item.filename || item.title || item.Title;
  };

  const isRealSong = (item) => {
    if (!item || typeof item !== 'object') return false;
    return !!(getHash(item) && getName(item));
  };

  const seen = new WeakSet();

  const traverse = (data, depth) => {
    if (depth > 8 || !data || typeof data !== 'object') return;
    if (seen.has(data)) return;
    seen.add(data);
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
    Object.values(data).forEach(val => traverse(val, depth + 1));
  };

  traverse(res, 0);
  return Array.from(songMap.values());
};

const fetchSearch = async () => {
  const keyword = route.query.keyword;
  if (!keyword) return;

  currentKeyword.value = keyword;
  isLoading.value = true;
  isError.value = false;
  errorMessage.value = '';
  isDrmRestricted.value = false;
  page.value = 1;
  hasMore.value = true;
  songs.value = [];
  totalCount.value = 0;

  try {
    await request.get('/register/dev').catch(() => {});
    
    const res = await request.get('/search', { 
      params: { keywords: keyword, type: 'song', page: page.value, pagesize: pageSize } 
    }).catch(() => null);

    let rawSongs = extractSongs(res);

    if (rawSongs.length === 0) {
      const complexRes = await request.get('/search/complex', { 
        params: { keywords: keyword, page: page.value, pagesize: pageSize } 
      }).catch(() => null);
      
      rawSongs = extractSongs(complexRes);
    }

    if (rawSongs.length > 0) {
      songs.value = normalizeSongs(rawSongs, defaultImg);
      totalCount.value = rawSongs.length >= pageSize ? rawSongs.length * 10 : rawSongs.length;
      if (rawSongs.length < pageSize) hasMore.value = false;
    } else {
      hasMore.value = false;
      if (!userStore.isLoggedIn) {
        isDrmRestricted.value = true;
      }
    }

  } catch (error) {
    isError.value = true;
    errorMessage.value = '系统网络通道堵塞，请稍后再试。';
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value) return;
  isLoadingMore.value = true;
  page.value += 1;
  
  try {
    const res = await request.get('/search', { 
      params: { keywords: currentKeyword.value, type: 'song', page: page.value, pagesize: pageSize } 
    }).catch(() => null);

    let newRawSongs = extractSongs(res);

    if (newRawSongs.length === 0) {
      const complexRes = await request.get('/search/complex', { 
        params: { keywords: currentKeyword.value, page: page.value, pagesize: pageSize } 
      }).catch(() => null);
      newRawSongs = extractSongs(complexRes);
    }

    if (newRawSongs.length === 0) {
      hasMore.value = false;
    } else {
      songs.value.push(...normalizeSongs(newRawSongs, defaultImg));
      if (newRawSongs.length < pageSize || songs.value.length >= totalCount.value) hasMore.value = false;
    }
  } catch (error) {
    hasMore.value = false;
  } finally {
    isLoadingMore.value = false;
  }
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading.value && !isLoadingMore.value && hasMore.value) loadMore();
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};

let searchDebounceTimer = null;

watch(
  () => route.query.keyword,
  (newKeyword) => {
    if (newKeyword && newKeyword !== currentKeyword.value) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetchSearch().then(() => setupObserver());
      }, 400);
    }
  }
);

onMounted(() => { if (route.query.keyword) { fetchSearch().then(() => setupObserver()); } });
onUnmounted(() => { if (observer) observer.disconnect(); });

const handlePlay = (song) => {
  if (!song._hash) return;
  store.playSong(buildPlayPayload(song, defaultImg));
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, defaultImg));
};

const playAll = () => {
  if (songs.value.length === 0) return;
  store.prependPlaylistAndPlay(songs.value.map(song => buildPlayPayload(song, defaultImg)));
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
