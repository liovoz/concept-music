// ====================
// 文件：src/layout/Sidebar.vue
// ====================
<template>
  <aside class="w-56 bg-gray-50 border-r border-gray-100 flex flex-col pt-4 pb-5 z-20 h-full relative">
    
    <div class="px-4 mb-2 overflow-visible">
      <div 
        @click="!userStore.isLoggedIn ? userStore.openLoginModal() : null"
        class="relative flex items-center p-2.5 rounded-xl transition-all duration-300 no-drag group"
        :class="userStore.isLoggedIn ? 'bg-white shadow-sm border border-gray-200 cursor-default' : 'hover:bg-gray-200 cursor-pointer'"
      >
        <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
          <img v-if="userStore.isLoggedIn && userStore.userInfo" :src="userStore.userInfo.avatar" :alt="userStore.userInfo.nickname || '用户头像'" class="w-full h-full object-cover" />
          <svg v-else class="w-full h-full text-gray-400 p-1.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
        </div>
        
        <div class="ml-3 flex-1 min-w-0 pr-6">
          <div v-if="userStore.isLoggedIn" class="text-sm font-bold text-gray-800 truncate" v-tooltip="userStore.userInfo.nickname">{{ userStore.userInfo.nickname }}</div>
          <div v-else class="text-sm font-bold text-gray-600 group-hover:text-blue-600 transition-colors truncate">点击登录</div>
          
          <div v-if="userStore.isLoggedIn" class="text-[10px] text-gray-400 mt-0.5 flex items-center">
            <span 
              @mouseenter="showVipCard"
              @mouseleave="hideVipCard"
              class="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider mr-1 transition-all cursor-pointer shadow-sm relative z-10"
              :class="userStore.userInfo.vip > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400 opacity-60'"
            >
              VIP
            </span>
            <span class="truncate">{{ userStore.userInfo.vip > 0 ? '尊贵会员' : '普通用户' }}</span>
          </div>
        </div>

        <button v-if="userStore.isLoggedIn" @click.stop="showLogoutConfirm = true" class="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" v-tooltip="'退出登录'"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>

        <transition name="pop-down">
          <div 
            v-if="isVipCardVisible && userStore.isLoggedIn" 
            class="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl p-4 z-[100] origin-top pointer-events-none"
          >
            <div class="flex flex-col space-y-2 relative z-10">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black text-orange-600 uppercase tracking-tighter">Asset Detail</span>
                <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              </div>
              <div class="h-px w-full bg-gray-100"></div>
              <div class="text-[11px] font-bold text-gray-800 flex items-center">
                <svg class="w-3 h-3 mr-1.5 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {{ userStore.vipLevelName }}
              </div>
              <div class="text-[10px] text-gray-500 font-medium bg-gray-50 rounded-lg p-2 leading-relaxed">
                到期时间：<br/>
                <span class="text-gray-900 font-mono font-bold break-all">{{ userStore.vipExpirationTime || '永久或同步中...' }}</span>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div v-if="userStore.isLoggedIn" class="px-4 mb-6 transition-all flex flex-col space-y-2">
      <div v-if="userStore.dayVipState.claimed" class="w-full py-1.5 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-bold flex items-center justify-center border border-gray-100 shadow-inner cursor-not-allowed">
        ✅ 今日 1天VIP 已入账
        <div class="ml-1 cursor-help pointer-events-auto" v-tooltip="'每日 0 点刷新领取次数'">
          <svg class="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>
      <button v-else @click="handleClaimOneDayVip" :disabled="userStore.isDayVipProcessing" class="w-full py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 text-[10px] font-bold flex items-center justify-center transition-all hover:bg-purple-100 hover:shadow-sm disabled:opacity-50">
        <svg v-if="userStore.isDayVipProcessing" class="animate-spin h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span v-else class="mr-1.5">👑</span>
        免费领 1 天畅听 VIP
      </button>

      <div v-if="userStore.vipState.count >= 8" class="w-full py-1.5 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold flex items-center justify-center border border-green-100 shadow-inner">
        ✅ 今日 3小时特权 已拉满
      </div>
      <div v-else-if="cooldownRemaining > 0 && !userStore.isVipProcessing" class="w-full py-1.5 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-bold flex items-center justify-center border border-gray-100 font-mono">
        ⏳ {{ formattedCooldown }} 后可领 ({{ userStore.vipState.count }}/8)
      </div>
      <button v-else @click="handleClaimDailyVip" :disabled="userStore.isVipProcessing" class="w-full py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 text-[10px] font-bold flex items-center justify-center transition-all hover:bg-orange-100 hover:shadow-sm disabled:opacity-50">
        <svg v-if="userStore.isVipProcessing" class="animate-spin h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span v-else class="mr-1.5">🎁</span>
        {{ claimBtnText }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
      <nav class="flex flex-col space-y-1 px-3">
        <div class="px-3 py-2 text-xs text-gray-400 rounded cursor-default uppercase font-semibold">在线音乐</div>
        <div @click="$router.push('/')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/' ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>首页</div>
        <div @click="$router.push('/rank')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/rank' || $route.path.startsWith('/rank/') ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/rank' || $route.path.startsWith('/rank/') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>排行榜</div>
        <div @click="$router.push('/new-songs')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/new-songs' ? 'font-medium bg-emerald-100 text-emerald-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/new-songs' ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>新歌速递</div>
        <div @click="$router.push('/fm')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/fm' ? 'font-medium bg-purple-100 text-purple-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/fm' ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>私人FM</div>
        <div @click="$router.push('/artists')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/artists' ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/artists' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>歌手</div>
        <div @click="$router.push('/playlist-category')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/playlist-category' ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/playlist-category' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>歌单广场</div>

        <div class="px-3 pt-4 pb-2 text-xs text-gray-400 rounded cursor-default uppercase font-semibold">我的音乐</div>
        <div @click="$router.push('/history')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/history' ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/history' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>听歌足迹</div>
        <div @click="goToLikedMusic" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="isLikedMusicActive ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="isLikedMusicActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>我喜欢的音乐</div>
        <div @click="$router.push('/my-playlists')" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/my-playlists' ? 'font-medium bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'"><svg class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/my-playlists' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>私人歌单</div>
      </nav>
    </div>

    <nav class="flex flex-col space-y-1 px-3 mt-4 border-t border-gray-100 pt-3">
      <div class="px-3 py-2 text-xs text-gray-400 rounded cursor-default uppercase font-semibold">系统</div>
      <div @click="checkForUpdates" class="px-3 py-2 text-sm rounded cursor-pointer no-drag flex items-center transition-colors text-gray-600 hover:bg-gray-200 group">
        <svg class="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        关于
      </div>
    </nav>

    <Teleport to="body">
      <transition name="fade-scale">
        <div v-if="showLogoutConfirm" ref="logoutModalRef" tabindex="-1" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm no-drag outline-none" @keydown.escape="showLogoutConfirm = false" @click.self="showLogoutConfirm = false">
          <div class="bg-white w-[320px] rounded-2xl shadow-2xl p-6 relative flex flex-col items-center text-center">
            <div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4"><svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">退出登录</h3>
            <p class="text-sm text-gray-500 mb-6">确定要退出当前账号吗？</p>
            <div class="flex space-x-3 w-full">
              <button @click="showLogoutConfirm = false" class="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">取消</button>
              <button @click="executeLogout" class="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-md">确认退出</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <transition name="fade-scale">
        <div v-if="userStore.showVipUpgradeModal" ref="vipUpgradeModalRef" tabindex="-1" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm no-drag outline-none" @click.self="userStore.closeVipUpgradeModal()" @keydown.escape="userStore.closeVipUpgradeModal()">
          <div class="bg-white w-[340px] rounded-2xl shadow-2xl p-6 relative flex flex-col items-center text-center">
            <div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">开通 VIP</h3>
            <p class="text-sm text-gray-500 mb-5">当前歌曲为 VIP 专享，开通 VIP 即可畅听完整版及无损音质。</p>
            <div class="flex flex-col space-y-2 w-full">
              <button @click="handleVipUpgradeClaim" class="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-bold shadow-md transition-all">
                🎁 去领取免费 VIP
              </button>
              <button @click="userStore.closeVipUpgradeModal()" class="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all">
                稍后再说
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore'; 

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const playerStore = usePlayerStore(); 
const updateModalRef = inject('updateModalRef', null);

const showLogoutConfirm = ref(false);
const isVipCardVisible = ref(false);
const logoutModalRef = ref(null);
const vipUpgradeModalRef = ref(null);
let showTimer = null;
let hideTimer = null;

const showVipCard = () => {
  clearTimeout(hideTimer);
  if (!isVipCardVisible.value) {
    showTimer = setTimeout(() => {
      isVipCardVisible.value = true;
    }, 80);
  }
};
const hideVipCard = () => {
  clearTimeout(showTimer);
  hideTimer = setTimeout(() => {
    isVipCardVisible.value = false;
  }, 120);
};

const now = ref(Date.now());
let timer = null;

const claimBtnText = computed(() => {
  if (userStore.isVipProcessing) return '正在同步资产...';
  if (userStore.vipState.count === 0) {
    return '免费领 3 小时 VIP';
  }
  return `领 3 小时 VIP (${userStore.vipState.count}/8)`;
});

const handleGatewayDown = (e) => {
   const msg = e.detail?.message || '网络或网关连接异常';
   playerStore.showToast(`⚠️ ${msg}`);
};

const checkForUpdates = () => {
  if (updateModalRef.value) {
    updateModalRef.value.showModal();
  }
};

onMounted(() => {
  window.addEventListener('API_GATEWAY_DOWN', handleGatewayDown);

  watch(showLogoutConfirm, (v) => { if (v) nextTick(() => { logoutModalRef.value?.focus(); }); });
  watch(() => userStore.showVipUpgradeModal, (v) => { if (v) nextTick(() => { vipUpgradeModalRef.value?.focus(); }); });

  timer = setInterval(() => {
    now.value = Date.now();
    if (userStore.isLoggedIn) {
      const today = new Date().toLocaleDateString('zh-CN');
      if (today !== userStore.vipState.date) {
         userStore.checkVipReset(); 
         userStore.checkDayVipReset();
      }
      userStore.checkVipExpiration();
    }
  }, 1000);
});

onUnmounted(() => { 
  if (timer) clearInterval(timer); 
  if (showTimer) clearTimeout(showTimer);
  if (hideTimer) clearTimeout(hideTimer);
  window.removeEventListener('API_GATEWAY_DOWN', handleGatewayDown);
});

const COOLDOWN_MS = 60 * 60 * 1000;
const cooldownRemaining = computed(() => {
  if (userStore.vipState.count >= 8) return 0;
  const remain = COOLDOWN_MS - (now.value - userStore.vipState.lastTime);
  return remain > 0 ? remain : 0;
});

const formattedCooldown = computed(() => {
  const totalSecs = Math.ceil(cooldownRemaining.value / 1000);
  return `${Math.floor(totalSecs / 60).toString().padStart(2, '0')}:${(totalSecs % 60).toString().padStart(2, '0')}`;
});

const handleClaimOneDayVip = async () => {
  const res = await userStore.claimOneDayVip();
  playerStore.showToast(res.msg);
};

const handleClaimDailyVip = async () => {
  const res = await userStore.claimDailyVip();
  playerStore.showToast(res.msg);
};

const handleVipUpgradeClaim = async () => {
  userStore.closeVipUpgradeModal();
  if (!userStore.dayVipState.claimed) {
    const res = await userStore.claimOneDayVip();
    playerStore.showToast(res.msg);
    if (res.success) {
      return;
    }
    playerStore.showToast('1天VIP领取失败，请稍后重试');
    return;
  }
  if (userStore.vipState.count < 8 && cooldownRemaining.value <= 0) {
    const res = await userStore.claimDailyVip();
    playerStore.showToast(res.msg);
  } else {
    playerStore.showToast('VIP 领取冷却中，请稍后再试');
  }
};

const executeLogout = () => {
  userStore.logout();
  showLogoutConfirm.value = false;
  router.push('/');
};

const isLikedMusicActive = computed(() => {
  return route.path === '/liked';
});

const goToLikedMusic = () => {
  router.push('/liked');
};
</script>

<style scoped>
.pop-down-enter-active, .pop-down-leave-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-down-enter-from, .pop-down-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-5px);
}
.custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
.custom-scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.3); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.6); }
</style>
