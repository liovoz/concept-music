// ====================
// 文件：src/views/History.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="history-scroll-container">
    <div class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      
      <div v-if="!userStore.isLoggedIn" class="flex-1 flex flex-col items-center justify-center relative">
        <div class="absolute inset-0 bg-white/40 backdrop-blur-md z-0 rounded-3xl"></div>
        <div class="relative z-10 flex flex-col items-center text-center">
          <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100">
            <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">听歌足迹</h2>
          <p class="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">安全登录后，我们将为您自动记录听歌足迹，帮您找回那些不经意间触动心弦的旋律。</p>
          <button @click="userStore.openLoginModal()" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag flex items-center">
            立即安全登录
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>

      <template v-else>
        
        <div class="flex items-end justify-between mb-6 w-full gap-4">
          <div class="flex-1 min-w-0">
            <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
              听歌足迹 <span class="text-lg text-blue-500 font-bold ml-2">History</span>
            </h2>
            <p class="text-xs text-gray-500 mt-2 font-medium">这里记录了每一首曾陪伴过您的音乐</p>
          </div>
          <button v-if="currentSongs.length > 0" @click="playAll" class="flex-shrink-0 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-all transform active:scale-95 flex items-center no-drag">
             <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
             播放全部
          </button>
        </div>

        <div class="flex items-center space-x-8 border-b border-gray-100 mb-6">
          <button @click="activeTab = 'recent'" class="pb-3 text-sm font-bold border-b-2 transition-all relative top-[1px] no-drag" :class="activeTab === 'recent' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">最近听过</button>
          <button @click="activeTab = 'rank'" class="pb-3 text-sm font-bold border-b-2 transition-all relative top-[1px] no-drag" :class="activeTab === 'rank' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">听歌排行</button>
        </div>

        <div v-if="activeTab === 'rank'" class="flex items-center space-x-2 mb-6 bg-gray-50 p-1 w-fit rounded-lg border border-gray-100">
           <button @click="rankType = 0" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag" :class="rankType === 0 ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'">最近一周</button>
           <button @click="rankType = 1" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag" :class="rankType === 1 ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'">全部累计</button>
        </div>

        <div v-if="isLoading && page === 1" class="space-y-4 w-full mt-2">
          <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
            <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
          </div>
        </div>

        <div v-else-if="isError && page === 1" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 mt-4">
          <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <p class="text-base font-bold text-red-600 mb-2">获取历史记录失败</p>
          <button @click="fetchData" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
        </div>

        <div v-else-if="currentSongs.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
          <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p class="text-sm font-medium tracking-widest">暂无听歌足迹，快去发现页听点好音乐吧</p>
        </div>

        <div v-else class="w-full flex-1 flex flex-col min-w-0">
          <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 mb-2 min-w-0">
            <div class="w-10 text-center flex-shrink-0">#</div>
            <div class="flex-1 pl-2 min-w-0">音乐标题</div>
            <div class="w-1/4 hidden sm:block pr-4 min-w-0">歌手</div>
            <div class="w-1/4 hidden md:block pr-4 min-w-0">专辑</div>
            <div class="w-24 text-right pr-4 flex-shrink-0" v-if="activeTab === 'rank'">播放次数</div>
            <div class="w-16 text-right pr-4 flex-shrink-0" v-else>时长</div>
          </div>
          
          <div class="space-y-1">
            <div v-for="(song, index) in currentSongs" :key="song._hash + index" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 group transition-colors cursor-pointer no-drag min-w-0">
              <div class="w-10 text-center text-sm font-bold group-hover:hidden flex-shrink-0 flex flex-col items-center justify-center"
                   :class="activeTab === 'rank' ? {'text-red-500': index === 0, 'text-orange-400': index === 1, 'text-yellow-500': index === 2, 'text-gray-400': index > 2} : 'text-gray-400'">
                {{ (index + 1).toString().padStart(2, '0') }}
              </div>
              <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 flex-shrink-0" @click.stop="handlePlay(song)">
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
                      :class="(song._album_id || song.album_id) ? 'hover:text-blue-600 cursor-pointer' : ''">{{ song._album }}</span>
              </div>
              
              <div class="w-24 text-xs font-bold text-gray-600 text-right pr-4 flex-shrink-0" v-if="activeTab === 'rank'">{{ song._playCount }} 次</div>
              <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0" v-else>{{ song._duration }}</div>
            </div>
          </div>

          <div v-if="activeTab === 'recent'" ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
            <div v-if="isLoadingMore" class="flex items-center text-blue-500">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              正在获取更多记录...
            </div>
            <div v-else-if="!recentHasMore && recentSongs.length > 0" class="text-gray-300 flex items-center space-x-2">
              <span class="w-8 h-px bg-gray-200"></span><span>所有的回忆都在这里啦</span><span class="w-8 h-px bg-gray-200"></span>
            </div>
          </div>
          <div v-if="activeTab === 'rank' && currentSongs.length > 0" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium text-gray-300">
            <span class="w-8 h-px bg-gray-200 mr-2"></span>最多仅展示前120首音乐<span class="w-8 h-px bg-gray-200 ml-2"></span>
          </div>

        </div>

      </template>
    </div>
    
    <BackToTop targetId="history-scroll-container" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';
import { openSongContextMenu } from '../utils/songContextMenu';

const userStore = useUserStore();
const store = usePlayerStore();
const router = useRouter();

const activeTab = ref('recent'); 
const rankType = ref(0); 

const isLoading = ref(true);
const isError = ref(false);

const page = ref(1); 

const recentSongs = ref([]);
const recentBp = ref('');
const recentHasMore = ref(true);
const isLoadingMore = ref(false);

const rankSongs = ref([]);

const loadMoreTrigger = ref(null);
let observer = null;

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

// ✨ BUG 修复：物理清洗掉所有播放次数为 0 的僵尸数据
const currentSongs = computed(() => {
  if (activeTab.value === 'recent') {
     const localHashes = userStore.localHistory.map(s => (s._hash || '').toUpperCase());
     const filteredRemote = recentSongs.value.filter(s => !localHashes.includes((s._hash || '').toUpperCase()));
     return [...userStore.localHistory, ...filteredRemote];
  } else {
     let remoteRanks = [...rankSongs.value];
     const localCounts = userStore.localPlayCounts || {};
     const remoteHashes = remoteRanks.map(s => (s._hash || '').toUpperCase());

     const finalRanks = remoteRanks.map(song => {
         const h = (song._hash || '').toUpperCase();
         const baseCount = parseInt(song.playcount || song.play_count || 0, 10);
         const extraCount = localCounts[h] || 0;
         return {
             ...song,
             _playCount: baseCount + extraCount 
         };
     });

     Object.keys(localCounts).forEach(hash => {
         if (!remoteHashes.includes(hash)) {
             const songObj = userStore.localHistory.find(s => (s._hash || '').toUpperCase() === hash);
             if (songObj) {
                 finalRanks.push({
                     ...songObj,
                     _playCount: localCounts[hash] 
                 });
             }
         }
     });

     // ✨ 数据清洗网：彻底屏蔽服务端的脏数据和 0 次误听记录
     const purifiedRanks = finalRanks.filter(song => song._playCount > 0);

     purifiedRanks.sort((a, b) => b._playCount - a._playCount);

     return purifiedRanks.slice(0, 120); 
  }
});

const extractSongs = (res) => {
  const songMap = new Map();
  const getHash = (item) => item.FileHash || item.hash || item.filehash || item.SQFileHash || item.HQFileHash || item.sqhash || item['320hash'] || (item.audio_info && item.audio_info.hash_128) || item.audio_id || item.mixsongid;
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

const extractBp = (obj) => {
   let newBp = '';
   const searchBp = (o) => {
      if(newBp) return;
      if(!o || typeof o !== 'object') return;
      if(o.bp || o.BP || o.Bp) { newBp = o.bp || o.BP || o.Bp; return; }
      Object.values(o).forEach(searchBp);
   }
   searchBp(obj);
   return newBp;
};

const fetchRecentData = async (isLoadMore = false) => {
  if (!isLoadMore) {
     recentSongs.value = [];
     recentBp.value = '';
     recentHasMore.value = true;
     isLoading.value = true;
  } else {
     isLoadingMore.value = true;
  }
  isError.value = false;
  if (!isLoadMore) {
    page.value = 1;
  }

  try {
    const params = { timestamp: Date.now() };
    if (isLoadMore && recentBp.value) {
       params.bp = recentBp.value;
    }

    const res = await request.get('/user/history', { params });
    const rawSongs = extractSongs(res);
    const newBp = extractBp(res);

    if (rawSongs.length > 0) {
       const normalized = normalizeSongs(rawSongs, defaultImg);
       recentSongs.value.push(...normalized);
       
       if (newBp && newBp !== recentBp.value) {
           recentBp.value = newBp;
       } else {
           recentHasMore.value = false;
       }
    } else {
       recentHasMore.value = false;
    }

  } catch (error) {
    if (!isLoadMore) isError.value = true;
    recentHasMore.value = false;
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

const fetchRankData = async () => {
  rankSongs.value = [];
  isLoading.value = true;
  isError.value = false;
  page.value = 1;

  try {
    const res = await request.get('/user/listen', { params: { type: rankType.value, timestamp: Date.now() } });
    const rawSongs = extractSongs(res);
    if (rawSongs.length > 0) {
       rankSongs.value = normalizeSongs(rawSongs, defaultImg);
    }
  } catch (error) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const fetchData = () => {
  if (!userStore.isLoggedIn) return;
  if (activeTab.value === 'recent') {
      if (recentSongs.value.length === 0) fetchRecentData();
  } else {
      fetchRankData(); 
  }
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && activeTab.value === 'recent' && !isLoading.value && !isLoadingMore.value && recentHasMore.value) {
        fetchRecentData(true);
    }
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};

watch([activeTab, rankType], () => {
  fetchData();
  setTimeout(() => {
    if (activeTab.value === 'recent' && loadMoreTrigger.value && observer) {
       observer.unobserve(loadMoreTrigger.value);
       observer.observe(loadMoreTrigger.value);
    }
  }, 100);
});

watch(() => userStore.isLoggedIn, (newVal) => { 
  if (newVal) { fetchData(); setupObserver(); }
});

onMounted(() => { 
  if (userStore.isLoggedIn) { fetchData(); setupObserver(); }
});
onUnmounted(() => { if (observer) observer.disconnect(); });

const handlePlay = (song) => {
  if (!song._hash) return;
  store.playSong(buildPlayPayload(song, defaultImg));
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, defaultImg));
};

const goToAlbum = (id) => {
  if (id) router.push(`/album/${id}`);
};

const playAll = () => {
  if (currentSongs.value.length === 0) return;
  store.clearPlaylist();
  currentSongs.value.forEach(song => {
     if(song._hash) store.playlist.push(buildPlayPayload(song, defaultImg));
  });
  if(store.playlist.length > 0) store.playSong(store.playlist[0]);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
