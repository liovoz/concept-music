<template>
  <Teleport to="body">
    <Transition name="fade-up">
      <button
        v-if="isVisible && !playerStore.isLyricsVisible"
        @click="scrollToTop"
        class="fixed right-10 bottom-28 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-100 dark:border-slate-700 rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.15)] dark:shadow-[0_10px_34px_rgba(0,0,0,0.38)] flex items-center justify-center text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)] transition-all duration-300 active:scale-95 z-[9999] no-drag group overflow-hidden px-3.5"
      >
        <svg class="w-5 h-5 flex-shrink-0 transform group-hover:-translate-y-0.5 transition-transform duration-300" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
        <span class="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2.5 transition-all duration-300 ease-out whitespace-nowrap text-xs font-extrabold tracking-widest">返回顶部</span>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePlayerStore } from '../store/playerStore';

const props = defineProps({
  targetId: {
    type: String,
    default: ''
  },
  threshold: {
    type: Number,
    default: 240
  }
});

const isVisible = ref(false);
const route = useRoute();
const playerStore = usePlayerStore();
let scrollContainer = null;

const findScrollContainer = () => {
  if (props.targetId) {
    const target = document.getElementById(props.targetId);
    if (target) return target;
    return null;
  }

  const main = document.querySelector('main');
  const candidates = Array.from(main?.querySelectorAll('.custom-scrollbar, [data-scroll-container]') || []);
  return candidates.find(el => {
    const style = window.getComputedStyle(el);
    return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
  }) || null;
};

const updateVisibility = () => {
  isVisible.value = !!scrollContainer && scrollContainer.scrollTop > props.threshold;
};

const handleScroll = () => {
  updateVisibility();
};

const scrollToTop = () => {
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const unbind = () => {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
    scrollContainer = null;
  }
};

const bind = async () => {
  unbind();
  isVisible.value = false;
  await nextTick();
  requestAnimationFrame(() => {
    scrollContainer = findScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      updateVisibility();
    }
  });
};

onMounted(bind);
onUnmounted(unbind);
watch(() => route.fullPath, bind);
</script>

<style scoped>
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}
</style>
