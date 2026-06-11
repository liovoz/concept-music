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
            <component :is="Component" :key="isCached(Component) ? Component.name : $route.fullPath" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <PlayerBar />

    <LoginModal />
    <GlobalToast />
    <GlobalDialog />
    <SongContextMenu />
    <DisclaimerModal @accepted="onDisclaimerAccepted" />
    <UpdateModal ref="updateModalRef" />

    <transition name="fade-tooltip">
      <div 
        v-if="tooltipState.visible"
        :style="{ left: tooltipState.x + 'px', top: tooltipState.y + 'px' }"
        class="fixed z-[99998] max-w-md px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] text-xs text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pointer-events-none font-medium"
        :class="tooltipState.isBottom ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'"
      >
        {{ tooltipState.text }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, provide } from 'vue';
import Header from './layout/Header.vue';
import Sidebar from './layout/Sidebar.vue';
import PlayerBar from './layout/PlayerBar.vue';
import LoginModal from './components/LoginModal.vue';
import GlobalToast from './components/GlobalToast.vue';

const cachedComponents = new Set(['PersonalFM', 'PlaylistCategory']);
const isCached = (Component) => cachedComponents.has(Component?.name); 
import GlobalDialog from './components/GlobalDialog.vue';
import SongContextMenu from './components/SongContextMenu.vue';
import UpdateModal from './components/UpdateModal.vue';
import DisclaimerModal from './components/DisclaimerModal.vue';
import { useUserStore } from './store/userStore';
import { usePlayerStore } from './store/playerStore';
import { tooltipState } from './utils/tooltip';

const userStore = useUserStore();
const playerStore = usePlayerStore();
const updateModalRef = ref(null);

const disclaimerAccepted = localStorage.getItem('kg_desktop_disclaimer_accepted') === 'true';

const onDisclaimerAccepted = () => {
  userStore.verifySession();
};

provide('updateModalRef', updateModalRef);

const handleTrayAction = (action) => {
  switch (action) {
    case 'toggle-play': playerStore.togglePlay(); break;
    case 'prev': playerStore.playPrev(); break;
    case 'next': playerStore.playNext(); break;
    case 'toggle-mute': playerStore.toggleMute(); break;
    case 'toggle-lyric': playerStore.toggleDesktopLyric(); break;
    case 'set-mode-sequence': playerStore.playMode = 'sequence'; playerStore.syncTrayState(); break;
    case 'set-mode-loop': playerStore.playMode = 'loop'; playerStore.syncTrayState(); break;
    case 'set-mode-random': playerStore.playMode = 'random'; playerStore.syncTrayState(); break;
    case 'show-about':
      if (updateModalRef.value) updateModalRef.value.showModal();
      break;
    case 'check-update':
      if (updateModalRef.value) {
        updateModalRef.value.showModal();
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
