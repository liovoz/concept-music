// ============================================================
// 文件：src/store/updateStore.js
// 概念音乐 (Concept Music) - 全局版本更新与感知状态管理
// ============================================================
import { defineStore } from 'pinia';

const STORAGE_KEYS = {
  IGNORED_VERSION: 'cm_update_ignored_version',
  SNOOZE_UNTIL: 'cm_update_snooze_until',
  DISMISSED_VERSION: 'cm_update_dismissed_version'
};

export const useUpdateStore = defineStore('update', {
  state: () => ({
    // 更新生命周期状态：'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'cancelled'
    status: 'idle',
    appVersion: '',
    updateInfo: {},
    progressInfo: {
      percent: 0,
      bytesPerSecond: 0,
      total: 0,
      transferred: 0
    },
    errorMsg: '',
    isDownloadError: false,
    isPortable: false,
    isManualCheck: false,

    // 线路选择：'auto' | 'ghfast' | 'ghproxy' | 'official'
    updateChannel: 'auto',
    activeFeedChannel: 'auto',
    channelFallbackNotice: '',

    // 右下角主动浮动通知卡片控制
    showFloatCard: false,

    // 用户免打扰偏好（持久化）
    ignoredVersion: localStorage.getItem(STORAGE_KEYS.IGNORED_VERSION) || '',
    snoozeUntil: Number(localStorage.getItem(STORAGE_KEYS.SNOOZE_UNTIL) || 0),
    dismissedVersion: localStorage.getItem(STORAGE_KEYS.DISMISSED_VERSION) || '',

    isListening: false,

    // 强制更新与高危熔断状态
    isForced: false,
    isBlacklisted: false,
    forceTitle: '',
    forceNotice: ''
  }),

  getters: {
    channelName: (state) => {
      const map = {
        auto: '自动优选 (遇到阻断自动加速)',
        ghfast: '国内高速节点 1 (ghfast.top)',
        ghproxy: '国内高速节点 2 (ghproxy.net)',
        official: '官方 GitHub 直连'
      };
      return map[state.updateChannel] || '自动优选';
    },

    // 是否检测到新版本
    hasNewVersion: (state) => {
      return Boolean(
        state.updateInfo?.version &&
        ['available', 'downloading', 'downloaded'].includes(state.status)
      );
    },

    // 侧边栏/设置内是否展示红点（如果该版本被用户彻底忽略，则不亮红点；强制更新必亮）
    hasBadge: (state) => {
      if (!state.hasNewVersion) return false;
      if (state.isForced || state.isBlacklisted) return true;
      const targetVer = state.updateInfo?.version;
      return Boolean(targetVer && targetVer !== state.ignoredVersion);
    },

    // 是否应该弹出右下角浮动通知卡片
    canShowFloatCard: (state) => {
      if (!state.showFloatCard || !state.hasNewVersion) return false;
      // 强制更新或熔断模式下：永远保持展示，不可被忽略或推迟
      if (state.isForced || state.isBlacklisted) return true;

      const ver = state.updateInfo?.version;
      // 已彻底忽略该版本
      if (ver && ver === state.ignoredVersion) return false;
      // 处于“稍后提醒”24小时静默期
      if (Date.now() < state.snoozeUntil) return false;
      // 本次运行已主动关闭过该版本的卡片（下载完成状态除外）
      if (state.status !== 'downloaded' && ver && ver === state.dismissedVersion) {
        return false;
      }
      return true;
    },

    // 下载速度格式化
    progressSpeed: (state) => {
      const bytes = state.progressInfo.bytesPerSecond;
      if (!bytes) return '计算中...';
      if (bytes > 1048576) return (bytes / 1048576).toFixed(2) + ' MB/s';
      return (bytes / 1024).toFixed(2) + ' KB/s';
    },

    // 下载百分比
    progressPercent: (state) => {
      return Math.floor(state.progressInfo.percent || 0);
    }
  },

  actions: {
    /**
     * 初始化全局更新监听器（在 App.vue 挂载时调用）
     */
    async initUpdater() {
      if (this.isListening) return;

      if (window.updaterAPI) {
        try {
          const ver = await window.updaterAPI.getAppVersion();
          if (ver) this.appVersion = ver;
          if (window.updaterAPI.getChannel) {
            const ch = await window.updaterAPI.getChannel();
            if (ch) this.updateChannel = ch;
          }
        } catch (e) {
          console.warn('[Updater] 获取本地版本号/线路失败:', e);
        }

        this.isListening = true;
        window.updaterAPI.onUpdateEvent((data) => {
          this.handleUpdateEvent(data);
        });
      } else if (import.meta.env.DEV) {
        // 纯浏览器端开发调试支持：从本地根目录读取并模拟策略
        this.appVersion = '3.6.2';
        this.isListening = true;
        setTimeout(() => {
          this.simulateBrowserDevCheck(false);
        }, 1200);
      }
    },

    /**
     * 纯浏览器开发环境下的更新策略模拟执行器
     */
    async simulateBrowserDevCheck(manual = false) {
      try {
        const rulesMod = await import('../../version-rules.json');
        const rules = rulesMod.default || rulesMod;
        if (!rules) return;

        const currentVer = this.appVersion || '3.6.2';
        const p1 = currentVer.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
        const p2 = (rules.latestVersion || currentVer).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
        const cmp = (a, b) => {
          for (let i = 0; i < 3; i++) {
            if ((a[i] || 0) > (b[i] || 0)) return 1;
            if ((a[i] || 0) < (b[i] || 0)) return -1;
          }
          return 0;
        };

        const isBlacklisted = Array.isArray(rules.blacklistedVersions) && rules.blacklistedVersions.some(v => cmp(p1, v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)) === 0);
        let isBelowMin = false;
        if (rules.minSupportedVersion) {
          const minP = rules.minSupportedVersion.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
          isBelowMin = cmp(p1, minP) < 0;
        }
        const hasHigherVer = cmp(p1, p2) < 0;
        const isForced = isBlacklisted || isBelowMin || (rules.forceUpdate && hasHigherVer);

        if (isBlacklisted || isForced || hasHigherVer) {
          this.handleUpdateEvent({
            type: 'available',
            info: {
              version: rules.latestVersion || '3.7.0',
              releaseDate: new Date().toISOString(),
              releaseNotes: rules.notice || '### [浏览器开发环境模拟更新]\n- 本地测试模式已激活\n- 支持验证常规更新、强制升级与黑名单熔断'
            },
            isManualCheck: manual,
            isPortable: false,
            channel: 'auto',
            isForced,
            isBlacklisted,
            forceTitle: isBlacklisted ? '版本已停用并熔断' : (isForced ? '强制安全更新' : '重要安全与稳定性更新'),
            forceNotice: rules.notice
          });
        } else if (manual) {
          this.handleUpdateEvent({
            type: 'not-available',
            isManualCheck: true
          });
        }
      } catch (e) {
        console.warn('[Updater][BrowserDev] 模拟更新异常:', e);
      }
    },

    /**
     * 处理主进程派发的更新事件
     */
    handleUpdateEvent(data) {
      if (!data || !data.type) return;

      switch (data.type) {
        case 'checking':
          if (data.isManualCheck) {
            this.status = 'checking';
            this.isManualCheck = true;
          }
          if (data.channel) this.activeFeedChannel = data.channel;
          break;

        case 'channel-fallback':
          this.channelFallbackNotice = data.message || '网络连接受阻，已自动启用国内高速加速通道';
          if (data.channel) this.activeFeedChannel = data.channel;
          break;

        case 'available':
          this.updateInfo = data.info || {};
          this.isPortable = Boolean(data.isPortable);
          this.isManualCheck = Boolean(data.isManualCheck);
          if (data.channel) this.activeFeedChannel = data.channel;
          this.status = 'available';

          // 接收强制更新与高危熔断状态
          this.isForced = Boolean(data.isForced);
          this.isBlacklisted = Boolean(data.isBlacklisted);
          this.forceTitle = data.forceTitle || '';
          this.forceNotice = data.forceNotice || '';

          // 判断是否弹出浮动卡片
          if (this.isForced || this.isBlacklisted) {
            this.showFloatCard = true;
          } else {
            const currentVer = this.updateInfo.version;
            const isIgnored = currentVer && currentVer === this.ignoredVersion;
            const isSnoozed = Date.now() < this.snoozeUntil;
            const isDismissed = currentVer && currentVer === this.dismissedVersion;

            // 手动检查时或者符合通知条件时弹出
            if (this.isManualCheck || (!isIgnored && !isSnoozed && !isDismissed)) {
              this.showFloatCard = true;
            }
          }
          break;

        case 'not-available':
          if (data.isManualCheck) {
            this.status = 'not-available';
          }
          this.isManualCheck = false;
          break;

        case 'progress':
          this.status = 'downloading';
          this.progressInfo = data.progressObj || {};
          break;

        case 'error':
          if (this.status === 'cancelled') break;
          // 静默后台检查若遇网络阻断，不将前端状态置为 error 打扰用户；仅在用户手动检查或下载阶段出错时呈现
          if (!data.isManualCheck && data.phase !== 'download') {
            this.status = 'idle';
            return;
          }
          this.status = 'error';
          this.errorMsg = data.message || '更新检查失败，请检查网络';
          this.isDownloadError = data.phase === 'download';
          this.isManualCheck = false;
          if (this.isDownloadError) {
            this.showFloatCard = true;
          }
          break;

        case 'cancelled':
          this.status = 'cancelled';
          this.progressInfo = { percent: 0, bytesPerSecond: 0 };
          break;

        case 'downloaded':
          this.status = 'downloaded';
          this.updateInfo = data.info || this.updateInfo;
          // 下载完成强提示，重新唤起卡片
          this.showFloatCard = true;
          break;
      }
    },

    /**
     * 触发检查更新
     */
    checkForUpdates(manual = true) {
      this.isManualCheck = manual;
      this.status = 'checking';
      this.errorMsg = '';
      this.channelFallbackNotice = '';

      if (window.updaterAPI) {
        window.updaterAPI.checkForUpdates();
      } else if (import.meta.env.DEV) {
        setTimeout(() => {
          this.simulateBrowserDevCheck(manual);
        }, 500);
      }
    },

    /**
     * 触发下载
     */
    startDownload() {
      if (this.isPortable) {
        let targetUrl = 'https://github.com/liovoz/concept-music/releases/latest';
        if (this.updateChannel === 'ghfast' || this.updateChannel === 'auto') {
          targetUrl = 'https://ghfast.top/' + targetUrl;
        } else if (this.updateChannel === 'ghproxy') {
          targetUrl = 'https://ghproxy.net/' + targetUrl;
        }

        if (window.settingsAPI?.openExternal) {
          window.settingsAPI.openExternal(targetUrl);
        } else {
          window.open(targetUrl, '_blank');
        }
        this.dismissCard('close');
        return;
      }

      if (window.updaterAPI) {
        this.status = 'downloading';
        this.progressInfo = { percent: 0, bytesPerSecond: 0 };
        window.updaterAPI.downloadUpdate();
      } else if (import.meta.env.DEV) {
        this.status = 'downloading';
        let percent = 0;
        const timer = setInterval(() => {
          percent += 25;
          if (percent >= 100) {
            clearInterval(timer);
            this.handleUpdateEvent({
              type: 'downloaded',
              info: this.updateInfo
            });
          } else {
            this.handleUpdateEvent({
              type: 'progress',
              progressObj: {
                percent,
                bytesPerSecond: 1024 * 1024 * 3.8
              }
            });
          }
        }, 350);
      }
    },

    /**
     * 取消下载
     */
    cancelDownload() {
      if (window.updaterAPI) {
        window.updaterAPI.cancelDownload();
        this.status = 'cancelled';
      }
    },

    /**
     * 重启并安装更新
     */
    quitAndInstall() {
      if (window.updaterAPI) {
        window.updaterAPI.quitAndInstall();
      }
    },

    /**
     * 用户关闭/操作卡片
     * @param {'close' | 'snooze' | 'ignore'} type
     */
    dismissCard(type = 'close') {
      // 强制更新或熔断模式下：严格拦截关闭、推迟和忽略行为
      if (this.isForced || this.isBlacklisted) {
        return;
      }

      this.showFloatCard = false;
      const ver = this.updateInfo?.version || '';

      if (type === 'close') {
        // 本次运行不再弹该版本
        if (ver) {
          this.dismissedVersion = ver;
          localStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, ver);
        }
      } else if (type === 'snooze') {
        // 稍后提醒：推迟 24 小时
        this.snoozeUntil = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_KEYS.SNOOZE_UNTIL, String(this.snoozeUntil));
        if (ver) {
          this.dismissedVersion = ver;
          localStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, ver);
        }
      } else if (type === 'ignore') {
        // 忽略此版本：永久不再主动提示该版本
        if (ver) {
          this.ignoredVersion = ver;
          localStorage.setItem(STORAGE_KEYS.IGNORED_VERSION, ver);
        }
      }
    },

    /**
     * 退出应用程序（强制更新模式下提供给用户的合法退出途径）
     */
    quitApp() {
      if (window.updaterAPI?.quitApp) {
        window.updaterAPI.quitApp();
      } else if (window.trayAPI?.forceQuit) {
        window.trayAPI.forceQuit();
      } else if (window.windowControls?.close) {
        window.windowControls.close();
      } else {
        window.close();
      }
    },

    /**
     * 重置状态为 idle
     */
    resetToIdle() {
      this.status = 'idle';
      this.progressInfo = { percent: 0, bytesPerSecond: 0 };
      this.errorMsg = '';
      this.isDownloadError = false;
      this.channelFallbackNotice = '';
    },

    /**
     * 切换更新线路
     * @param {'auto' | 'ghfast' | 'ghproxy' | 'official'} channelId
     */
    async setChannel(channelId) {
      this.updateChannel = channelId;
      this.channelFallbackNotice = '';
      if (window.updaterAPI?.setChannel) {
        await window.updaterAPI.setChannel(channelId);
      }
    }
  }
});
