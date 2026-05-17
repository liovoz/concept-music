<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative">
    <div class="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col items-center justify-center min-w-0">
      <div class="relative flex flex-col items-center text-center">
        <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100">
          <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">我喜欢的音乐</h2>
        <p class="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">安全登录后，即可收藏您喜爱的音乐，随时随地重温心动旋律。</p>
        <button @click="userStore.openLoginModal()" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag flex items-center">
          立即安全登录
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
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
