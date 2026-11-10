<template>
  <div class="h-full flex flex-col relative overflow-hidden bg-white dark:!bg-slate-950 text-gray-800 dark:text-slate-100 min-w-0 transition-colors">
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/80 to-white dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-950 -z-10 pointer-events-none"></div>

    <div id="playlist-category-scroll" class="p-8 z-10 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-w-0 box-border scroll-smooth">

      <div class="flex items-end justify-between mb-6 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 dark:text-slate-50 tracking-tight truncate">
            歌单广场 <span class="text-lg text-blue-500 font-bold ml-2">Explore</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-2 font-medium">按分类发现更多精选歌单</p>
        </div>
      </div>

      <div v-if="isTagsLoading" class="mb-6 space-y-3">
        <div v-squircle="{ radius: 10, smoothing: 0.6 }" class="inline-flex items-center space-x-1 bg-gray-100/80 dark:!bg-slate-900/80 p-1 rounded-lg border border-gray-200/60 dark:!border-slate-800">
          <div v-for="i in 7" :key="'cat-'+i" v-squircle="{ radius: 6, smoothing: 0.6 }" class="h-7 w-14 bg-gray-200/60 dark:bg-slate-800 rounded-md animate-pulse"></div>
        </div>
        <div v-squircle="'lg'" class="p-3 bg-gray-50/70 dark:bg-slate-900/50 rounded-[14px] border border-gray-100/80 dark:border-slate-800/80 flex flex-wrap gap-1.5">
          <div v-for="i in 12" :key="'tag-'+i" v-squircle="{ radius: 6, smoothing: 0.6 }" class="h-6 w-14 bg-gray-200/50 dark:bg-slate-800/80 rounded-md animate-pulse"></div>
        </div>
      </div>

      <div v-else class="mb-6">
        <div class="overflow-x-auto pb-1 scrollbar-hide">
          <div v-squircle="{ radius: 10, smoothing: 0.6 }" class="inline-flex items-center space-x-1 bg-gray-100/80 dark:!bg-slate-900/80 p-1 border border-gray-200/60 dark:!border-slate-800 min-w-max transition-colors">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="selectCategory(category)"
              v-squircle="{ radius: 6, smoothing: 0.6 }"
              class="px-4 py-1.5 text-xs font-bold transition-colors whitespace-nowrap no-drag"
              :class="activeCategory.id === category.id
                ? 'bg-white text-blue-600 shadow-sm dark:!bg-slate-800 dark:text-blue-400 dark:shadow-black/40'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100'"
            >
              {{ category.name }}
            </button>
          </div>
        </div>

        <div v-if="activeCategory.tags && activeCategory.tags.length > 0" v-squircle="'lg'" class="mt-3 p-3 bg-gray-50/70 dark:bg-slate-900/50 border border-gray-100/80 dark:border-slate-800/80 flex flex-wrap gap-1.5">
          <button
            v-for="tag in activeCategory.tags"
            :key="tag.tagId"
            @click="selectTag(tag)"
            v-squircle="{ radius: 6, smoothing: 0.6 }"
            class="px-3 py-1.5 text-xs font-semibold transition-colors no-drag whitespace-nowrap"
            :class="activeTag?.tagId === tag.tagId
              ? 'bg-white text-blue-600 shadow-sm dark:!bg-slate-800 dark:text-blue-400 dark:shadow-black/40'
              : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60'"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mb-5">
        <h3 class="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center">
          <span class="text-2xl mr-2">{{ activeTag?.name || activeCategory?.name || '全部' }}</span>
        </h3>
        <div v-squircle="{ radius: 10, smoothing: 0.6 }" class="flex items-center space-x-1 bg-gray-100/80 dark:!bg-slate-900/80 p-1 border border-gray-200/60 dark:!border-slate-800 transition-colors">
          <button
            @click="sortMode = 1"
            v-squircle="{ radius: 6, smoothing: 0.6 }"
            class="px-3.5 py-1.5 text-xs font-bold transition-colors no-drag"
            :class="sortMode === 1
              ? 'bg-white text-blue-600 shadow-sm dark:!bg-slate-800 dark:text-blue-400 dark:shadow-black/40'
              : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100'"
          >热门</button>
          <button
            @click="sortMode = 2"
            v-squircle="{ radius: 6, smoothing: 0.6 }"
            class="px-3.5 py-1.5 text-xs font-bold transition-colors no-drag"
            :class="sortMode === 2
              ? 'bg-white text-blue-600 shadow-sm dark:!bg-slate-800 dark:text-blue-400 dark:shadow-black/40'
              : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100'"
          >最新</button>
        </div>
      </div>

      <div v-if="isPlaylistsLoading && playlists.length === 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 lg:gap-5">
        <div v-for="i in 15" :key="i" class="flex flex-col space-y-3">
          <div v-squircle="'xl'" class="w-full aspect-square bg-gray-100 dark:bg-slate-850 rounded-[18px] animate-pulse shadow-sm border border-gray-50 dark:border-slate-800"></div>
          <div class="w-3/4 h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse"></div>
          <div class="w-1/2 h-3 bg-gray-50 dark:bg-slate-800/80 rounded animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="playlistsError && playlists.length === 0" v-squircle="'xl'" class="flex-1 flex flex-col items-center justify-center py-10 text-red-500 bg-red-50/50 rounded-[18px] border border-red-100">
        <p class="text-sm font-bold text-red-600 mb-2">获取歌单失败</p>
        <button @click="fetchPlaylists" class="mt-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="playlists.length > 0">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 lg:gap-5 mb-8">
          <div v-for="playlist in playlists" :key="playlist.global_collection_id || playlist.specialid" @click="goToPlaylist(playlist.global_collection_id || playlist.specialid)" class="flex flex-col group cursor-pointer no-drag">
            <div class="relative w-full aspect-square rounded-[18px] shadow-sm group-hover:shadow-xl transition-shadow duration-300">
              <!-- 1. 独立图片容器（专属 v-squircle 裁切） -->
              <div v-squircle="'xl'" class="absolute inset-0 w-full h-full bg-gray-100 dark:bg-slate-850 overflow-hidden pointer-events-none">
                <img :src="formatImg(playlist.imgurl || playlist.flexible_cover || playlist.pic)" :alt="playlist.specialname" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>

              <!-- 2. 中间播放层（独立浮层） -->
              <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-10 rounded-[18px] overflow-hidden">
                <div class="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center shadow-lg border border-white/40 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <AppIcon name="play" class="w-6 h-6 text-white ml-0.5 flex-shrink-0" />
                </div>
              </div>

              <!-- 3. 右上角角标（独立浮层） -->
              <div class="absolute top-2 right-2 bg-black/45 text-white px-2 py-0.5 rounded-full flex items-center shadow-sm pointer-events-none select-none z-20">
                <AppIcon name="play" class="w-3 h-3 mr-1 flex-shrink-0" />
                <span class="text-[10px] font-bold tracking-wider leading-none">{{ formatPlayCount(playlist.play_count) }}</span>
              </div>
            </div>
            <div class="mt-3 flex flex-col px-1 min-w-0">
              <h4 class="text-sm font-bold text-gray-800 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" v-tooltip="playlist.specialname">{{ playlist.specialname }}</h4>
              <p class="text-xs text-gray-400 dark:text-slate-500 mt-1.5 font-medium truncate" v-tooltip="'By ' + (playlist.nickname || '未知用户')">By {{ playlist.nickname || '未知用户' }}</p>
            </div>
          </div>
        </div>

        <div v-if="isLoadingMore" class="flex items-center justify-center py-6">
          <div class="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span class="ml-3 text-xs text-gray-400 font-bold">加载中...</span>
        </div>

        <div v-else-if="!hasMore" class="w-full flex flex-col items-center justify-center mt-2 mb-8">
          <div v-squircle="'2xl'" class="group px-10 py-6 bg-gray-50/50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800/80 rounded-3xl flex flex-col items-center transition-all hover:bg-gray-100/60 dark:hover:bg-slate-800/60 dark:hover:border-slate-700/80">
            <div class="w-10 h-10 bg-white dark:!bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 border border-transparent dark:border-slate-700/60 transition-transform">
              <AppIcon name="music" class="w-5 h-5 text-gray-300 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <div class="flex items-center space-x-3">
              <span class="w-8 h-px bg-gray-200 dark:bg-slate-700"></span>
              <span class="text-[11px] font-bold tracking-[0.2em] text-gray-400 dark:text-slate-400 uppercase">已经到底了 · 换个分类看看</span>
              <span class="w-8 h-px bg-gray-200 dark:bg-slate-700"></span>
            </div>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="h-1"></div>
      </div>

      <div v-else class="flex-1 flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-500">
        <AppIcon name="music" class="w-16 h-16 mb-4 text-gray-200 dark:text-slate-800" />
        <p class="text-sm font-bold">暂无歌单</p>
        <p class="text-xs mt-1">换个分类试试</p>
      </div>
    </div>

    <BackToTop targetId="playlist-category-scroll" />
  </div>
</template>

<script setup>
defineOptions({ name: 'PlaylistCategory' });
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import BackToTop from '../components/BackToTop.vue';

const router = useRouter();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const isTagsLoading = ref(true);
const categories = ref([]);
const activeCategory = ref({ id: 0, name: '全部', tags: [] });
const activeTag = ref(null);

const isPlaylistsLoading = ref(false);
const playlistsError = ref(false);
const playlists = ref([]);
const currentPage = ref(1);
const sortMode = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);

const loadMoreTrigger = ref(null);
let observer = null;
let fetchVersion = 0;

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

const goToPlaylist = (id) => {
  if (id) router.push({ path: `/playlist/${id}` });
};

const fetchTags = async () => {
  isTagsLoading.value = true;

  const allCategory = { id: 0, name: '全部', tags: [] };
  const cats = [allCategory];

  try {
    const res = await request.post('/playlist/tags');
    const tagData = res?.data;

    if (Array.isArray(tagData)) {
      tagData.forEach((parent, idx) => {
        if (!parent || typeof parent !== 'object') return;
        const groupName = parent.tag_name || '';
        const children = [];
        if (Array.isArray(parent.son)) {
          parent.son.forEach(child => {
            const tagId = String(child.tag_id || '');
            const tagName = (child.tag_name || '').trim();
            if (tagId && tagName) {
              children.push({ id: Number(tagId), name: tagName, tagId });
            }
          });
        }
        if (children.length > 0) {
          cats.push({ id: idx + 1, name: groupName, tags: children });
        }
      });
    }
  } catch (error) {
    console.warn('获取分类标签失败', error);
  }

  categories.value = cats;
  activeCategory.value = allCategory;
  activeTag.value = null;
  isTagsLoading.value = false;
};

const scrollToTop = () => {
  const scrollEl = document.getElementById('playlist-category-scroll');
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'auto' });
};

const fetchPlaylists = async (isLoadMore = false) => {
  if (isLoadingMore.value) return;

  const thisVersion = ++fetchVersion;

  if (isLoadMore) {
    isLoadingMore.value = true;
  } else {
    isPlaylistsLoading.value = true;
    playlists.value = [];
    currentPage.value = 1;
    hasMore.value = true;
  }
  playlistsError.value = false;

  try {
    const tagId = activeTag.value?.tagId || 0;
    const sortMap = { 1: 5, 2: 7 };
    const res = await request.get('/playlist/by/tag', {
      params: {
        tag_id: tagId,
        page: currentPage.value,
        pagesize: 30,
        sort: sortMap[sortMode.value] || 5,
      }
    });

    if (thisVersion !== fetchVersion) return;

    const rawList = res?.data?.info || res?.data?.list || res?.data?.special_list || [];
    const arr = rawList.map(item => ({
      specialname: item.specialname,
      imgurl: item.imgurl,
      play_count: item.playcount || item.play_count,
      nickname: item.username || item.nickname,
      global_collection_id: item.global_specialid || item.global_collection_id,
      specialid: item.specialid,
    }));

    const total = res?.data?.total || 0;
    hasMore.value = arr.length > 0 && (arr.length >= 30 || total > currentPage.value * 30);

    if (isLoadMore) {
      const merged = [...playlists.value, ...arr];
      if (sortMode.value === 1) {
        merged.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      } else if (sortMode.value === 2) {
        merged.sort((a, b) => (b.specialid || 0) - (a.specialid || 0));
      }
      playlists.value = merged;
    } else {
      if (sortMode.value === 1) {
        arr.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      } else if (sortMode.value === 2) {
        arr.sort((a, b) => (b.specialid || 0) - (a.specialid || 0));
      }
      playlists.value = arr;
    }

    if (arr.length > 0) currentPage.value++;
  } catch (error) {
    if (thisVersion !== fetchVersion) return;
    if (!isLoadMore) playlistsError.value = true;
  } finally {
    if (thisVersion === fetchVersion) {
      isPlaylistsLoading.value = false;
      isLoadingMore.value = false;
    }
    nextTick(() => setupObserver());
  }
};

const selectCategory = (category) => {
  if (activeCategory.value.id === category.id) {
    scrollToTop();
    fetchPlaylists(false);
    return;
  }
  activeCategory.value = category;
  if (category.tags && category.tags.length > 0) {
    activeTag.value = category.tags[0];
  } else {
    activeTag.value = null;
  }
  scrollToTop();
  fetchPlaylists(false);
};

const selectTag = (tag) => {
  if (activeTag.value?.tagId === tag.tagId) return;
  activeTag.value = tag;
  scrollToTop();
  fetchPlaylists(false);
};

watch(() => sortMode.value, () => {
  scrollToTop();
  fetchPlaylists(false);
});

const setupObserver = () => {
  if (observer) observer.disconnect();
  if (!loadMoreTrigger.value) return;
  const scrollEl = document.getElementById('playlist-category-scroll');
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !isLoadingMore.value && !isPlaylistsLoading.value) {
      fetchPlaylists(true);
    }
  }, { root: scrollEl, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  observer.observe(loadMoreTrigger.value);
};

onMounted(() => {
  fetchTags().then(() => {
    fetchPlaylists();
  });
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
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
