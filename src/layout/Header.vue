// ====================
// 文件：src/layout/Header.vue
// ====================
<template>
  <header class="h-14 w-full flex items-center justify-between px-6 bg-white drag-region z-40 border-b border-gray-50">
    <div class="flex items-center w-48 text-blue-600 font-black text-lg tracking-wide select-none">
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      概念音乐 Desktop
    </div>

    <div class="flex-1 flex justify-center no-drag relative">
      <div class="relative w-80 group">
        <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        
        <input 
          ref="searchInput"
          v-model="searchKeyword" 
          @input="handleInput"
          @keydown.down.prevent="navigateSuggest(1)"
          @keydown.up.prevent="navigateSuggest(-1)"
          @keydown.enter="handleEnter"
          @focus="isFocused = true"
          @blur="handleBlur"
          type="text" 
          placeholder="搜索音乐、歌手、歌单...(按回车搜索)" 
          class="w-full h-8 bg-gray-100 shadow-inner hover:bg-gray-200 focus:bg-white focus:shadow-none focus:ring-1 focus:ring-blue-300 border border-transparent focus:border-blue-300 rounded-full pl-9 pr-8 text-xs text-gray-700 outline-none transition-all placeholder-gray-400 font-medium"
        />

        <button 
          v-show="searchKeyword" 
          @click="clearSearch"
          class="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center w-5 h-5 rounded-full hover:bg-gray-200"
          v-tooltip="'清空内容'"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <transition name="fade">
          <div v-if="isFocused && (suggestions.length > 0 || isSuggestLoading)" class="absolute top-11 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col py-2">
            
            <div v-if="isSuggestLoading" class="text-blue-500 text-xs py-4 flex items-center justify-center font-medium">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              正在获取搜索建议...
            </div>
            
            <div v-else class="max-h-[300px] overflow-y-auto custom-scrollbar" ref="suggestListRef">
              <div 
                v-for="(item, index) in suggestions" 
                :key="index" 
                @mousedown.prevent="selectSuggest(item)" 
                @mouseenter="selectedIndex = index"
                class="px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center group/item"
                :class="selectedIndex === index ? 'bg-gray-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'"
              >
                <svg class="w-4 h-4 mr-3 transition-colors" :class="selectedIndex === index ? 'text-blue-500' : 'text-gray-400 group-hover/item:text-blue-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <span class="truncate">{{ item }}</span>
              </div>
            </div>

          </div>
        </transition>

      </div>
    </div>

    <div class="w-48 flex justify-end items-center space-x-3 no-drag text-gray-400">
      <button @click="minimize" class="hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg></button>
      <button @click="maximize" class="hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" stroke-width="2"></rect></svg></button>
      <button @click="close" class="hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>
  </header>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import request from '../utils/request';

const router = useRouter();
const route = useRoute();
const searchKeyword = ref('');
const searchInput = ref(null);

const isFocused = ref(false);
const suggestions = ref([]);
const isSuggestLoading = ref(false);
let debounceTimer = null;

const selectedIndex = ref(-1);
const suggestListRef = ref(null);

const handleSearch = () => {
  const keyword = searchKeyword.value.trim();
  if (keyword) {
    isFocused.value = false;
    suggestions.value = [];
    selectedIndex.value = -1;
    router.push({ path: '/search', query: { keyword } });
  }
};

const selectSuggest = (word) => {
  searchKeyword.value = word;
  handleSearch();
};

const navigateSuggest = (direction) => {
  if (!suggestions.value.length || !isFocused.value) return;
  
  selectedIndex.value += direction;
  
  if (selectedIndex.value >= suggestions.value.length) {
    selectedIndex.value = 0;
  } else if (selectedIndex.value < 0) {
    selectedIndex.value = suggestions.value.length - 1;
  }

  nextTick(() => {
    const container = suggestListRef.value;
    if (container && container.children[selectedIndex.value]) {
      const activeItem = container.children[selectedIndex.value];
      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      if (itemTop < containerTop) {
        container.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        container.scrollTop = itemBottom - container.clientHeight;
      }
    }
  });
};

const handleEnter = () => {
  if (isFocused.value && selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
    selectSuggest(suggestions.value[selectedIndex.value]);
  } else {
    handleSearch();
  }
};

const handleInput = () => {
  clearTimeout(debounceTimer);
  if (!searchKeyword.value.trim()) {
    suggestions.value = [];
    selectedIndex.value = -1;
    return;
  }
  
  debounceTimer = setTimeout(async () => {
    isSuggestLoading.value = true;
    try {
      const res = await request.get('/search/suggest', {
        params: { keywords: searchKeyword.value.trim() }
      });
      const rawData = res?.data?.[0]?.RecordDatas || [];
      suggestions.value = rawData.map(item => item.HintInfo).filter(Boolean);
      selectedIndex.value = -1; 
    } catch (err) {
      console.error('联想请求失败:', err);
    } finally {
      isSuggestLoading.value = false;
    }
  }, 400); 
};

const handleBlur = () => {
  isFocused.value = false;
};

const clearSearch = () => {
  searchKeyword.value = '';
  suggestions.value = [];
  selectedIndex.value = -1;
  if (searchInput.value) searchInput.value.focus();
};

watch(() => route.query.keyword, (newKeyword) => {
  if (newKeyword !== undefined) searchKeyword.value = newKeyword;
});

// ✨ 修复 BUG 3 & BUG 4：监听 Z 轴之上以外的平移路由跳转，离开搜索环境就彻底清洗搜索框上下文
watch(() => route.path, (newPath) => {
  if (newPath !== '/search') {
    searchKeyword.value = '';
    suggestions.value = [];
    selectedIndex.value = -1;
    isFocused.value = false;
  }
});

onMounted(() => {
  if (route.query.keyword) searchKeyword.value = route.query.keyword;
});

const minimize = () => { if (window.windowControls) window.windowControls.minimize(); };
const maximize = () => { if (window.windowControls) window.windowControls.maximize(); };
const close = () => { if (window.windowControls) window.windowControls.close(); };
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.3); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.6); }
</style>