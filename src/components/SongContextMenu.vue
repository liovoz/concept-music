<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="fixed z-[100001] w-56 overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-100 shadow-[0_16px_45px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl no-drag"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @contextmenu.prevent
    >
      <button class="menu-item" @click="playNow">
        <PlayIcon class="menu-icon" />
        <span>播放</span>
      </button>
      <button class="menu-item" @click="playNext">
        <ListPlusIcon class="menu-icon" />
        <span>添加下一首播放</span>
      </button>
      <button v-if="source !== 'playlist'" class="menu-item" @click="append">
        <ListEndIcon class="menu-icon" />
        <span>添加到播放列表</span>
      </button>

      <div class="my-1 h-px bg-gray-100 dark:bg-slate-700"></div>

      <button class="menu-item" :class="{ liked: isLiked }" @click="toggleLike">
        <HeartIcon class="menu-icon" :filled="isLiked" />
        <span>{{ isLiked ? '取消喜欢' : '添加到我喜欢' }}</span>
      </button>
      <button v-if="songArtists.length <= 1" class="menu-item" :class="{ disabled: songArtists.length === 0 }" @click="goArtist(songArtists[0])">
        <UserIcon class="menu-icon" />
        <span>查看歌手</span>
      </button>
      <template v-else>
        <div class="menu-item menu-item-heading">
          <UserIcon class="menu-icon" />
          <span>&#26597;&#30475;&#27468;&#25163;</span>
        </div>
        <button v-for="artist in songArtists" :key="artist.id || artist.name" class="menu-item artist-subitem text-gray-700 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400" @click="goArtist(artist)" v-tooltip="artist.name">
          <span class="truncate">{{ artist.name }}</span>
        </button>
      </template>
      <button class="menu-item" :class="{ disabled: !song?.album_id }" @click="goAlbum">
        <DiscIcon class="menu-icon" />
        <span>查看专辑</span>
      </button>
      <button class="menu-item" @click="copyInfo">
        <CopyIcon class="menu-icon" />
        <span>复制歌曲信息</span>
      </button>

      <template v-if="source === 'playlist'">
        <div class="my-1 h-px bg-gray-100 dark:bg-slate-700"></div>
        <button class="menu-item danger" @click="removeFromPlaylist">
          <TrashIcon class="menu-icon" />
          <span>从播放列表移除</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, h, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../store/playerStore';
import { useUserStore } from '../store/userStore';
import { getSongArtists } from '../utils/songHelper';
import { goToArtist as navigateArtist } from '../utils/artistNavigation';

const makeIcon = (paths, options = {}) => (props = {}) => h(
  'svg',
  {
    ...props,
    viewBox: '0 0 24 24',
    fill: options.filled || props.filled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true'
  },
  paths.map(attrs => h('path', attrs))
);

const PlayIcon = makeIcon([{ d: 'M8 5v14l11-7z' }], { filled: true });
const ListPlusIcon = makeIcon([{ d: 'M8 6h11' }, { d: 'M8 12h7' }, { d: 'M8 18h11' }, { d: 'M3 12h2' }, { d: 'M4 11v2' }]);
const ListEndIcon = makeIcon([{ d: 'M5 7h14' }, { d: 'M5 12h10' }, { d: 'M5 17h14' }, { d: 'M17 10l3 2-3 2' }]);
const HeartIcon = makeIcon([{ d: 'M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6z' }]);
const UserIcon = makeIcon([{ d: 'M20 21a8 8 0 0 0-16 0' }, { d: 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z' }]);
const DiscIcon = makeIcon([{ d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z' }, { d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' }]);
const CopyIcon = makeIcon([{ d: 'M8 8h11v11H8z' }, { d: 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1' }]);
const TrashIcon = makeIcon([{ d: 'M3 6h18' }, { d: 'M8 6V4h8v2' }, { d: 'M6 6l1 15h10l1-15' }, { d: 'M10 11v6' }, { d: 'M14 11v6' }]);

const router = useRouter();
const playerStore = usePlayerStore();
const userStore = useUserStore();

const visible = ref(false);
const song = ref(null);
const source = ref('list');
const sourceIndex = ref(-1);
const position = ref({ x: 0, y: 0 });
const menuRef = ref(null);

const isLiked = computed(() => {
  const hash = song.value?.hash?.toUpperCase();
  return !!hash && userStore.likedHashes.includes(hash);
});

const songArtists = computed(() => getSongArtists(song.value));

const close = () => {
  visible.value = false;
  song.value = null;
  source.value = 'list';
  sourceIndex.value = -1;
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
};

const open = (event) => {
  const detail = event.detail || {};
  if (!detail.song) return;
  song.value = detail.song;
  source.value = detail.source || 'list';
  sourceIndex.value = Number.isInteger(detail.index) ? detail.index : -1;
  position.value = { x: detail.x || 0, y: detail.y || 0 };
  visible.value = true;
  placeWithinViewport();
};

const runAndClose = (fn) => {
  fn();
  close();
};

const playNow = () => runAndClose(() => playerStore.playSong(song.value));
const playNext = () => runAndClose(() => playerStore.insertNext(song.value));
const append = () => runAndClose(() => playerStore.appendToPlaylist(song.value));
const toggleLike = () => runAndClose(() => userStore.toggleLikeSong(song.value));

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
  if (visible.value && menuRef.value && !menuRef.value.contains(event.target)) close();
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape') close();
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
</style>
