<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div v-if="isVisible" class="fixed inset-0 z-[250] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm no-drag">
        <div class="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[420px] flex flex-col overflow-hidden relative">

          <button v-if="canClose" @click="closeModal" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-1.5 no-drag focus:outline-none z-10">
            <AppIcon name="close" class="w-4 h-4" />
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
                  <AppIcon name="refresh" class="w-4 h-4" />
                  检查更新
                </button>
              </template>

              <template v-else-if="status === 'checking'">
                <div class="flex flex-col items-center py-2">
                  <AppIcon name="spinner" spin class="h-8 w-8 text-blue-500 mb-3" />
                  <p class="text-sm text-gray-500">正在检查更新，请稍候...</p>
                </div>
              </template>

              <template v-else-if="status === 'not-available'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <AppIcon name="check" class="w-5 h-5 text-green-500" />
                  </div>
                  <p class="text-sm text-gray-600 font-medium">当前已是最新版本</p>
                  <p class="text-xs text-gray-400 mt-1">无需更新，继续享受音乐吧</p>
                </div>
              </template>

              <template v-else-if="status === 'available'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                    <AppIcon name="download" class="w-5 h-5 text-blue-500" />
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
                    <AppIcon name="check" class="w-5 h-5 text-green-500" />
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
                    <AppIcon name="danger" class="w-5 h-5 text-red-400" />
                  </div>
                  <p class="text-sm text-gray-900 font-bold">{{ isDownloadError ? '下载更新失败' : '检查更新失败' }}</p>
                  <p class="text-xs text-gray-400 mt-1 mb-3">{{ errorMsg }}</p>
                  <div v-if="isDownloadError && updateInfo.version" class="w-full space-y-2">
                    <button @click="retryDownload" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag focus:outline-none">
                      重新下载
                    </button>
                    <a :href="'https://github.com/liovoz/concept-music/releases/tag/v' + updateInfo.version" target="_blank" class="block w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors no-drag text-center">
                      手动下载安装包
                    </a>
                  </div>
                  <button v-else @click="resetToIdle" class="text-xs text-blue-500 hover:text-blue-700 font-medium no-drag transition-colors">
                    返回重试
                  </button>
                </div>
              </template>

              <template v-else-if="status === 'cancelled'">
                <div class="flex flex-col items-center py-2">
                  <div class="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center mb-3">
                    <AppIcon name="ban" class="w-5 h-5 text-yellow-500" />
                  </div>
                  <p class="text-sm text-gray-900 font-bold">下载已取消</p>
                  <p class="text-xs text-gray-400 mt-1 mb-4">更新下载已中断</p>
                  <div class="w-full space-y-2">
                    <button @click="retryDownload" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 no-drag focus:outline-none">
                      重新下载
                    </button>
                    <a v-if="updateInfo.version" :href="'https://github.com/liovoz/concept-music/releases/tag/v' + updateInfo.version" target="_blank" class="block w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors no-drag text-center">
                      手动下载安装包
                    </a>
                  </div>
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
const appVersion = ref(__APP_VERSION__);
const updateInfo = ref({});
const progressInfo = ref({ percent: 0, bytesPerSecond: 0 });
const errorMsg = ref('');
const isDownloadError = ref(false);

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

const retryDownload = () => {
  isDownloadError.value = false;
  errorMsg.value = '';
  startDownload();
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
  status.value = 'idle';
  progressInfo.value = { percent: 0, bytesPerSecond: 0 };
  errorMsg.value = '';
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
          if (status.value === 'cancelled') break;
          if (data.isManualCheck || isVisible.value) {
            let msg = data.message || '';
            const inDownloadPhase = data.phase === 'download' || status.value === 'downloading';
            if (inDownloadPhase) {
              if (msg.includes('404')) {
                msg = '更新安装包不存在或已被移除，请手动下载';
              } else if (msg.includes('ENOSPC')) {
                msg = '磁盘空间不足，请清理后重试';
              } else if (msg.includes('EPERM') || msg.includes('EBUSY') || msg.includes('in use')) {
                msg = '安装包被占用或权限不足，请关闭杀毒软件后重试';
              } else if (msg.includes('net::') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT')) {
                msg = '无法连接到更新服务器，请检查网络';
              } else if (msg.includes('aborted') || msg.includes('cancel')) {
                msg = '';
              } else if (msg.length > 60) {
                msg = '网络连接异常，请稍后重试';
              }
            } else {
              if (msg.includes('404') || msg.includes('github.com')) {
                msg = '暂无可用更新，或更新服务器未配置';
              } else if (msg.includes('net::') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
                msg = '无法连接到更新服务器，请检查网络';
              } else if (msg.includes('aborted') || msg.includes('cancel')) {
                msg = '';
              } else if (msg.length > 60) {
                msg = '网络连接异常，请稍后重试';
              }
            }
            if (status.value === 'downloading') {
              isDownloadError.value = true;
              errorMsg.value = msg || '下载中断，请检查网络连接';
              status.value = 'error';
            } else {
              errorMsg.value = msg || '更新检查失败';
              status.value = 'error';
            }
          }
          break;
        case 'cancelled':
          status.value = 'cancelled';
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
