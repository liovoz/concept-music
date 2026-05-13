// ====================
// 文件：src/views/Discover.vue
// ====================
<template>
  <div class="h-full flex flex-col relative overflow-hidden bg-white min-w-0">
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/80 to-white -z-10 pointer-events-none"></div>

    <div id="discover-scroll-container" class="p-8 z-10 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-w-0 box-border scroll-smooth">
      
      <div class="flex items-end justify-between mb-8 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            首页 <span class="text-lg text-blue-500 font-bold ml-2">Home</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">听见好时光，发现未知的旋律</p>
        </div>
      </div>

      <div class="w-full flex flex-col min-w-0 mb-14">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-xl font-bold text-gray-800 flex items-center">
            <span class="text-2xl mr-2">🎧</span> 每日推荐
          </h3>
          <button v-if="userStore.isLoggedIn && dailySongs.length > 0" @click="playAllDaily" class="px-5 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-100 rounded-full text-xs font-bold transition-colors no-drag flex items-center">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            播放全部
          </button>
        </div>

        <div v-if="!userStore.isLoggedIn" class="w-full bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100/50 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-inner">
          <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h4 class="text-xl font-bold text-gray-800 mb-2">解锁您的专属音乐口味</h4>
          <p class="text-xs text-gray-500 mb-6">登录后，我们将每天为您量身定制符合您品味的私藏好歌</p>
          <button @click="userStore.openLoginModal()" class="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-all active:scale-95 no-drag">
            立即安全登录
          </button>
        </div>

        <div v-else-if="isDailyLoading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="flex items-center p-3 bg-gray-50/50 border border-gray-100 rounded-xl">
            <div class="w-12 h-12 bg-gray-200 rounded-md animate-pulse flex-shrink-0"></div>
            <div class="flex-1 ml-3 flex flex-col space-y-2">
              <div class="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
              <div class="w-1/2 h-2.5 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        <div v-else-if="dailyError" class="w-full py-10 flex flex-col items-center justify-center text-red-500 bg-red-50/50 rounded-2xl border border-red-100">
          <p class="text-sm font-bold text-red-600 mb-2">获取每日推荐失败，请检查网络</p>
          <button @click="fetchDailyRecommend" class="mt-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 no-drag">重试加载</button>
        </div>

        <div v-else-if="dailySongs.length > 0" class="w-full flex flex-col">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            <div v-for="song in dailySongs" :key="song._hash" @dblclick="handlePlay(song)" class="group flex items-center p-2.5 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md hover:border-blue-100 transition-all cursor-pointer no-drag min-w-0">
              <div class="relative w-[50px] h-[50px] flex-shrink-0 rounded-md overflow-hidden bg-gray-100 mr-3 border border-gray-50">
                <img :src="song._cover" :alt="song._name || '歌曲封面'" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" @error="e => e.target.src = defaultImg" />
                
                <div @click.stop="handlePlay(song)" class="absolute inset-0 bg-black/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <svg class="w-6 h-6 text-white ml-0.5 drop-shadow-md transform scale-75 group-hover:scale-100 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                </div>
              </div>
              
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex items-center w-full">
                  <span class="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate" v-tooltip="song._title">{{ song._title }}</span>
                  <span v-if="song._is_paid" class="ml-1.5 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-px rounded text-[8px] font-bold tracking-widest uppercase transform scale-90 origin-left">付费</span>
                  <span v-else-if="song._is_vip" class="ml-1.5 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-px rounded text-[8px] font-bold tracking-widest uppercase transform scale-90 origin-left">VIP</span>
                </div>
                <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" size="small" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-full mb-4">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-gray-800 flex items-center">
            <span class="text-2xl mr-2">💿</span> 为您精选歌单
          </h3>
        </div>

        <div v-if="isPlaylistsLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 lg:gap-5">
          <div v-for="i in 15" :key="i" class="flex flex-col space-y-3">
            <div class="w-full aspect-square bg-gray-100 rounded-2xl animate-pulse shadow-sm border border-gray-50"></div>
            <div class="w-3/4 h-4 bg-gray-100 rounded animate-pulse"></div>
            <div class="w-1/2 h-3 bg-gray-50 rounded animate-pulse"></div>
          </div>
        </div>

        <div v-else-if="playlistsError" class="flex-1 flex flex-col items-center justify-center py-10 text-red-500 bg-red-50/50 rounded-2xl border border-red-100">
          <p class="text-sm font-bold text-red-600 mb-2">获取精选歌单失败</p>
          <button @click="fetchPlaylists" class="mt-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
        </div>

        <div v-else-if="playlists.length > 0">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5 mb-8">
            <div v-for="playlist in playlists" :key="playlist.global_collection_id || playlist.specialid" @click="goToPlaylist(playlist.global_collection_id || playlist.specialid)" class="flex flex-col group cursor-pointer no-drag">
              <div class="relative w-full aspect-square rounded-2xl overflow-hidden fix-clip shadow-sm group-hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-1 bg-gray-100 border border-gray-50/50">
                <img :src="formatImg(playlist.imgurl || playlist.flexible_cover || playlist.pic)" :alt="playlist.specialname" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                
                <div class="absolute top-2 right-2 bg-black/30 backdrop-blur-md text-white px-2 py-0.5 rounded-full flex items-center shadow-sm">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <span class="text-[10px] font-bold tracking-wider">{{ formatPlayCount(playlist.play_count) }}</span>
                </div>

                <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                  </div>
                </div>
              </div>
              <div class="mt-3 flex flex-col px-1 min-w-0">
                <h4 class="text-sm font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors" v-tooltip="playlist.specialname">{{ playlist.specialname }}</h4>
                <p class="text-xs text-gray-400 mt-1.5 font-medium truncate" v-tooltip="'By ' + (playlist.nickname || '未知用户')">By {{ playlist.nickname || '未知用户' }}</p>
              </div>
            </div>
          </div>

          <div class="w-full flex flex-col items-center justify-center mt-2 mb-8">
            <div class="group px-10 py-6 bg-gray-50/50 border border-gray-100 rounded-3xl flex flex-col items-center transition-all hover:bg-gray-100/60">
              <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
              <div class="flex items-center space-x-3">
                <span class="w-8 h-px bg-gray-200"></span>
                <span class="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">已经到底了 · 听点别的吧</span>
                <span class="w-8 h-px bg-gray-200"></span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-10 text-gray-400">
          <svg class="w-12 h-12 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
          <p class="text-sm font-bold">暂无精选歌单</p>
        </div>
      </div>
    </div>

    <BackToTop targetId="discover-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';

const router = useRouter();
const userStore = useUserStore();
const store = usePlayerStore();

const isPlaylistsLoading = ref(true);
const playlistsError = ref(false);
const playlists = ref([]);

const isDailyLoading = ref(false);
const dailyError = ref(false);
const dailySongs = ref([]);

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatPlayCount = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
};

const formatImg = (url, size = 400) => {
  if (!url || typeof url !== 'string') return defaultImg;
  return url.replace(/\{size\}/g, size.toString());
};

const fetchPlaylists = async () => {
  isPlaylistsLoading.value = true;
  playlistsError.value = false;
  try {
    const res = await request.get('/top/playlist', { params: { category_id: 0 } });
    if (res?.data?.special_list) {
      playlists.value = res.data.special_list;
    } else {
      throw new Error('解析精选歌单失败');
    }
  } catch (error) {
    playlistsError.value = true;
  } finally {
    isPlaylistsLoading.value = false;
  }
};

const fetchDailyRecommend = async () => {
  if (!userStore.isLoggedIn) return;
  
  try {
    const cachedData = localStorage.getItem('kg_desktop_daily_rec_home');
    const cachedDate = localStorage.getItem('kg_desktop_daily_date');
    const today = getTodayStr();
    
    if (cachedData && cachedDate === today) {
      const parsed = JSON.parse(cachedData);
      if (parsed && parsed.length > 0) {
        dailySongs.value = parsed;
        isDailyLoading.value = false; 
      }
    }
  } catch(e) {
    localStorage.removeItem('kg_desktop_daily_rec_home');
    localStorage.removeItem('kg_desktop_daily_date');
  }

  if (dailySongs.value.length === 0) {
    isDailyLoading.value = true;
  }
  dailyError.value = false;
  
  try {
    const res = await request.get('/everyday/recommend', { silent: true });
    const rawSongs = res?.data?.song_list || [];
    if (rawSongs.length > 0) {
      const normalized = normalizeSongs(rawSongs, defaultImg);
      dailySongs.value = normalized;
      
      localStorage.setItem('kg_desktop_daily_rec_home', JSON.stringify(normalized));
      localStorage.setItem('kg_desktop_daily_date', getTodayStr());
    } else if (res.code !== 1 && res.status !== 1 && dailySongs.value.length === 0) {
      throw new Error('API限流');
    }
  } catch (error) {
    if (dailySongs.value.length === 0) {
      dailyError.value = true;
    }
  } finally {
    isDailyLoading.value = false;
  }
};

const goToPlaylist = (id) => {
  if (id) router.push({ path: `/playlist/${id}` });
};

const handlePlay = (song) => {
  if (!song._hash) return;
  store.playSong(buildPlayPayload(song, defaultImg));
};

const playAllDaily = () => {
  if (dailySongs.value.length === 0) return;
  store.clearPlaylist();
  dailySongs.value.forEach(song => {
     if(song._hash) store.playlist.push(buildPlayPayload(song, defaultImg));
  });
  if(store.playlist.length > 0) store.playSong(store.playlist[0]);
};

watch(() => userStore.isLoggedIn, (newVal) => { 
  if (newVal) fetchDailyRecommend(); 
  else dailySongs.value = [];
});

let timers = [];

onMounted(() => { 
  timers.push(setTimeout(() => { fetchPlaylists(); }, 150));
  if (userStore.isLoggedIn) { 
    timers.push(setTimeout(() => { fetchDailyRecommend(); }, 300)); 
  } 
});

onUnmounted(() => {
  timers.forEach(t => clearTimeout(t));
  timers = [];
});
</script>

<style scoped>
.fix-clip {
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);
  backface-visibility: hidden;
  transform: translateZ(0);
}
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>