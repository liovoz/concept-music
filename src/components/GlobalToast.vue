// ====================
// 文件：src/components/GlobalToast.vue
// ====================
<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div v-if="store.toastMessage" class="fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-xl border border-blue-100 text-gray-700 px-6 py-3 rounded-full shadow-[0_12px_40px_rgba(37,99,235,0.12)] text-xs font-bold z-[9999] pointer-events-none flex items-center justify-center tracking-wide max-w-[80vw] sm:max-w-md">
        <svg class="w-4 h-4 mr-2.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="line-clamp-2 break-words">{{ store.toastMessage }}</span>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { usePlayerStore } from '../store/playerStore';
const store = usePlayerStore();
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.95);
}
</style>