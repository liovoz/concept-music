// ====================
// 文件：src/components/GlobalDialog.vue
// ====================
<template>
  <Teleport to="body">
    <transition name="dialog-fade">
      <div v-if="store.dialogState.visible" class="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/30 backdrop-blur-sm no-drag" @click.self="store.closeDialog(false)" @keydown.escape="store.closeDialog(false)">
        <div class="bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[380px] flex flex-col overflow-hidden transform transition-all">
          
          <div class="px-6 py-5 border-b border-gray-50 flex items-center">
             <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3 shadow-inner">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             </div>
             <h3 class="text-lg font-bold text-gray-800 tracking-wide">{{ store.dialogState.title }}</h3>
          </div>
          
          <div class="px-7 py-6 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-medium max-h-[60vh] overflow-y-auto custom-scrollbar break-all text-left">
            {{ store.dialogState.message }}
          </div>
          
          <div class="px-6 py-4 bg-gray-50/50 flex items-center justify-end space-x-3">
            <button @click="store.closeDialog(false)" class="px-5 py-2 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-200/80 hover:text-gray-800 transition-colors no-drag focus:outline-none">
              {{ store.dialogState.cancelText }}
            </button>
            <button @click="store.closeDialog(true)" class="px-6 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center justify-center min-w-[100px] no-drag focus:outline-none">
              {{ store.dialogState.confirmText }}
              <span v-if="store.dialogState.countdown > 0" class="ml-1 opacity-90 font-mono">({{ store.dialogState.countdown }}s后自动执行)</span>
            </button>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { usePlayerStore } from '../store/playerStore';
const store = usePlayerStore();
</script>

<style scoped>
.dialog-fade-enter-active, .dialog-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.dialog-fade-enter-from, .dialog-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>