// ====================
// 文件：src/components/GlobalToast.vue
// ====================
<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div
        v-if="store.toastMessage"
        :key="store.toastState?.id || store.toastMessage"
        class="global-toast-container fixed bottom-28 left-1/2 transform -translate-x-1/2 backdrop-blur-xl border px-5 py-2.5 rounded-full text-xs font-bold z-[100010] flex items-center justify-center tracking-wide max-w-[86vw] sm:max-w-lg select-none no-drag transition-colors"
        :class="[
          toastThemeClasses,
          hasAction ? 'pointer-events-auto pr-2.5' : 'pointer-events-none'
        ]"
      >
        <AppIcon :name="toastIconName" class="w-4 h-4 mr-2 flex-shrink-0" :class="toastIconColorClass" />
        <span class="line-clamp-2 break-words">{{ store.toastMessage }}</span>
        <button
          v-if="hasAction"
          type="button"
          @click.stop="store.triggerToastAction()"
          class="ml-3 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all active:scale-95 cursor-pointer flex-shrink-0"
          :class="toastActionBtnClasses"
        >
          {{ store.toastState.actionText }}
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { usePlayerStore } from '../store/playerStore';

const store = usePlayerStore();

const toastType = computed(() => store.toastState?.type || 'info');
const hasAction = computed(() => Boolean(store.toastState?.actionText));

const toastIconName = computed(() => {
  if (toastType.value === 'success') return 'check';
  if (toastType.value === 'warning') return 'warning';
  if (toastType.value === 'error') return 'danger';
  return 'info';
});

const toastIconColorClass = computed(() => {
  if (toastType.value === 'success') return 'text-emerald-500 dark:text-emerald-400';
  if (toastType.value === 'warning') return 'text-amber-500 dark:text-amber-400';
  if (toastType.value === 'error') return 'text-red-500 dark:text-red-400';
  return 'text-blue-500 dark:text-blue-400';
});

const toastThemeClasses = computed(() => {
  if (toastType.value === 'success') {
    return 'bg-white/95 dark:bg-slate-900/95 border-emerald-200/90 dark:border-emerald-800/70 text-gray-800 dark:text-slate-100 shadow-[0_12px_40px_rgba(16,185,129,0.16)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.6)]';
  }
  if (toastType.value === 'warning') {
    return 'bg-white/95 dark:bg-slate-900/95 border-amber-200/90 dark:border-amber-800/70 text-gray-800 dark:text-slate-100 shadow-[0_12px_40px_rgba(245,158,11,0.18)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.6)]';
  }
  if (toastType.value === 'error') {
    return 'bg-white/95 dark:bg-slate-900/95 border-red-200/90 dark:border-red-800/70 text-gray-800 dark:text-slate-100 shadow-[0_12px_40px_rgba(239,68,68,0.18)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.6)]';
  }
  return 'bg-white/95 dark:bg-slate-900/95 border-blue-100 dark:border-slate-700/80 text-gray-700 dark:text-slate-100 shadow-[0_12px_40px_rgba(37,99,235,0.14)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.6)]';
});

const toastActionBtnClasses = computed(() => {
  if (toastType.value === 'success') {
    return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70';
  }
  if (toastType.value === 'warning') {
    return 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70';
  }
  if (toastType.value === 'error') {
    return 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/70 dark:hover:bg-red-900/80 dark:text-red-300 border border-red-200/80 dark:border-red-800/70';
  }
  return 'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70';
});
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px) scale(0.95);
}
</style>
