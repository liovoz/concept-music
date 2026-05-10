// ====================
// 文件：src/views/DailyRecommend.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="daily-scroll-container">
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-blue-50/60 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <div v-if="!userStore.isLoggedIn" class="flex-1 flex flex-col items-center justify-center relative">
        <div class="absolute inset-0 bg-white/40 backdrop-blur-md z-0 rounded-3xl"></div>
        <div class="relative z-10 flex flex-col items-center text-center">
          <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100">
            <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">每日私人推荐</h2>
          <p class="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">登录概念音乐，开启根据你个人口味深度定制的每日专属歌单。遇见不期而遇的惊喜。</p>
          <button @click="userStore.openLoginModal()" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag flex items-center">
            立即安全登录
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>

      <template v-else>
        <div class="flex items-end mb-10 w-full gap-6">
          <div v-if="isLoading" class="w-24 h-28 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0 shadow-md"></div>
          <div v-else class="w-24 h-28 rounded-2xl bg-white shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col overflow-hidden text-center flex-shrink-0 select-none">
            <div class="bg-blue-500 text-white text-[11px] font-black py-1.5 tracking-widest">{{ currentMonth }}</div>
            <div class="flex-1 flex items-center justify-center text-4xl font-black text-gray-800 bg-gradient-to-b from-gray-50 to-white">{{ currentDay }}</div>
          </div>
          <div class="flex flex-col justify-end flex-1 min-w-0 pb-1">
            <div v-if="isLoading" class="w-3/4 h-10 bg-gray-200 rounded animate-pulse mb-3"></div>
            <h2 v-else class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight line-clamp-1 mb-2">每日歌曲推荐</h2>
            <div v-if="isLoading" class="w-1/2 h-4 bg-gray-200 rounded animate-pulse mb-5"></div>
            <p v-else class="text-sm text-gray-500 line-clamp-1 mb-5 font-medium">根据你的音乐口味生成，每天 6:00 更新</p>
            <div class="flex items-center">
              <button @click="playAll" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-all transform active:scale-95 flex items-center no-drag" :class="{'opacity-50 pointer-events-none': isLoading || songs.length === 0 || isError}">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                播放全部
              </button>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl"><div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div><div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div></div>
        </div>
        <div v-else-if="isError" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 mt-4">
          <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <p class="text-base font-bold text-red-600 mb-2">获取每日推荐失败</p><p class="text-xs text-red-400 max-w-lg text-center">{{ errorMessage }}</p>
          <button @click="fetchDailyRecommend" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重试加载</button>
        </div>
        <div v-else-if="songs.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 text-gray-400 mt-4">
          <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19a2 2 0 11-4 0 2 2 0 014 0zm12-3a2 2 0 11-4 0 2 2 0 014 0zM9 10l12-3"></path></svg>
          <p class="text-sm font-medium tracking-widest">今日暂无推荐，多听听歌再来看看吧</p>
        </div>

        <div v-else class="w-full flex-1 flex flex-col min-w-0">
          <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 mb-2 min-w-0">
            <div class="w-10 text-center flex-shrink-0">#</div><div class="flex-1 pl-2 min-w-0">音乐标题</div><div class="w-1/4 hidden sm:block pr-4 min-w-0">歌手</div><div class="w-1/4 hidden md:block pr-4 min-w-0">专辑</div><div class="w-16 text-right pr-4 flex-shrink-0">时长</div>
          </div>
          
          <div class="space-y-1">
            <div v-for="(song, index) in songs" :key="song._hash || index" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 group transition-colors cursor-pointer no-drag min-w-0">
              <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
              <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 flex-shrink-0" @click.stop="handlePlay(song)">
                 <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              </div>
              
              <div class="flex-1 flex items-center pl-2 pr-4 min-w-0" v-tooltip="song._title">
                <img :src="song._cover" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100" @error="e => e.target.src = defaultImg" />
                <span class="truncate text-sm text-gray-800 font-medium min-w-0">{{ song._title }}</span>
                <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
                <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
              </div>
              
              <div class="w-1/4 hidden sm:block text-xs truncate pr-4 min-w-0">
                <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" :show-underline="true" />
              </div>
              <div class="w-1/4 hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
                <span
                  @click.stop="goToAlbum(song._album_id || song.album_id)"
                  class="transition-colors"
                  :class="(song._album_id || song.album_id) ? 'hover:text-blue-600 hover:underline cursor-pointer' : 'text-gray-400 cursor-default'"
                >
                  {{ song._album }}
                </span>
              </div>
              <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
            </div>
          </div>
          
          <div class="w-full h-24 flex items-center justify-center mt-4 pb-8 text-xs font-medium">
            <div class="text-gray-300 flex items-center space-x-2">
              <span class="w-8 h-px bg-gray-200"></span><span>今日推荐已全部加载</span><span class="w-8 h-px bg-gray-200"></span>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <BackToTop targetId="daily-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import request from '../utils/request';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';

const router = useRouter();
const userStore = useUserStore();
const store = usePlayerStore();

const dateObj = new Date();
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const currentMonth = computed(() => months[dateObj.getMonth()]);
const currentDay = computed(() => dateObj.getDate().toString().padStart(2, '0'));

const isLoading = ref(false);
const isError = ref(false);
const errorMessage = ref('');
const songs = ref([]);
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const goToArtist = (id) => {
  if (!id || id === '0') return store.showToast('暂无该歌手详情信息');
  router.push(`/artist/${id}`);
};

const goToAlbum = (id) => {
  if (!id || id === '0') return store.showToast('暂无该专辑详情信息');
  router.push(`/album/${id}`);
};

const extractSongs = (res) => {
  if (res?.data?.song_list && Array.isArray(res.data.song_list)) return res.data.song_list;
  let validArr = [];
  const isRealSong = (item) => item && typeof item === 'object' && (item.hash || item.filehash || item.FileHash);
  const traverse = (data, depth) => {
    if (depth > 6 || !data || validArr.length > 0) return;
    if (Array.isArray(data)) {
      if (data.length > 0 && isRealSong(data[0])) validArr = data;
      data.forEach(item => traverse(item, depth + 1));
      return;
    }
    if (typeof data === 'object') Object.values(data).forEach(val => traverse(val, depth + 1));
  };
  traverse(res, 0);
  return validArr;
};

const fetchDailyRecommend = async () => {
  if (!userStore.isLoggedIn) return;
  
  // ✨ 核心修复：引入缓存预取逻辑
  try {
    const cachedData = localStorage.getItem('kg_desktop_daily_rec_full');
    const cachedDate = localStorage.getItem('kg_desktop_daily_date');
    const today = getTodayStr();
    if (cachedData && cachedDate === today) {
      const parsed = JSON.parse(cachedData);
      if (parsed && parsed.length > 0) {
        songs.value = parsed;
        isLoading.value = false;
      }
    }
  } catch(e) {}

  if (songs.value.length === 0) {
    isLoading.value = true;
  }
  isError.value = false;
  errorMessage.value = '';

  try {
    await request.get('/register/dev').catch(() => {});
    const res = await request.get('/everyday/recommend', { silent: true });
    const rawSongs = extractSongs(res);
    if (rawSongs.length > 0) {
        const normalized = normalizeSongs(rawSongs, defaultImg);
        songs.value = normalized;
        localStorage.setItem('kg_desktop_daily_rec_full', JSON.stringify(normalized));
        localStorage.setItem('kg_desktop_daily_date', getTodayStr());
    } else if (res.code !== 1 && res.status !== 1 && songs.value.length === 0) {
        throw new Error('服务器拒绝访问，可能由于频繁请求被风控拦截。');
    }
  } catch (error) {
    if (songs.value.length === 0) {
        isError.value = true;
        errorMessage.value = error.message || '无法连接到服务器，请检查网络或登录状态是否过期。';
    }
  } finally {
    isLoading.value = false;
  }
};

const handlePlay = (song) => {
  if (!song._hash) return;
  store.playSong(buildPlayPayload(song, defaultImg));
};

const playAll = () => {
  if (songs.value.length === 0) return;
  store.clearPlaylist();
  songs.value.forEach(song => {
     if(song._hash) store.playlist.push(buildPlayPayload(song, defaultImg));
  });
  if(store.playlist.length > 0) store.playSong(store.playlist[0]);
};

watch(() => userStore.isLoggedIn, (newVal) => { if (newVal) fetchDailyRecommend(); });
onMounted(() => { if (userStore.isLoggedIn) fetchDailyRecommend(); });
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>