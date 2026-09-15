<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative">
    <div class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-950 -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <div class="flex-1 flex flex-col items-center justify-center relative">
        <div class="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-0 rounded-3xl border border-transparent dark:border-slate-800/60"></div>
        <div class="relative z-10 flex flex-col items-center text-center">
          <div class="w-24 h-24 bg-blue-50 dark:bg-blue-950/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100 dark:border-blue-900/40 transition-colors">
            <AppIcon name="heart" class="w-10 h-10 text-blue-500 dark:text-blue-400" />
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 dark:text-slate-100 mb-3 tracking-tight">我喜欢的音乐</h2>
          <p class="text-sm text-gray-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">安全登录后，即可收藏您喜爱的音乐，随时随地重温心动旋律。</p>
          <button @click="userStore.openLoginModal()" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] dark:shadow-none dark:hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all transform active:scale-95 no-drag flex items-center">
            立即安全登录
            <AppIcon name="chevron-right" class="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';

const userStore = useUserStore();
const router = useRouter();

const navigateToLikedPlaylist = () => {
  if (userStore.likedPlaylistGlobalId) {
    router.replace(`/playlist/${userStore.likedPlaylistGlobalId}`);
  } else {
    userStore.fetchLikedPlaylistMeta().then(() => {
      if (userStore.likedPlaylistGlobalId) {
        router.replace(`/playlist/${userStore.likedPlaylistGlobalId}`);
      }
    });
  }
};

watch(() => userStore.isLoggedIn, (val) => {
  if (val) navigateToLikedPlaylist();
});

onMounted(() => {
  if (userStore.isLoggedIn) navigateToLikedPlaylist();
});
</script>
