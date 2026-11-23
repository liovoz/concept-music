// ====================
// 文件：src/App.vue
// ====================
<template>
  <div v-if="isStandaloneMode" class="w-screen h-screen bg-transparent overflow-hidden">
    <router-view></router-view>
  </div>

  <div v-else class="flex h-screen w-full flex-col bg-white dark:bg-[#141415] overflow-hidden text-gray-800 dark:text-[#ededed] relative transition-colors duration-200">
    <Header />

    <div class="flex flex-1 overflow-hidden relative">
      <Sidebar />
      <main class="flex-1 bg-white dark:bg-[#141415] relative min-w-0 overflow-hidden transition-colors duration-200">
        <router-view v-slot="{ Component }">
          <keep-alive :include="['PersonalFM', 'PlaylistCategory']">
            <component :is="Component" :key="getRouteComponentKey(Component)" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <PlayerBar />

    <LoginModal />
    <GlobalToast />
    <GlobalDialog />
    <SongContextMenu />
    <AddToPlaylistPopover />
    <DisclaimerModal ref="disclaimerModalRef" @accepted="onDisclaimerAccepted" />
    <SettingsModal ref="settingsModalRef" />
    <UpdateNotificationCard />

    <transition name="fade-tooltip">
      <div 
        v-if="tooltipState.visible"
        :style="{ left: tooltipState.x + 'px', top: tooltipState.y + 'px' }"
        class="fixed z-[1000001] w-max max-w-xs sm:max-w-sm rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] pointer-events-none"
        :class="tooltipState.isBottom ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'"
      >
        <div
          v-squircle="'md'"
          class="relative px-3 py-1.5 bg-white/95 dark:bg-[#19191b]/95 backdrop-blur-2xl border border-gray-100 dark:border-white/[0.08] rounded-xl overflow-hidden"
        >
          <div
            class="type-meta-base text-gray-700 dark:text-[#ededed] leading-normal whitespace-normal break-words overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar"
            :style="{ maxHeight: `${(tooltipState.maxHeight || 320) - 16}px` }"
          >
            {{ tooltipState.text }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, provide, watch, computed } from 'vue';
import Header from './layout/Header.vue';
import Sidebar from './layout/Sidebar.vue';
import PlayerBar from './layout/PlayerBar.vue';
import LoginModal from './components/LoginModal.vue';
import GlobalToast from './components/GlobalToast.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const checkIsStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  const hash = String(window.location?.hash || '');
  const pathname = String(window.location?.pathname || '');
  return hash.startsWith('#/desktop-lyric') || pathname.includes('desktop-lyric') ||
         hash.startsWith('#/tray-menu') || pathname.includes('tray-menu') ||
         route.path === '/desktop-lyric' || route.path === '/tray-menu';
};
const isStandaloneMode = computed(() => checkIsStandaloneMode());
const cachedComponents = new Set(['PersonalFM', 'PlaylistCategory']);
const getComponentName = (Component) => Component?.type?.name || Component?.name || '';
const isCached = (Component) => cachedComponents.has(getComponentName(Component)); 
const getRouteComponentKey = (Component) => {
  if (typeof route.meta?.stableComponentKey === 'string') return route.meta.stableComponentKey;
  return isCached(Component) ? getComponentName(Component) : route.fullPath;
};

watch(() => route.path, () => {
  hideTooltip();
});
import GlobalDialog from './components/GlobalDialog.vue';
import SongContextMenu from './components/SongContextMenu.vue';
import AddToPlaylistPopover from './components/AddToPlaylistPopover.vue';
import SettingsModal from './components/SettingsModal.vue';
import DisclaimerModal from './components/DisclaimerModal.vue';
import UpdateNotificationCard from './components/UpdateNotificationCard.vue';
import { useUserStore } from './store/userStore';
import { usePlayerStore } from './store/playerStore';
import { useFmStore } from './store/fmStore';
import { useUpdateStore } from './store/updateStore';
import { hideTooltip, tooltipState } from './utils/tooltip';
import { initMediaSessionBridge, disposeMediaSessionBridge } from './utils/mediaSessionBridge';

const userStore = useUserStore();
const playerStore = usePlayerStore();
const fmStore = useFmStore();
const updateStore = useUpdateStore();
const settingsModalRef = ref(null);
const disclaimerModalRef = ref(null);

const disclaimerAccepted = localStorage.getItem('kg_desktop_disclaimer_accepted') === 'true';

const onDisclaimerAccepted = () => {
  userStore.verifySession();
};

provide('settingsModalRef', settingsModalRef);
provide('disclaimerModalRef', disclaimerModalRef);

const handleTrayAction = (action) => {
  switch (action) {
    case 'toggle-play': playerStore.togglePlay(); break;
    case 'prev': playerStore.playPrev(); break;
    case 'next': playerStore.playNext(); break;
    case 'toggle-mute': playerStore.toggleMute(); break;
    case 'toggle-lyric': playerStore.toggleDesktopLyric(); break;
    case 'set-mode-sequence': playerStore.setPlayMode('sequence'); break;
    case 'set-mode-loop': playerStore.setPlayMode('loop'); break;
    case 'set-mode-random': playerStore.setPlayMode('random'); break;
    case 'show-about':
      if (settingsModalRef.value) settingsModalRef.value.showModal('about');
      break;
    case 'check-update':
      if (settingsModalRef.value) {
        settingsModalRef.value.showModal('about');
        setTimeout(() => {
          if (window.updaterAPI) window.updaterAPI.checkForUpdates();
        }, 300);
      }
      break;
  }
};

const isStandaloneWindow = () => checkIsStandaloneMode();

const handleFmPositiveAssetEvent = (event) => {
  const song = event?.detail?.song;
  if (song && userStore.isLoggedIn) {
    fmStore.onSongSavedToPlaylist(song);
  }
};

watch(
  () => [userStore.isLoggedIn, userStore.userInfo?.userid],
  ([loggedIn]) => {
    if (isStandaloneWindow()) return;
    if (loggedIn) {
      fmStore.ensureAccountContext();
    } else {
      fmStore.resetOnLogout();
    }
  },
  { immediate: false }
);

onMounted(() => { 
  const isStandalone = isStandaloneWindow();
  if (disclaimerAccepted && !isStandalone) userStore.verifySession(); 
  if (window.trayAPI && !isStandalone) {
    window.trayAPI.onTrayAction(handleTrayAction);
    // 仅主窗口在启动时同步一次托盘状态，恢复上次退出时的播放模式显示（歌词窗口不参与，避免覆盖播放状态）
    playerStore.syncTrayState();
  }
  if (!isStandalone) {
    updateStore.initUpdater();
    // 锁屏 / 系统媒体控件（SMTC）桥接，仅主窗口初始化，避免桌面歌词窗口产生第二个会话
    initMediaSessionBridge(playerStore);
    if (userStore.isLoggedIn) {
      fmStore.ensureAccountContext();
    }
    window.addEventListener('song-context-menu:song-added', handleFmPositiveAssetEvent);
    window.addEventListener('user:song-liked', handleFmPositiveAssetEvent);
  }
});

onUnmounted(() => {
  disposeMediaSessionBridge();
  window.removeEventListener('song-context-menu:song-added', handleFmPositiveAssetEvent);
  window.removeEventListener('user:song-liked', handleFmPositiveAssetEvent);
  if (window.trayAPI) {
    try { window.trayAPI.onTrayAction(() => {}); } catch(e) {}
  }
});
</script>

<style>
.fade-tooltip-enter-active, .fade-tooltip-leave-active { transition: opacity 0.2s ease; }
.fade-tooltip-enter-from, .fade-tooltip-leave-to { opacity: 0; }
</style>
