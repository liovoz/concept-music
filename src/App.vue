// ====================
// 文件：src/App.vue
// ====================
<template>
  <div v-if="$route.path === '/desktop-lyric'" class="w-screen h-screen bg-transparent overflow-hidden">
    <router-view></router-view>
  </div>

  <div v-else class="flex h-screen w-full flex-col bg-white overflow-hidden text-gray-800 font-sans relative">
    <Header />

    <div class="flex flex-1 overflow-hidden relative">
      <Sidebar />
      <main class="flex-1 bg-white relative min-w-0 overflow-hidden">
        <router-view v-slot="{ Component }">
          <keep-alive include="PersonalFM">
            <component :is="Component" :key="$route.fullPath" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <PlayerBar />

    <LoginModal />
    <GlobalToast />
    <GlobalDialog />
    <UpdateModal ref="updateModalRef" />

    <transition name="fade-tooltip">
      <div 
        v-if="tooltipState.visible"
        :style="{ left: tooltipState.x + 'px', top: tooltipState.y + 'px' }"
        class="fixed z-[99999] max-w-md px-4 py-2.5 bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pointer-events-none font-medium"
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
import GlobalDialog from './components/GlobalDialog.vue';
import UpdateModal from './components/UpdateModal.vue';
import { useUserStore } from './store/userStore';
import { usePlayerStore } from './store/playerStore';
import { tooltipState } from './utils/tooltip';

const userStore = useUserStore();
const playerStore = usePlayerStore();
const updateModalRef = ref(null);

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
  userStore.verifySession(); 
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