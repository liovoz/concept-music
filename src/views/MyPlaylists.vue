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
            <AppIcon name="my-playlists" class="w-10 h-10 text-blue-500" />
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">私人歌单</h2>
          <p class="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">登录概念音乐，一键同步您精心收集的所有私人歌单，让好音乐随时陪伴。</p>
          <button @click="userStore.openLoginModal()" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag flex items-center">
            立即安全登录
            <AppIcon name="chevron-right" class="w-4 h-4 ml-2" />
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
          <button
            @click="openCreateModal"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-md shadow-blue-200 transition-all flex items-center flex-shrink-0 no-drag"
          >
            <AppIcon name="plus" class="w-3.5 h-3.5 mr-1.5" />
            新建歌单
          </button>
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
          <AppIcon name="warning" class="w-16 h-16 mb-4 text-red-300" />
          <p class="text-base font-bold text-red-600 mb-2">获取歌单失败</p><p class="text-xs text-red-400 max-w-lg text-center">{{ errorMessage }}</p>
          <button @click="fetchUserPlaylists" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
        </div>

        <div v-else-if="playlists.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
          <AppIcon name="my-playlists" class="w-20 h-20 mb-4 text-gray-200" />
          <p class="text-sm font-medium tracking-widest">你还没有创建或收藏任何歌单</p>
          <button @click="openCreateModal" class="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-sm">
            立即创建第一个歌单
          </button>
        </div>
        
        <div v-else-if="filteredPlaylists.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
          <AppIcon name="search" class="w-16 h-16 mb-4 text-gray-200" />
          <p class="text-sm font-medium tracking-widest">{{ activeTab === 'created' ? '您还没有创建过私人歌单' : '您还没有收藏过他人的歌单' }}</p>
          <button v-if="activeTab === 'created'" @click="openCreateModal" class="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-sm">
            立即创建歌单
          </button>
        </div>

        <div v-else class="w-full flex-1 flex flex-col min-w-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            <div v-for="playlist in filteredPlaylists" :key="playlist._id" @click="goToPlaylist(playlist._id)" class="flex flex-col group cursor-pointer no-drag relative">
              <div class="relative w-full aspect-square rounded-2xl overflow-hidden fix-clip shadow-sm group-hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-1.5 bg-gray-100 border border-gray-50/50">
                <img :src="playlist._cover" :alt="playlist.name" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div class="absolute top-2 right-2 bg-black/30 backdrop-blur-md text-white px-2.5 py-1 rounded-full flex items-center shadow-sm">
                  <AppIcon name="music" class="w-3 h-3 mr-1" />
                  <span class="text-[10px] font-bold tracking-wider">{{ playlist._trackCount }}首</span>
                </div>
                <!-- 隐私标识 -->
                <div v-if="playlist.is_pri === 1" class="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md text-white px-2 py-0.5 rounded-md flex items-center text-[10px] font-medium">
                  <AppIcon name="lock" class="w-2.5 h-2.5 mr-1" />
                  <span>私密</span>
                </div>
                <!-- 删除歌单按钮 -->
                <button
                  v-if="canDelete(playlist)"
                  @click.stop="openDeleteModal(playlist)"
                  class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/40 hover:bg-red-500 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md z-10"
                  v-tooltip="isCollectedPlaylist(playlist) ? '取消收藏' : '删除歌单'"
                >
                  <AppIcon name="trash" class="w-3.5 h-3.5" />
                </button>
                <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <AppIcon name="play" class="w-6 h-6 text-white ml-1" />
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
              <AppIcon name="spinner" spin class="h-4 w-4 mr-2" />
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

    <!-- 新建歌单对话框 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-drag" @click.self="closeCreateModal">
        <div class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center space-x-2.5">
              <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <AppIcon name="my-playlists" class="w-4 h-4" />
              </div>
              <h3 class="text-base font-bold text-gray-800">新建歌单</h3>
            </div>
            <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <AppIcon name="close" class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1.5">歌单标题</label>
              <input
                ref="createInputRef"
                v-model="newPlaylistName"
                type="text"
                maxlength="40"
                placeholder="请输入歌单标题..."
                @keyup.enter="handleCreatePlaylist"
                class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 transition-all placeholder:text-gray-400"
              />
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div class="flex flex-col">
                <span class="text-xs font-bold text-gray-700">设为隐私歌单</span>
                <span class="text-[11px] text-gray-400">设为私密后，其他用户将无法在社区查看该歌单</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="newPlaylistIsPrivate" class="sr-only peer" />
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 mt-6">
            <button @click="closeCreateModal" class="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              取消
            </button>
            <button
              @click="handleCreatePlaylist"
              :disabled="isCreating || !newPlaylistName.trim()"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center"
            >
              <AppIcon v-if="isCreating" name="spinner" spin class="w-3.5 h-3.5 mr-1.5" />
              <span>{{ isCreating ? '创建中...' : '立即创建' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除歌单确认对话框 -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-drag" @click.self="closeDeleteModal">
        <div class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
              <AppIcon name="trash" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-800">
                {{ isCollectedPlaylist(playlistToDelete) ? '取消收藏歌单' : '删除歌单' }}
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">此操作将从云端删除相关记录</p>
            </div>
          </div>

          <p class="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 mb-5">
            确定要{{ isCollectedPlaylist(playlistToDelete) ? '取消收藏' : '删除' }}歌单「<span class="font-bold text-gray-800">{{ playlistToDelete?.name }}</span>」吗？{{ isCollectedPlaylist(playlistToDelete) ? '取消后可随时重新收藏。' : '删除后将无法恢复该歌单。' }}
          </p>

          <div class="flex items-center justify-end space-x-3">
            <button @click="closeDeleteModal" class="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              取消
            </button>
            <button
              @click="handleDeletePlaylist"
              :disabled="isDeleting"
              class="px-5 py-2 bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center"
            >
              <AppIcon v-if="isDeleting" name="spinner" spin class="w-3.5 h-3.5 mr-1.5" />
              <span>{{ isDeleting ? '正在删除...' : '确认删除' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { isDefaultPlaylistName } from '../utils/songHelper';
import request from '../utils/request';
import BackToTop from '../components/BackToTop.vue'; // ✨ 引入组件

const router = useRouter();
const userStore = useUserStore();

const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref('');
const playlists = ref([]);
const activeTab = ref('all');

const showCreateModal = ref(false);
const newPlaylistName = ref('');
const newPlaylistIsPrivate = ref(false);
const isCreating = ref(false);
const createInputRef = ref(null);

const showDeleteModal = ref(false);
const playlistToDelete = ref(null);
const isDeleting = ref(false);

const openCreateModal = () => {
  if (!userStore.isLoggedIn) return userStore.openLoginModal();
  newPlaylistName.value = '';
  newPlaylistIsPrivate.value = false;
  showCreateModal.value = true;
  nextTick(() => {
    if (createInputRef.value) createInputRef.value.focus();
  });
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newPlaylistName.value = '';
  newPlaylistIsPrivate.value = false;
  isCreating.value = false;
};

const handleCreatePlaylist = async () => {
  const name = newPlaylistName.value.trim();
  if (!name || isCreating.value) return;
  isCreating.value = true;
  try {
    const res = await userStore.createCustomPlaylist({
      name,
      isPrivate: newPlaylistIsPrivate.value
    });
    if (res.success) {
      closeCreateModal();
      await fetchUserPlaylists();
    }
  } finally {
    isCreating.value = false;
  }
};

const isCollectedPlaylist = (playlist) => {
  if (!playlist) return false;
  if (isDefaultPlaylistName(playlist.name)) return false;
  const currentUserId = String(userStore.userInfo?.userid || '');
  const creatorId = String(playlist.list_create_userid || playlist.userid || '');

  // 1. 若创建者ID与当前用户一致，必定是自建歌单
  if (currentUserId && creatorId && creatorId === currentUserId) {
    return false;
  }

  const gid = String(playlist._id || playlist.global_collection_id || playlist.listid || playlist.specialid || '');
  const lid = String(playlist.listid || '');

  // 2. 存在于自建歌单索引中
  if (userStore.createdListIds.includes(gid) || userStore.createdListIds.includes(lid)) {
    return false;
  }

  // 3. 存在于 userCreatedPlaylists 列表中
  if (userStore.userCreatedPlaylists.some(p => p.listid === lid || p.gid === gid || p.name === playlist.name)) {
    return false;
  }

  // 4. 存在于 collectedListIds 列表中
  if (userStore.collectedListIds.includes(gid) || userStore.collectedListIds.includes(lid)) {
    return true;
  }

  // 5. 根据 type 属性判定（0为自建，1为收藏）
  if (playlist.type !== undefined && Number(playlist.type) === 0) {
    return false;
  }
  if (playlist.type !== undefined && Number(playlist.type) === 1) {
    return true;
  }

  // 6. 若创建者ID存在且不等于当前用户，则必为他人收藏歌单
  if (currentUserId && creatorId && creatorId !== currentUserId) {
    return true;
  }

  return false;
};

const canDelete = (playlist) => {
  if (!playlist) return false;
  const id = String(playlist._id || playlist.listid || '');
  if (id === String(userStore.likedPlaylistGlobalId) || id === String(userStore.likedListId)) return false;
  if (isDefaultPlaylistName(playlist.name)) return false;
  return true;
};

const openDeleteModal = (playlist) => {
  if (!playlist) return;
  playlistToDelete.value = playlist;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  playlistToDelete.value = null;
  isDeleting.value = false;
};

const handleDeletePlaylist = async () => {
  if (!playlistToDelete.value || isDeleting.value) return;
  isDeleting.value = true;
  try {
    const res = await userStore.deleteCustomPlaylist({
      listid: playlistToDelete.value.listid,
      gid: playlistToDelete.value._id,
      isCollected: isCollectedPlaylist(playlistToDelete.value)
    });
    if (res.success) {
      const deletedId = playlistToDelete.value._id;
      const deletedListId = playlistToDelete.value.listid;
      playlists.value = playlists.value.filter(p => p._id !== deletedId && p.listid !== deletedListId);
      closeDeleteModal();
    }
  } finally {
    isDeleting.value = false;
  }
};

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
    const lid = String(item.listid || '');
    const isCreated = !isCollectedPlaylist(item);
    const trackCount = item.count || item.m_count || 0;
    
    let finalCover = '';
    if (isCreated) {
      finalCover = userStore.customPlaylistCovers[routeId] || userStore.customPlaylistCovers[lid] || '';
    }

    if (!finalCover) {
      let rawCover = item.pic || '';
      const userPic = item.create_user_pic || '';
      const isAvatar = (userPic && rawCover === userPic) || (typeof rawCover === 'string' && rawCover.includes('/avatar/'));
      if (rawCover && (!isCreated || !isAvatar)) {
        finalCover = rawCover.replace(/\{size\}/g, '400');
      }
    }

    if (!finalCover) {
      finalCover = defaultImg;
    }
    
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
     if (!isCollectedPlaylist(p)) {
        const customCover = userStore.customPlaylistCovers[p._id] || userStore.customPlaylistCovers[String(p.listid)];
        if (customCover) {
           return {
               ...p,
               _cover: customCover
           };
        }
     }
     return p;
  });
});

const syncCreatedPlaylistCovers = async (list) => {
  if (!Array.isArray(list)) return;
  const targets = list.filter(p => {
    const isCreated = !isCollectedPlaylist(p);
    const hasCount = (p._trackCount || 0) > 0;
    const cached = userStore.customPlaylistCovers[p._id] || userStore.customPlaylistCovers[String(p.listid)];
    return isCreated && hasCount && (!cached || p._cover === defaultImg);
  });

  if (targets.length === 0) return;

  await Promise.allSettled(targets.map(async (p) => {
    const targetId = p._id || p.listid;
    const cover = await userStore.fetchPlaylistLatestCover(targetId);
    if (cover) {
      userStore.setCustomPlaylistCover(p._id, cover);
      if (p.listid) userStore.setCustomPlaylistCover(p.listid, cover);
      p._cover = cover;
    }
  }));
};

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
      userStore.syncPlaylistsFromRaw(rawLists);
      syncCreatedPlaylistCovers(playlists.value);
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
        const normalized = normalizePlaylists(newRawLists);
        playlists.value.push(...normalized);
        userStore.syncPlaylistsFromRaw(newRawLists);
        syncCreatedPlaylistCovers(normalized);
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