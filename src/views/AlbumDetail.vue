// ====================
// 文件：src/views/AlbumDetail.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="album-scroll-container">
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-gray-100 to-white -z-10"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <button @click="$router.back()" class="mb-6 flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors no-drag w-fit">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        返回
      </button>

      <div class="flex items-end mb-10 gap-6">
        <div v-if="isLoading && page === 1" class="w-48 h-48 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0 shadow-md"></div>
        <div v-else class="relative w-48 h-48 rounded-2xl flex-shrink-0 shadow-lg overflow-hidden border border-gray-100 bg-white group z-10">
          <img :src="albumInfo.cover || defaultImg" :alt="albumInfo.name || '专辑封面'" @error="e => e.target.src = defaultImg" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 relative z-10" />
          <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"></div>
          
          <div class="absolute -right-5 top-1/2 transform -translate-y-1/2 w-[90%] h-[90%] bg-[#111] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.6)] -z-10 group-hover:translate-x-4 transition-transform duration-700 border border-gray-800" style="background: repeating-radial-gradient(#111 0px, #1c1c1c 2px, #111 4px);"></div>
        </div>

        <div class="flex flex-col justify-end flex-1 min-w-0">
          <div v-if="isLoading && page === 1" class="w-24 h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
          <div v-else class="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2 flex items-center">
            <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2 border border-gray-200 shadow-sm">专辑</span> ALBUM
          </div>

          <div v-if="isLoading && page === 1" class="w-3/4 h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
          <h2 v-else class="text-4xl font-extrabold text-gray-900 tracking-tight line-clamp-2 mb-3">{{ albumInfo.name || '未知专辑' }}</h2>

          <div v-if="isLoading && page === 1" class="w-1/2 h-4 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div v-else class="flex items-center text-sm mb-6 space-x-4">
            <span 
              @click="goToArtist(albumInfo.singer_id)"
              class="font-bold text-gray-700 transition-colors"
              :class="albumInfo.singer_id ? 'hover:text-blue-600 cursor-pointer' : ''"
            >
              {{ albumInfo.singer || '未知歌手' }}
            </span>
            <span v-if="albumInfo.publish_date" class="text-gray-400 font-mono">{{ albumInfo.publish_date.split(' ')[0] }} 发行</span>
          </div>

          <div class="flex items-center space-x-3">
            <button @click="playAll" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-all transform active:scale-95 flex items-center no-drag" :class="{'opacity-50 pointer-events-none': (isLoading && page === 1) || songs.length === 0}">
              <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              播放全部
            </button>
          </div>
        </div>
      </div>

      <div v-if="albumInfo.intro && !isLoading" class="mb-8 p-5 bg-gray-50/50 rounded-2xl border border-gray-100 group relative">
        <h4 class="text-xs font-bold text-gray-800 mb-2">专辑简介</h4>
        <p class="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap transition-all duration-300" :class="isIntroExpanded ? '' : 'line-clamp-3'">{{ albumInfo.intro }}</p>
        <button v-if="albumInfo.intro.length > 120" @click="isIntroExpanded = !isIntroExpanded" class="mt-2 text-blue-500 hover:text-blue-600 text-xs font-bold focus:outline-none no-drag transition-colors">
          {{ isIntroExpanded ? '收起简介' : '展开全部' }}
        </button>
      </div>

      <div v-if="isLoading && page === 1" class="space-y-4 w-full">
        <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
          <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div><div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
        </div>
      </div>

      <div v-else-if="isError && page === 1" class="w-full flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">获取专辑信息失败</p>
        <button @click="fetchDetail" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="songs.length === 0" class="w-full flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
        <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        <p class="text-sm font-medium tracking-widest text-gray-400">该专辑暂无歌曲内容</p>
      </div>

      <div v-else class="w-full flex-1 flex flex-col min-w-0">
        <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 mb-2 min-w-0">
          <div class="w-10 text-center flex-shrink-0">#</div>
          <div class="flex-1 pl-2 min-w-0">音乐标题</div>
          <div class="w-1/3 hidden sm:block pr-4 min-w-0">歌手</div>
          <div class="w-16 text-right pr-4 flex-shrink-0">时长</div>
        </div>
        
        <div class="space-y-1 w-full">
          <div v-for="(song, index) in songs" :key="song._hash || index" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 group transition-colors cursor-pointer no-drag min-w-0">
            <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
            <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 flex-shrink-0" @click.stop="handlePlay(song)">
               <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            </div>
            
            <div class="flex-1 pl-2 text-sm text-gray-800 font-medium flex items-center pr-4 overflow-hidden min-w-0" v-tooltip="song._title">
              <span class="truncate min-w-0">{{ song._title }}</span>
              <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
              <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
            </div>
            
            <div class="w-1/3 hidden sm:block text-xs truncate pr-4 min-w-0">
              <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
            </div>
            
            <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
          <div v-if="isLoadingMore" class="flex items-center text-blue-500">
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            正在获取更多歌曲...
          </div>
          <div v-else-if="!hasMore && songs.length > 0" class="text-gray-300 flex items-center space-x-2">
            <span class="w-8 h-px bg-gray-200"></span><span>专辑曲目已全部加载</span><span class="w-8 h-px bg-gray-200"></span>
          </div>
        </div>
      </div>
    </div>
    
    <BackToTop targetId="album-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import { openSongContextMenu } from '../utils/songContextMenu';
import { usePlayAllHydration } from '../composables/usePlayAllHydration';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';

const route = useRoute();
const router = useRouter();
const store = usePlayerStore();
const { startPlayAllHydration, cancelPlayAllHydration } = usePlayAllHydration();

const albumInfo = ref({});
const songs = ref([]);

const isLoading = ref(true);
const isError = ref(false);
const isIntroExpanded = ref(false); 

const page = ref(1);
const pageSize = 30;
const hasMore = ref(true);
const isLoadingMore = ref(false);
const loadMoreTrigger = ref(null);
let observer = null;

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const goToArtist = (id) => {
  if (!id || id === '0') return store.showToast('暂无该歌手详情信息');
  router.push(`/artist/${id}`);
};

const extractAlbumInfo = (res) => {
  let data = res?.data || {};
  if (Array.isArray(data) && data.length > 0) data = data[0]; 
  
  let cover = data.sizable_cover || data.imgurl || data.pic || data.cover || '';
  if (cover && cover.includes('{size}')) cover = cover.replace(/\{size\}/g, '400');
  else if (cover && !cover.startsWith('http')) cover = ''; 
  
  let introStr = data.intro || data.desc || '';
  introStr = introStr.replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n');

  return {
    name: data.albumname || data.name || data.album_name || '未知专辑',
    cover: cover,
    intro: introStr,
    singer: data.author_name || data.singername || data.singer_name || '',
    singer_id: data.author_id || data.singerid || data.singer_id || '',
    publish_date: data.publish_date || data.publishtime || ''
  };
};

const extractSongs = (res) => {
  let validArr = [];
  if (res?.data?.info && Array.isArray(res.data.info)) validArr = res.data.info;
  else if (res?.data?.songs && Array.isArray(res.data.songs)) validArr = res.data.songs;
  else if (res?.data?.data && Array.isArray(res.data.data)) validArr = res.data.data;
  
  return validArr.map(item => {
    if (item.base && item.audio_info) {
       return {
          ...item,
          name: item.base.audio_name || item.base.songname,
          author_name: item.base.author_name || item.base.singername,
          hash: item.audio_info.hash_128 || item.audio_info.hash_320 || item.audio_info.hash_flac,
          album_id: item.base.album_id,
          album_audio_id: item.base.audio_id || item.base.album_audio_id,
          cover: item.album_info?.cover || item.album_info?.sizable_cover
       };
    }
    return {
       ...item,
       name: item.name || item.SongName || item.audio_name,
       author_name: item.author_name || item.singername 
    };
  }).filter(item => item.name && (item.hash || item.FileHash || item.album_audio_id)); 
};

const fetchDetail = async () => {
  const id = route.params.id;
  isLoading.value = true;
  isError.value = false;
  isIntroExpanded.value = false; 
  page.value = 1;
  hasMore.value = true;
  songs.value = [];

  try {
    await request.get('/register/dev').catch(() => {});
    
    const [infoRes, songsRes] = await Promise.allSettled([
      request.get('/album/detail', { params: { id: id, timestamp: Date.now() } }),
      request.get('/album/songs', { params: { id: id, page: page.value, pagesize: pageSize, timestamp: Date.now() } })
    ]);
    
    if (infoRes.status === 'fulfilled') {
      albumInfo.value = extractAlbumInfo(infoRes.value);
    } else {
      throw new Error('获取专辑详情失败');
    }
    
    if (songsRes.status === 'fulfilled') {
      const rawSongs = extractSongs(songsRes.value);
      songs.value = normalizeSongs(rawSongs, defaultImg);
      if (rawSongs.length < pageSize) hasMore.value = false;
    } else {
      hasMore.value = false;
    }
  } catch (error) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value) return;
  isLoadingMore.value = true;
  page.value += 1;
  const id = route.params.id;
  
  try {
    const songsRes = await request.get('/album/songs', { params: { id: id, page: page.value, pagesize: pageSize, timestamp: Date.now() } });
    const newRawSongs = extractSongs(songsRes);
    if (newRawSongs.length === 0) hasMore.value = false;
    else {
      songs.value.push(...normalizeSongs(newRawSongs, defaultImg));
      if (newRawSongs.length < pageSize) hasMore.value = false;
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

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId && route.path.startsWith('/album/')) {
    cancelPlayAllHydration();
    store.cancelPlayAllHydration();
    fetchDetail().then(() => setupObserver());
  }
});

let isComponentMounted = false;

onMounted(() => { 
  isComponentMounted = true;
  fetchDetail().then(() => { if (isComponentMounted) setupObserver(); }); 
});
onUnmounted(() => { 
  isComponentMounted = false;
  cancelPlayAllHydration();
  store.cancelPlayAllHydration();
  if (observer) observer.disconnect(); 
});

const handlePlay = (song) => {
  if (!song._hash && !song._album_audio_id) return;
  store.playSong(buildPlayPayload(song, albumInfo.value.cover || defaultImg));
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash && !song._album_audio_id) return;
  openSongContextMenu(event, buildPlayPayload(song, albumInfo.value.cover || defaultImg));
};

const playAll = () => {
  if (songs.value.length === 0) return;
  const fallbackCover = albumInfo.value.cover || defaultImg;
  const initialSongs = songs.value.map(song => buildPlayPayload(song, fallbackCover));
  const result = store.startPlayAllHydrationSession(initialSongs, { sourceKey: `album:${route.params.id}` });
  if (!result.sessionId || !hasMore.value) return;

  const albumId = String(route.params.id || '');
  startPlayAllHydration({
    sessionId: result.sessionId,
    startPage: page.value + 1,
    pageSize,
    loadPage: async (nextPage) => {
      const songsRes = await request.get('/album/songs', {
        params: { id: albumId, page: nextPage, pagesize: pageSize, timestamp: Date.now() },
        silent: true
      });
      const rawSongs = extractSongs(songsRes);
      return {
        rawCount: rawSongs.length,
        songs: normalizeSongs(rawSongs, defaultImg).map(song => buildPlayPayload(song, fallbackCover))
      };
    },
    appendSongs: (sessionId, payloads) => store.extendPlayAllHydration(sessionId, payloads),
    shouldContinue: () => String(route.params.id || '') === albumId && store.isPlayAllHydrationActive(result.sessionId)
  });
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
