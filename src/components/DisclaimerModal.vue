<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div v-if="isVisible" class="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm no-drag p-4">
        <div class="bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[480px] max-w-full max-h-[85vh] flex flex-col overflow-hidden transform transition-all">

          <div class="px-6 py-5 border-b border-gray-100 flex items-center bg-gray-50/50">
            <div class="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mr-3 shadow-inner">
              <AppIcon name="warning" class="w-5 h-5" />
            </div>
            <h3 class="text-lg font-bold text-gray-800 tracking-wide">免责声明</h3>
          </div>

          <div class="px-7 py-5 text-sm text-gray-600 leading-relaxed overflow-y-auto custom-scrollbar text-left space-y-3">
            <p>感谢您使用「概念音乐」（Concept Music）。</p>
            <p>本软件是一款轻量级第三方桌面音乐播放器，专为个人学习交流、前端工程化技术研究与桌面高品质视听体验而开发。</p>
            <p class="font-bold text-gray-800">请您仔细阅读以下条款，使用本软件即表示您已充分理解并同意以下全部内容：</p>

            <div class="space-y-3 mt-1">
              <div>
                <p class="font-bold text-gray-800">1. 软件性质与非官方声明</p>
                <p class="mt-1">本软件为开源个人技术研究项目，并非任何音乐平台的官方产品。本软件与广州酷狗计算机科技有限公司、腾讯音乐娱乐集团（TME）、网易云音乐等机构无任何关联、合作或商业从属关系。本项目严禁用于任何商业营利或非法用途。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">2. 登录方式与凭据安全</p>
                <p class="mt-1"><span class="font-bold text-red-500">本软件仅支持手机验证码登录及「酷狗概念版」官方 APP 扫码登录</span>（暂不支持酷狗普通版或其他第三方平台扫码）。未注册概念版的手机号码验证后将自动初始化概念版账号。</p>
                <p class="mt-1"><span class="font-bold text-gray-700">安全与隐私保障：</span>用户的登录凭据（Cookie / Token 等）均通过系统底层硬件加密（Electron safeStorage）存储在用户本地设备中，绝不会向任何第三方云端服务器传输或共享您的敏感隐私数据。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">3. 数据来源与版权归属</p>
                <p class="mt-1">本软件所呈现的歌曲信息、歌词、封面、歌单及流媒体资源，均动态调用第三方公开网络接口或通过独立音源脚本进行本地解析渲染。本软件自身不托管、不存储、不修改亦不分发任何音视频资源。所有音乐作品的著作权、商标权及其他知识产权均归原始权利人（对应音乐平台或版权方）所有，请在版权许可范围内合理使用。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">4. VIP 音质与特权助手声明</p>
                <p class="mt-1">本软件集成的会员音质探测及「VIP 特权打卡助手」（如自动领取概念版畅听特权等功能）均依赖于平台现存的公开活动规则及接口逻辑。相关接口可能因官方业务调整随时失效、限制或关闭。因使用自动化或第三方接口可能引发的账号风控、权益变动或限制，由使用者自行承担，开发者不对相关接口的长期有效性做任何担保。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">5. 跨平台歌单与扩展音源说明</p>
                <p class="mt-1">软件提供的网易云音乐、企鹅音乐（QQ 音乐）等跨平台歌单解析与外部音源脚本支持，仅为本地数据格式规整与试听辅助工具。因第三方平台反爬策略调整或网络中断导致的功能不可用，开发者不承担连带责任。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">6. 用户守则与责任限制</p>
                <p class="mt-1">用户应严格遵守相关法律法规及各音乐平台的用户协议，不得利用本软件从事侵犯他人著作权、规避技术保护措施等违规违法行为。因非合理使用本软件而产生的一切纠纷、法律责任或直接/间接损失，均由使用者本人独立承担，开发者及贡献者概不负责。</p>
              </div>
            </div>

            <p class="font-bold text-gray-800 mt-2">点击下方「我已阅读并同意上述条款」按钮，即表示您已详细阅读、充分理解并自愿接受本免责声明的全部条款。如您不同意上述条款，请立即退出并卸载本软件。</p>
          </div>

          <div class="px-6 py-4 bg-gray-50/50 flex items-center justify-between shrink-0">
            <button
              @click="handleReject"
              class="px-5 py-2.5 rounded-full text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all no-drag focus:outline-none"
            >
              拒绝并退出
            </button>
            <button
              :disabled="countdown > 0"
              @click="handleAgree"
              class="px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center min-w-[200px] no-drag focus:outline-none"
              :class="countdown > 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 active:scale-95'"
            >
              <template v-if="countdown > 0">
                请仔细阅读条款（{{ countdown }}s）
              </template>
              <template v-else>
                我已阅读并同意上述条款
              </template>
            </button>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { disclaimerVisible } from '../utils/appState';

const STORAGE_KEY = 'kg_desktop_disclaimer_accepted';
const COUNTDOWN_SECONDS = 10;

const emit = defineEmits(['accepted']);

const isVisible = ref(false);
const countdown = ref(COUNTDOWN_SECONDS);
let timer = null;

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
  if (countdown.value > 0) return;
  localStorage.setItem(STORAGE_KEY, 'true');
  isVisible.value = false;
  disclaimerVisible.value = false;
  emit('accepted');
};

const handleReject = () => {
  if (window.trayAPI) window.trayAPI.forceQuit();
};

onMounted(() => {
  const accepted = localStorage.getItem(STORAGE_KEY);
  if (accepted !== 'true') {
    isVisible.value = true;
    disclaimerVisible.value = true;
    startCountdown();
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
  isVisible.value = true;
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
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(203, 213, 225, 0.8); }
</style>
