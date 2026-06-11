// ====================
// 文件：src/views/MyPlaylists.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="my-playlists-scroll-container">
    
    <div class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      
      <div v-if="!userStore.isLoggedIn" class="flex-1 flex flex-col items-center justify-center relative">
        <div class="absolute inset-0 bg-white/40 backdrop-blur-md z-0 rounded-3xl"></div>
        <div class="relative z-10 flex flex-col items-center text-center">
          <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100">
            <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">私人歌单</h2>
          <p class="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">登录概念音乐，一键同步您精心收集的所有私人歌单，让好音乐随时陪伴。</p>
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
              私人歌单 <span class="text-lg text-blue-500 font-bold ml-2">My Playlists</span>
            </h2>
            <p class="text-xs text-gray-500 mt-2 font-medium">您创建与收藏的所有音乐记忆</p>
          </div>
        </div>

        <div class="flex items-center space-x-8 border-b border-gray-100 mb-8">
          <button @click="activeTab = 'all'" class="pb-3 text-sm font-bold border-b-2 transition-all relative top-[1px] no-drag" :class="activeTab === 'all' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">全部歌单</button>
          <button @click="activeTab = 'created'" class="pb-3 text-sm font-bold border-b-2 transition-all relative top-[1px] no-drag" :class="activeTab === 'created' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">我创建的</button>
          <button @click="activeTab = 'collected'" class="pb-3 text-sm font-bold border-b-2 transition-all relative top-[1px] no-drag" :class="activeTab === 'collected' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">我收藏的</button>
        </div>

        <div v-if="isLoading && page === 1" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
          <div v-for="i in 12" :key="i" class="flex flex-col space-y-3"><div class="w-full aspect-square bg-gray-100 rounded-2xl animate-pulse shadow-sm border border-gray-50"></div><div class="w-3/4 h-4 bg-gray-100 rounded animate-pulse"></div><div class="w-1/2 h-3 bg-gray-50 rounded animate-pulse"></div></div>
        </div>

        <div v-else-if="isError" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 mt-4">
          <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <p class="text-base font-bold text-red-600 mb-2">获取歌单失败</p><p class="text-xs text-red-400 max-w-lg text-center">{{ errorMessage }}</p>
          <button @click="fetchUserPlaylists" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
        </div>

        <div v-else-if="playlists.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
          <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <p class="text-sm font-medium tracking-widest">你还没有创建或收藏任何歌单</p>
        </div>
        
        <div v-else-if="filteredPlaylists.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
          <svg class="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <p class="text-sm font-medium tracking-widest">{{ activeTab === 'created' ? '您还没有创建过私人歌单' : '您还没有收藏过他人的歌单' }}</p>
        </div>

        <div v-else class="w-full flex-1 flex flex-col min-w-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            <div v-for="playlist in filteredPlaylists" :key="playlist._id" @click="goToPlaylist(playlist._id)" class="flex flex-col group cursor-pointer no-drag">
              <div class="relative w-full aspect-square rounded-2xl overflow-hidden fix-clip shadow-sm group-hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-1.5 bg-gray-100 border border-gray-50/50">
                <img :src="playlist._cover" :alt="playlist.name" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div class="absolute top-2 right-2 bg-black/30 backdrop-blur-md text-white px-2.5 py-1 rounded-full flex items-center shadow-sm">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M9 19V6l12-3v13M9 19a2 2 0 11-4 0 2 2 0 014 0zm12-3a2 2 0 11-4 0 2 2 0 014 0zM9 10l12-3"></path></svg>
                  <span class="text-[10px] font-bold tracking-wider">{{ playlist._trackCount }}首</span>
                </div>
                <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                  </div>
                </div>
              </div>
              
              <div class="mt-3 flex flex-col px-1">
                <h4 class="text-sm font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors" v-tooltip="playlist.name">{{ playlist.name }}</h4>
                <p class="text-xs text-gray-400 mt-1.5 font-medium truncate" v-tooltip="'By ' + (playlist.list_create_username || '未知用户')">By {{ playlist.list_create_username || '未知用户' }}</p>
              </div>
            </div>
          </div>

          <div ref="loadMoreTrigger" class="w-full h-24 flex items-center justify-center mt-6 pb-8 text-xs font-medium">
            <div v-if="isLoadingMore" class="flex items-center text-blue-500">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              正在获取更多歌单...
            </div>
            <div v-else-if="!hasMore && filteredPlaylists.length > 0" class="text-gray-300 flex items-center space-x-2">
              <span class="w-8 h-px bg-gray-200"></span><span>私人歌单已全部加载</span><span class="w-8 h-px bg-gray-200"></span>
            </div>
          </div>
        </div>

      </template>

    </div>
    
    <BackToTop targetId="my-playlists-scroll-container" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';
import request from '../utils/request';
import BackToTop from '../components/BackToTop.vue'; // ✨ 引入组件

const router = useRouter();
const userStore = useUserStore();

const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref('');
const playlists = ref([]);
const activeTab = ref('all');

const page = ref(1);
const pageSize = 30;
const hasMore = ref(true);
const isLoadingMore = ref(false);
const loadMoreTrigger = ref(null);
let observer = null;

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const normalizePlaylists = (rawList) => {
  return rawList.filter(item => {
    const gid = String(item.global_collection_id || item.listid || item.specialid);
    const lid = String(item.listid);
    return !userStore.deletedPlaylistIds.includes(gid) && !userStore.deletedPlaylistIds.includes(lid);
  }).map(item => {
    const routeId = String(item.global_collection_id || item.listid || item.specialid);
    
    let rawCover = item.pic || item.create_user_pic || '';
    let finalCover = defaultImg;
    if (rawCover && typeof rawCover === 'string') {
      finalCover = rawCover.replace(/\{size\}/g, '400');
    }
    let trackCount = item.count || item.m_count || 0;
    
    return { ...item, _id: routeId, _cover: finalCover, _trackCount: trackCount };
  });
};

const filteredPlaylists = computed(() => {
  let list = playlists.value;
  if (activeTab.value === 'created') {
    list = playlists.value.filter(p => userStore.createdListIds.includes(p._id));
  } else if (activeTab.value === 'collected') {
    list = playlists.value.filter(p => userStore.collectedListIds.includes(p._id));
  }
  
  return list.map(p => {
     if (p._id === String(userStore.likedPlaylistGlobalId)) {
        return {
            ...p,
            _cover: userStore.likedPlaylistCover || p._cover,
            _trackCount: userStore.likedHashes.length > 0 ? userStore.likedHashes.length : p._trackCount
        };
     }
     return p;
  });
});

const fetchUserPlaylists = async () => {
  if (!userStore.isLoggedIn) return;
  isLoading.value = true;
  isError.value = false;
  errorMessage.value = '';
  page.value = 1;
  hasMore.value = true;
  playlists.value = [];

  try {
    await request.get('/register/dev').catch(() => {});
    const res = await request.get('/user/playlist', { params: { page: page.value, pagesize: pageSize } });
    if (res?.data?.info && Array.isArray(res.data.info)) {
      const rawLists = res.data.info;
      playlists.value = normalizePlaylists(rawLists);
      if (rawLists.length < pageSize) hasMore.value = false;
    } else throw new Error('未能在响应中找到预期的 info 数组');
  } catch (error) {
    isError.value = true;
    errorMessage.value = error.message || '无法连接到服务器，请检查网络或登录状态。';
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value || !userStore.isLoggedIn) return;
  isLoadingMore.value = true;
  page.value += 1;
  try {
    const res = await request.get('/user/playlist', { params: { page: page.value, pagesize: pageSize } });
    if (res?.data?.info && Array.isArray(res.data.info)) {
      const newRawLists = res.data.info;
      if (newRawLists.length === 0) hasMore.value = false;
      else {
        playlists.value.push(...normalizePlaylists(newRawLists));
        if (newRawLists.length < pageSize) hasMore.value = false;
      }
    } else hasMore.value = false;
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

const goToPlaylist = (id) => {
  if (!id) return;
  router.push({ path: `/playlist/${id}` });
};

watch(() => userStore.isLoggedIn, (newVal) => { if (newVal) fetchUserPlaylists().then(() => setupObserver()); });
watch(activeTab, () => {
  setTimeout(() => {
    if (loadMoreTrigger.value && observer) {
       observer.unobserve(loadMoreTrigger.value);
       observer.observe(loadMoreTrigger.value);
    }
  }, 100);
});

onMounted(() => { if (userStore.isLoggedIn) fetchUserPlaylists().then(() => setupObserver()); });
onUnmounted(() => { if (observer) observer.disconnect(); });
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