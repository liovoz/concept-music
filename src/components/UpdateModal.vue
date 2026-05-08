<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div v-if="isVisible" class="fixed inset-0 z-[250] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm no-drag">
        <div class="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[420px] flex flex-col overflow-hidden relative">

          <button v-if="canClose" @click="closeModal" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1.5 no-drag focus:outline-none z-10">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div class="h-36 bg-gradient-to-br from-blue-500 to-indigo-600 relative flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 bg-black/10"></div>
            <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div class="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div class="z-10 flex flex-col items-center">
              <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-black/10">
                <img src="/icon.ico" class="w-10 h-10" alt="概念音乐" />
              </div>
              <span class="text-white/80 text-xs font-medium tracking-wider">CONCEPT MUSIC</span>
            </div>
          </div>

          <div class="px-8 py-6 flex flex-col items-center text-center">

            <h2 class="text-xl font-extrabold text-gray-900 tracking-tight">概念音乐 Desktop</h2>
            <p class="text-sm text-gray-400 mt-1 font-mono">v{{ appVersion }}</p>
            <p class="text-xs text-gray-400 mt-2 leading-relaxed">回归音乐本身，听见好时光</p>

            <div class="w-full mt-5 border-t border-gray-100 pt-5">

              <template v-if="status === 'idle'">
                <button @click="checkForUpdates" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag focus:outline-none flex items-center justify-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  检查更新
                </button>
              </template>

              <template v-else-if="status === 'checking'">
                <div class="flex flex-col items-center py-2">
                  <svg class="animate-spin h-8 w-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p class="text-sm text-gray-500">正在检查更新，请稍候...</p>
                </div>
              </template>

              <template v-else-if="status === 'not-available'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <p class="text-sm text-gray-600 font-medium">当前已是最新版本</p>
                  <p class="text-xs text-gray-400 mt-1">无需更新，继续享受音乐吧</p>
                </div>
              </template>

              <template v-else-if="status === 'available'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                  </div>
                  <p class="text-sm text-gray-900 font-bold mb-4">发现新版本 v{{ updateInfo.version }}</p>
                  <div class="w-full flex space-x-3">
                    <button @click="closeModal" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors no-drag focus:outline-none">
                      以后再说
                    </button>
                    <button @click="startDownload" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag focus:outline-none">
                      立即更新
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="status === 'downloading'">
                <div class="flex flex-col items-center py-2">
                  <p class="text-sm text-gray-900 font-bold mb-4">正在下载更新...</p>
                  <div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div class="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300 ease-out" :style="{ width: progressPercent + '%' }"></div>
                  </div>
                  <div class="w-full flex justify-between mt-3 text-xs font-mono font-medium text-gray-500">
                    <span>{{ progressSpeed }}</span>
                    <span class="text-blue-600">{{ progressPercent }}%</span>
                  </div>
                  <button @click="cancelDownload" class="mt-4 text-xs text-gray-400 hover:text-red-500 transition-colors no-drag font-medium">
                    取消下载
                  </button>
                </div>
              </template>

              <template v-else-if="status === 'downloaded'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <p class="text-sm text-gray-900 font-bold">更新下载完成</p>
                  <p class="text-xs text-gray-400 mt-1 mb-4">重启软件即可体验新功能</p>
                  <button @click="installUpdate" class="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(34,197,94,0.3)] transition-all transform active:scale-95 no-drag focus:outline-none">
                    立即重启安装
                  </button>
                </div>
              </template>

              <template v-else-if="status === 'error'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  </div>
                  <p class="text-sm text-gray-900 font-bold">检查更新失败</p>
                  <p class="text-xs text-gray-400 mt-1 mb-4">{{ errorMsg }}</p>
                  <button @click="resetToIdle" class="text-xs text-blue-500 hover:text-blue-700 font-medium no-drag transition-colors">
                    返回重试
                  </button>
                </div>
              </template>

              <template v-else-if="status === 'cancelled'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                  </div>
                  <p class="text-sm text-gray-900 font-bold">下载已取消</p>
                  <p class="text-xs text-gray-400 mt-1 mb-4">更新下载已中断</p>
                  <button @click="resetToIdle" class="text-xs text-blue-500 hover:text-blue-700 font-medium no-drag transition-colors">
                    返回
                  </button>
                </div>
              </template>

            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const isVisible = ref(false);
const status = ref('idle');
const appVersion = ref('1.0.0');
const updateInfo = ref({});
const progressInfo = ref({ percent: 0, bytesPerSecond: 0 });
const errorMsg = ref('');

const progressSpeed = computed(() => {
  const bytes = progressInfo.value.bytesPerSecond;
  if (!bytes) return '计算中...';
  if (bytes > 1048576) return (bytes / 1048576).toFixed(2) + ' MB/s';
  return (bytes / 1024).toFixed(2) + ' KB/s';
});

const progressPercent = computed(() => Math.floor(progressInfo.value.percent || 0));

const canClose = computed(() => !['downloading'].includes(status.value));

let isListening = false;

const showModal = async () => {
  isVisible.value = true;
  if (window.updaterAPI) {
    try {
      appVersion.value = await window.updaterAPI.getAppVersion();
    } catch (e) {}
  }
};

const checkForUpdates = () => {
  if (window.updaterAPI) {
    status.value = 'checking';
    window.updaterAPI.checkForUpdates();
  }
};

const startDownload = () => {
  if (window.updaterAPI) {
    status.value = 'downloading';
    progressInfo.value = { percent: 0, bytesPerSecond: 0 };
    window.updaterAPI.downloadUpdate();
  }
};

const cancelDownload = () => {
  if (window.updaterAPI) {
    window.updaterAPI.cancelDownload();
    status.value = 'cancelled';
  }
};

const installUpdate = () => {
  if (window.updaterAPI) window.updaterAPI.quitAndInstall();
};

const resetToIdle = () => {
  status.value = 'idle';
  progressInfo.value = { percent: 0, bytesPerSecond: 0 };
};

const closeModal = () => {
  if (!canClose.value) return;
  isVisible.value = false;
  setTimeout(() => {
    status.value = 'idle';
    progressInfo.value = { percent: 0, bytesPerSecond: 0 };
    errorMsg.value = '';
  }, 300);
};

onMounted(() => {
  if (window.updaterAPI && !isListening) {
    isListening = true;
    window.updaterAPI.onUpdateEvent((data) => {
      switch (data.type) {
        case 'checking':
          if (data.isManualCheck && isVisible.value) status.value = 'checking';
          break;
        case 'available':
          updateInfo.value = data.info || {};
          status.value = 'available';
          isVisible.value = true;
          break;
        case 'not-available':
          if (data.isManualCheck) status.value = 'not-available';
          break;
        case 'progress':
          status.value = 'downloading';
          progressInfo.value = data.progressObj || {};
          break;
        case 'error':
          if (data.isManualCheck || isVisible.value) {
            let msg = data.message || '';
            if (msg.includes('404') || msg.includes('github.com')) {
              msg = '暂无可用更新，或更新服务器未配置';
            } else if (msg.includes('net::') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
              msg = '无法连接到更新服务器，请检查网络';
            } else if (msg.length > 60) {
              msg = '网络连接异常，请稍后重试';
            }
            if (status.value === 'downloading') {
              status.value = 'cancelled';
            } else {
              errorMsg.value = msg;
              status.value = 'error';
            }
          }
          break;
        case 'downloaded':
          status.value = 'downloaded';
          break;
      }
    });
  }
});

defineExpose({ showModal });
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
