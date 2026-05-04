<template>
  <div id="desktop-lyric-root" class="lyric-root" @mousedown="handleDragStart">
    <div
      class="lyric-bg"
      :class="{ 'lyric-bg-active': isHovered || showSettings }"
    ></div>

    <div class="lyric-toolbar" v-show="isHovered && !showSettings">
      <template v-if="isLocked">
        <button class="tb-btn tb-btn-unlock" @click.stop="unlockLyric" title="解锁">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6-6h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z"/></svg>
        </button>
        <span class="tb-label">点击解锁</span>
      </template>
      <template v-else>
        <button class="tb-btn" @click.stop="openSettings" title="设置">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
        </button>
        <span class="tb-sep"></span>
        <button class="tb-btn" @click.stop="sendCommand('prev')" title="上一首">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg>
        </button>
        <button class="tb-btn tb-btn-play" @click.stop="sendCommand('togglePlay')" title="播放/暂停">
          <svg v-if="isPlaying" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          <svg v-else width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z"/></svg>
        </button>
        <button class="tb-btn" @click.stop="sendCommand('next')" title="下一首">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M11.555 5.168A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"/></svg>
        </button>
        <span class="tb-sep"></span>
        <button class="tb-btn" @click.stop="lockLyric" title="锁定穿透">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
        </button>
        <button class="tb-btn tb-btn-close" @click.stop="sendCommand('close')" title="关闭">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </template>
    </div>

    <div class="lyric-body" :class="{ 'lyric-body-hidden': showSettings }">
      <div class="lyric-line lyric-main" :class="activeTheme.textClass" :style="{ fontSize: config.fontSize + 'px' }">
        {{ currentText }}
      </div>
      <div v-if="config.showSub && nextText" class="lyric-line lyric-sub" :class="activeTheme.textClass" :style="{ fontSize: Math.max(14, config.fontSize - 14) + 'px' }">
        {{ nextText }}
      </div>
    </div>

    <transition name="panel-fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings" @mousedown.stop>
        <div class="settings-panel" @click.stop @mousedown.stop>
          <div class="st-group">
            <span class="st-label">字号</span>
            <input type="range" min="24" max="50" v-model="config.fontSize" class="st-range" />
            <span class="st-value">{{ config.fontSize }}</span>
          </div>
          <div class="st-divider"></div>
          <div class="st-group">
            <span class="st-label">颜色</span>
            <div class="st-colors">
              <button
                v-for="t in themes" :key="t.id"
                class="st-color-dot"
                :class="{ 'st-color-active': config.colorTheme === t.id }"
                :style="{ backgroundColor: t.color }"
                @click="config.colorTheme = t.id"
              ></button>
            </div>
          </div>
          <div class="st-divider"></div>
          <div class="st-group">
            <span class="st-label">副歌词</span>
            <button class="st-toggle" :class="{ 'st-toggle-on': config.showSub }" @click="config.showSub = !config.showSub">
              <span class="st-toggle-knob"></span>
            </button>
          </div>
          <div class="st-divider"></div>
          <button class="st-done" @click="closeSettings">完成</button>
        </div>
      </div>
    </transition>

    <transition name="toast-fade">
      <div v-if="showLockToast" class="lock-toast">
        已锁定鼠标穿透，悬停歌词可解锁
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';

const isHovered = ref(false);
const isLocked = ref(false);
const showSettings = ref(false);
const showLockToast = ref(false);
const currentText = ref('听见好时光');
const nextText = ref('');
const isPlaying = ref(false);

const config = reactive({
  fontSize: 34,
  colorTheme: 'white',
  showSub: true
});

const themes = [
  { id: 'white', color: '#ffffff', textClass: 'text-white' },
  { id: 'blue', color: '#4facfe', textClass: 'text-blue-400' },
  { id: 'pink', color: '#ff0844', textClass: 'text-pink-500' },
  { id: 'gold', color: '#f6d365', textClass: 'text-yellow-400' }
];

const activeTheme = computed(() => themes.find(t => t.id === config.colorTheme) || themes[0]);

const handleMouseEnter = () => {
  isHovered.value = true;
};

const handleMouseLeave = () => {
  if (showSettings.value) return;
  isHovered.value = false;
};

const handleDragStart = (e) => {
  if (showSettings.value) return;
  if (e.target.closest('button') || e.target.closest('.settings-overlay')) return;
  if (window.lyricAPI && window.lyricAPI.setIgnoreMouse) {
    window.lyricAPI.setIgnoreMouse(false);
  }
  const upHandler = () => {
    if (window.lyricAPI && window.lyricAPI.setMouseAuto) {
      window.lyricAPI.setMouseAuto();
    }
    window.removeEventListener('mouseup', upHandler);
  };
  window.addEventListener('mouseup', upHandler);
};

const sendCommand = (cmd) => {
  if (window.lyricAPI) window.lyricAPI.sendControl(cmd);
};

const openSettings = () => {
  showSettings.value = true;
  if (window.lyricAPI) window.lyricAPI.setIgnoreMouse(false);
};

const closeSettings = () => {
  showSettings.value = false;
  isHovered.value = false;
  if (window.lyricAPI) window.lyricAPI.setMouseAuto();
};

const lockLyric = () => {
  isLocked.value = true;
  isHovered.value = false;
  if (window.lyricAPI) window.lyricAPI.setIgnoreMouse(true);
  showLockToast.value = true;
  setTimeout(() => { showLockToast.value = false; }, 4000);
};

const unlockLyric = () => {
  isLocked.value = false;
  if (window.lyricAPI) window.lyricAPI.unlockLyric();
};

onMounted(() => {
  try {
    const saved = localStorage.getItem('kg_desktop_lyric_config');
    if (saved) Object.assign(config, JSON.parse(saved));
  } catch (e) {}

  let el = document.getElementById('desktop-lyric-root');
  while (el && el !== document) {
    if (el.style) {
      el.style.setProperty('background-color', 'transparent', 'important');
      el.style.setProperty('background', 'transparent', 'important');
    }
    el = el.parentNode;
  }

  if (window.lyricAPI) {
    window.lyricAPI.onSync((data) => {
      currentText.value = data.currentText;
      nextText.value = data.nextText;
      isPlaying.value = data.isPlaying;
    });

    window.lyricAPI.onMouseEnter(() => {
      handleMouseEnter();
    });

    window.lyricAPI.onMouseLeave(() => {
      handleMouseLeave();
    });
  }
});

onUnmounted(() => {
});

watch(config, (v) => localStorage.setItem('kg_desktop_lyric_config', JSON.stringify(v)), { deep: true });
</script>

<style scoped>
.lyric-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  cursor: move;
  -webkit-app-region: drag;
}

.lyric-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  border-radius: 8px;
}

.lyric-bg-active {
  opacity: 1;
}

.lyric-toolbar {
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  margin-top: 8px;
  background: rgba(30, 30, 30, 0.9);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
  cursor: default;
  -webkit-app-region: no-drag;
}

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.1s;
}

.tb-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.tb-btn:active {
  transform: scale(0.9);
}

.tb-btn-play {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: #fff;
}

.tb-btn-play:hover {
  background: #60a5fa;
}

.tb-btn-close:hover {
  background: rgba(239, 68, 68, 0.8);
}

.tb-btn-unlock {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.tb-btn-unlock:hover {
  background: rgba(59, 130, 246, 0.35);
  color: #93bbfd;
}

.tb-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
}

.tb-sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}

.lyric-body {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  padding: 0 30px;
  pointer-events: none;
  min-height: 0;
  transition: opacity 0.3s ease;
}

.lyric-body-hidden {
  opacity: 0;
}

.lyric-line {
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.3;
}

.lyric-main {
  font-weight: 800;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.8);
}

.lyric-sub {
  font-weight: 600;
  opacity: 0.65;
  margin-top: 2px;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
}

.settings-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  -webkit-app-region: no-drag;
}

.settings-panel {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 28px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.st-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.st-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

.st-range {
  width: 100px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.st-value {
  font-size: 12px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.8);
  min-width: 24px;
  text-align: center;
}

.st-colors {
  display: flex;
  gap: 8px;
}

.st-color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}

.st-color-dot:hover {
  transform: scale(1.15);
}

.st-color-active {
  border-color: #fff;
  transform: scale(1.2);
}

.st-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}

.st-toggle-on {
  background: #3b82f6;
}

.st-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.st-toggle-on .st-toggle-knob {
  transform: translateX(16px);
}

.st-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
}

.st-done {
  padding: 6px 20px;
  border-radius: 14px;
  border: none;
  background: #fff;
  color: #000;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.st-done:hover {
  background: #e5e7eb;
}

.lock-toast {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 150;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.95);
  color: rgba(0, 0, 0, 0.75);
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  pointer-events: none;
  -webkit-app-region: no-drag;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.3s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
