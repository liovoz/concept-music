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
        <router-view :key="$route.fullPath"></router-view>
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
import { onMounted, ref, provide } from 'vue';
import Header from './layout/Header.vue';
import Sidebar from './layout/Sidebar.vue';
import PlayerBar from './layout/PlayerBar.vue';
import LoginModal from './components/LoginModal.vue';
import GlobalToast from './components/GlobalToast.vue'; 
import GlobalDialog from './components/GlobalDialog.vue';
import UpdateModal from './components/UpdateModal.vue';
import { useUserStore } from './store/userStore';
import { tooltipState } from './utils/tooltip';

const userStore = useUserStore();
const updateModalRef = ref(null);

provide('updateModalRef', updateModalRef);

onMounted(() => { 
  userStore.verifySession(); 
});
</script>

<style>
.fade-tooltip-enter-active, .fade-tooltip-leave-active { transition: opacity 0.2s ease; }
.fade-tooltip-enter-from, .fade-tooltip-leave-to { opacity: 0; }
</style>