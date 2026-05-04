// ====================
// 文件：src/components/BackToTop.vue
// ====================
<template>
  <Teleport to="body">
    <Transition name="fade-up">
      <button 
        v-if="isVisible" 
        @click="scrollToTop"
        class="fixed right-10 bottom-28 h-12 bg-white/95 backdrop-blur-md border border-gray-100 rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.15)] flex items-center justify-center text-blue-500 hover:text-blue-600 hover:bg-white hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)] transition-all duration-300 active:scale-95 z-[9999] no-drag group overflow-hidden px-3.5"
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  targetId: {
    type: String,
    required: true
  },
  threshold: {
    type: Number,
    default: 400
  }
});

const isVisible = ref(false);
let scrollContainer = null;

const handleScroll = (e) => {
  if (e && e.target) {
    isVisible.value = e.target.scrollTop > props.threshold;
  }
};

const scrollToTop = () => {
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

onMounted(() => {
  nextTick(() => {
    scrollContainer = document.getElementById(props.targetId);
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // 主动检测一次初始状态，防止页面重载时已经处于滚动状态
      handleScroll({ target: scrollContainer });
    }
  });
});

onUnmounted(() => {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
  }
});
</script>

<style scoped>
.fade-up-enter-active, .fade-up-leave-active { 
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
}
.fade-up-enter-from, .fade-up-leave-to { 
  opacity: 0; 
  transform: translateY(20px) scale(0.8); 
}
</style>