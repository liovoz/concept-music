// ====================
// 文件：src/components/LoginModal.vue
// ====================
<template>
  <Teleport to="body">
  <transition name="fade-scale">
    <div v-if="userStore.showLoginModal" ref="loginModalRef" tabindex="-1" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm no-drag outline-none" @keydown.escape="closeModal" @click.self="closeModal">
      
      <div class="bg-white w-[380px] rounded-3xl shadow-2xl p-8 relative flex flex-col items-center">
        <button @click="closeModal" class="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 no-drag">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h3 class="text-xl font-bold text-gray-800 mb-2">登录概念音乐</h3>
        <p class="text-xs text-gray-500 mb-6">安全、快捷，免除风控验证</p>

        <div class="relative w-48 h-48 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden p-2 shadow-inner">
          
          <div v-if="isLoading" class="flex flex-col items-center justify-center w-full h-full text-blue-500">
            <svg class="animate-spin h-8 w-8 mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="text-xs font-medium">安全环境初始化...</span>
          </div>

          <div v-else-if="isError" class="flex flex-col items-center justify-center w-full h-full text-red-500 cursor-pointer hover:bg-red-50 transition-colors rounded-xl" @click="initLoginFlow">
            <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span class="text-xs font-medium text-center">获取失败<br>点击重试</span>
          </div>

          <img v-else-if="qrImageBase64" :src="qrImageBase64" alt="登录二维码" class="w-full h-full object-contain rounded-xl" />

          <div v-if="scanStatus === 2" class="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-green-600 z-10">
            <svg class="w-10 h-10 mb-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            <span class="text-sm font-bold">扫描成功</span>
            <span class="text-[10px] text-gray-600 mt-1">请在手机端点击确认登录</span>
          </div>

          <div v-if="scanStatus === 5" class="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-blue-600 z-10">
            <svg class="animate-spin h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span class="text-sm font-bold">登录中...</span>
            <span class="text-[10px] text-gray-600 mt-1">正在同步用户信息</span>
          </div>

          <div v-if="scanStatus === 0 || scanStatus === 402 || scanStatus === 404" @click="initLoginFlow" class="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white cursor-pointer hover:bg-black/70 transition-colors z-10">
            <svg class="w-8 h-8 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span class="text-sm font-bold">二维码已失效</span>
            <span class="text-[10px] text-gray-300 mt-1">点击刷新重新获取</span>
          </div>
        </div>

        <p class="mt-6 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
          请打开 <span class="text-blue-600 font-bold tracking-wide">酷狗音乐 APP</span> 扫一扫
        </p>
      </div>
    </div>
  </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { useUserStore } from '../store/userStore';
import request from '../utils/request';

const userStore = useUserStore();

const isLoading = ref(true);
const isError = ref(false);
const qrKey = ref('');
const qrImageBase64 = ref('');
const scanStatus = ref(-1);
const loginModalRef = ref(null);
let pollingTimer = null;
let pollingCount = 0;
const MAX_POLLING_COUNT = 150;

const clearPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  pollingCount = 0;
};

const extractField = (data, fieldNames) => {
  let found = null;
  const visited = new WeakSet();
  const search = (obj, depth) => {
    if (found !== null || !obj || typeof obj !== 'object' || depth > 8) return;
    if (visited.has(obj)) return;
    visited.add(obj);
    for (const name of fieldNames) {
      if (obj[name] !== undefined && obj[name] !== null && obj[name] !== '') {
        found = obj[name];
        return;
      }
    }
    Object.values(obj).forEach(val => search(val, depth + 1));
  };
  search(data, 0);
  return found;
};

const initLoginFlow = async () => {
  clearPolling();
  isLoading.value = true;
  isError.value = false;
  scanStatus.value = -1;
  qrImageBase64.value = '';

  try {
    await request.get('/register/dev').catch(() => {});

    const keyRes = await request.get('/login/qr/key', { params: { timestamp: Date.now() } });
    const key = extractField(keyRes, ['key', 'unikey', 'qrcode', 'auth_id']);
    if (!key) throw new Error('未能获取有效的二维码 Key');
    qrKey.value = key;

    const imgRes = await request.get('/login/qr/create', { 
      params: { key: key, qrimg: 1, timestamp: Date.now() } 
    });
    
    const base64 = extractField(imgRes, ['qrimg', 'qrcode_img', 'base64', 'img']);
    if (!base64) throw new Error('未能获取二维码图片数据');
    qrImageBase64.value = base64;

    scanStatus.value = 1; 
    startPollingStatus();

  } catch (error) {
    console.error('登录流程初始化异常:', error);
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const startPollingStatus = () => {
  pollingCount = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;
  pollingTimer = setInterval(async () => {
    pollingCount++;
    if (pollingCount > MAX_POLLING_COUNT) {
      clearPolling();
      scanStatus.value = 0;
      return;
    }
    try {
      const checkRes = await request.get('/login/qr/check', { 
        params: { key: qrKey.value, timestamp: Date.now() } 
      });
      
      consecutiveErrors = 0;
      
      let code = -1;
      if (checkRes?.data && checkRes.data.status !== undefined) code = checkRes.data.status;
      else if (checkRes?.data && checkRes.data.code !== undefined) code = checkRes.data.code;
      else if (checkRes?.status !== undefined && checkRes.status !== 1) code = checkRes.status;

      if (code !== -1) scanStatus.value = Number(code);

      if (scanStatus.value === 4 || scanStatus.value === 405) {
        clearPolling();
        scanStatus.value = 5;
        await userStore.fetchUserInfo();
        closeModal();
      } 
      else if (scanStatus.value === 0 || scanStatus.value === 402 || scanStatus.value === 404) {
        clearPolling();
      }
    } catch (e) {
      consecutiveErrors++;
      if (e instanceof TypeError || e instanceof ReferenceError) {
        console.error('轮询致命错误:', e.message);
        clearPolling();
        scanStatus.value = 0;
        return;
      }
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        clearPolling();
        scanStatus.value = 0;
        return;
      }
    }
  }, 2000); 
};

watch(() => userStore.showLoginModal, (newVal) => {
  if (newVal) {
    initLoginFlow(); 
    nextTick(() => { loginModalRef.value?.focus(); });
  } else clearPolling();  
});

const closeModal = () => userStore.closeLoginModal();

onUnmounted(() => clearPolling());
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.95); }
</style>
