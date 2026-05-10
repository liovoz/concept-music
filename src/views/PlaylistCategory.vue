<template>
  <div class="h-full flex flex-col relative overflow-hidden bg-white min-w-0">
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/80 to-white -z-10 pointer-events-none"></div>

    <div id="playlist-category-scroll" class="p-8 z-10 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-w-0 box-border scroll-smooth">

      <div class="flex items-end justify-between mb-6 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            歌单广场 <span class="text-lg text-blue-500 font-bold ml-2">Explore</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">按分类发现更多精选歌单</p>
        </div>
      </div>

      <div v-if="isTagsLoading" class="mb-6">
        <div class="flex space-x-2 mb-3">
          <div v-for="i in 6" :key="'cat-'+i" class="h-9 w-20 bg-gray-100 rounded-full animate-pulse"></div>
        </div>
        <div class="flex flex-wrap gap-2">
          <div v-for="i in 8" :key="'tag-'+i" class="h-7 w-16 bg-gray-50 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div v-else class="mb-6">
        <div class="mb-3 overflow-x-auto pb-2 scrollbar-hide">
          <div class="flex space-x-1.5 min-w-max">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="selectCategory(category)"
              class="px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap no-drag"
              :class="activeCategory.id === category.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
            >
              {{ category.name }}
            </button>
          </div>
        </div>

        <div v-if="activeCategory.tags && activeCategory.tags.length > 0" class="flex flex-wrap gap-2 pb-1">
          <button
            v-for="tag in activeCategory.tags"
            :key="tag.tagId"
            @click="selectTag(tag)"
            class="px-4 py-1.5 rounded-full text-xs font-bold transition-all no-drag border whitespace-nowrap"
            :class="activeTag?.tagId === tag.tagId
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mb-5">
        <h3 class="text-xl font-bold text-gray-800 flex items-center">
          <span class="text-2xl mr-2">{{ activeTag?.name || activeCategory?.name || '全部' }}</span>
        </h3>
        <div class="flex items-center space-x-2">
          <button
            @click="sortMode = 1"
            class="px-3 py-1 rounded-full text-xs font-bold transition-all no-drag"
            :class="sortMode === 1 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
          >热门</button>
          <button
            @click="sortMode = 2"
            class="px-3 py-1 rounded-full text-xs font-bold transition-all no-drag"
            :class="sortMode === 2 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
          >最新</button>
        </div>
      </div>

      <div v-if="isPlaylistsLoading && playlists.length === 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 lg:gap-5">
        <div v-for="i in 15" :key="i" class="flex flex-col space-y-3">
          <div class="w-full aspect-square bg-gray-100 rounded-2xl animate-pulse shadow-sm border border-gray-50"></div>
          <div class="w-3/4 h-4 bg-gray-100 rounded animate-pulse"></div>
          <div class="w-1/2 h-3 bg-gray-50 rounded animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="playlistsError && playlists.length === 0" class="flex-1 flex flex-col items-center justify-center py-10 text-red-500 bg-red-50/50 rounded-2xl border border-red-100">
        <p class="text-sm font-bold text-red-600 mb-2">获取歌单失败</p>
        <button @click="fetchPlaylists" class="mt-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="playlists.length > 0">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 lg:gap-5 mb-8">
          <div v-for="playlist in playlists" :key="playlist.global_collection_id || playlist.specialid" @click="goToPlaylist(playlist.global_collection_id || playlist.specialid)" class="flex flex-col group cursor-pointer no-drag">
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden fix-clip shadow-sm group-hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-1 bg-gray-100 border border-gray-50/50">
              <img :src="formatImg(playlist.imgurl || playlist.flexible_cover || playlist.pic)" :alt="playlist.specialname" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

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

        <div v-if="isLoadingMore" class="flex items-center justify-center py-6">
          <div class="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span class="ml-3 text-xs text-gray-400 font-bold">加载中...</span>
        </div>

        <div v-else-if="!hasMore" class="w-full flex flex-col items-center justify-center mt-2 mb-8">
          <div class="group px-10 py-6 bg-gray-50/50 border border-gray-100 rounded-3xl flex flex-col items-center transition-all hover:bg-gray-100/60">
            <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <div class="flex items-center space-x-3">
              <span class="w-8 h-px bg-gray-200"></span>
              <span class="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">已经到底了 · 换个分类看看</span>
              <span class="w-8 h-px bg-gray-200"></span>
            </div>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="h-1"></div>
      </div>

      <div v-else class="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
        <svg class="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
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
  if (scrollEl) scrollEl.scrollTo({ top: 0 });
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
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
