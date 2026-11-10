<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div 
        v-if="isVisible" 
        ref="modalRef"
        tabindex="-1"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/50 dark:bg-black/70 backdrop-blur-md no-drag p-4 outline-none select-none"
        @keydown.esc="handleReject"
      >
        <!-- 外层 Wrapper：严格限制视口最大高度与宽度，提供柔和阴影，具备确定的弹性高度与边界 -->
        <div class="w-[510px] max-w-[92vw] h-[84vh] max-h-[660px] min-h-[460px] rounded-[24px] shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.75)] relative flex flex-col">
          <!-- 内层 Squircle 矢量剪裁容器：100% 填满外层弹性空间 -->
          <div 
            v-squircle="'2xl'" 
            class="w-full h-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[24px] flex flex-col overflow-hidden text-gray-800 dark:text-slate-100 transform transition-all"
          >

            <!-- 1. 顶栏：极简浅黄三角图标与纯粹标题（彻底去除生硬边框与多余版本标） -->
            <div class="px-7 pt-6 pb-2.5 flex items-center bg-transparent shrink-0">
              <div class="w-7.5 h-7.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center mr-3 shadow-inner shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 class="text-lg font-extrabold text-gray-900 dark:text-white tracking-wide">免责声明</h3>
            </div>

            <!-- 2. 中间滚动条款区：引入底部渐隐蒙层（Alpha Mask），文字滑入底栏时柔和羽化淡出，彻底杜绝半截字硬切 -->
            <div 
              ref="scrollBodyRef"
              class="flex-1 min-h-0 px-7 pt-3 pb-8 text-[13px] text-gray-700 dark:text-slate-300 leading-relaxed overflow-y-auto custom-scrollbar text-left space-y-4 select-text [mask-image:linear-gradient(to_bottom,black_calc(100%-36px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%-36px),transparent_100%)]"
              @scroll="handleScroll"
            >
              <div class="space-y-2">
                <p class="font-bold text-gray-900 dark:text-white">感谢您使用「概念音乐」（Concept Music）。</p>
                <p>本软件是一款轻量级第三方桌面音乐播放器，专为个人学习交流、前端工程化技术研究与桌面高品质视听体验而开发。</p>
                <p class="font-bold text-gray-900 dark:text-white pt-1">
                  请您仔细阅读以下条款，使用本软件即表示您已充分理解并同意以下全部内容：
                </p>
              </div>

              <!-- 条款 1 -->
              <div class="space-y-1">
                <p class="font-extrabold text-gray-900 dark:text-white text-[13.5px]">1. 软件性质与非官方声明</p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed">
                  本软件为开源个人技术研究项目，并非任何音乐平台的官方产品。本软件与广州酷狗计算机科技有限公司、腾讯音乐娱乐集团（TME）、网易云音乐等机构无任何关联、合作或商业从属关系。本项目严禁用于任何商业营利或非法用途。
                </p>
              </div>

              <!-- 条款 2 -->
              <div class="space-y-1">
                <p class="font-extrabold text-gray-900 dark:text-white text-[13.5px]">2. 登录方式与凭据安全</p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed">
                  <span class="font-bold text-red-500 dark:text-red-400">本软件仅支持手机验证码登录及「酷狗概念版」官方 APP 扫码登录</span>（暂不支持酷狗普通版或其他第三方平台扫码）。未注册概念版的手机号码验证后将自动初始化概念版账号。
                </p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed pt-1">
                  <span class="font-bold text-gray-900 dark:text-white">安全与隐私保障：</span>用户的登录凭据（Cookie / Token 等）均通过系统底层硬件加密（Electron safeStorage）存储在用户本地设备中，绝不会向任何第三方云端服务器传输或共享您的敏感隐私数据。
                </p>
              </div>

              <!-- 条款 3 -->
              <div class="space-y-1">
                <p class="font-extrabold text-gray-900 dark:text-white text-[13.5px]">3. 数据来源与版权归属</p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed">
                  本软件所呈现的歌曲信息、歌词、封面、歌单及流媒体资源，均动态调用第三方公开网络接口或通过独立音源脚本进行本地解析渲染。本软件自身不托管、不存储、不修改亦不分发任何音视频资源。所有音乐作品的著作权、商标权及其他知识产权均归原始权利人（对应音乐平台或版权方）所有，请在版权许可范围内合理使用。
                </p>
              </div>

              <!-- 条款 4 -->
              <div class="space-y-1">
                <p class="font-extrabold text-gray-900 dark:text-white text-[13.5px]">4. VIP 音质与特权助手声明</p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed">
                  本软件集成的会员音质探测及「VIP 特权打卡助手」（如自动领取概念版畅听特权等功能）均依赖于平台现存的公开活动规则及接口逻辑。相关接口可能因官方业务调整随时失效、限制或关闭。因使用自动化或第三方接口可能引发的账号风控、权益变动或限制，由使用者自行承担，开发者不对相关接口的长期有效性做任何担保。
                </p>
              </div>

              <!-- 条款 5 -->
              <div class="space-y-1">
                <p class="font-extrabold text-gray-900 dark:text-white text-[13.5px]">5. 跨平台歌单与扩展音源说明</p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed">
                  软件提供的网易云音乐、企鹅音乐（QQ 音乐）等跨平台歌单解析与外部音源脚本支持，仅为本地数据格式规整与试听辅助工具。因第三方平台反爬策略调整或网络中断导致的功能不可用，开发者不承担连带责任。
                </p>
              </div>

              <!-- 条款 6 -->
              <div class="space-y-1">
                <p class="font-extrabold text-gray-900 dark:text-white text-[13.5px]">6. 用户守则与责任限制</p>
                <p class="text-gray-600 dark:text-slate-300 leading-relaxed">
                  用户应严格遵守相关法律法规及各音乐平台的用户协议，不得利用本软件从事侵犯他人著作权、规避技术保护措施等违规违法行为。因非合理使用本软件而产生的一切纠纷、法律责任或直接/间接损失，均由使用者本人独立承担，开发者及贡献者概不负责。
                </p>
              </div>

              <!-- 滚动到底部结束指示 -->
              <div 
                class="flex items-center justify-center pt-5 pb-3 text-[11.5px] gap-2 select-none transition-colors duration-200"
                :class="hasScrolledToBottom ? 'text-emerald-500 font-bold' : 'text-gray-400 dark:text-slate-500'"
              >
                <span class="w-8 h-px bg-gray-200 dark:bg-slate-800"></span>
                <span>{{ hasScrolledToBottom ? '已阅读至条款末尾 ✓' : '请继续向下滑动至底部' }}</span>
                <span class="w-8 h-px bg-gray-200 dark:bg-slate-800"></span>
              </div>
            </div>

            <!-- 3. 底栏操作区：移除生硬的 1px 割裂线，改用微环境阴影浮空；左右实体胶囊平衡对仗 -->
            <div class="px-7 pt-4 pb-6 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 select-none shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.03)] dark:shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.35)]">
              <!-- 左侧次级操作按钮：次级浅灰微底实体胶囊，平衡左右视觉重心；悬浮平滑展开淡粉底红字 -->
              <button
                @click="handleReject"
                class="px-5 py-2.5 rounded-full text-[13px] font-bold text-gray-500 dark:text-slate-400 bg-gray-100/80 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800/80 dark:hover:bg-red-950/40 dark:hover:text-red-400 border border-gray-200/50 dark:border-slate-700/50 transition-all duration-200 no-drag focus:outline-none cursor-pointer flex items-center justify-center active:scale-95"
              >
                拒绝并退出
              </button>
              
              <!-- 右侧主行动按钮：自适应适度宽度胶囊，带亮蓝微光影，与顶栏和左侧完美契合 -->
              <button
                :disabled="!isAgreedAvailable"
                @click="handleAgree"
                class="px-6 py-2.5 min-w-[190px] rounded-full text-[13px] font-bold border transition-[background-color,color,box-shadow,transform] duration-200 flex items-center justify-center no-drag focus:outline-none"
                :class="buttonClass"
              >
                <template v-if="countdown > 0">
                  请仔细阅读条款（{{ countdown }}s）
                </template>
                <template v-else-if="!hasScrolledToBottom">
                  请滑动至底部以确认 ↓
                </template>
                <template v-else>
                  我已阅读并同意上述条款
                </template>
              </button>
            </div>

          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { disclaimerVisible } from '../utils/appState';

const STORAGE_KEY = 'kg_desktop_disclaimer_accepted';
const COUNTDOWN_SECONDS = 8;

const emit = defineEmits(['accepted']);

const isVisible = ref(false);
const countdown = ref(COUNTDOWN_SECONDS);
const hasScrolledToBottom = ref(false);
const modalRef = ref(null);
const scrollBodyRef = ref(null);
let timer = null;

// 双重规则校验：倒计时结束 + 用户滚动触底
const isAgreedAvailable = computed(() => {
  return countdown.value <= 0 && hasScrolledToBottom.value;
});

// 按钮状态样式
const buttonClass = computed(() => {
  if (isAgreedAvailable.value) {
    // 亮蓝实体胶囊 + 柔和发光投影 (1:1 还原用户参考图)
    return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md shadow-blue-500/30 active:scale-95 cursor-pointer';
  }
  if (countdown.value <= 0 && !hasScrolledToBottom.value) {
    // 提示滑动到底部状态：严格使用 cursor-not-allowed
    return 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/35 cursor-not-allowed';
  }
  // 默认禁用态：平淡中灰胶囊
  return 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800 cursor-not-allowed shadow-none';
});

// 滚动触底检测逻辑 (带 12px 次像素容差)
const handleScroll = () => {
  const el = scrollBodyRef.value;
  if (!el || hasScrolledToBottom.value) return;
  const tolerance = 12;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - tolerance) {
    hasScrolledToBottom.value = true;
  }
};

const startCountdown = () => {
  countdown.value = COUNTDOWN_SECONDS;
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
};

const handleAgree = () => {
  if (!isAgreedAvailable.value) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, 'true');
  isVisible.value = false;
  disclaimerVisible.value = false;
  emit('accepted');
};

const handleReject = () => {
  if (window.trayAPI) {
    window.trayAPI.forceQuit();
  } else if (window.windowControls) {
    window.windowControls.close();
  }
};

onMounted(() => {
  const accepted = localStorage.getItem(STORAGE_KEY);
  if (accepted !== 'true') {
    isVisible.value = true;
    disclaimerVisible.value = true;
    hasScrolledToBottom.value = false;
    startCountdown();
    nextTick(() => {
      modalRef.value?.focus();
    });
  }
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

const showModal = () => {
  countdown.value = 0;
  hasScrolledToBottom.value = false;
  isVisible.value = true;
  nextTick(() => {
    modalRef.value?.focus();
  });
};

defineExpose({
  showModal
});
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 9999px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(203, 213, 225, 0.8); }
:deep(.dark) .custom-scrollbar::-webkit-scrollbar-thumb,
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(71, 85, 105, 0.4);
}
:deep(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover,
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(71, 85, 105, 0.8);
}
</style>
