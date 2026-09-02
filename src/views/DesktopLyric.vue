<template>
  <div id="desktop-lyric-root" class="lyric-root" @mousedown="handleDragStart">
    <div
      class="lyric-bg"
      :class="{ 'lyric-bg-active': isHovered || showSettings }"
    ></div>

    <div class="lyric-toolbar" v-show="isHovered && !showSettings">
      <template v-if="isLocked">
        <button class="tb-btn tb-btn-unlock" @click.stop="unlockLyric" title="解锁">
          <AppIcon name="unlock" class="w-4 h-4" />
        </button>
        <span class="tb-label">点击解锁</span>
      </template>
      <template v-else>
        <button class="tb-btn" @click.stop="openSettings" title="设置">
          <AppIcon name="settings" class="w-4 h-4" />
        </button>
        <span class="tb-sep"></span>
        <button class="tb-btn" @click.stop="sendCommand('prev')" title="上一首">
          <AppIcon name="prev" class="w-4 h-4" />
        </button>
        <button class="tb-btn tb-btn-play" @click.stop="sendCommand('togglePlay')" title="播放/暂停">
          <AppIcon :name="isPlaying ? 'pause' : 'play'" class="w-4 h-4" />
        </button>
        <button class="tb-btn" @click.stop="sendCommand('next')" title="下一首">
          <AppIcon name="next" class="w-4 h-4" />
        </button>
        <span class="tb-sep"></span>
        <button class="tb-btn" @click.stop="lockLyric" title="锁定穿透">
          <AppIcon name="lock" class="w-4 h-4" />
        </button>
        <button class="tb-btn tb-btn-close" @click.stop="closeLyricWindow" title="关闭">
          <AppIcon name="close" class="w-4 h-4" />
        </button>
      </template>
    </div>

    <div class="lyric-body" :class="{ 'lyric-body-hidden': showSettings }">
      <!-- 开启逐字过渡模式且有逐字数据 -->
      <div
        v-if="config.karaokeMode && currentWords.length > 0"
        class="lyric-line lyric-main lyric-karaoke"
        :style="lyricMainBaseStyle"
      >
        <span
          v-for="(w, idx) in currentWords"
          :key="idx"
          class="k-char-box"
        >
          <span class="k-char-base">{{ w.text }}</span>
          <span
            class="k-char-fill"
            :style="{
              width: `${getCharProgress(w)}%`,
              color: activeTheme.main
            }"
          >{{ w.text }}</span>
        </span>
      </div>
      <!-- 关闭逐字过渡模式或静态文本 -->
      <div v-else class="lyric-line lyric-main" :style="lyricMainStyle">
        {{ currentText }}
      </div>
      <div v-if="config.showSub && (currentTranslation || nextText)" class="lyric-line lyric-sub" :style="lyricSubStyle">
        {{ currentTranslation || nextText }}
      </div>
    </div>

    <transition name="panel-fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings" @mousedown.stop>
        <div class="settings-panel" @click.stop @mousedown.stop>
          <div class="st-group st-sizes">
            <div class="st-size-row">
              <span class="st-label">主歌词</span>
              <input type="range" min="24" max="50" v-model.number="config.fontSize" class="st-range" />
              <span class="st-value">{{ config.fontSize }}</span>
            </div>
            <div class="st-size-row">
              <span class="st-label">副歌词</span>
              <input type="range" min="14" :max="config.fontSize - 6" v-model.number="config.subFontSize" class="st-range" />
              <span class="st-value">{{ config.subFontSize }}</span>
            </div>
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
              <button
                class="st-color-dot st-color-custom"
                :class="{ 'st-color-active': config.colorTheme === 'custom' }"
                title="自定义调色盘"
              >
                <img 
                  v-if="rainbowRingDataUrl" 
                  :src="rainbowRingDataUrl" 
                  class="w-full h-full block pointer-events-none select-none" 
                  alt="rainbow ring"
                />
                <input
                  ref="colorInputRef"
                  type="color"
                  v-model="config.customColor"
                  @change="config.colorTheme = 'custom'"
                  @input="config.colorTheme = 'custom'"
                  class="st-color-input-overlay"
                  title="点击打开调色盘"
                />
              </button>
            </div>
          </div>
          <div class="st-divider"></div>
          <div class="st-group">
            <span class="st-label">逐字过渡</span>
            <button class="st-toggle" :class="{ 'st-toggle-on': config.karaokeMode }" @click="config.karaokeMode = !config.karaokeMode">
              <span class="st-toggle-knob"></span>
            </button>
          </div>
          <div class="st-divider"></div>
          <div class="st-group">
            <span class="st-label">显示副歌词</span>
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
        已锁定鼠标穿透，悬停歌词 1 秒可解锁
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

const isHovered = ref(false);
const isLocked = ref(false);
const showSettings = ref(false);
const showLockToast = ref(false);
const currentText = ref('听见好时光');
const nextText = ref('');
const currentTranslation = ref('');
const isPlaying = ref(false);
const colorInputRef = ref(null);

const rainbowRingDataUrl = computed(() => {
  if (typeof document === 'undefined') return '';
  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || !ctx.createConicGradient) return '';
    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 0.5;
    const innerR = (size / 2) * 0.35;
    const grad = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    grad.addColorStop(0, '#ff3b30');
    grad.addColorStop(0.14, '#ff9500');
    grad.addColorStop(0.28, '#ffcc00');
    grad.addColorStop(0.42, '#34c759');
    grad.addColorStop(0.56, '#00c7be');
    grad.addColorStop(0.70, '#007aff');
    grad.addColorStop(0.84, '#5856d6');
    grad.addColorStop(0.93, '#af52de');
    grad.addColorStop(0.98, '#ff2d55');
    grad.addColorStop(1, '#ff3b30');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2, false);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
});

const triggerColorPick = () => {
  config.colorTheme = 'custom';
  if (colorInputRef.value) {
    colorInputRef.value.click();
  }
};

const currentWords = ref([]);
const lineStartTime = ref(0);
const lineDuration = ref(0);
const lastSyncPlayTime = ref(0);
const lastSyncTimestamp = ref(0);
const currentPlayTime = ref(0);
let animationFrameId = null;

const config = reactive({
  fontSize: 34,
  subFontSize: 28,
  colorTheme: 'white',
  customColor: '#38bdf8',
  showSub: true,
  karaokeMode: true
});

// 副歌词字号约束：始终比主歌词至少小 6px
const clampSubFontSize = () => {
  const maxSub = config.fontSize - 6;
  if (typeof config.subFontSize !== 'number' || Number.isNaN(config.subFontSize)) {
    config.subFontSize = maxSub;
    return;
  }
  if (config.subFontSize > maxSub) config.subFontSize = maxSub;
  if (config.subFontSize < 14) config.subFontSize = 14;
};

const hexToRgb = (hex) => {
  let c = (hex || '').replace(/^#/, '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return [56, 189, 248];
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return [56, 189, 248];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const getCustomTheme = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  const subR = Math.round(r * 0.6 + 255 * 0.4);
  const subG = Math.round(g * 0.6 + 255 * 0.4);
  const subB = Math.round(b * 0.6 + 255 * 0.4);
  return {
    id: 'custom',
    color: hex || '#38bdf8',
    main: hex || '#38bdf8',
    sub: `rgba(${subR}, ${subG}, ${subB}, 0.75)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.35)`
  };
};

const themes = [
  { id: 'white', color: '#f8fafc', main: '#f8fafc', sub: 'rgba(203, 213, 225, 0.78)', glow: 'rgba(148, 163, 184, 0.22)' },
  { id: 'red', color: '#fb7185', main: '#fda4af', sub: 'rgba(254, 205, 211, 0.72)', glow: 'rgba(251, 113, 133, 0.34)' },
  { id: 'blue', color: '#60a5fa', main: '#93c5fd', sub: 'rgba(191, 219, 254, 0.74)', glow: 'rgba(96, 165, 250, 0.36)' },
  { id: 'green', color: '#34d399', main: '#86efac', sub: 'rgba(187, 247, 208, 0.72)', glow: 'rgba(52, 211, 153, 0.32)' },
  { id: 'purple', color: '#a78bfa', main: '#c4b5fd', sub: 'rgba(221, 214, 254, 0.72)', glow: 'rgba(167, 139, 250, 0.34)' }
];

const activeTheme = computed(() => {
  if (config.colorTheme === 'custom') {
    return getCustomTheme(config.customColor);
  }
  return themes.find(t => t.id === config.colorTheme) || themes[0];
});

const lyricMainStyle = computed(() => ({
  fontSize: `${config.fontSize}px`,
  color: activeTheme.value.main,
  textShadow: `0 1px 2px rgba(15, 23, 42, 0.58), 0 10px 28px rgba(15, 23, 42, 0.34), 0 0 18px ${activeTheme.value.glow}`
}));
const lyricMainBaseStyle = computed(() => ({
  fontSize: `${config.fontSize}px`,
  color: activeTheme.value.sub,
  textShadow: '0 1px 2px rgba(15, 23, 42, 0.58), 0 6px 18px rgba(15, 23, 42, 0.34)'
}));
const lyricSubStyle = computed(() => ({
  fontSize: `${Math.max(14, Math.min(Number(config.subFontSize), config.fontSize - 6))}px`,
  color: activeTheme.value.sub,
  textShadow: '0 1px 2px rgba(15, 23, 42, 0.48), 0 6px 18px rgba(15, 23, 42, 0.26)'
}));

const getCharProgress = (w) => {
  const t = currentPlayTime.value;
  if (!w || !w.duration || t <= w.startTime) return 0;
  if (t >= w.endTime) return 100;
  const p = ((t - w.startTime) / w.duration) * 100;
  return Math.max(0, Math.min(100, p));
};

const startAnimation = () => {
  if (animationFrameId) return;
  const loop = () => {
    if (!isPlaying.value || !config.karaokeMode) {
      animationFrameId = null;
      return;
    }
    const elapsed = (performance.now() - lastSyncTimestamp.value) / 1000;
    currentPlayTime.value = lastSyncPlayTime.value + elapsed;
    animationFrameId = requestAnimationFrame(loop);
  };
  animationFrameId = requestAnimationFrame(loop);
};

const stopAnimation = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

const updateLyricHotArea = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    if (!window.lyricAPI?.updateHotArea) return;

    const root = document.getElementById('desktop-lyric-root');
    const lines = Array.from(document.querySelectorAll('.lyric-line'))
      .filter(el => el.offsetParent !== null && el.textContent.trim());
    if (!root || lines.length === 0) return;

    const rootRect = root.getBoundingClientRect();
    const rects = lines.map(el => el.getBoundingClientRect());
    const left = Math.min(...rects.map(rect => rect.left));
    const top = Math.min(...rects.map(rect => rect.top));
    const right = Math.max(...rects.map(rect => rect.right));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    const padding = 10;

    window.lyricAPI.updateHotArea({
      x: Math.max(0, left - rootRect.left - padding),
      y: Math.max(0, top - rootRect.top - padding),
      width: Math.min(rootRect.width, right - left + padding * 2),
      height: Math.min(rootRect.height, bottom - top + padding * 2)
    });
  });
};

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

const closeLyricWindow = () => {
  if (window.lyricAPI) window.lyricAPI.toggle();
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
  if (typeof config.karaokeMode !== 'boolean') {
    config.karaokeMode = true;
  }
  // 旧配置无 subFontSize 字段时，初始化为“主歌词 - 6px”，并统一钳制差值约束
  clampSubFontSize();

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
      currentText.value = data.currentText || '';
      nextText.value = data.nextText || '';
      currentTranslation.value = data.currentTranslation || '';
      isPlaying.value = !!data.isPlaying;

      lineStartTime.value = data.lineStartTime || 0;
      lineDuration.value = data.lineDuration || 0;
      currentWords.value = Array.isArray(data.words) ? data.words : [];

      lastSyncPlayTime.value = typeof data.currentTime === 'number' ? data.currentTime : 0;
      lastSyncTimestamp.value = performance.now();
      currentPlayTime.value = lastSyncPlayTime.value;

      if (isPlaying.value && config.karaokeMode) {
        startAnimation();
      } else {
        stopAnimation();
      }

      updateLyricHotArea();
    });

    window.lyricAPI.onMouseEnter(() => {
      handleMouseEnter();
    });

    window.lyricAPI.onMouseLeave(() => {
      handleMouseLeave();
    });
  }

  const handleStorageChange = (e) => {
    if (e.key === 'kg_desktop_lyric_config' && e.newValue) {
      try {
        Object.assign(config, JSON.parse(e.newValue));
        clampSubFontSize();
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorageChange);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      closeLyricWindow();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  updateLyricHotArea();
});

onUnmounted(() => {
  stopAnimation();
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener('keydown', handleKeyDown);
});

watch([() => isPlaying.value, () => config.karaokeMode], ([playing, karaoke]) => {
  if (playing && karaoke) {
    lastSyncTimestamp.value = performance.now();
    startAnimation();
  } else {
    stopAnimation();
  }
  updateLyricHotArea();
});

// 主歌词调小时，若副歌词超出上限，自动压回至主歌词 - 6px
watch(() => config.fontSize, () => {
  clampSubFontSize();
});

watch(config, (v) => {
  localStorage.setItem('kg_desktop_lyric_config', JSON.stringify(v));
  updateLyricHotArea();
}, { deep: true });
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
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.34;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.lyric-main {
  font-weight: 700;
  -webkit-line-clamp: 2;
  letter-spacing: 0;
}

.lyric-karaoke {
  position: relative;
  display: block;
  text-align: center;
  max-width: 100%;
  word-break: break-word;
  white-space: normal;
  line-height: 1.34;
}

.k-char-box {
  position: relative;
  display: inline-block;
  white-space: pre;
  vertical-align: baseline;
}

.k-char-base {
  display: inline;
}

.k-char-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  overflow: hidden;
  white-space: pre;
  pointer-events: none;
  will-change: width;
  text-shadow: none !important;
}

.lyric-sub {
  font-weight: 600;
  -webkit-line-clamp: 2;
  margin-top: 4px;
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

.st-sizes {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.st-size-row {
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
  align-items: center;
  gap: 8px;
}

.st-color-dot {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
  box-sizing: border-box;
  padding: 0;
  flex-shrink: 0;
}

.st-color-dot:hover {
  transform: scale(1.15);
}

.st-color-active {
  border-color: #fff;
  transform: scale(1.2);
}

.st-color-custom {
  background: transparent;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
}

.st-color-input-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
  margin: 0;
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
