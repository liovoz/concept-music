<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div v-if="isVisible" class="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm no-drag p-4">
        <div class="bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[480px] max-w-full max-h-[85vh] flex flex-col overflow-hidden transform transition-all">

          <div class="px-6 py-5 border-b border-gray-100 flex items-center shrink-0">
            <div class="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mr-3 shadow-inner">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-gray-800 tracking-wide">免责声明</h3>
          </div>

          <div class="px-7 py-5 text-sm text-gray-600 leading-relaxed overflow-y-auto custom-scrollbar text-left space-y-3">
            <p>感谢您使用「概念音乐」（Concept Music）。</p>
            <p>本软件是一款基于酷狗音乐（Kugou Music）开放接口开发的第三方桌面音乐客户端，旨在为用户提供更优质的音乐播放体验。</p>
            <p class="font-bold text-gray-800">请您仔细阅读以下条款，使用本软件即表示您已充分理解并同意以下全部内容：</p>

            <div class="space-y-3 mt-1">
              <div>
                <p class="font-bold text-gray-800">1. 登录方式说明</p>
                <p class="mt-1"><span class="font-bold text-red-500">本软件仅支持使用「酷狗概念版」手机 APP 扫码登录</span>，不支持其他登录方式（包括但不限于手机号、微信、QQ、微博等）。如您尚未安装酷狗概念版，请先前往手机应用商店下载安装后扫码登录。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">2. 数据来源声明</p>
                <p class="mt-1">本软件所展示的音乐内容（包括但不限于歌曲、歌词、专辑封面、歌单等）均来源于酷狗音乐官方接口。所有音乐作品的著作权及相关权利归原始权利人（酷狗音乐或版权方）所有，本软件不声称对任何音乐内容拥有版权。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">3. VIP 接口声明</p>
                <p class="mt-1">本软件使用了酷狗音乐的 VIP 会员接口，用于提供高品质音频播放及会员专属功能。该接口的使用可能存在合规性风险或随时被酷狗音乐官方限制、关闭，届时本软件的相关功能将无法正常使用，开发者不对此承担任何责任。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">4. 非官方软件声明</p>
                <p class="mt-1">本软件并非酷狗音乐官方产品，与广州酷狗计算机科技有限公司无任何关联、合作或从属关系。本软件仅供个人学习、研究和技术交流使用，严禁用于任何商业目的。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">5. 使用风险提示</p>
                <p class="mt-1">使用本软件可能违反酷狗音乐的用户服务协议，由此产生的账号风险（包括但不限于账号受限、封禁等）由用户自行承担，开发者不承担任何直接或间接责任。</p>
              </div>

              <div>
                <p class="font-bold text-gray-800">6. 用户义务</p>
                <p class="mt-1">用户应遵守中华人民共和国相关法律法规及酷狗音乐的用户协议，不得利用本软件从事任何违法违规活动。</p>
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
