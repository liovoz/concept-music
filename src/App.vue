// ====================
// 文件：src/App.vue
// ====================
<template>
  <div v-if="$route.path === '/desktop-lyric'" class="w-screen h-screen bg-transparent overflow-hidden">
    <router-view></router-view>
  </div>

  <div v-else class="flex h-screen w-full flex-col bg-white dark:bg-slate-950 overflow-hidden text-gray-800 dark:text-slate-100 font-sans relative transition-colors duration-200">
    <Header />

    <div class="flex flex-1 overflow-hidden relative">
      <Sidebar />
      <main class="flex-1 bg-white dark:bg-slate-950 relative min-w-0 overflow-hidden transition-colors duration-200">
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
    <DisclaimerModal ref="disclaimerModalRef" @accepted="onDisclaimerAccepted" />
    <SettingsModal ref="settingsModalRef" />

    <transition name="fade-tooltip">
      <div 
        v-if="tooltipState.visible"
        :style="{ left: tooltipState.x + 'px', top: tooltipState.y + 'px', maxHeight: tooltipState.maxHeight + 'px' }"
        class="fixed z-[99998] w-max max-w-xs sm:max-w-sm overflow-y-auto overscroll-contain px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-100 dark:border-slate-700 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] text-xs text-gray-700 dark:text-slate-200 leading-normal whitespace-normal break-words pointer-events-none font-medium custom-scrollbar"
        :class="tooltipState.isBottom ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'"
      >
        {{ tooltipState.text }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, provide, watch } from 'vue';
import Header from './layout/Header.vue';
import Sidebar from './layout/Sidebar.vue';
import PlayerBar from './layout/PlayerBar.vue';
import LoginModal from './components/LoginModal.vue';
import GlobalToast from './components/GlobalToast.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const cachedComponents = new Set(['PersonalFM', 'PlaylistCategory']);
const isCached = (Component) => cachedComponents.has(Component?.name); 
const getRouteComponentKey = (Component) => {
  if (typeof route.meta?.stableComponentKey === 'string') return route.meta.stableComponentKey;
  return isCached(Component) ? Component.name : route.fullPath;
};

watch(() => route.path, () => {
  hideTooltip();
});
import GlobalDialog from './components/GlobalDialog.vue';
import SongContextMenu from './components/SongContextMenu.vue';
import SettingsModal from './components/SettingsModal.vue';
import DisclaimerModal from './components/DisclaimerModal.vue';
import { useUserStore } from './store/userStore';
import { usePlayerStore } from './store/playerStore';
import { hideTooltip, tooltipState } from './utils/tooltip';

const userStore = useUserStore();
const playerStore = usePlayerStore();
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

onMounted(() => { 
  if (disclaimerAccepted) userStore.verifySession(); 
  if (window.trayAPI) {
    window.trayAPI.onTrayAction(handleTrayAction);
    // 仅主窗口在启动时同步一次托盘状态，恢复上次退出时的播放模式显示（歌词窗口不参与，避免覆盖播放状态）
    if (route.path !== '/desktop-lyric') {
      playerStore.syncTrayState();
    }
  }
});

onUnmounted(() => {
  if (window.trayAPI) {
    try { window.trayAPI.onTrayAction(() => {}); } catch(e) {}
  }
});
</script>

<style>
.fade-tooltip-enter-active, .fade-tooltip-leave-active { transition: opacity 0.2s ease; }
.fade-tooltip-enter-from, .fade-tooltip-leave-to { opacity: 0; }
</style>
