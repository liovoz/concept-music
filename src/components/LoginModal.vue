<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div
        v-if="userStore.showLoginModal"
        ref="loginModalRef"
        tabindex="-1"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm no-drag outline-none"
        @keydown.escape="closeModal"
        @click.self="closeModal"
      >
        <div class="bg-white w-[400px] rounded-3xl shadow-2xl p-7 relative flex flex-col items-center">
          <!-- 关闭按钮 -->
          <button
            @click="closeModal"
            class="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 no-drag"
          >
            <AppIcon name="close" class="w-4 h-4" />
          </button>

          <h3 class="text-xl font-bold text-gray-800 mb-1">登录概念音乐</h3>
          <p class="text-xs text-gray-400 mb-5">畅享高品质音乐与多端权益同步</p>

          <!-- 登录模式切换 Tab -->
          <div class="flex p-1 bg-gray-100 rounded-2xl mb-6 w-full text-xs font-semibold text-gray-500 select-none">
            <button
              type="button"
              @click="switchTab('phone')"
              :class="[
                'flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5',
                loginType === 'phone' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-gray-800'
              ]"
            >
              <AppIcon name="phone" class="w-3.5 h-3.5" />
              <span>手机号登录</span>
            </button>
            <button
              type="button"
              @click="switchTab('qr')"
              :class="[
                'flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5',
                loginType === 'qr' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'hover:text-gray-800'
              ]"
            >
              <AppIcon name="qrcode" class="w-3.5 h-3.5" />
              <span>扫码登录</span>
            </button>
          </div>

          <!-- ==================== 1. 手机号登录模式 ==================== -->
          <div v-if="loginType === 'phone'" class="w-full flex flex-col items-center">
            <!-- 场景 A：常规手机号验证码表单 -->
            <form v-if="!multiUserList.length" @submit.prevent="handlePhoneLogin" class="w-full flex flex-col">
              <!-- 手机号输入框 -->
              <div class="w-full mb-3">
                <label class="block text-[11px] font-bold text-gray-500 mb-1.5 px-0.5">手机号码</label>
                <div
                  class="flex items-center w-full bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all px-3 py-2.5"
                >
                  <span class="text-xs font-bold text-gray-500 pr-2.5 border-r border-gray-200 select-none">+86</span>
                  <input
                    ref="phoneInputRef"
                    v-model="phone"
                    type="tel"
                    maxlength="11"
                    placeholder="请输入11位大陆手机号码"
                    class="w-full pl-2.5 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                    @input="handlePhoneInput"
                    @keydown.enter.prevent="focusCodeInput"
                  />
                  <button
                    v-if="phone"
                    type="button"
                    @click="clearPhone"
                    class="text-gray-400 hover:text-gray-600 p-0.5 transition-colors"
                  >
                    <AppIcon name="close" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- 验证码输入框 -->
              <div class="w-full mb-2">
                <label class="block text-[11px] font-bold text-gray-500 mb-1.5 px-0.5">短信验证码</label>
                <div
                  class="flex items-center w-full bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all px-3 py-1.5"
                >
                  <input
                    ref="codeInputRef"
                    v-model="code"
                    type="text"
                    maxlength="6"
                    placeholder="请输入6位验证码"
                    class="w-full pl-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                    @keydown.enter.prevent="handlePhoneLogin"
                  />
                  <button
                    type="button"
                    :disabled="!canSendCode"
                    @click="handleSendCode"
                    class="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-xl transition-all select-none"
                    :class="
                      canSendCode
                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    "
                  >
                    <span v-if="isSendingCode" class="flex items-center gap-1">
                      <AppIcon name="spinner" spin class="w-3 h-3" />
                      <span>发送中</span>
                    </span>
                    <span v-else-if="countdown > 0">{{ countdown }}s后获取</span>
                    <span v-else>获取验证码</span>
                  </button>
                </div>
              </div>

              <!-- 错误回显与未注册智能提示条 -->
              <div
                v-if="phoneError"
                class="w-full mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex flex-col gap-1.5 transition-all"
              >
                <div class="flex items-start gap-2">
                  <AppIcon name="warning" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span class="font-medium leading-relaxed">{{ phoneError }}</span>
                </div>
                <!-- 针对未注册、连续失败或风控的引导操作 -->
                <div
                  v-if="isUnregistered || sendFailedCount >= 2"
                  class="flex items-center justify-between pt-2 border-t border-amber-200/60 mt-0.5"
                >
                  <span class="text-[11px] text-amber-700 font-medium">推荐免风控通道：</span>
                  <button
                    type="button"
                    @click="switchTab('qr')"
                    class="text-blue-600 font-bold hover:underline text-xs flex items-center gap-0.5"
                  >
                    <span>切换至扫码登录</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>

              <!-- 协议与未注册自动初始化提示 -->
              <p class="text-[11px] text-gray-400 text-center leading-relaxed mt-2 mb-4 px-1 select-none">
                未注册手机号验证后将自动初始化概念版账号<br />
                登录即代表同意用户协议与隐私政策
              </p>

              <!-- 登录提交按钮 -->
              <button
                type="submit"
                :disabled="!canSubmit"
                class="w-full py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 select-none"
                :class="
                  canSubmit
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/25 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                "
              >
                <AppIcon v-if="isLoggingIn" name="spinner" spin class="w-4 h-4" />
                <span>{{ isLoggingIn ? '正在登录与同步...' : '立即登录' }}</span>
              </button>
            </form>

            <!-- 场景 B：该手机号存在多账号时的选择列表 -->
            <div v-else class="w-full flex flex-col items-center">
              <p class="text-xs text-gray-600 mb-3 text-center">
                检测到该手机号绑定了多个账号，请选择要登录的身份：
              </p>
              <div class="w-full max-h-48 overflow-y-auto space-y-2 mb-4 pr-1">
                <div
                  v-for="(u, idx) in multiUserList"
                  :key="idx"
                  @click="selectAccountAndLogin(u)"
                  class="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-blue-50/60 hover:border-blue-200 cursor-pointer transition-all"
                >
                  <img
                    :src="u.pic || u.avatar || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&q=80'"
                    class="w-9 h-9 rounded-full object-cover border border-gray-200"
                    alt="用户头像"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-gray-800 truncate">{{ u.nickname || u.username || '酷狗用户' }}</div>
                    <div class="text-[10px] text-gray-400">UID: {{ u.userid || u.uid || '-' }}</div>
                  </div>
                  <AppIcon name="check" class="w-4 h-4 text-blue-600 opacity-60" />
                </div>
              </div>
              <button
                type="button"
                @click="multiUserList = []"
                class="text-xs text-gray-500 hover:text-gray-800 py-1"
              >
                返回重新输入
              </button>
            </div>
          </div>

          <!-- ==================== 2. 扫码登录模式 ==================== -->
          <div v-else-if="loginType === 'qr'" class="w-full flex flex-col items-center">
            <div
              class="relative w-48 h-48 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden p-2 shadow-inner"
            >
              <div v-if="isLoading" class="flex flex-col items-center justify-center w-full h-full text-blue-500">
                <AppIcon name="spinner" spin class="h-8 w-8 mb-3" />
                <span class="text-xs font-medium">安全环境初始化...</span>
              </div>

              <div
                v-else-if="isError"
                class="flex flex-col items-center justify-center w-full h-full text-red-500 cursor-pointer hover:bg-red-50 transition-colors rounded-xl"
                @click="initLoginFlow"
              >
                <AppIcon name="warning" class="w-8 h-8 mb-2" />
                <span class="text-xs font-medium text-center">获取失败<br />点击重试</span>
              </div>

              <img
                v-else-if="qrImageBase64"
                :src="qrImageBase64"
                alt="登录二维码"
                class="w-full h-full object-contain rounded-xl"
              />

              <div
                v-if="scanStatus === 2"
                class="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-green-600 z-10"
              >
                <AppIcon name="check" class="w-10 h-10 mb-2" />
                <span class="text-sm font-bold">扫描成功</span>
                <span class="text-[10px] text-gray-600 mt-1">请在手机端点击确认登录</span>
              </div>

              <div
                v-if="scanStatus === 5"
                class="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-blue-600 z-10"
              >
                <AppIcon name="spinner" spin class="h-10 w-10 mb-2" />
                <span class="text-sm font-bold">登录中...</span>
                <span class="text-[10px] text-gray-600 mt-1">正在同步用户信息</span>
              </div>

              <div
                v-if="scanStatus === 0 || scanStatus === 402 || scanStatus === 404"
                @click="initLoginFlow"
                class="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white cursor-pointer hover:bg-black/70 transition-colors z-10"
              >
                <AppIcon name="refresh" class="w-8 h-8 mb-2 opacity-80" />
                <span class="text-sm font-bold">二维码已失效</span>
                <span class="text-[10px] text-gray-300 mt-1">点击刷新重新获取</span>
              </div>
            </div>

            <p class="mt-5 text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              请打开 <span class="text-blue-600 font-bold tracking-wide">酷狗概念版 APP</span> 扫一扫
            </p>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useUserStore } from '../store/userStore';
import request from '../utils/request';

const userStore = useUserStore();

// --- 弹窗与 Tab 状态 ---
const loginType = ref('phone'); // 'phone' | 'qr'
const loginModalRef = ref(null);
const phoneInputRef = ref(null);
const codeInputRef = ref(null);

// --- 手机号表单状态 ---
const phone = ref('');
const code = ref('');
const countdown = ref(0);
const isSendingCode = ref(false);
const isLoggingIn = ref(false);
const phoneError = ref('');
const isUnregistered = ref(false);
const sendFailedCount = ref(0);
const multiUserList = ref([]);
let countdownTimer = null;

// --- 扫码登录状态 ---
const isLoading = ref(true);
const isError = ref(false);
const qrKey = ref('');
const qrImageBase64 = ref('');
const scanStatus = ref(-1);
let pollingTimer = null;
let pollingCount = 0;
const MAX_POLLING_COUNT = 150;

// --- 计算属性 ---
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value.trim()));
const canSendCode = computed(() => isPhoneValid.value && countdown.value === 0 && !isSendingCode.value);
const canSubmit = computed(() => isPhoneValid.value && code.value.trim().length >= 4 && !isLoggingIn.value);

// --- 倒计时逻辑 ---
const startCountdown = (duration = 60) => {
  if (countdownTimer) clearInterval(countdownTimer);
  countdown.value = duration;
  countdownTimer = setInterval(() => {
    if (countdown.value > 1) {
      countdown.value--;
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdown.value = 0;
    }
  }, 1000);
};

const clearCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const handlePhoneInput = () => {
  phone.value = phone.value.replace(/\D/g, '').slice(0, 11);
  if (phoneError.value) {
    phoneError.value = '';
    isUnregistered.value = false;
  }
};

const clearPhone = () => {
  phone.value = '';
  phoneError.value = '';
  isUnregistered.value = false;
  nextTick(() => phoneInputRef.value?.focus());
};

const focusCodeInput = () => {
  if (isPhoneValid.value) {
    codeInputRef.value?.focus();
  }
};

// --- 发送短信验证码 ---
const handleSendCode = async () => {
  if (!canSendCode.value) return;

  phoneError.value = '';
  isUnregistered.value = false;
  isSendingCode.value = true;

  try {
    const res = await userStore.sendSmsCode(phone.value.trim());
    if (res.success) {
      startCountdown(60);
      focusCodeInput();
    } else {
      sendFailedCount.value++;
      phoneError.value = res.msg || '验证码发送失败';
      if (res.isUnregistered) {
        isUnregistered.value = true;
      }
      // 连续失败 3 次以上触发 120 秒冷却熔断
      if (sendFailedCount.value >= 3) {
        startCountdown(120);
      }
    }
  } catch (err) {
    sendFailedCount.value++;
    phoneError.value = (err && typeof err.message === 'string' && !err.message.includes('is not a function') ? err.message : '') || '网络连接异常，发送失败';
  } finally {
    isSendingCode.value = false;
  }
};

// --- 手机号验证码登录提交 ---
const handlePhoneLogin = async () => {
  if (!canSubmit.value) return;

  phoneError.value = '';
  isUnregistered.value = false;
  isLoggingIn.value = true;

  try {
    const res = await userStore.loginWithPhone({
      mobile: phone.value.trim(),
      code: code.value.trim()
    });

    if (res.success) {
      code.value = '';
      sendFailedCount.value = 0;
      closeModal();
    } else if (res.needSelectAccount) {
      multiUserList.value = res.userList || [];
    } else {
      phoneError.value = res.msg || '登录失败，请检查验证码';
      if (res.isUnregistered) {
        isUnregistered.value = true;
      }
    }
  } catch (err) {
    phoneError.value = (err && typeof err.message === 'string' && !err.message.includes('is not a function') ? err.message : '') || '登录异常，请稍后重试';
  } finally {
    isLoggingIn.value = false;
  }
};

// --- 多账号选择登录 ---
const selectAccountAndLogin = async (account) => {
  const userid = account.userid || account.uid;
  if (!userid) return;

  isLoggingIn.value = true;
  phoneError.value = '';

  try {
    const res = await userStore.loginWithPhone({
      mobile: phone.value.trim(),
      code: code.value.trim(),
      userid
    });

    if (res.success) {
      multiUserList.value = [];
      code.value = '';
      closeModal();
    } else {
      phoneError.value = res.msg || '账号选择登录失败';
    }
  } catch (err) {
    phoneError.value = err.message || '登录异常';
  } finally {
    isLoggingIn.value = false;
  }
};

// --- 扫码登录流程 ---
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
    Object.values(obj).forEach((val) => search(val, depth + 1));
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

      let codeNum = -1;
      if (checkRes?.data && checkRes.data.status !== undefined) codeNum = checkRes.data.status;
      else if (checkRes?.data && checkRes.data.code !== undefined) codeNum = checkRes.data.code;
      else if (checkRes?.status !== undefined && checkRes.status !== 1) codeNum = checkRes.status;

      if (codeNum !== -1) scanStatus.value = Number(codeNum);

      if (scanStatus.value === 4 || scanStatus.value === 405) {
        clearPolling();
        scanStatus.value = 5;
        await userStore.fetchUserInfo();
        closeModal();
      } else if (scanStatus.value === 0 || scanStatus.value === 402 || scanStatus.value === 404) {
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

// --- Tab 切换 ---
const switchTab = (type) => {
  loginType.value = type;
  phoneError.value = '';
  isUnregistered.value = false;

  if (type === 'qr') {
    if (!qrKey.value || scanStatus.value === 0) {
      initLoginFlow();
    } else if (!pollingTimer && scanStatus.value === 1) {
      startPollingStatus();
    }
  } else {
    clearPolling();
    nextTick(() => phoneInputRef.value?.focus());
  }
};

// --- 表单状态重置 ---
const resetForm = () => {
  phone.value = '';
  code.value = '';
  phoneError.value = '';
  isUnregistered.value = false;
  multiUserList.value = [];
  isSendingCode.value = false;
  isLoggingIn.value = false;
  clearCountdown();
};

// --- 弹窗显隐监听 ---
watch(
  () => userStore.showLoginModal,
  (newVal) => {
    if (newVal) {
      resetForm();
      if (loginType.value === 'qr') {
        initLoginFlow();
      } else {
        clearPolling();
        nextTick(() => phoneInputRef.value?.focus());
      }
      nextTick(() => {
        loginModalRef.value?.focus();
      });
    } else {
      clearPolling();
      resetForm();
    }
  }
);

const closeModal = () => {
  clearPolling();
  resetForm();
  userStore.closeLoginModal();
};

onUnmounted(() => {
  clearPolling();
  clearCountdown();
});
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
