// ====================
// 文件：src/views/PlaylistDetail.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="playlist-scroll-container">
    
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-gray-100 to-white -z-10"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <button @click="$router.back()" class="mb-6 flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors no-drag w-fit">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        返回上一页
      </button>

      <div class="flex items-end mb-10 gap-6">
        <div v-if="isLoading && page === 1" class="w-48 h-48 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0 shadow-md"></div>
        <div v-else class="relative w-48 h-48 rounded-2xl flex-shrink-0 shadow-lg overflow-hidden border border-gray-100 bg-white group">
          <img :key="playlistCover" :src="playlistCover" :alt="playlistInfo.name || '歌单封面'" @error="handleCoverError" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>

        <div class="flex flex-col justify-end flex-1 min-w-0">
          <div v-if="isLoading && page === 1" class="w-24 h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
          <div v-else class="text-xs font-bold text-blue-600 tracking-widest uppercase mb-2">Playlist</div>

          <div v-if="isLoading && page === 1" class="w-3/4 h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
          <h2 v-else class="text-4xl font-extrabold text-gray-900 tracking-tight line-clamp-2 mb-3" v-tooltip="playlistInfo.name">{{ playlistInfo.name || '未知歌单' }}</h2>

          <div v-if="isLoading && page === 1" class="w-1/2 h-4 bg-gray-200 rounded animate-pulse mb-6"></div>
          <p v-else class="text-sm text-gray-500 line-clamp-2 mb-6 leading-relaxed pr-10 cursor-default whitespace-pre-wrap" v-tooltip="playlistInfo.intro">{{ playlistInfo.intro || '该歌单暂无简介...' }}</p>

          <div class="flex items-center space-x-3">
            <button @click="playAll" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-all transform active:scale-95 flex items-center no-drag" :class="{'opacity-50 pointer-events-none': (isLoading && page === 1) || songs.length === 0}">
              <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              播放全部
            </button>
            
            <button v-if="!isCreatedByMe" @click="toggleCollect" :disabled="isCollectLoading" class="px-6 py-2.5 rounded-full text-sm font-bold transition-all transform active:scale-95 flex items-center no-drag" 
                :class="[
                    isCollected ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-red-500' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm border border-blue-100',
                    {'opacity-50 pointer-events-none': isCollectLoading || (isLoading && page === 1)}
                ]">
              <svg v-if="isCollectLoading" class="animate-spin h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <svg v-else-if="isCollected" class="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>
              <svg v-else class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              {{ isCollectLoading ? '' : (isCollected ? '已收藏' : '收藏歌单') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoading && page === 1" class="space-y-4 w-full">
        <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
          <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
        </div>
      </div>

      <div v-else-if="isError && page === 1" class="w-full flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
         <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">获取歌曲列表失败</p>
        <button @click="fetchDetail" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="songs.length === 0" class="w-full flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
        <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        <p class="text-sm font-medium tracking-widest text-gray-400">该歌单暂无歌曲内容</p>
      </div>

      <div v-else class="w-full flex-1 flex flex-col min-w-0">
        <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 mb-2 min-w-0">
          <div class="w-10 text-center flex-shrink-0">#</div>
          <div class="flex-1 pl-2 min-w-0">音乐标题</div>
          <div class="w-1/4 hidden sm:block pr-4 min-w-0">歌手</div>
          <div class="w-1/4 hidden md:block pr-4 min-w-0">专辑</div>
          <div class="w-12 sm:w-16 text-right pr-4 flex-shrink-0">时长</div>
        </div>
        
        <div class="space-y-1 w-full">
          <div v-for="(song, index) in songs" :key="song._hash || index" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 group transition-colors cursor-pointer no-drag min-w-0">
            <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
            <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 flex-shrink-0" @click.stop="handlePlay(song)">
               <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            </div>
            
            <div class="flex-1 pl-2 text-sm text-gray-800 font-medium flex items-center pr-4 overflow-hidden min-w-0" v-tooltip="song._title">
              <img :src="song._cover" :alt="song._name || '歌曲封面'" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100" @error="e => e.target.src = defaultImg" />
              <span class="truncate min-w-0">{{ song._title }}</span>
              <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
              <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
            </div>
            
            <div class="w-1/4 hidden sm:block text-xs truncate pr-4 min-w-0">
              <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
            </div>

            <div class="w-1/4 hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
              <span
                @click.stop="goToAlbum(song._album_id || song.album_id)"
                class="transition-colors"
                :class="(song._album_id || song.album_id) ? 'hover:text-blue-600 cursor-pointer' : ''"
              >
                {{ song._album }}
              </span>
            </div>
            
            <div class="w-12 sm:w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
          </div>
        </div>

        <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
          <div v-if="isLoadingMore" class="flex items-center text-blue-500">
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            正在获取更多歌曲...
          </div>
          <div v-else-if="!hasMore && songs.length > 0" class="text-gray-300 flex items-center space-x-2">
            <span class="w-8 h-px bg-gray-200"></span>
            <span>已经到底啦</span>
            <span class="w-8 h-px bg-gray-200"></span>
          </div>
        </div>
      </div>

    </div>
    
    <BackToTop targetId="playlist-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import { useUserStore } from '../store/userStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import { openSongContextMenu } from '../utils/songContextMenu';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';

const route = useRoute();
const router = useRouter();
const store = usePlayerStore();
const userStore = useUserStore(); 

const playlistInfo = ref({});
const songs = ref([]);
const rawPlaylistData = ref(null);

const isLoading = ref(true);
const isError = ref(false);
const isCollectLoading = ref(false);

const page = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const loadMoreTrigger = ref(null);
let observer = null;

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const goToArtist = (id) => {
  if (!id || id === '0') return store.showToast('暂无该歌手详情信息');
  router.push(`/artist/${id}`);
};

const goToAlbum = (id) => {
  if (!id || id === '0') return store.showToast('暂无该专辑详情信息');
  router.push(`/album/${id}`);
};

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId && route.path.startsWith('/playlist/')) {
    isLoading.value = true;
    songs.value = [];
    playlistInfo.value = {};
    fetchDetail().then(() => setupObserver());
  }
});

const isCreatedByMe = computed(() => {
  return userStore.createdListIds.includes(String(route.params.id));
});

const isCollected = computed(() => {
  const id = String(route.params.id);
  if (userStore.collectedListIds.includes(id) || !!userStore.collectedMap[id]) return true;
  const originGid = playlistInfo.value.list_create_gid || rawPlaylistData.value?.list_info?.list_create_gid || rawPlaylistData.value?.info?.list_create_gid;
  if (originGid) {
    const gid = String(originGid);
    return userStore.collectedListIds.includes(gid) || !!userStore.collectedMap[gid];
  }
  return false;
});

const playlistCover = computed(() => {
  const isLikedList = String(route.params.id) === String(userStore.likedPlaylistGlobalId) || 
                      (playlistInfo.value.name && (playlistInfo.value.name.includes('默认收藏') || playlistInfo.value.name.includes('我喜欢')));
  
  if (isLikedList) {
     if (songs.value.length > 0 && songs.value[0]._cover) {
        return songs.value[0]._cover;
     }
     return defaultImg; 
  }
  
  return playlistInfo.value.cover || (songs.value.length > 0 ? songs.value[0]._cover : defaultImg);
});

const handleCoverError = (e) => {
  const fallback = songs.value.length > 0 ? songs.value[0]._cover : defaultImg;
  if (e.target.src !== fallback) {
    e.target.src = fallback;
  } else {
    e.target.src = defaultImg;
  }
};

const toggleCollect = async () => {
  if (!userStore.isLoggedIn) return userStore.openLoginModal();
  if (isCreatedByMe.value) return; 

  const targetId = String(route.params.id);
  isCollectLoading.value = true;
  
  try {
    if (isCollected.value) {
      let listid = userStore.playlistMap[targetId] || userStore.collectedMap[targetId];
      if (!listid && rawPlaylistData.value) {
          const searchListId = (obj) => {
             if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
             if (!listid) listid = obj.listid || obj.specialid;
             Object.values(obj).forEach(val => searchListId(val));
          };
          searchListId(rawPlaylistData.value);
      }
      
      if (!listid) throw new Error('未能从本地库查找到该歌单的关联指针，请尝试重新登录同步。');
      
      const res = await request.get('/playlist/del', { params: { listid } });
      if (res && (res.status === 1 || res.error_code === 0)) {
        store.showToast('已取消收藏');
        
        const originGid = playlistInfo.value.list_create_gid || rawPlaylistData.value?.list_info?.list_create_gid || rawPlaylistData.value?.info?.list_create_gid;
        const globalId = userStore.collectedMap[targetId + '_global'];

        userStore.collectedListIds = userStore.collectedListIds.filter(id => 
            id !== targetId && id !== String(originGid) && id !== String(listid) && id !== String(globalId)
        );

        const idsToNuke = [targetId, String(listid)];
        if (originGid) idsToNuke.push(String(originGid));
        if (globalId) idsToNuke.push(String(globalId));

        idsToNuke.forEach(id => {
           if (!userStore.deletedPlaylistIds.includes(id)) userStore.deletedPlaylistIds.push(id);
        });

        Object.keys(userStore.collectedMap).forEach(key => {
            if (idsToNuke.includes(key) || idsToNuke.includes(userStore.collectedMap[key])) {
                if (!userStore.deletedPlaylistIds.includes(key)) userStore.deletedPlaylistIds.push(key);
                delete userStore.collectedMap[key];
            }
        });

        localStorage.setItem('kg_desktop_collected_map', JSON.stringify(userStore.collectedMap));
        localStorage.setItem('kg_desktop_deleted_playlists', JSON.stringify(userStore.deletedPlaylistIds));

        userStore.fetchLikedPlaylistMeta();
      } else {
        throw new Error(res?.error_msg || res?.message || '取消收藏失败');
      }
    } else {
      let userid = null;
      let listid = null;
      let listName = playlistInfo.value.name || '未命名歌单';

      const searchIds = (obj) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
        if (userid && listid) return;
        
        if (!userid) userid = obj.userid || obj.user_id || obj.creator_id || obj.creator_userid || obj.list_create_userid;
        if (!listid) listid = obj.listid || obj.specialid || obj.list_create_listid || obj.id;
        
        Object.values(obj).forEach(val => {
          if (val && typeof val === 'object') searchIds(val);
        });
      };
      searchIds(rawPlaylistData.value);

      if (!userid || !listid) {
        const parts = targetId.split('_');
        if (parts.length >= 4) {
          if (!userid) userid = parts[2];
          if (!listid) listid = parts[3];
        }
      }

      if (!userid || !listid) throw new Error('提取核心 ID 失败，操作已阻断。');

      const res = await request.get('/playlist/add', {
        params: {
          type: 1,  
          source: 1,
          name: listName,
          list_create_userid: userid,
          list_create_listid: listid
        }
      });

      if (res && (res.status === 1 || res.error_code === 0)) {
        const infoObj = res.data?.info || res.data || {};
        const newListId = infoObj.listid || infoObj.id;
        const newGlobalId = infoObj.global_collection_id || '';

        store.showToast('🎉 收藏成功');
        
        userStore.collectedMap[targetId] = String(newListId);
        if (newGlobalId) userStore.collectedMap[targetId + '_global'] = String(newGlobalId);
        localStorage.setItem('kg_desktop_collected_map', JSON.stringify(userStore.collectedMap));
        
        userStore.deletedPlaylistIds = userStore.deletedPlaylistIds.filter(id => id !== targetId && id !== String(newListId) && id !== newGlobalId);
        localStorage.setItem('kg_desktop_deleted_playlists', JSON.stringify(userStore.deletedPlaylistIds));
        
        userStore.fetchLikedPlaylistMeta(); 
      } else {
        throw new Error(res?.error_msg || res?.message || '收藏被服务器拒绝');
      }
    }
  } catch (error) {
    store.showToast(error.message);
  } finally {
    isCollectLoading.value = false;
  }
};

watch(() => [...userStore.likedHashes], (newHashes, oldHashes) => {
  const isLikedList = String(route.params.id) === String(userStore.likedPlaylistGlobalId) || 
                      (playlistInfo.value.name && (playlistInfo.value.name.includes('默认收藏') || playlistInfo.value.name.includes('我喜欢')));
  
  if (isLikedList) {
    const isAdding = newHashes.length > (oldHashes ? oldHashes.length : 0);

    if (!isAdding) {
      songs.value = songs.value.filter(song => {
        const h = (song._hash || '').toUpperCase();
        return newHashes.includes(h);
      });
    } else {
      const addedHashes = newHashes.filter(h => !(oldHashes || []).includes(h));
      for (const addedHash of addedHashes) {
        const exists = songs.value.some(s => (s._hash || '').toUpperCase() === addedHash);
        
        if (!exists) {
          if (store.currentSong && (store.currentSong.hash || '').toUpperCase() === addedHash) {
            const newSong = buildPlayPayload({ 
               ...store.currentSong, 
               _hash: store.currentSong.hash, 
               _title: store.currentSong.name,
               _singer: store.currentSong.singer,
               _album: store.currentSong.album,
               _cover: store.currentSong.cover,
               _is_vip: store.currentSong.is_vip,
               _is_paid: store.currentSong.is_paid,
               _qualities: store.currentSong.qualities
            });
            songs.value.unshift(newSong);
          } else {
            fetchDetail();
            return;
          }
        }
      }
    }
  }
});

const extractSongs = (res) => {
  let validArr = [];
  if (res?.data?.songs && Array.isArray(res.data.songs)) {
      validArr = res.data.songs;
  }
  const isRealSong = (item) => item && typeof item === 'object' && (item.hash || item.filehash || item.FileHash);
  const seen = new WeakSet();
  const traverse = (data, depth) => {
    if (depth > 6 || !data || typeof data !== 'object' || validArr.length > 0) return;
    if (seen.has(data)) return;
    seen.add(data);
    if (Array.isArray(data)) {
      if (data.length > 0 && isRealSong(data[0])) validArr = data;
      data.forEach(item => traverse(item, depth + 1));
      return;
    }
    Object.values(data).forEach(val => traverse(val, depth + 1));
  };
  if (validArr.length === 0) traverse(res, 0);
  return validArr;
};

const extractPlaylistInfo = (res) => {
  let info = {};
  const formatImg = (url) => url ? url.replace(/\{size\}/g, '400') : '';
  const seen2 = new WeakSet();
  const traverse = (data, depth) => {
    if (depth > 6 || !data || typeof data !== 'object') return;
    if (seen2.has(data)) return;
    seen2.add(data);
    if (data.specialname || data.listname || data.name || data.title) {
      if(!info.name) info.name = data.specialname || data.listname || data.name || data.title;
    }
    if (data.imgurl || data.pic || data.cover || data.user_avatar) {
      if(!info.cover) info.cover = formatImg(data.imgurl || data.pic || data.cover || data.user_avatar);
    }
    if (data.intro || data.desc || data.description) {
      if(!info.intro) {
        let text = data.intro || data.desc || data.description;
        info.intro = typeof text === 'string' ? text.replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n') : text;
      }
    }
    if (data.list_create_gid && !info.list_create_gid) {
        info.list_create_gid = data.list_create_gid;
    }
    Object.values(data).forEach(val => traverse(val, depth + 1));
  };
  traverse(res, 0);
  return info;
};

const fetchDetail = async () => {
  const id = route.params.id;
  isLoading.value = true;
  isError.value = false;
  page.value = 1;
  hasMore.value = true;
  songs.value = [];

  try {
    await request.get('/register/dev').catch(() => {});
    
    let infoRes = null;
    try {
      infoRes = await request.get('/playlist/detail', { params: { ids: id, timestamp: Date.now() } });
    } catch (e) { console.warn('获取歌单详情抛出异常 (已隔离):', e); }
    
    playlistInfo.value = extractPlaylistInfo(infoRes);
    rawPlaylistData.value = infoRes; 
    
    const targetFetchId = playlistInfo.value.list_create_gid || id;

    let songsRes = null;
    try {
      songsRes = await request.get('/playlist/track/all', { params: { id: targetFetchId, page: page.value, timestamp: Date.now() } });
    } catch (e) { console.warn('获取歌曲列表抛出异常 (已隔离):', e); }
    
    if (songsRes) {
      const rawSongs = extractSongs(songsRes);
      let normalized = normalizeSongs(rawSongs, defaultImg);
      
      const isLikedList = String(route.params.id) === String(userStore.likedPlaylistGlobalId) || 
                          (playlistInfo.value.name && (playlistInfo.value.name.includes('默认收藏') || playlistInfo.value.name.includes('我喜欢')));
                          
      if (isLikedList) {
        normalized = normalized.filter(song => {
          const h = (song._hash || '').toUpperCase();
          return userStore.likedHashes.includes(h);
        });
      }
      
      songs.value = normalized;
      if (rawSongs.length < 30) hasMore.value = false;
    } else {
      throw new Error('歌曲列表接口阻断');
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
  
  const targetFetchId = playlistInfo.value.list_create_gid || id;

  try {
    const songsRes = await request.get('/playlist/track/all', { params: { id: targetFetchId, page: page.value, timestamp: Date.now() } });
    const newRawSongs = extractSongs(songsRes);
    if (newRawSongs.length === 0) hasMore.value = false;
    else {
      let normalized = normalizeSongs(newRawSongs, defaultImg);
      const isLikedList = String(route.params.id) === String(userStore.likedPlaylistGlobalId) || 
                          (playlistInfo.value.name && (playlistInfo.value.name.includes('默认收藏') || playlistInfo.value.name.includes('我喜欢')));
                          
      if (isLikedList) {
        normalized = normalized.filter(song => {
          const h = (song._hash || '').toUpperCase();
          return userStore.likedHashes.includes(h);
        });
      }
      
      songs.value.push(...normalized);
      if (newRawSongs.length < 30) hasMore.value = false;
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

onMounted(() => { fetchDetail().then(() => { setupObserver(); }); });
onUnmounted(() => { if (observer) observer.disconnect(); });

const handlePlay = (song) => {
  if (!song._hash) return;
  store.playSong(buildPlayPayload(song, playlistInfo.value.cover || defaultImg));
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, playlistInfo.value.cover || defaultImg));
};

const playAll = () => {
  if (songs.value.length === 0) return;
  store.prependPlaylistAndPlay(songs.value.map(song => buildPlayPayload(song, playlistInfo.value.cover || defaultImg)));
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
