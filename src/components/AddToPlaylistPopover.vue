<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div
        v-if="visible"
        ref="overlayRef"
        class="fixed inset-0 z-[100002] flex items-center justify-center bg-gray-900/45 dark:bg-black/65 backdrop-blur-sm no-drag outline-none p-4"
        tabindex="-1"
        @keydown.escape.stop="close"
        @click.self="close"
      >
        <div
          v-squircle="'xl'"
          class="w-[420px] max-w-[92vw] max-h-[80vh] bg-white dark:bg-[#141415] rounded-[20px] border border-gray-200/90 dark:border-white/[0.08] shadow-[0_24px_70px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden text-gray-800 dark:text-[#ededed]"
        >
          <!-- 顶栏 -->
          <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <img
                :src="songCover"
                alt=""
                class="w-10 h-10 rounded-[10px] object-cover bg-gray-100 dark:bg-[#232325] shrink-0 border border-gray-100 dark:border-white/[0.06]"
                @error="e => e.target.src = defaultImg"
              />
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-[#ededed] truncate">添加到歌单</h3>
                <p class="text-[11px] text-gray-400 dark:text-[#85858b] truncate mt-0.5">
                  {{ songTitle }} · {{ songArtist }}
                </p>
              </div>
            </div>
            <button
              @click="close"
              class="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-[#ededed] hover:bg-gray-100 dark:hover:bg-[#232325] transition-colors shrink-0"
              v-tooltip="'关闭 (Esc)'"
            >
              <AppIcon name="close" class="w-4 h-4" />
            </button>
          </div>

          <!-- 搜索与快速新建区 -->
          <div class="px-5 pt-3.5 pb-2 space-y-2.5 shrink-0">
            <div class="relative flex items-center">
              <AppIcon name="search" class="w-3.5 h-3.5 text-gray-400 dark:text-[#85858b] absolute left-3 pointer-events-none" />
              <input
                v-model="keyword"
                type="text"
                placeholder="筛选歌单名称..."
                class="w-full h-9 pl-8 pr-3 rounded-xl bg-gray-100/80 dark:bg-[#19191b] border border-gray-200/70 dark:border-white/[0.08] text-xs text-gray-800 dark:text-[#ededed] placeholder:text-gray-400 dark:placeholder:text-[#85858b] focus:outline-none focus:border-purple-400 dark:focus:border-blue-500/60 transition-colors"
              />
            </div>

            <!-- 快速新建歌单开关 / 表单 -->
            <div v-if="!showCreateForm">
              <button
                @click="openCreateForm"
                class="w-full h-9 px-3 rounded-xl border border-dashed border-purple-200 dark:border-white/[0.12] bg-purple-50/50 dark:bg-[#19191b] hover:bg-purple-50 dark:hover:bg-[#232325] text-purple-600 dark:text-purple-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <AppIcon name="plus" class="w-3.5 h-3.5" />
                <span>新建歌单并加入此歌曲</span>
              </button>
            </div>
            <div v-else class="p-3 rounded-xl bg-gray-50 dark:bg-[#19191b] border border-gray-200/70 dark:border-white/[0.08] space-y-2.5">
              <PlaylistNameInput
                ref="createInputRef"
                v-model="newPlaylistName"
                label="新歌单名称"
                placeholder="输入新歌单名称（最多 40 字）"
                accent="purple"
                compact
                @submit="handleCreateAndAdd"
              />
              <div class="flex items-center justify-between pt-0.5">
                <label class="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#a1a1a6] cursor-pointer select-none">
                  <input type="checkbox" v-model="newPlaylistPrivate" class="rounded border-gray-300 text-purple-600 focus:ring-0" />
                  <span>设为私密歌单</span>
                </label>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="cancelCreateForm"
                    class="px-2.5 py-1 rounded-lg text-[11px] text-gray-500 hover:text-gray-700 dark:text-[#a1a1a6] dark:hover:text-[#ededed]"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    @click="handleCreateAndAdd"
                    :disabled="!newNameValidation.isValid || isCreating"
                    class="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <AppIcon v-if="isCreating" name="spinner" spin class="w-3 h-3" />
                    <span>创建并加入</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 歌单列表 -->
          <div class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 pt-1 space-y-1 min-h-[180px]">
            <!-- 1. 我喜欢的音乐（始终独立置顶） -->
            <button
              v-if="showLikedEntry"
              @click="handleAddToLiked"
              :disabled="pendingId === '__liked__' || isSongAlreadyLiked"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left group"
              :class="isSongAlreadyLiked
                ? 'bg-red-50/60 dark:bg-red-500/10 cursor-default'
                : 'hover:bg-purple-50/70 dark:hover:bg-[#19191b]'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-[10px] bg-red-50 dark:bg-red-500/15 border border-red-100 dark:border-red-500/20 flex items-center justify-center shrink-0">
                  <AppIcon :name="isSongAlreadyLiked ? 'heart-solid' : 'heart'" class="w-4 h-4 text-red-500" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-gray-900 dark:text-[#ededed] flex items-center gap-1.5">
                    <span class="truncate">我喜欢的音乐</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-300">红心</span>
                  </div>
                  <div class="text-[11px] text-gray-400 dark:text-[#85858b] mt-0.5">
                    {{ isSongAlreadyLiked ? '该歌曲已在我喜欢的音乐中' : '点亮红心并同步云端喜欢列表' }}
                  </div>
                </div>
              </div>
              <div class="shrink-0 ml-2">
                <AppIcon v-if="pendingId === '__liked__'" name="spinner" spin class="w-4 h-4 text-purple-500" />
                <span v-else-if="isSongAlreadyLiked" class="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 dark:text-red-300">
                  <AppIcon name="check" class="w-3.5 h-3.5" />
                  <span>已喜欢</span>
                </span>
                <span v-else class="text-[11px] font-medium text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">添加</span>
              </div>
            </button>

            <div v-if="showLikedEntry && filteredPlaylists.length > 0" class="my-1.5 mx-2 h-px bg-gray-100 dark:bg-white/[0.06]"></div>

            <!-- 2. 同步中占位 -->
            <div v-if="userStore.isFetchingPlaylists && filteredPlaylists.length === 0" class="py-10 flex flex-col items-center justify-center text-gray-400 dark:text-[#85858b] gap-2">
              <AppIcon name="spinner" spin class="w-5 h-5 text-purple-500" />
              <span class="text-xs">正在同步账号歌单...</span>
            </div>

            <!-- 3. 全部可写入歌单（默认收藏 + 全部自建歌单） -->
            <button
              v-for="p in filteredPlaylists"
              :key="p.listid"
              @click="handleAddToPlaylist(p)"
              :disabled="pendingId === String(p.listid) || isPlaylistAdded(p)"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left group"
              :class="isPlaylistAdded(p)
                ? 'bg-emerald-50/70 dark:bg-emerald-500/10 cursor-default'
                : 'hover:bg-purple-50/70 dark:hover:bg-[#19191b]'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-[10px] overflow-hidden bg-gray-100 dark:bg-[#232325] border border-gray-100 dark:border-white/[0.06] shrink-0 flex items-center justify-center">
                  <img v-if="p.cover" :src="p.cover" alt="" class="w-full h-full object-cover" @error="e => e.target.style.display = 'none'" />
                  <AppIcon v-else name="my-playlists" class="w-4 h-4 text-gray-400 dark:text-[#85858b]" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-gray-800 dark:text-[#ededed] flex items-center gap-1.5 min-w-0">
                    <span class="truncate">{{ p.name }}</span>
                    <AppIcon v-if="p.isPrivate" name="lock" class="w-3 h-3 text-gray-400 shrink-0" />
                  </div>
                  <div class="text-[11px] text-gray-400 dark:text-[#85858b] mt-0.5 tabular-nums">
                    {{ p.count || 0 }} 首歌曲
                  </div>
                </div>
              </div>
              <div class="shrink-0 ml-2">
                <AppIcon v-if="pendingId === String(p.listid)" name="spinner" spin class="w-4 h-4 text-purple-500" />
                <span v-else-if="isPlaylistAdded(p)" class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <AppIcon name="check" class="w-3.5 h-3.5" />
                  <span>已加入</span>
                </span>
                <span v-else-if="isPlaylistChecking(p)" class="text-[11px] text-gray-400 dark:text-[#85858b]">
                  检测中...
                </span>
                <span v-else class="text-[11px] font-medium text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">加入</span>
              </div>
            </button>

            <div
              v-if="!userStore.isFetchingPlaylists && !showLikedEntry && filteredPlaylists.length === 0"
              class="py-10 text-center text-xs text-gray-400 dark:text-[#85858b]"
            >
              未找到匹配的歌单，可点击上方新建歌单
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import { isFavoritePlaylistName, buildPlayPayload } from '../utils/songHelper';
import {
  formatPlaylistNameForToast,
  isUnsupportedCloudPlaylistSong,
  resolveCloudSongHash,
  validatePlaylistName
} from '../utils/playlistHelper';
import { ADD_TO_PLAYLIST_EVENT } from '../utils/addToPlaylist';
import PlaylistNameInput from './common/PlaylistNameInput.vue';

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const userStore = useUserStore();
const playerStore = usePlayerStore();

const visible = ref(false);
const targetSong = ref(null);
const keyword = ref('');
const pendingId = ref('');
const addedIds = ref(new Set());
const showCreateForm = ref(false);
const newPlaylistName = ref('');
const newPlaylistPrivate = ref(false);
const isCreating = ref(false);
let openSessionSeq = 0;

const overlayRef = ref(null);
const createInputRef = ref(null);

const newNameValidation = computed(() => validatePlaylistName(newPlaylistName.value));

const normalizedTarget = computed(() => {
  if (!targetSong.value) return null;
  return buildPlayPayload(targetSong.value, defaultImg);
});

const songTitle = computed(() => normalizedTarget.value?.name || '未知歌曲');
const songArtist = computed(() => normalizedTarget.value?.singer || '未知歌手');
const songCover = computed(() => normalizedTarget.value?.cover || defaultImg);
const songHashUpper = computed(() => String(normalizedTarget.value?.hash || '').toUpperCase());

const isSongAlreadyLiked = computed(() => {
  if (!songHashUpper.value || !userStore.isLoggedIn) return false;
  return Array.isArray(userStore.likedHashes) && userStore.likedHashes.includes(songHashUpper.value);
});

const isPlaylistAdded = (playlist) => {
  const pid = String(playlist?.listid || '');
  if (!pid) return false;
  if (addedIds.value.has(pid)) return true;
  if (!normalizedTarget.value) return false;
  return userStore.isSongInPlaylist(pid, normalizedTarget.value);
};

const isPlaylistChecking = (playlist) => {
  const pid = String(playlist?.listid || '');
  return Boolean(pid && userStore.playlistTrackCheckingIds[pid]);
};

const showLikedEntry = computed(() => {
  if (!userStore.likedListId) return false;
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return true;
  return '我喜欢的音乐'.includes(kw) || '喜欢'.includes(kw) || '红心'.includes(kw);
});

const filteredPlaylists = computed(() => {
  const likedListId = String(userStore.likedListId || '');
  const likedGid = String(userStore.likedPlaylistGlobalId || '');
  const kw = keyword.value.trim().toLowerCase();

  const list = (userStore.userCreatedPlaylists || []).filter((p) => {
    if (!p || !p.listid) return false;
    if (p.isFavorite || isFavoritePlaylistName(p.name)) return false;
    const pid = String(p.listid || '');
    const gid = String(p.gid || '');
    if ((pid && pid === likedListId) || (gid && gid === likedGid)) {
      if (!p.name?.includes('默认收藏') && !p.name?.includes('默认列表')) return false;
    }
    if (kw && !String(p.name || '').toLowerCase().includes(kw)) return false;
    return true;
  });

  return [...list].sort((a, b) => {
    const aDef = a.name?.includes('默认收藏') || a.name?.includes('默认列表') ? 1 : 0;
    const bDef = b.name?.includes('默认收藏') || b.name?.includes('默认列表') ? 1 : 0;
    return bDef - aDef;
  });
});

const close = () => {
  openSessionSeq++;
  visible.value = false;
  targetSong.value = null;
  pendingId.value = '';
  showCreateForm.value = false;
  newPlaylistName.value = '';
  newPlaylistPrivate.value = false;
};

const openHandler = async (event) => {
  const detail = event.detail || {};
  const song = detail.song;
  if (!song) return;

  if (isUnsupportedCloudPlaylistSong(song)) {
    playerStore.showToast('外部导入歌曲暂不支持添加到云端歌单', { type: 'warning' });
    return;
  }

  if (!resolveCloudSongHash(song)) {
    playerStore.showToast('歌曲标识不存在，暂无法添加到云端歌单', { type: 'warning' });
    return;
  }

  if (!userStore.isLoggedIn) {
    userStore.openLoginModal();
    return;
  }

  const sessionToken = ++openSessionSeq;
  targetSong.value = song;
  keyword.value = '';
  addedIds.value = new Set();
  showCreateForm.value = false;
  newPlaylistName.value = '';
  newPlaylistPrivate.value = false;
  visible.value = true;

  await nextTick();
  overlayRef.value?.focus();

  if (!userStore.userCreatedPlaylists || userStore.userCreatedPlaylists.length === 0) {
    await userStore.fetchLikedPlaylistMeta();
  }

  if (visible.value && sessionToken === openSessionSeq) {
    userStore.prefetchPlaylistsTrackKeys(filteredPlaylists.value, {
      concurrency: 3,
      shouldContinue: () => visible.value && sessionToken === openSessionSeq
    });
  }
};

const openCreateForm = async () => {
  showCreateForm.value = true;
  await nextTick();
  createInputRef.value?.focus();
};

const cancelCreateForm = () => {
  showCreateForm.value = false;
  newPlaylistName.value = '';
  newPlaylistPrivate.value = false;
};

const handleAddToLiked = async () => {
  if (!normalizedTarget.value || isSongAlreadyLiked.value || pendingId.value) return;
  pendingId.value = '__liked__';
  try {
    await userStore.toggleLikeSong(normalizedTarget.value);
  } finally {
    pendingId.value = '';
  }
};

const handleAddToPlaylist = async (playlist) => {
  const pid = String(playlist?.listid || '');
  if (!pid || !normalizedTarget.value || pendingId.value || isPlaylistAdded(playlist)) return;
  pendingId.value = pid;
  try {
    const res = await userStore.addSongToCustomPlaylist({
      listid: pid,
      song: normalizedTarget.value,
      playlistName: playlist.name
    });
    if (res?.success || res?.alreadyExists || (res?.msg && /已存在|重复/.test(res.msg))) {
      const next = new Set(addedIds.value);
      next.add(pid);
      addedIds.value = next;
    }
  } finally {
    pendingId.value = '';
  }
};

const handleCreateAndAdd = async () => {
  const validation = newNameValidation.value;
  if (!validation.isValid) {
    if (validation.error) playerStore.showToast(validation.error, { type: 'warning' });
    return;
  }
  if (isCreating.value || !normalizedTarget.value) return;

  const name = validation.trimmed;
  isCreating.value = true;
  try {
    const res = await userStore.createCustomPlaylist({
      name,
      isPrivate: newPlaylistPrivate.value,
      silentToast: true
    });
    if (res?.success) {
      const found = userStore.userCreatedPlaylists.find((p) => p.name === name);
      const listid = res.listid || res.data?.info?.listid || res.data?.listid || found?.listid;
      keyword.value = '';
      if (listid) {
        const shortName = formatPlaylistNameForToast(name);
        const addRes = await userStore.addSongToCustomPlaylist({
          listid,
          song: normalizedTarget.value,
          playlistName: name,
          toastMessage: shortName ? `已创建「${shortName}」并加入歌曲` : '已创建歌单并加入歌曲'
        });
        if (addRes?.success || addRes?.alreadyExists) {
          const next = new Set(addedIds.value);
          next.add(String(listid));
          addedIds.value = next;
        }
      } else {
        playerStore.showToast('🎉 新建歌单成功', { type: 'success' });
      }
      cancelCreateForm();
    }
  } finally {
    isCreating.value = false;
  }
};

onMounted(() => {
  window.addEventListener(ADD_TO_PLAYLIST_EVENT, openHandler);
});

onUnmounted(() => {
  window.removeEventListener(ADD_TO_PLAYLIST_EVENT, openHandler);
});
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.45); border-radius: 3px; }
</style>
