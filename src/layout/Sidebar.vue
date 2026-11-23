// ====================
// 文件：src/layout/Sidebar.vue
// ====================
<template>
  <aside class="w-56 bg-gray-50 dark:bg-[#0f0f10] border-r border-gray-100 dark:border-white/[0.08] flex flex-col pt-4 pb-5 z-20 h-full relative transition-colors duration-200">
    
    <div class="px-4 mb-2 overflow-visible">
      <div 
        @click="handleUserCardClick"
        v-squircle="'lg'"
        class="relative flex items-center p-2.5 rounded-xl transition-colors duration-150 no-drag group cursor-pointer active:scale-[0.98]"
        :class="userStore.isLoggedIn 
          ? 'bg-white dark:bg-[#19191b] shadow-xs dark:shadow-none border border-gray-200 dark:border-white/[0.08] hover:border-blue-400/60 dark:hover:border-white/[0.16] hover:shadow-md dark:hover:bg-[#232325]' 
          : 'hover:bg-gray-200 dark:hover:bg-[#19191b] border border-transparent'"
        v-tooltip="userStore.isLoggedIn ? '点击查看账号与资产详情' : '点击登录酷狗账号'"
      >
        <!-- 头像 -->
        <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#232325] border border-gray-200/80 dark:border-white/[0.08] shadow-2xs dark:shadow-none">
          <img v-if="userStore.isLoggedIn && userStore.userInfo" :src="userStore.userInfo.avatar" :alt="userStore.userInfo.nickname || '用户头像'" class="w-full h-full object-cover" />
          <AppIcon v-else name="artists" class="w-full h-full text-gray-400 dark:text-[#85858b] p-1.5" />
        </div>
        
        <!-- 用户身份与特权信息 -->
        <div class="ml-3 flex-1 min-w-0 pr-1">
          <div v-if="userStore.isLoggedIn" class="type-body-md text-gray-800 dark:text-[#ededed] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {{ userStore.userInfo.nickname }}
          </div>
          <div v-else class="type-body-md text-gray-600 dark:text-[#a1a1a6] group-hover:text-blue-600 dark:group-hover:text-[#ededed] transition-colors truncate">
            点击登录
          </div>
          
          <div v-if="userStore.isLoggedIn" class="type-meta-base text-gray-500 dark:text-[#b4b4ba] mt-0.5 flex items-center min-w-0">
            <span 
              v-squircle="'xs'"
              class="rounded song-badge shrink-0 mr-1 shadow-2xs dark:shadow-none"
              :class="userStore.userInfo.vip > 0 ? 'bg-orange-100 text-orange-600 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-gray-100 text-gray-400 dark:bg-[#232325] dark:text-[#85858b]'"
            >
              VIP
            </span>
            <span class="truncate">{{ userStore.userInfo.vip > 0 ? userStore.vipLevelName : '普通用户' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="userStore.isLoggedIn" class="px-4 mb-6 transition-all flex flex-col space-y-2">
      <!-- 1天VIP特权：已领入账状态 -->
      <div 
        v-if="userStore.dayVipState.claimed" 
        v-squircle="'sm'" 
        class="w-full py-1.5 px-2 rounded-lg bg-emerald-500/[0.07] dark:bg-[#19191b] border border-emerald-500/20 dark:border-white/[0.08] text-emerald-700 dark:text-[#4cc38a] type-meta-base font-medium flex items-center justify-center gap-1.5 transition-colors select-none"
      >
        <AppIcon name="check" class="w-3.5 h-3.5 text-emerald-600 dark:text-[#4cc38a] shrink-0" />
        <span>今日 1天VIP 已入账</span>
        <div class="cursor-help pointer-events-auto flex items-center opacity-60 hover:opacity-100 transition-opacity ml-0.5" v-tooltip="'每日 0 点刷新领取次数'">
          <AppIcon name="info" class="w-3 h-3 text-emerald-600 dark:text-[#4cc38a]" />
        </div>
      </div>
      <!-- 1天VIP特权：可领取状态 -->
      <button 
        v-else 
        @click="handleClaimOneDayVip" 
        :disabled="userStore.isDayVipProcessing" 
        v-squircle="'sm'" 
        class="w-full py-1.5 rounded-lg border border-purple-300/60 dark:border-purple-500/35 bg-gradient-to-r from-purple-50 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/30 text-purple-700 dark:text-purple-300 type-meta-base font-medium flex items-center justify-center transition-all hover:from-purple-100 hover:to-purple-200/70 dark:hover:from-purple-900/50 dark:hover:to-purple-800/40 hover:border-purple-400/80 hover:shadow-xs active:scale-[0.98] disabled:opacity-50"
      >
        <AppIcon v-if="userStore.isDayVipProcessing" name="spinner" spin class="h-3 w-3 mr-1.5" />
        <span v-else class="mr-1.5 type-meta-base">👑</span>
        免费领 1 天畅听 VIP
      </button>

      <!-- 3小时VIP特权：已达今日上限 (8/8) -->
      <div 
        v-if="userStore.vipState.count >= 8" 
        v-squircle="'sm'" 
        class="w-full py-1.5 px-2 rounded-lg bg-emerald-500/[0.07] dark:bg-[#19191b] border border-emerald-500/20 dark:border-white/[0.08] text-emerald-700 dark:text-[#4cc38a] type-meta-base font-medium flex items-center justify-center gap-1.5 transition-colors select-none"
      >
        <AppIcon name="check" class="w-3.5 h-3.5 text-emerald-600 dark:text-[#4cc38a] shrink-0" />
        <span>今日 3小时特权 已拉满</span>
      </div>
      <!-- 3小时VIP特权：冷却计时状态 -->
      <div 
        v-else-if="cooldownRemaining > 0 && !userStore.isVipProcessing" 
        v-squircle="'sm'" 
        class="w-full py-1.5 px-2 rounded-lg bg-slate-100/70 dark:bg-[#19191b] border border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-[#a1a1a6] type-meta-base font-medium flex items-center justify-center gap-1.5 transition-colors select-none"
      >
        <AppIcon name="clock" class="w-3 h-3 text-amber-500/90 dark:text-amber-400 shrink-0" />
        <span class="type-numeric-sm font-medium text-slate-700 dark:text-[#ededed] px-1 py-0.5 rounded bg-slate-200/50 dark:bg-[#232325]">{{ formattedCooldown }}</span>
        <span>后可领</span>
        <span class="type-meta-micro text-slate-400 dark:text-[#85858b]">({{ userStore.vipState.count }}/8)</span>
      </div>
      <!-- 3小时VIP特权：可领取状态 -->
      <button 
        v-else 
        @click="handleClaimDailyVip" 
        :disabled="userStore.isVipProcessing" 
        v-squircle="'sm'" 
        class="w-full py-1.5 rounded-lg border border-orange-300/60 dark:border-orange-500/35 bg-gradient-to-r from-orange-50 to-amber-100/60 dark:from-orange-950/40 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 type-meta-base font-medium flex items-center justify-center transition-all hover:from-orange-100 hover:to-amber-200/70 dark:hover:from-orange-900/50 dark:hover:to-amber-800/40 hover:border-orange-400/80 hover:shadow-xs active:scale-[0.98] disabled:opacity-50"
      >
        <AppIcon v-if="userStore.isVipProcessing" name="spinner" spin class="h-3 w-3 mr-1.5" />
        <span v-else class="mr-1.5 type-meta-base">🎁</span>
        {{ claimBtnText }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
      <nav class="flex flex-col space-y-1 px-3">
        <div class="px-3 py-1.5 type-meta-base font-medium text-gray-500 dark:text-[#98989f] rounded cursor-default">在线音乐</div>
        <div @click="$router.push('/')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/' ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="home" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />首页</div>
        <div @click="$router.push('/rank')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/rank' || $route.path.startsWith('/rank/') ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="rank" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/rank' || $route.path.startsWith('/rank/') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />排行榜</div>
        <div @click="$router.push('/new-songs')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/new-songs' ? 'font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="new-songs" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/new-songs' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />新歌速递</div>
        <div @click="$router.push('/fm')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/fm' ? 'font-semibold bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="personal-fm" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/fm' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />私人FM</div>
        <div @click="$router.push('/artists')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/artists' ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="artists" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/artists' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />歌手</div>
        <div @click="$router.push('/playlist-category')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/playlist-category' ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="playlist-category" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/playlist-category' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />歌单广场</div>
        <div class="px-3 pt-3 pb-1.5 type-meta-base font-medium text-gray-500 dark:text-[#98989f] rounded cursor-default">我的音乐</div>
        <div @click="$router.push('/history')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/history' ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="history" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/history' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />听歌足迹</div>
        <div @click="goToLikedMusic" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="isLikedMusicActive ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="heart" class="w-4 h-4 mr-3 transition-colors" :class="isLikedMusicActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />我喜欢的音乐</div>
        <div @click="$router.push('/my-playlists')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group" :class="$route.path === '/my-playlists' ? 'font-semibold bg-blue-100 text-blue-600 dark:bg-[#232325] dark:text-blue-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"><AppIcon name="my-playlists" class="w-4 h-4 mr-3 transition-colors" :class="$route.path === '/my-playlists' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'" />私人歌单</div>
        <div
          @click="$router.push('/import/netease')"
          v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group"
          :class="$route.path.startsWith('/import/netease') ? 'font-semibold bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"
        >
          <AppIcon
            name="netease-cloud"
            class="w-4 h-4 mr-3 flex-shrink-0 transition-colors"
            :class="$route.path.startsWith('/import/netease') ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'"
          />
          网易歌单
        </div>
        <div
          @click="$router.push('/import/qq')"
          v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center transition-colors group"
          :class="$route.path.startsWith('/import/qq') ? 'font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b]'"
        >
          <AppIcon
            name="qq-music"
            class="w-4 h-4 mr-3 flex-shrink-0 transition-colors"
            :class="$route.path.startsWith('/import/qq') ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-[#85858b] group-hover:text-gray-500 dark:group-hover:text-[#ededed]'"
          />
          企鹅歌单
        </div>
      </nav>
    </div>

    <nav class="flex flex-col space-y-1 px-3 mt-4 border-t border-gray-100 dark:border-white/[0.08] pt-3">
      <div class="px-3 py-1.5 type-meta-base font-medium text-gray-500 dark:text-[#98989f] rounded cursor-default">系统</div>
      <div @click="openSettings('account')" v-squircle="'md'" class="px-3 py-1.5 type-body-base rounded-lg cursor-pointer no-drag flex items-center justify-between transition-colors text-gray-600 dark:text-[#b4b4ba] hover:bg-gray-200 dark:hover:bg-[#19191b] group relative">
        <div class="flex items-center">
          <AppIcon name="settings" class="w-4 h-4 mr-3 text-gray-400 dark:text-[#85858b] group-hover:text-blue-500 dark:group-hover:text-[#ededed] transition-colors" />
          <span>设置</span>
        </div>
        <span
          v-if="updateStore.hasBadge"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-[#232325] border border-red-200/60 dark:border-white/[0.08] type-meta-micro text-red-500 dark:text-[#e5484d]"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-[#e5484d]"></span>
          <span>新版</span>
        </span>
      </div>
    </nav>



    <Teleport to="body">
      <transition name="fade-scale">
        <div v-if="userStore.showVipUpgradeModal" ref="vipUpgradeModalRef" tabindex="-1" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm no-drag outline-none" @click.self="userStore.closeVipUpgradeModal()" @keydown.escape="userStore.closeVipUpgradeModal()">
          <div v-squircle="'2xl'" class="bg-white dark:bg-[#19191b] dark:border dark:border-white/[0.08] w-[340px] rounded-2xl shadow-2xl p-6 relative flex flex-col items-center text-center">
            <div class="w-12 h-12 bg-orange-50 dark:bg-[#232325] rounded-full flex items-center justify-center mb-4">
              <AppIcon name="star-solid" class="w-6 h-6 text-orange-500 dark:text-blue-400" />
            </div>
            <h3 class="type-heading-lg text-gray-800 dark:text-[#ededed] mb-2">开通 VIP</h3>
            <p class="type-body-base text-gray-500 dark:text-[#a1a1a6] mb-5">当前歌曲为 VIP 专享，开通 VIP 即可畅听完整版及无损音质。</p>
            <div class="flex space-x-3 w-full">
              <button @click="handleVipUpgradeClaim" v-squircle="'md'" class="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl type-body-md shadow-md dark:shadow-none transition-all">
                🎁 去领取免费 VIP
              </button>
              <button @click="userStore.closeVipUpgradeModal()" v-squircle="'md'" class="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#232325] dark:hover:bg-[#2c2c2f] text-gray-600 dark:text-[#ededed] rounded-xl type-body-md transition-colors">
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
import { useUpdateStore } from '../store/updateStore';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const playerStore = usePlayerStore(); 
const updateStore = useUpdateStore();
const settingsModalRef = inject('settingsModalRef', null);

const vipUpgradeModalRef = ref(null);

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

const openSettings = (tab = 'account') => {
  if (settingsModalRef?.value) {
    const targetTab = typeof tab === 'string' ? tab : 'account';
    settingsModalRef.value.showModal(targetTab);
  }
};

const handleUserCardClick = () => {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal();
  } else {
    openSettings('account');
  }
};

onMounted(() => {
  window.addEventListener('API_GATEWAY_DOWN', handleGatewayDown);


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



const isLikedMusicActive = computed(() => {
  if (route.path === '/liked') return true;
  if (route.name !== 'PlaylistDetail') return false;

  const currentPlaylistId = String(route.params.id || '');
  const likedIds = [
    userStore.likedPlaylistGlobalId,
    userStore.likedListId
  ].filter(Boolean).map(id => String(id));

  return likedIds.includes(currentPlaylistId);
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

nav > div > svg:first-child {
  width: 17px;
  height: 17px;
  margin-right: 12px;
  flex-shrink: 0;
  overflow: visible;
}

nav > div > svg:first-child path {
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
</style>
