<template>
  <Teleport to="body">
    <Transition name="fade-up">
      <button
        v-if="isVisible && !playerStore.isLyricsVisible && !playerStore.isPlaylistVisible"
        @click="scrollToTop"
        class="fixed right-10 bottom-28 h-12 bg-white/95 dark:bg-[#19191b]/95 backdrop-blur-md border border-gray-100 dark:border-white/[0.08] rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.15)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.45)] flex items-center justify-center text-blue-500 dark:text-[#ededed] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-[#232325] hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)] dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.5)] transition-colors duration-200 active:scale-95 z-40 no-drag group overflow-hidden px-3.5"
      >
        <AppIcon name="back-to-top" class="w-5 h-5 flex-shrink-0 transform group-hover:-translate-y-0.5 transition-transform duration-300" />
        <span class="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2.5 transition-[max-width,opacity,margin] duration-300 ease-out whitespace-nowrap type-meta-base font-medium">返回顶部</span>
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
let bindRafId = null;
let isDestroyed = false;

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
  if (bindRafId) {
    cancelAnimationFrame(bindRafId);
    bindRafId = null;
  }
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
    scrollContainer = null;
  }
};

const bind = async () => {
  unbind();
  isVisible.value = false;
  await nextTick();
  if (isDestroyed) return;
  bindRafId = requestAnimationFrame(() => {
    bindRafId = null;
    if (isDestroyed) return;
    scrollContainer = findScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      updateVisibility();
    }
  });
};

onMounted(() => {
  isDestroyed = false;
  bind();
});
onUnmounted(() => {
  isDestroyed = true;
  unbind();
});
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
