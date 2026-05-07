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
          @keydown.esc="isFocused = false"
          @focus="handleFocus"
          @blur="handleBlur"
          type="text" 
          :placeholder="defaultPlaceholder" 
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
          <div v-if="isFocused" class="absolute top-11 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col py-2 max-h-[460px]">
            
            <template v-if="!searchKeyword.trim()">
              <div v-if="history.length > 0" class="pb-2 border-b border-gray-100">
                <div class="px-4 py-2 flex items-center justify-between">
                  <span class="text-xs text-gray-400 font-medium flex items-center">
                    <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    搜索历史
                  </span>
                  <button @mousedown.prevent="clearHistory" class="text-xs text-gray-400 hover:text-red-500 cursor-pointer transition-colors flex items-center">
                    <svg class="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    清空
                  </button>
                </div>
                <div class="px-4 flex flex-wrap gap-2">
                  <span 
                    v-for="(item, index) in history" 
                    :key="'h-'+index"
                    @mousedown.prevent="selectHistory(item)"
                    class="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-full text-xs text-gray-600 cursor-pointer transition-colors group relative pr-6 max-w-[120px] truncate"
                  >
                    {{ item }}
                    <button 
                      @mousedown.prevent.stop="removeHistory(item)"
                      class="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-300 transition-all"
                    >
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </span>
                </div>
              </div>

              <div>
                <div class="px-4 py-2 flex items-center">
                  <svg class="w-3.5 h-3.5 mr-1.5 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 23c-3.866 0-7-2.686-7-6 0-2.418 1.272-4.336 2.38-5.843C8.328 10.07 9 9.24 9 8c0-1.657 1.343-3 3-3s3 1.343 3 3c0 1.24.672 2.07 1.62 3.157C17.728 12.664 19 14.582 19 17c0 3.314-3.134 6-7 6z"/></svg>
                  <span class="text-xs text-gray-400 font-medium">热搜榜</span>
                </div>
                
                <div v-if="isHotLoading" class="text-blue-500 text-xs py-4 flex items-center justify-center font-medium">
                  <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  正在获取热搜...
                </div>
                
                <div v-else-if="hotList.length > 0" class="max-h-[300px] overflow-y-auto custom-scrollbar" ref="hotListRef">
                  <div 
                    v-for="(item, index) in hotList" 
                    :key="'hot-'+index"
                    @mousedown.prevent="selectHot(item)"
                    @mouseenter="selectedIndex = index"
                    class="px-4 py-2.5 flex items-center cursor-pointer transition-colors"
                    :class="selectedIndex === index ? 'bg-gray-50 text-blue-600' : 'hover:bg-gray-50 hover:text-blue-600'"
                  >
                    <span 
                      class="w-5 text-sm font-bold mr-3 text-center flex-shrink-0"
                      :class="index < 3 ? 'text-blue-600' : 'text-gray-400'"
                    >{{ index + 1 }}</span>
                    <span class="text-sm truncate flex-1" :class="index < 3 ? 'font-semibold' : ''">{{ item.word }}</span>
                    <span v-if="item.score" class="text-xs text-gray-400 ml-2 flex-shrink-0">{{ formatScore(item.score) }}</span>
                    <svg v-if="index < 3" class="w-3.5 h-3.5 ml-1 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 23c-3.866 0-7-2.686-7-6 0-2.418 1.272-4.336 2.38-5.843C8.328 10.07 9 9.24 9 8c0-1.657 1.343-3 3-3s3 1.343 3 3c0 1.24.672 2.07 1.62 3.157C17.728 12.664 19 14.582 19 17c0 3.314-3.134 6-7 6z"/></svg>
                  </div>
                </div>

                <div v-else class="text-gray-400 text-xs py-4 flex items-center justify-center">
                  暂无热搜数据
                </div>
              </div>
            </template>

            <template v-else>
              <div v-if="isSuggestLoading" class="text-blue-500 text-xs py-4 flex items-center justify-center font-medium">
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                正在获取搜索建议...
              </div>

              <div v-else-if="suggestGroups.songs.length || suggestGroups.artists.length || suggestGroups.albums.length" class="max-h-[360px] overflow-y-auto custom-scrollbar" ref="suggestListRef">
                
                <div v-if="suggestGroups.songs.length">
                  <div class="px-4 py-1.5 flex items-center">
                    <svg class="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <span class="text-xs text-gray-400 font-medium">歌曲</span>
                  </div>
                  <div 
                    v-for="(item, i) in suggestGroups.songs" 
                    :key="'song-'+i" 
                    :data-flat-index="getSuggestFlatIndex('song', i)"
                    @mousedown.prevent="selectSuggestItem(item)" 
                    @mouseenter="selectedIndex = getSuggestFlatIndex('song', i)"
                    class="px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center group/item"
                    :class="selectedIndex === getSuggestFlatIndex('song', i) ? 'bg-gray-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'"
                  >
                    <svg class="w-4 h-4 mr-3 transition-colors" :class="selectedIndex === getSuggestFlatIndex('song', i) ? 'text-blue-500' : 'text-gray-400 group-hover/item:text-blue-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <span class="truncate">{{ item.name }}</span>
                    <span v-if="item.artist" class="text-xs text-gray-400 ml-2 truncate flex-shrink-0">- {{ item.artist }}</span>
                  </div>
                </div>

                <div v-if="suggestGroups.artists.length">
                  <div class="px-4 py-1.5 flex items-center border-t border-gray-50">
                    <svg class="w-3.5 h-3.5 mr-1.5 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span class="text-xs text-gray-400 font-medium">歌手</span>
                  </div>
                  <div 
                    v-for="(item, i) in suggestGroups.artists" 
                    :key="'artist-'+i" 
                    :data-flat-index="getSuggestFlatIndex('artist', i)"
                    @mousedown.prevent="selectSuggestItem(item)" 
                    @mouseenter="selectedIndex = getSuggestFlatIndex('artist', i)"
                    class="px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center group/item"
                    :class="selectedIndex === getSuggestFlatIndex('artist', i) ? 'bg-gray-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'"
                  >
                    <svg class="w-4 h-4 mr-3 transition-colors" :class="selectedIndex === getSuggestFlatIndex('artist', i) ? 'text-blue-500' : 'text-gray-400 group-hover/item:text-blue-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <span class="truncate">{{ item.name }}</span>
                  </div>
                </div>

                <div v-if="suggestGroups.albums.length">
                  <div class="px-4 py-1.5 flex items-center border-t border-gray-50">
                    <svg class="w-3.5 h-3.5 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
                    <span class="text-xs text-gray-400 font-medium">专辑</span>
                  </div>
                  <div 
                    v-for="(item, i) in suggestGroups.albums" 
                    :key="'album-'+i" 
                    :data-flat-index="getSuggestFlatIndex('album', i)"
                    @mousedown.prevent="selectSuggestItem(item)" 
                    @mouseenter="selectedIndex = getSuggestFlatIndex('album', i)"
                    class="px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center group/item"
                    :class="selectedIndex === getSuggestFlatIndex('album', i) ? 'bg-gray-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'"
                  >
                    <svg class="w-4 h-4 mr-3 transition-colors" :class="selectedIndex === getSuggestFlatIndex('album', i) ? 'text-blue-500' : 'text-gray-400 group-hover/item:text-blue-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                    <span class="truncate">{{ item.name }}</span>
                    <span v-if="item.artist" class="text-xs text-gray-400 ml-2 truncate flex-shrink-0">- {{ item.artist }}</span>
                  </div>
                </div>
              </div>

              <div v-else class="text-gray-400 text-xs py-4 flex items-center justify-center">
                暂无搜索建议
              </div>
            </template>

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
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import request from '../utils/request';
import { useSearchHistory } from '../composables/useSearchHistory';

const router = useRouter();
const route = useRoute();
const searchKeyword = ref('');
const searchInput = ref(null);

const isFocused = ref(false);
const isSuggestLoading = ref(false);
const isHotLoading = ref(false);
let debounceTimer = null;

const selectedIndex = ref(-1);
const suggestListRef = ref(null);
const hotListRef = ref(null);

const hotList = ref([]);
let hotCacheTime = 0;
const HOT_CACHE_TTL = 5 * 60 * 1000;

const defaultPlaceholder = ref('搜索音乐、歌手、歌单...(按回车搜索)');

const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();

const suggestGroups = ref({ songs: [], artists: [], albums: [] });

const navigableItemCount = computed(() => {
  if (!searchKeyword.value.trim()) {
    return hotList.value.length;
  }
  return suggestGroups.value.songs.length + suggestGroups.value.artists.length + suggestGroups.value.albums.length;
});

const getSuggestFlatIndex = (type, localIndex) => {
  const g = suggestGroups.value;
  if (type === 'song') return localIndex;
  if (type === 'artist') return g.songs.length + localIndex;
  if (type === 'album') return g.songs.length + g.artists.length + localIndex;
  return -1;
};

const getSuggestItemByFlatIndex = (flatIndex) => {
  const g = suggestGroups.value;
  const songCount = g.songs.length;
  const artistCount = g.artists.length;
  if (flatIndex < songCount) return { type: 'song', item: g.songs[flatIndex] };
  if (flatIndex < songCount + artistCount) return { type: 'artist', item: g.artists[flatIndex - songCount] };
  return { type: 'album', item: g.albums[flatIndex - songCount - artistCount] };
};

const formatScore = (score) => {
  if (!score) return '';
  if (score >= 10000) return (score / 10000).toFixed(1) + '万';
  return String(score);
};

const fetchHotList = async () => {
  const now = Date.now();
  if (hotList.value.length > 0 && now - hotCacheTime < HOT_CACHE_TTL) return;

  isHotLoading.value = true;
  try {
    const res = await request.get('/search/hot');
    const d = res?.data;
    const list = Array.isArray(d?.list) ? d.list : [];
    let rawList = [];
    for (const tab of list) {
      if (Array.isArray(tab?.keywords) && tab.keywords.length > 0) {
        rawList = tab.keywords;
        break;
      }
    }
    if (rawList.length === 0) {
      rawList = Array.isArray(d?.data) ? d.data
        : Array.isArray(d?.info) ? d.info
        : Array.isArray(d) ? d
        : [];
    }
    hotList.value = rawList.slice(0, 10).map(item => {
      if (typeof item === 'string') return { word: item, score: 0, content: '' };
      return {
        word: item.keyword || item.search_word || item.word || item.HintInfo || item.name || '',
        score: item.score || item.heat || item.hot || 0,
        content: item.reason || item.content || ''
      };
    });
    hotCacheTime = now;
  } catch (err) {
    console.error('热搜请求失败:', err);
  } finally {
    isHotLoading.value = false;
  }
};

const fetchDefaultPlaceholder = async () => {
  try {
    const res = await request.get('/search/default');
    const word = res?.data?.realkeyword || res?.data?.showKeyword || '';
    if (word) defaultPlaceholder.value = `搜索：${word}`;
  } catch {
    // keep default placeholder
  }
};

const handleFocus = () => {
  isFocused.value = true;
  selectedIndex.value = -1;
  if (!searchKeyword.value.trim()) {
    fetchHotList();
  }
};

const handleSearch = () => {
  const keyword = searchKeyword.value.trim();
  if (keyword) {
    addHistory(keyword);
    isFocused.value = false;
    suggestGroups.value = { songs: [], artists: [], albums: [] };
    selectedIndex.value = -1;
    router.push({ path: '/search', query: { keyword } });
  }
};

const selectHistory = (word) => {
  searchKeyword.value = word;
  addHistory(word);
  isFocused.value = false;
  selectedIndex.value = -1;
  router.push({ path: '/search', query: { keyword: word } });
};

const selectHot = (item) => {
  const word = item.word;
  searchKeyword.value = word;
  addHistory(word);
  isFocused.value = false;
  selectedIndex.value = -1;
  router.push({ path: '/search', query: { keyword: word } });
};

const selectSuggestItem = (item) => {
  const keyword = item.artist ? `${item.artist} ${item.name}` : item.name;
  searchKeyword.value = keyword;
  addHistory(keyword);
  isFocused.value = false;
  suggestGroups.value = { songs: [], artists: [], albums: [] };
  selectedIndex.value = -1;
  router.push({ path: '/search', query: { keyword } });
};

const navigateSuggest = (direction) => {
  const count = navigableItemCount.value;
  if (count === 0 || !isFocused.value) return;

  selectedIndex.value += direction;

  if (selectedIndex.value >= count) {
    selectedIndex.value = 0;
  } else if (selectedIndex.value < 0) {
    selectedIndex.value = count - 1;
  }

  nextTick(() => {
    const isHotMode = !searchKeyword.value.trim();
    const container = isHotMode ? hotListRef.value : suggestListRef.value;
    if (!container) return;

    let activeItem;
    if (isHotMode) {
      activeItem = container.children[selectedIndex.value];
    } else {
      activeItem = container.querySelector(`[data-flat-index="${selectedIndex.value}"]`);
    }
    if (!activeItem) return;

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;

    if (itemTop < containerTop) {
      container.scrollTop = itemTop;
    } else if (itemBottom > containerBottom) {
      container.scrollTop = itemBottom - container.clientHeight;
    }
  });
};

const handleEnter = () => {
  if (!isFocused.value) return;

  if (selectedIndex.value >= 0 && selectedIndex.value < navigableItemCount.value) {
    if (!searchKeyword.value.trim()) {
      if (selectedIndex.value < hotList.value.length) {
        selectHot(hotList.value[selectedIndex.value]);
      }
    } else {
      const { item } = getSuggestItemByFlatIndex(selectedIndex.value);
      selectSuggestItem(item);
    }
  } else {
    handleSearch();
  }
};

const parseHintInfo = (hint) => {
  const sep = hint.indexOf(' - ');
  if (sep > 0) {
    return { name: hint.slice(sep + 3).trim(), artist: hint.slice(0, sep).trim() };
  }
  return { name: hint.trim(), artist: '' };
};

const parseSuggestData = (res) => {
  const groups = { songs: [], artists: [], albums: [] };
  const dataList = res?.data || [];

  for (const section of dataList) {
    const label = (section?.LableName || '').trim();
    const records = section?.RecordDatas || [];
    for (const item of records) {
      const hint = item.HintInfo || '';
      if (!hint) continue;
      const parsed = parseHintInfo(hint);

      if (label === '专辑') {
        groups.albums.push({ name: parsed.name, artist: parsed.artist, type: 'album' });
      } else if (label === 'MV') {
        groups.songs.push({ name: parsed.name, artist: parsed.artist, type: 'song' });
      } else {
        if (!parsed.artist) {
          groups.artists.push({ name: parsed.name, type: 'artist' });
        } else {
          groups.songs.push({ name: parsed.name, artist: parsed.artist, type: 'song' });
        }
      }
    }
  }

  groups.songs = groups.songs.slice(0, 4);
  groups.artists = groups.artists.slice(0, 3);
  groups.albums = groups.albums.slice(0, 3);

  return groups;
};

const handleInput = () => {
  clearTimeout(debounceTimer);
  if (!searchKeyword.value.trim()) {
    suggestGroups.value = { songs: [], artists: [], albums: [] };
    selectedIndex.value = -1;
    fetchHotList();
    return;
  }
  
  debounceTimer = setTimeout(async () => {
    isSuggestLoading.value = true;
    try {
      const res = await request.get('/search/suggest', {
        params: { keywords: searchKeyword.value.trim() }
      });
      suggestGroups.value = parseSuggestData(res);
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
  suggestGroups.value = { songs: [], artists: [], albums: [] };
  selectedIndex.value = -1;
  if (searchInput.value) searchInput.value.focus();
};

watch(() => route.query.keyword, (newKeyword) => {
  if (newKeyword !== undefined) searchKeyword.value = newKeyword;
});

watch(() => route.path, (newPath) => {
  if (newPath !== '/search') {
    searchKeyword.value = '';
    suggestGroups.value = { songs: [], artists: [], albums: [] };
    selectedIndex.value = -1;
    isFocused.value = false;
  }
});

onMounted(() => {
  if (route.query.keyword) searchKeyword.value = route.query.keyword;
  fetchDefaultPlaceholder();
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
