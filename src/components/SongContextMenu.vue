<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="fixed z-[100001] w-56 overflow-visible rounded-xl border border-gray-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-100 shadow-[0_16px_45px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl no-drag"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @contextmenu.prevent
    >
      <button class="menu-item" @click="playNow">
        <AppIcon name="play" class="menu-icon" />
        <span>播放</span>
      </button>
      <button class="menu-item" @click="playNext">
        <AppIcon name="play-next" class="menu-icon" />
        <span>添加下一首播放</span>
      </button>
      <button v-if="source !== 'playlist'" class="menu-item" @click="append">
        <AppIcon name="add-playlist" class="menu-icon" />
        <span>添加到播放列表</span>
      </button>

      <div class="my-1 h-px bg-gray-100 dark:bg-slate-700"></div>

      <template v-if="!isExternalImportContext">
        <button class="menu-item" :class="{ liked: isLiked }" @click="toggleLike">
          <AppIcon :name="isLiked ? 'heart-solid' : 'heart'" class="menu-icon" :class="isLiked ? 'text-red-500' : ''" />
          <span>{{ isLiked ? '取消喜欢' : '添加到我喜欢' }}</span>
        </button>

        <!-- 添加到歌单 -->
        <div class="relative group/playlist" @mouseenter="ensurePlaylists">
          <button class="menu-item justify-between w-full">
            <div class="flex items-center space-x-2.5">
              <AppIcon name="my-playlists" class="menu-icon" />
              <span>添加到歌单</span>
            </div>
            <AppIcon name="chevron-right" class="w-3.5 h-3.5 text-gray-400 group-hover/playlist:text-blue-600" />
          </button>

          <!-- 歌单二级子菜单 -->
          <div
            class="hidden group-hover/playlist:flex flex-col absolute top-0 w-48 max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-gray-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-100 shadow-[0_16px_45px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl z-10"
            :class="submenuPlacement === 'left' ? 'right-full mr-1' : 'left-full ml-1'"
          >
            <button
              class="menu-item text-blue-600 hover:text-blue-700 hover:bg-blue-50/80"
              @click="openQuickCreate"
            >
              <AppIcon name="plus" class="menu-icon" />
              <span>新建歌单</span>
            </button>
            <div v-if="userPlaylists.length > 0" class="my-1 h-px bg-gray-100 dark:bg-slate-700"></div>
            <button
              v-for="p in userPlaylists"
              :key="p.listid"
              class="menu-item"
              @click="addToPlaylist(p)"
              v-tooltip="p.name"
            >
              <AppIcon name="music" class="menu-icon text-gray-400" />
              <span class="truncate">{{ p.name }}</span>
            </button>
            <div v-if="userStore.isFetchingPlaylists && userPlaylists.length === 0" class="px-3 py-2 text-gray-400 text-[11px] text-center font-normal flex items-center justify-center space-x-1.5">
              <AppIcon name="spinner" spin class="w-3.5 h-3.5 text-blue-500" />
              <span>正在同步歌单...</span>
            </div>
            <div v-else-if="userPlaylists.length === 0" class="px-3 py-2 text-gray-400 text-[11px] text-center font-normal">
              暂无可选歌单
            </div>
          </div>
        </div>

        <button v-if="songArtists.length <= 1" class="menu-item" :class="{ disabled: songArtists.length === 0 }" @click="goArtist(songArtists[0])">
          <AppIcon name="artists" class="menu-icon" />
          <span>查看歌手</span>
        </button>
        <template v-else>
          <div class="menu-item menu-item-heading">
            <AppIcon name="artists" class="menu-icon" />
            <span>查看歌手</span>
          </div>
          <button v-for="artist in songArtists" :key="artist.id || artist.name" class="menu-item artist-subitem text-gray-700 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400" @click="goArtist(artist)" v-tooltip="artist.name">
            <span class="truncate">{{ artist.name }}</span>
          </button>
        </template>
        <button class="menu-item" :class="{ disabled: !song?.album_id }" @click="goAlbum">
          <AppIcon name="album" class="menu-icon" />
          <span>查看专辑</span>
        </button>
      </template>

      <button class="menu-item" @click="copyInfo">
        <AppIcon name="copy" class="menu-icon" />
        <span>复制歌曲信息</span>
      </button>

      <template v-if="source === 'playlist'">
        <div class="my-1 h-px bg-gray-100 dark:bg-slate-700"></div>
        <button class="menu-item danger" @click="removeFromPlaylist">
          <AppIcon name="trash" class="menu-icon" />
          <span>从播放列表移除</span>
        </button>
      </template>

      <template v-else-if="source === 'user-playlist'">
        <div class="my-1 h-px bg-gray-100 dark:bg-slate-700"></div>
        <button class="menu-item danger" @click="removeFromUserPlaylist">
          <AppIcon name="trash" class="menu-icon" />
          <span>从歌单中删除</span>
        </button>
      </template>
    </div>

    <!-- 快速新建歌单并添加弹窗 -->
    <div v-if="showQuickCreate" class="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-drag" @click.self="showQuickCreate = false">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-slate-800 w-full max-w-sm p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <AppIcon name="plus" class="w-3.5 h-3.5" />
            </div>
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">新建歌单并添加歌曲</h3>
          </div>
          <button @click="showQuickCreate = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <AppIcon name="close" class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="mb-5">
          <input
            v-model="quickPlaylistName"
            type="text"
            maxlength="40"
            placeholder="输入新歌单标题..."
            @keyup.enter="handleQuickCreateAndAdd"
            class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 outline-none transition-all"
            autofocus
          />
        </div>
        <div class="flex items-center justify-end space-x-2.5">
          <button @click="showQuickCreate = false" class="px-3.5 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            取消
          </button>
          <button
            @click="handleQuickCreateAndAdd"
            :disabled="isQuickCreating || !quickPlaylistName.trim()"
            class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center"
          >
            <AppIcon v-if="isQuickCreating" name="spinner" spin class="w-3 h-3 mr-1" />
            <span>{{ isQuickCreating ? '创建中...' : '创建并添加' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../store/playerStore';
import { useUserStore } from '../store/userStore';
import { getSongArtists, isFavoritePlaylistName } from '../utils/songHelper';
import { goToArtist as navigateArtist } from '../utils/artistNavigation';

const router = useRouter();
const playerStore = usePlayerStore();
const userStore = useUserStore();

const visible = ref(false);
const song = ref(null);
const source = ref('list');
const sourceIndex = ref(-1);
const contextData = ref({});
const position = ref({ x: 0, y: 0 });
const menuRef = ref(null);
const submenuPlacement = ref('right');

const showQuickCreate = ref(false);
const quickPlaylistName = ref('');
const isQuickCreating = ref(false);

const isLiked = computed(() => {
  const hash = song.value?.hash?.toUpperCase();
  return !!hash && userStore.likedHashes.includes(hash);
});

const userPlaylists = computed(() => {
  const likedListId = String(userStore.likedListId || '');
  const likedGid = String(userStore.likedPlaylistGlobalId || '');

  const list = (userStore.userCreatedPlaylists || []).filter(p => {
    // 排除心动/我喜欢歌单（“我喜欢”已有专门的心动红心按键与“添加到我喜欢”菜单项，不在此处重复）
    if (p.isFavorite) return false;
    if (isFavoritePlaylistName(p.name)) return false;

    // 按照 likedListId / likedGid 校验（只有在不是默认收藏的情况下才排除）
    const pid = String(p.listid || '');
    const gid = String(p.gid || '');
    if ((pid && pid === likedListId) || (gid && gid === likedGid)) {
      if (!p.name?.includes('默认收藏') && !p.name?.includes('默认列表')) {
        return false;
      }
    }
    return true;
  });

  // 排序：将“默认收藏”置顶在普通自建歌单之前，便于快速添加
  return [...list].sort((a, b) => {
    const aIsDefault = (a.name?.includes('默认收藏') || a.name?.includes('默认列表')) ? 1 : 0;
    const bIsDefault = (b.name?.includes('默认收藏') || b.name?.includes('默认列表')) ? 1 : 0;
    return bIsDefault - aIsDefault;
  });
});

const songArtists = computed(() => getSongArtists(song.value));
const isExternalImportContext = computed(() => {
  return source.value === 'netease-import'
    || source.value === 'qq-import'
    || song.value?.source === 'netease-import'
    || song.value?.source === 'qq-import'
    || String(song.value?.hash || '').startsWith('netease:')
    || String(song.value?.hash || '').startsWith('qq:')
    || Boolean(song.value?.qqMid);
});
const isNeteaseImportContext = isExternalImportContext;

const close = () => {
  visible.value = false;
  song.value = null;
  source.value = 'list';
  sourceIndex.value = -1;
  contextData.value = {};
};

const checkSubmenuPosition = () => {
  if (position.value.x + 224 + 192 > window.innerWidth) {
    submenuPlacement.value = 'left';
  } else {
    submenuPlacement.value = 'right';
  }
};

const placeWithinViewport = async () => {
  await nextTick();
  const el = menuRef.value;
  if (!el) return;
  const pad = 8;
  const rect = el.getBoundingClientRect();
  position.value = {
    x: Math.max(pad, Math.min(position.value.x, window.innerWidth - rect.width - pad)),
    y: Math.max(pad, Math.min(position.value.y, window.innerHeight - rect.height - pad))
  };
  checkSubmenuPosition();
};

const ensurePlaylists = () => {
  checkSubmenuPosition();
  if (userStore.isLoggedIn && (!userStore.userCreatedPlaylists || userStore.userCreatedPlaylists.length === 0)) {
    userStore.fetchLikedPlaylistMeta();
  }
};

const open = (event) => {
  const detail = event.detail || {};
  if (!detail.song) return;
  song.value = detail.song;
  source.value = detail.source || 'list';
  sourceIndex.value = Number.isInteger(detail.index) ? detail.index : -1;
  contextData.value = detail;
  position.value = { x: detail.x || 0, y: detail.y || 0 };
  visible.value = true;
  showQuickCreate.value = false;
  placeWithinViewport();

  if (userStore.isLoggedIn && (!userStore.userCreatedPlaylists || userStore.userCreatedPlaylists.length === 0)) {
    userStore.fetchLikedPlaylistMeta();
  }
};

const runAndClose = (fn) => {
  fn();
  close();
};

const playNow = () => runAndClose(() => playerStore.playSong(song.value));
const playNext = () => runAndClose(() => playerStore.insertNext(song.value));
const append = () => runAndClose(() => playerStore.appendToPlaylist(song.value));
const toggleLike = () => runAndClose(() => userStore.toggleLikeSong(song.value));

const addToPlaylist = (targetPlaylist) => runAndClose(async () => {
  await userStore.addSongToCustomPlaylist({
    listid: targetPlaylist.listid,
    song: song.value,
    playlistName: targetPlaylist.name
  });
});

const openQuickCreate = () => {
  if (!userStore.isLoggedIn) {
    runAndClose(() => userStore.openLoginModal());
    return;
  }
  quickPlaylistName.value = '';
  showQuickCreate.value = true;
};

const handleQuickCreateAndAdd = async () => {
  const name = quickPlaylistName.value.trim();
  if (!name || isQuickCreating.value) return;
  isQuickCreating.value = true;
  try {
    const res = await userStore.createCustomPlaylist({ name, isPrivate: false });
    if (res.success) {
      const target = userStore.userCreatedPlaylists.find(p => p.name === name);
      const listid = target?.listid || res.data?.info?.listid || res.data?.listid;
      if (listid && song.value) {
        await userStore.addSongToCustomPlaylist({
          listid,
          song: song.value,
          playlistName: name
        });
      }
      showQuickCreate.value = false;
      close();
    }
  } finally {
    isQuickCreating.value = false;
  }
};

const removeFromUserPlaylist = () => runAndClose(async () => {
  const listid = contextData.value.listid;
  const fileid = contextData.value.fileid || song.value?.fileid || song.value?._fileid;
  const hash = song.value?.hash || song.value?._hash;
  if (!listid || !fileid) {
    playerStore.showToast('缺少歌曲唯一标识');
    return;
  }
  const res = await userStore.removeSongFromCustomPlaylist({
    listid,
    fileid,
    hash
  });
  if (res.success) {
    window.dispatchEvent(new CustomEvent('song-context-menu:song-removed', {
      detail: {
        index: sourceIndex.value,
        fileid,
        hash,
        listid
      }
    }));
  }
});

const goArtist = (artist) => runAndClose(() => {
  navigateArtist(router, artist, playerStore);
});

const goAlbum = () => runAndClose(() => {
  if (!song.value?.album_id) return playerStore.showToast('暂无该专辑详情信息');
  router.push(`/album/${song.value.album_id}`);
});

const copyInfo = () => runAndClose(async () => {
  const text = `${song.value?.name || '未知歌曲'} - ${song.value?.singer || '未知歌手'}`;
  try {
    await navigator.clipboard?.writeText(text);
    playerStore.showToast('已复制歌曲信息');
  } catch (e) {
    playerStore.showToast(text);
  }
});

const removeFromPlaylist = () => runAndClose(() => {
  if (sourceIndex.value >= 0) playerStore.removeFromPlaylist(sourceIndex.value);
});

const handlePointerDown = (event) => {
  if (showQuickCreate.value) return;
  if (visible.value && menuRef.value && !menuRef.value.contains(event.target)) close();
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (showQuickCreate.value) {
      showQuickCreate.value = false;
    } else {
      close();
    }
  }
};

onMounted(() => {
  window.addEventListener('song-context-menu:open', open);
  window.addEventListener('song-context-menu:close', close);
  window.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('resize', close);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('song-context-menu:open', open);
  window.removeEventListener('song-context-menu:close', close);
  window.removeEventListener('mousedown', handlePointerDown);
  window.removeEventListener('resize', close);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.menu-item:hover {
  background: rgba(239, 246, 255, 0.8);
  color: rgb(37, 99, 235);
}

:global(.dark) .menu-item:hover {
  background: rgba(37, 99, 235, 0.18);
  color: rgb(96, 165, 250);
}

.menu-item.disabled {
  pointer-events: none;
  color: rgb(203, 213, 225);
}

:global(.dark) .menu-item.disabled {
  color: rgb(71, 85, 105);
}

.menu-item-heading {
  pointer-events: none;
  color: rgb(100, 116, 139);
  padding-bottom: 0.25rem;
}

:global(.dark) .menu-item-heading {
  color: rgb(148, 163, 184);
}

.artist-subitem {
  padding-left: 3rem;
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
  font-weight: 700;
}

.menu-item.danger:hover {
  background: rgba(254, 242, 242, 0.9);
  color: rgb(239, 68, 68);
}

.menu-item.liked .menu-icon {
  color: rgb(239, 68, 68);
}


.menu-item.liked:hover {
  background: rgba(254, 242, 242, 0.9);
  color: rgb(220, 38, 38);
}

.menu-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: currentColor;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.5); border-radius: 2px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
