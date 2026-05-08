<template>
  <div ref="scrollContainer" class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="artist-list-scroll-container">
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-indigo-50/80 to-white -z-10"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">

      <div class="flex items-end justify-between mb-6 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            歌手 <span class="text-lg text-indigo-500 font-bold ml-2">Artists</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">浏览你喜爱的歌手</p>
        </div>
      </div>

      <div class="flex items-center flex-wrap gap-4 mb-8">
        <div class="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button v-for="opt in typeOptions" :key="opt.key" @click="currentType = opt.key" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag" :class="currentType === opt.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">{{ opt.label }}</button>
        </div>
        <div class="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button v-for="opt in sexOptions" :key="opt.key" @click="currentSex = opt.key" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag" :class="currentSex === opt.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">{{ opt.label }}</button>
        </div>
      </div>

      <div v-if="isLoading && displayedArtists.length === 0" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8">
        <div v-for="i in 21" :key="i" class="flex flex-col items-center">
          <div class="w-24 h-24 rounded-full bg-gray-200 animate-pulse mb-3"></div>
          <div class="w-16 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div class="w-12 h-3 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="isError && displayedArtists.length === 0" class="w-full flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">获取歌手列表失败</p>
        <button @click="fetchArtists" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="allArtists.length === 0 && !isLoading" class="flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
        <svg class="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        <p class="text-sm font-medium tracking-widest text-gray-400">该分类暂无歌手数据</p>
      </div>

      <template v-else>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8">
          <div v-for="artist in displayedArtists" :key="artist.id" @click="goToArtist(artist.id)" class="flex flex-col items-center group cursor-pointer no-drag">
            <div class="relative w-24 h-24 rounded-full flex-shrink-0 shadow-lg overflow-hidden border-4 border-white bg-gray-100 mb-3">
              <img :src="artist.avatar || defaultImg" :alt="artist.name" loading="lazy" @error="e => e.target.src = defaultImg" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <h4 class="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-indigo-600 transition-colors text-center max-w-full" v-tooltip="artist.name">{{ artist.name }}</h4>
            <p v-if="artist.fans_count" class="text-xs text-gray-400 mt-1 font-medium">{{ formatCount(artist.fans_count) }} 粉丝</p>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-6 text-xs font-medium">
          <div v-if="isLoadingMore" class="flex items-center text-indigo-500">
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            正在加载更多歌手...
          </div>
          <div v-else-if="!hasMore && displayedArtists.length > 0" class="text-gray-300 flex items-center space-x-2">
            <span class="w-8 h-px bg-gray-200"></span>
            <span>已经到底啦</span>
            <span class="w-8 h-px bg-gray-200"></span>
          </div>
        </div>
      </template>

    </div>
    <BackToTop targetId="artist-list-scroll-container" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import BackToTop from '../components/BackToTop.vue';

const router = useRouter();
const store = usePlayerStore();

const allArtists = ref([]);
const isLoading = ref(true);
const isError = ref(false);
const currentType = ref(0);
const currentSex = ref(0);

const PAGE_SIZE = 42;
const displayCount = ref(PAGE_SIZE);
const isLoadingMore = ref(false);
const loadMoreTrigger = ref(null);
let observer = null;

const displayedArtists = computed(() => allArtists.value.slice(0, displayCount.value));
const hasMore = computed(() => displayCount.value < allArtists.value.length);

const typeOptions = [
  { key: 0, label: '全部' },
  { key: 1, label: '华语' },
  { key: 2, label: '欧美' },
  { key: 3, label: '日韩' },
  { key: 4, label: '其他' }
];

const sexOptions = [
  { key: 0, label: '全部' },
  { key: 1, label: '男' },
  { key: 2, label: '女' },
  { key: 3, label: '组合' }
];

const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%23d1d5db'/%3E%3Cellipse cx='50' cy='80' rx='28' ry='20' fill='%23d1d5db'/%3E%3C/svg%3E";

const formatCount = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
};

const goToArtist = (id) => {
  if (!id || id === '0') return store.showToast('暂无该歌手详情信息');
  router.push(`/artist/${id}`);
};

const extractArtists = (res) => {
  let rawList = [];
  const data = res?.data;
  if (Array.isArray(data?.info)) {
    data.info.forEach(group => {
      if (Array.isArray(group?.singer)) rawList.push(...group.singer);
    });
  } else if (Array.isArray(data?.hot)) {
    rawList = data.hot;
  } else if (Array.isArray(data?.data)) {
    rawList = data.data;
  } else if (Array.isArray(data)) {
    rawList = data;
  }

  const seen = new Set();
  return rawList.map(item => {
    let avatar = item.sizable_avatar || item.imgurl || item.avatar || item.pic || '';
    if (avatar && avatar.includes('{size}')) avatar = avatar.replace(/\{size\}/g, '300');
    return {
      id: item.singerid || item.author_id || item.singer_id || item.id,
      name: item.singername || item.author_name || item.name || '未知歌手',
      avatar: avatar,
      fans_count: item.fanscount || item.fans_count || 0
    };
  }).filter(item => {
    if (!item.id || item.name === '未知歌手') return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const scrollContainer = ref(null);

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !isLoadingMore.value) {
      loadMore();
    }
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};

const loadMore = () => {
  if (!hasMore.value || isLoadingMore.value) return;
  isLoadingMore.value = true;
  setTimeout(() => {
    displayCount.value = Math.min(displayCount.value + PAGE_SIZE, allArtists.value.length);
    isLoadingMore.value = false;
  }, 200);
};

let fetchTimer = null;

const fetchArtists = async () => {
  isLoading.value = true;
  isError.value = false;
  displayCount.value = PAGE_SIZE;
  try {
    await request.get('/register/dev').catch(() => {});
    const res = await request.get('/artist/lists', {
      params: {
        type: currentType.value,
        sextypes: currentSex.value,
        musician: 0,
        showtype: 2,
        hotsize: 200
      }
    });
    allArtists.value = extractArtists(res);
  } catch (error) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

watch([currentType, currentSex], () => {
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(() => {
    if (scrollContainer.value) scrollContainer.value.scrollTo({ top: 0, behavior: 'smooth' });
    fetchArtists();
  }, 300);
});

onMounted(() => {
  fetchArtists().then(() => { setupObserver(); });
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
