<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="song-context-menu fixed z-[100001] w-56 overflow-visible rounded-xl border border-gray-100 dark:border-white/[0.08] bg-white/95 dark:bg-[#19191b]/95 p-1.5 type-body-sm text-gray-700 dark:text-[#ededed] shadow-[0_16px_45px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl no-drag"
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

      <div class="my-1 h-px bg-gray-100 dark:bg-[#2c2c2f]"></div>

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
            class="hidden group-hover/playlist:flex flex-col absolute w-52 max-h-64 rounded-xl shadow-[0_16px_45px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_54px_rgba(0,0,0,0.55)] z-10"
            :class="[submenuPlacement === 'left' ? 'right-full mr-1' : 'left-full ml-1', submenuVerticalPlacement === 'bottom' ? 'bottom-0' : 'top-0']"
          >
            <div
              class="w-full h-full flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar custom-scrollbar-thin rounded-xl border border-gray-100 dark:border-white/[0.08] bg-white/95 dark:bg-[#19191b]/95 p-1.5 type-body-sm text-gray-700 dark:text-[#ededed] backdrop-blur-xl"
            >
            <button
              class="menu-item text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 dark:text-blue-400 dark:hover:bg-blue-900/30"
              @click="openQuickCreate"
            >
              <AppIcon name="plus" class="menu-icon" />
              <span>新建歌单</span>
            </button>
            <div v-if="userPlaylists.length > 0" class="my-1 h-px bg-gray-100 dark:bg-[#2c2c2f]"></div>
            <button
              v-for="p in userPlaylists"
              :key="p.listid"
              class="menu-item min-w-0 justify-between"
              :class="{ 'opacity-65 cursor-default text-emerald-600 dark:text-emerald-400': isSongInPlaylist(p) }"
              :disabled="isSongInPlaylist(p)"
              @click="addToPlaylist(p)"
              v-tooltip="isSongInPlaylist(p) ? `${p.name}（已在歌单中）` : p.name"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <AppIcon :name="isSongInPlaylist(p) ? 'check' : 'music'" class="menu-icon" :class="isSongInPlaylist(p) ? 'text-emerald-500' : 'text-gray-400'" />
                <span class="truncate flex-1 min-w-0">{{ p.name }}</span>
              </div>
              <span v-if="isSongInPlaylist(p)" class="type-meta-micro text-emerald-600 dark:text-emerald-400 shrink-0">已加入</span>
            </button>
            <div v-if="userStore.isFetchingPlaylists && userPlaylists.length === 0" class="px-3 py-2 text-gray-400 type-meta-base text-center flex items-center justify-center space-x-1.5">
              <AppIcon name="spinner" spin class="w-3.5 h-3.5 text-blue-500" />
              <span>正在同步歌单...</span>
            </div>
            <div v-else-if="userPlaylists.length === 0" class="px-3 py-2 text-gray-400 type-meta-base text-center">
              暂无可选歌单
            </div>
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
          <button v-for="artist in songArtists" :key="artist.id || artist.name" class="menu-item artist-subitem text-gray-700 dark:text-[#ededed] hover:text-blue-600 dark:hover:text-blue-400" @click="goArtist(artist)" v-tooltip="artist.name">
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
        <div class="my-1 h-px bg-gray-100 dark:bg-[#2c2c2f]"></div>
        <button class="menu-item danger" @click="removeFromPlaylist">
          <AppIcon name="trash" class="menu-icon" />
          <span>从播放列表移除</span>
        </button>
      </template>

      <template v-else-if="source === 'user-playlist'">
        <div class="my-1 h-px bg-gray-100 dark:bg-[#2c2c2f]"></div>
        <button class="menu-item danger" @click="removeFromUserPlaylist">
          <AppIcon name="trash" class="menu-icon" />
          <span>从歌单中删除</span>
        </button>
      </template>
    </div>

    <!-- 快速新建歌单并添加弹窗 -->
    <div v-if="showQuickCreate" class="fixed inset-0 z-[100003] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-drag" @click.self="showQuickCreate = false">
      <div class="bg-white dark:bg-[#19191b] rounded-2xl shadow-2xl dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-white/[0.08] w-full max-w-sm p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <AppIcon name="plus" class="w-3.5 h-3.5" />
            </div>
            <h3 class="type-body-md text-gray-800 dark:text-[#ededed]">新建歌单并添加歌曲</h3>
          </div>
          <button @click="showQuickCreate = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-[#ededed] p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#232325] transition-colors">
            <AppIcon name="close" class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="mb-5 space-y-3">
          <PlaylistNameInput
            ref="quickCreateInputRef"
            v-model="quickPlaylistName"
            label="歌单标题"
            placeholder="输入新歌单标题..."
            accent="blue"
            @submit="handleQuickCreateAndAdd"
          />
          <label class="inline-flex items-center gap-2 type-meta-base text-gray-500 dark:text-[#a1a1a6] cursor-pointer select-none pl-0.5">
            <input type="checkbox" v-model="quickPlaylistPrivate" class="rounded border-gray-300 text-blue-600 focus:ring-0" />
            <span>设为私密歌单</span>
          </label>
        </div>
        <div class="flex items-center justify-end space-x-2.5">
          <button @click="showQuickCreate = false" class="px-3.5 py-1.5 type-meta-base font-medium text-gray-500 dark:text-[#a1a1a6] hover:text-gray-700 dark:hover:text-[#ededed] hover:bg-gray-100 dark:hover:bg-[#232325] rounded-lg transition-colors">
            取消
          </button>
          <button
            @click="handleQuickCreateAndAdd"
            :disabled="isQuickCreating || !quickNameValidation.isValid"
            class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white type-meta-base font-medium rounded-lg shadow-sm transition-all flex items-center"
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
import { formatPlaylistNameForToast, validatePlaylistName } from '../utils/playlistHelper';
import { goToArtist as navigateArtist } from '../utils/artistNavigation';
import PlaylistNameInput from './common/PlaylistNameInput.vue';

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
const submenuVerticalPlacement = ref('top');

const showQuickCreate = ref(false);
const quickPlaylistName = ref('');
const quickPlaylistPrivate = ref(false);
const isQuickCreating = ref(false);
const quickCreateInputRef = ref(null);

const quickNameValidation = computed(() => validatePlaylistName(quickPlaylistName.value));

const isSongInPlaylist = (playlist) => {
  if (!playlist?.listid || !song.value) return false;
  return userStore.isSongInPlaylist(playlist.listid, song.value);
};

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
  if (position.value.x + 224 + 208 > window.innerWidth) {
    submenuPlacement.value = 'left';
  } else {
    submenuPlacement.value = 'right';
  }
  if (position.value.y + 120 + 256 > window.innerHeight - 8) {
    submenuVerticalPlacement.value = 'bottom';
  } else {
    submenuVerticalPlacement.value = 'top';
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

const ensurePlaylists = async () => {
  checkSubmenuPosition();
  if (!userStore.isLoggedIn) return;
  if (!userStore.userCreatedPlaylists || userStore.userCreatedPlaylists.length === 0) {
    await userStore.fetchLikedPlaylistMeta();
  }
  if (visible.value && userPlaylists.value.length > 0) {
    userStore.prefetchPlaylistsTrackKeys(userPlaylists.value, {
      concurrency: 3,
      shouldContinue: () => visible.value
    });
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

const addToPlaylist = (targetPlaylist) => {
  if (!targetPlaylist) return;
  if (isSongInPlaylist(targetPlaylist)) {
    const shortName = formatPlaylistNameForToast(targetPlaylist.name);
    playerStore.showToast(shortName ? `该歌曲已在「${shortName}」中，无需重复添加` : '该歌曲已在歌单中，无需重复添加', { type: 'info' });
    close();
    return;
  }
  const currentSong = song.value;
  runAndClose(async () => {
    await userStore.addSongToCustomPlaylist({
      listid: targetPlaylist.listid,
      song: currentSong,
      playlistName: targetPlaylist.name
    });
  });
};

const openQuickCreate = async () => {
  if (!userStore.isLoggedIn) {
    runAndClose(() => userStore.openLoginModal());
    return;
  }
  quickPlaylistName.value = '';
  quickPlaylistPrivate.value = false;
  showQuickCreate.value = true;
  await nextTick();
  quickCreateInputRef.value?.focus();
};

const handleQuickCreateAndAdd = async () => {
  const validation = quickNameValidation.value;
  if (!validation.isValid) {
    if (validation.error) playerStore.showToast(validation.error, { type: 'warning' });
    return;
  }
  if (isQuickCreating.value) return;

  const name = validation.trimmed;
  isQuickCreating.value = true;
  try {
    const res = await userStore.createCustomPlaylist({
      name,
      isPrivate: quickPlaylistPrivate.value,
      silentToast: true
    });
    if (res.success) {
      const target = userStore.userCreatedPlaylists.find(p => p.name === name);
      const listid = res.listid || res.data?.info?.listid || res.data?.listid || target?.listid;
      if (listid && song.value) {
        const shortName = formatPlaylistNameForToast(name);
        await userStore.addSongToCustomPlaylist({
          listid,
          song: song.value,
          playlistName: name,
          toastMessage: shortName ? `已创建「${shortName}」并加入歌曲` : '已创建歌单并加入歌曲'
        });
      } else {
        playerStore.showToast('已新建歌单', { type: 'success' });
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
  if (sourceIndex.value >= 0 || song.value?.hash) {
    playerStore.removeFromPlaylist(sourceIndex.value, song.value?.hash);
  }
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
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.menu-item:hover {
  background: rgba(239, 246, 255, 0.85);
  color: rgb(37, 99, 235);
}

:global(.dark) .menu-item:hover {
  background: rgba(59, 130, 246, 0.2);
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
  font-weight: var(--font-weight-medium);
}

.menu-item.danger:hover {
  background: rgba(254, 242, 242, 0.9);
  color: rgb(239, 68, 68);
}

:global(.dark) .menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.menu-item.liked .menu-icon {
  color: rgb(239, 68, 68);
}

.menu-item.liked:hover {
  background: rgba(254, 242, 242, 0.9);
  color: rgb(220, 38, 38);
}

:global(.dark) .menu-item.liked:hover {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.menu-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: currentColor;
}
</style>
