<template>
  <div
    class="tray-backdrop w-full h-full bg-transparent select-none overflow-hidden relative flex items-end pb-1.5"
    :class="[
      placement.openSubmenuLeft ? 'justify-end pr-2' : 'justify-start pl-2'
    ]"
    @click.self="closeMenu"
    @contextmenu.prevent="closeMenu"
  >
    <!-- 托盘主卡片：干净微边框，深色模式下使用柔和的 slate-800 边框 -->
    <div
      ref="cardRef"
      class="tray-menu-card w-48 rounded-xl border border-gray-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs font-bold text-gray-700 dark:text-slate-100 backdrop-blur-xl"
      @click.stop
    >
      <!-- 当前播放歌曲简要信息（如果有） -->
      <div
        v-if="state.currentSong?.name"
        class="px-2.5 py-1.5 mb-1 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-200/60 dark:border-slate-700/60 text-[11px]"
      >
        <div class="font-bold text-gray-800 dark:text-slate-200 truncate leading-tight">
          {{ state.currentSong.name }}
        </div>
        <div class="text-[10px] truncate text-gray-400 dark:text-slate-400 font-normal mt-0.5">
          {{ state.currentSong.singer || '概念音乐' }}
        </div>
      </div>

      <!-- 核心播放控制 -->
      <button class="menu-item" @click="handleAction('toggle-play')">
        <img
          :src="state.isPlaying ? '/tray-icons/pause.png' : '/tray-icons/play.png'"
          class="menu-img-icon"
          alt=""
        />
        <span>{{ state.isPlaying ? '暂停' : '播放' }}</span>
      </button>

      <button class="menu-item" @click="handleAction('prev')">
        <img src="/tray-icons/prev.png" class="menu-img-icon" alt="" />
        <span>上一首</span>
      </button>

      <button class="menu-item" @click="handleAction('next')">
        <img src="/tray-icons/next.png" class="menu-img-icon" alt="" />
        <span>下一首</span>
      </button>

      <div class="my-1 h-px bg-gray-100 dark:bg-white/[0.08]"></div>

      <!-- 窗口与歌词控制 -->
      <button class="menu-item" @click="handleAction('show-window')">
        <img src="/tray-icons/win.png" class="menu-img-icon" alt="" />
        <span>显示主窗口</span>
      </button>

      <button class="menu-item justify-between" @click="handleAction('toggle-lyric')">
        <div class="flex items-center gap-3">
          <img
            :src="state.lyricVisible ? '/tray-icons/lyricsOn.png' : '/tray-icons/lyrics.png'"
            class="menu-img-icon"
            alt=""
          />
          <span>桌面歌词</span>
        </div>
        <AppIcon v-if="state.lyricVisible" name="check" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      </button>

      <!-- 播放模式及二级子菜单 -->
      <div
        class="relative group/mode"
        @mouseenter="showSubmenu = true"
        @mouseleave="showSubmenu = false"
      >
        <button class="menu-item justify-between">
          <div class="flex items-center gap-3">
            <img :src="currentModeIcon" class="menu-img-icon" alt="" />
            <span>{{ currentModeLabel }}</span>
          </div>
          <AppIcon
            :name="placement.openSubmenuLeft ? 'chevron-left' : 'chevron-right'"
            class="w-3.5 h-3.5 text-gray-400 group-hover/mode:text-blue-600 dark:group-hover/mode:text-blue-400 transition-colors"
          />
        </button>

        <!-- 模式子菜单：智能自适应方向 + 安全透明防脱桥接 -->
        <div
          v-show="showSubmenu"
          class="absolute w-36 rounded-xl border border-gray-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs font-bold text-gray-700 dark:text-slate-100 backdrop-blur-xl z-20 bottom-0"
          :class="[
            placement.openSubmenuLeft
              ? 'right-full mr-1.5 before:absolute before:inset-y-0 before:-right-2 before:w-2'
              : 'left-full ml-1.5 before:absolute before:inset-y-0 before:-left-2 before:w-2'
          ]"
        >
          <button
            class="menu-item justify-between"
            :class="{ 'text-blue-600 dark:text-blue-400 font-extrabold': state.playMode === 'sequence' }"
            @click="selectMode('sequence')"
          >
            <div class="flex items-center gap-2.5">
              <img src="/tray-icons/seq.png" class="menu-img-icon-sm" alt="" />
              <span>列表循环</span>
            </div>
            <AppIcon v-if="state.playMode === 'sequence'" name="check" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </button>

          <button
            class="menu-item justify-between"
            :class="{ 'text-blue-600 dark:text-blue-400 font-extrabold': state.playMode === 'loop' }"
            @click="selectMode('loop')"
          >
            <div class="flex items-center gap-2.5">
              <img src="/tray-icons/loop.png" class="menu-img-icon-sm" alt="" />
              <span>单曲循环</span>
            </div>
            <AppIcon v-if="state.playMode === 'loop'" name="check" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </button>

          <button
            class="menu-item justify-between"
            :class="{ 'text-blue-600 dark:text-blue-400 font-extrabold': state.playMode === 'random' }"
            @click="selectMode('random')"
          >
            <div class="flex items-center gap-2.5">
              <img src="/tray-icons/rnd.png" class="menu-img-icon-sm" alt="" />
              <span>随机播放</span>
            </div>
            <AppIcon v-if="state.playMode === 'random'" name="check" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>

      <div class="my-1 h-px bg-gray-100 dark:bg-white/[0.08]"></div>

      <!-- 关于与更新 -->
      <button class="menu-item" @click="handleAction('show-about')">
        <img src="/tray-icons/about.png" class="menu-img-icon" alt="" />
        <span>关于概念音乐</span>
      </button>

      <button class="menu-item" @click="handleAction('check-update')">
        <img src="/tray-icons/update.png" class="menu-img-icon" alt="" />
        <span>检查更新</span>
      </button>

      <div class="my-1 h-px bg-gray-100 dark:bg-white/[0.08]"></div>

      <!-- 退出 -->
      <button class="menu-item danger" @click="handleAction('quit')">
        <img src="/tray-icons/quit.png" class="menu-img-icon" alt="" />
        <span>退出</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const getInitialDark = () => {
  try {
    const savedTheme = localStorage.getItem('kg_desktop_theme');
    const isSysDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return isSysDark;
  } catch (e) {
    return false;
  }
};

const initialDark = getInitialDark();

const state = ref({
  isPlaying: false,
  playMode: 'sequence',
  lyricVisible: false,
  currentSong: null,
  isDark: initialDark
});

// Windows 托盘在右下角，默认 openSubmenuLeft 为 true
const placement = ref({
  openSubmenuLeft: true
});

const showSubmenu = ref(false);

const currentModeLabel = computed(() => {
  const map = {
    sequence: '列表循环',
    loop: '单曲循环',
    random: '随机播放'
  };
  return map[state.value.playMode] || '列表循环';
});

const currentModeIcon = computed(() => {
  const map = {
    sequence: '/tray-icons/seq.png',
    loop: '/tray-icons/loop.png',
    random: '/tray-icons/rnd.png'
  };
  return map[state.value.playMode] || '/tray-icons/seq.png';
});

const applyTheme = (isDark) => {
  state.value.isDark = Boolean(isDark);
  document.documentElement.classList.toggle('dark', Boolean(isDark));
};

const setTrayData = (payload) => {
  showSubmenu.value = false;
  if (!payload) return;
  if (payload.state) {
    Object.assign(state.value, payload.state);
    if (typeof payload.state.isDark === 'boolean') {
      applyTheme(payload.state.isDark);
    }
  }
  if (payload.placement) {
    Object.assign(placement.value, payload.placement);
  }
};

// 挂载到 window 供主进程在 show 前同步注入，并在 nextTick + requestAnimationFrame 渲染完成后 resolve
if (typeof window !== 'undefined') {
  window.__setTrayPlacement = (payload) => {
    return new Promise((resolve) => {
      setTrayData(payload);
      nextTick(() => {
        requestAnimationFrame(() => {
          resolve(true);
        });
      });
    });
  };
}

const handleAction = (action) => {
  showSubmenu.value = false;
  if (window.trayAPI?.sendAction) {
    window.trayAPI.sendAction(action);
  }
};

const selectMode = (mode) => {
  state.value.playMode = mode;
  handleAction(`set-mode-${mode}`);
};

const closeMenu = () => {
  showSubmenu.value = false;
  if (window.trayAPI?.closeMenu) {
    window.trayAPI.closeMenu();
  }
};

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
};

const handleStorageChange = (e) => {
  if (e.key === 'kg_desktop_theme') {
    const val = e.newValue;
    const isSysDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    applyTheme(val === 'dark' || (val === 'system' && isSysDark));
  }
};

onMounted(async () => {
  document.documentElement.classList.add('tray-menu-window');
  applyTheme(initialDark);

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('storage', handleStorageChange);

  // 初始化通过 IPC 获取主进程推送的最新状态与深浅色
  if (window.trayAPI?.getTrayState) {
    try {
      const data = await window.trayAPI.getTrayState();
      if (data) {
        setTrayData(data);
      }
    } catch (e) {
      console.warn('[TrayMenu] Failed to fetch initial tray state:', e);
    }
  }

  // 监听来自主进程的主题与播放状态推送广播
  if (window.trayAPI?.onStateUpdate) {
    window.trayAPI.onStateUpdate((payload) => {
      setTrayData(payload);
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('storage', handleStorageChange);
});
</script>

<style>
/* 保证托盘菜单宿主页面无论深浅色均 100% 透明 */
html.tray-menu-window,
html.tray-menu-window body,
html.tray-menu-window #app,
html.tray-menu-window.dark body,
html.tray-menu-window.dark #app {
  background-color: transparent !important;
  background: transparent !important;
}
</style>

<style scoped>
.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
  cursor: pointer;
}

.menu-item:hover {
  background: rgba(239, 246, 255, 0.85);
  color: rgb(37, 99, 235);
}

:global(.dark) .menu-item:hover {
  background: rgba(59, 130, 246, 0.2);
  color: rgb(96, 165, 250);
}

.menu-item.danger:hover {
  background: rgba(254, 242, 242, 0.9);
  color: rgb(239, 68, 68);
}

:global(.dark) .menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.menu-img-icon {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 4px;
  flex-shrink: 0;
  object-fit: contain;
}

.menu-img-icon-sm {
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  flex-shrink: 0;
  object-fit: contain;
}
</style>
