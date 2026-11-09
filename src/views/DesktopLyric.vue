<template>
  <div
    id="desktop-lyric-root"
    class="lyric-root"
    :class="[`layout-${config.layoutDirection || 'horizontal'}`]"
    @mousedown="handleDragStart"
  >
    <div
      class="lyric-bg"
      :class="{ 'lyric-bg-active': isHovered || showSettings }"
    ></div>

    <div class="lyric-toolbar" :class="{ 'tb-locked': isLocked }" v-show="isHovered && !showSettings">
      <template v-if="isLocked">
        <button
          class="tb-btn tb-btn-unlock"
          @click.stop="unlockLyric"
          @mouseenter="showTip($event, '点击解锁')"
          @mouseleave="hideTip"
        >
          <AppIcon name="unlock" class="w-4 h-4" />
        </button>
        <span class="tb-label">点击解锁</span>
      </template>
      <template v-else>
        <!-- 左侧分组：设置与排版切换（2个按钮） -->
        <button
          class="tb-btn tb-btn-settings"
          @click.stop="openSettings"
          @mouseenter="showTip($event, '设置')"
          @mouseleave="hideTip"
        >
          <AppIcon name="settings" class="w-4 h-4" />
        </button>
        <button
          class="tb-btn tb-btn-layout"
          @click.stop="toggleLayoutDirection"
          @mouseenter="showTip($event, isVertical ? '切换至横排模式' : '切换至竖排模式')"
          @mouseleave="hideTip"
        >
          <svg v-if="!isVertical" class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="9.5" y="2" width="2.5" height="12" rx="1.2" />
            <rect x="4" y="2" width="2.5" height="8" rx="1.2" />
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="4" width="12" height="2.5" rx="1.2" />
            <rect x="2" y="9.5" width="8" height="2.5" rx="1.2" />
          </svg>
        </button>

        <span class="tb-sep"></span>

        <!-- 中间分组：核心播放控制（3个按钮） -->
        <button
          class="tb-btn tb-btn-prev"
          @click.stop="sendCommand('prev')"
          @mouseenter="showTip($event, '上一首')"
          @mouseleave="hideTip"
        >
          <AppIcon name="prev" class="w-4 h-4" />
        </button>
        <button
          class="tb-btn tb-btn-play"
          @click.stop="sendCommand('togglePlay')"
          @mouseenter="showTip($event, isPlaying ? '暂停' : '播放')"
          @mouseleave="hideTip"
        >
          <AppIcon :name="isPlaying ? 'pause' : 'play'" class="w-4 h-4" />
        </button>
        <button
          class="tb-btn tb-btn-next"
          @click.stop="sendCommand('next')"
          @mouseenter="showTip($event, '下一首')"
          @mouseleave="hideTip"
        >
          <AppIcon name="next" class="w-4 h-4" />
        </button>

        <span class="tb-sep"></span>

        <!-- 右侧分组：窗口锁定与关闭（2个按钮） -->
        <button
          class="tb-btn tb-btn-lock"
          @click.stop="lockLyric"
          @mouseenter="showTip($event, '锁定穿透')"
          @mouseleave="hideTip"
        >
          <AppIcon name="lock" class="w-4 h-4" />
        </button>
        <button
          class="tb-btn tb-btn-close"
          @click.stop="closeLyricWindow"
          @mouseenter="showTip($event, '关闭')"
          @mouseleave="hideTip"
        >
          <AppIcon name="close" class="w-4 h-4" />
        </button>
      </template>
    </div>

    <div class="lyric-body" :class="{ 'lyric-body-hidden': showSettings }">
      <!-- 主歌词列 -->
      <div class="lyric-col lyric-col-main">
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
                [isVertical ? 'height' : 'width']: `${getCharProgress(w)}%`,
                color: activeTheme.main
              }"
            >{{ w.text }}</span>
          </span>
        </div>
        <!-- 关闭逐字过渡模式或静态文本 -->
        <div v-else class="lyric-line lyric-main" :style="lyricMainStyle">
          {{ currentText }}
        </div>
      </div>

      <!-- 副歌词列 (双排并列显示) -->
      <div
        v-if="config.showSub && (currentTranslation || nextText)"
        class="lyric-col lyric-col-sub"
      >
        <div class="lyric-line lyric-sub" :style="lyricSubStyle">
          {{ currentTranslation || nextText }}
        </div>
      </div>
    </div>

    <transition name="panel-fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings" @mousedown.stop>
        <!-- ================= 横排：经典原版质感 + 逐字/副歌上下双排排版 ================= -->
        <div v-if="!isVertical" class="settings-panel settings-panel-horizontal" @click.stop @mousedown.stop>
          <!-- 排版方向切换 -->
          <div class="st-group st-layout-group">
            <span class="st-label">排版</span>
            <div class="st-segmented">
              <button
                type="button"
                class="st-seg-btn"
                :class="{ 'st-seg-active': config.layoutDirection !== 'vertical' }"
                @click="setLayoutDirection('horizontal')"
              >横排</button>
              <button
                type="button"
                class="st-seg-btn"
                :class="{ 'st-seg-active': config.layoutDirection === 'vertical' }"
                @click="setLayoutDirection('vertical')"
              >竖排</button>
            </div>
          </div>

          <div class="st-divider"></div>

          <!-- 字号调节（主歌词、副歌词上下双排） -->
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

          <!-- 颜色主题 -->
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

          <!-- 功能开关（逐字过渡、显示副歌词上下双排！） -->
          <div class="st-group st-toggles-col">
            <div class="st-toggle-row">
              <span class="st-label">逐字过渡</span>
              <button class="st-toggle" :class="{ 'st-toggle-on': config.karaokeMode }" @click="config.karaokeMode = !config.karaokeMode">
                <span class="st-toggle-knob"></span>
              </button>
            </div>
            <div class="st-toggle-row">
              <span class="st-label">显示副歌词</span>
              <button class="st-toggle" :class="{ 'st-toggle-on': config.showSub }" @click="config.showSub = !config.showSub">
                <span class="st-toggle-knob"></span>
              </button>
            </div>
          </div>

          <div class="st-divider"></div>

          <!-- 完成按钮 -->
          <button class="st-done" @click="closeSettings">完成</button>
        </div>

        <!-- ================= 竖排：方案 C (浮岛层级卡 Vertical Island) ================= -->
        <div v-else class="panel-island-vertical" @click.stop @mousedown.stop>
          <!-- 头部：标题与排版切换 -->
          <div class="island-header">
            <span class="island-title">歌词设置</span>
            <div class="island-seg">
              <button
                type="button"
                class="island-seg-btn"
                :class="{ 'active': config.layoutDirection !== 'vertical' }"
                @click="setLayoutDirection('horizontal')"
              >横</button>
              <button
                type="button"
                class="island-seg-btn"
                :class="{ 'active': config.layoutDirection === 'vertical' }"
                @click="setLayoutDirection('vertical')"
              >竖</button>
            </div>
          </div>

          <!-- 模块 1：双字号微卡 -->
          <div class="island-card">
            <div class="island-slider-row">
              <div class="island-row-info">
                <span>主字号</span>
                <span class="island-val">{{ config.fontSize }}px</span>
              </div>
              <input type="range" min="24" max="50" v-model.number="config.fontSize" class="island-range" />
            </div>
            <div class="island-card-sep"></div>
            <div class="island-slider-row">
              <div class="island-row-info">
                <span>副字号</span>
                <span class="island-val">{{ config.subFontSize }}px</span>
              </div>
              <input type="range" min="14" :max="config.fontSize - 6" v-model.number="config.subFontSize" class="island-range" />
            </div>
          </div>

          <!-- 模块 2：主题色彩网格卡 -->
          <div class="island-card">
            <span class="island-card-label">主题色彩</span>
            <div class="island-colors-grid">
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

          <!-- 模块 3：功能开关列表卡 -->
          <div class="island-card island-card-toggles">
            <div class="island-toggle-row">
              <span class="island-toggle-label">逐字过渡</span>
              <button class="st-toggle" :class="{ 'st-toggle-on': config.karaokeMode }" @click="config.karaokeMode = !config.karaokeMode">
                <span class="st-toggle-knob"></span>
              </button>
            </div>
            <div class="island-card-sep"></div>
            <div class="island-toggle-row">
              <span class="island-toggle-label">副歌双排</span>
              <button class="st-toggle" :class="{ 'st-toggle-on': config.showSub }" @click="config.showSub = !config.showSub">
                <span class="st-toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- 完成按钮 -->
          <button class="island-done-btn" @click="closeSettings">完成</button>
        </div>
      </div>
    </transition>

    <transition name="toast-fade">
      <div v-if="showLockToast" class="lock-toast">
        已锁定鼠标穿透，悬停歌词 1 秒可解锁
      </div>
    </transition>

    <!-- 统一软件全局风格的悬浮提示 Tooltip -->
    <transition name="fade-tooltip">
      <div 
        v-if="tipState.visible && tipState.text"
        class="lyric-tooltip"
        :class="tipState.placement === 'top' ? 'tip-top' : 'tip-bottom'"
        :style="{ left: `${tipState.x}px`, top: `${tipState.y}px` }"
      >
        {{ tipState.text }}
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

const currentWords = ref([]);
const lineStartTime = ref(0);
const lineDuration = ref(0);
const lastSyncPlayTime = ref(0);
const lastSyncTimestamp = ref(0);
const currentPlayTime = ref(0);
let animationFrameId = null;

const config = reactive({
  layoutDirection: 'horizontal',
  fontSize: 34,
  subFontSize: 28,
  colorTheme: 'white',
  customColor: '#38bdf8',
  showSub: true,
  karaokeMode: true
});

const isVertical = computed(() => config.layoutDirection === 'vertical');

// ==================== 全局统一样式的悬浮提示 Tooltip 状态管理 ====================
const tipState = reactive({
  visible: false,
  text: '',
  x: 0,
  y: 0,
  placement: 'bottom'
});

const showTip = (e, text) => {
  const target = e?.currentTarget;
  if (!target || !text) return;
  const rect = target.getBoundingClientRect();
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;

  let x = rect.left + rect.width / 2;
  const estimatedW = text.length * 13 + 24;
  const halfW = estimatedW / 2;
  const pad = 8;
  if (x - halfW < pad) {
    x = halfW + pad;
  } else if (x + halfW > windowWidth - pad) {
    x = windowWidth - halfW - pad;
  }

  let y = rect.bottom + 6;
  let placement = 'bottom';
  if (rect.bottom + 36 > windowHeight && rect.top > 36) {
    y = rect.top - 6;
    placement = 'top';
  }

  tipState.text = text;
  tipState.x = Math.round(x);
  tipState.y = Math.round(y);
  tipState.placement = placement;
  tipState.visible = true;
};

const hideTip = () => {
  tipState.visible = false;
};

const setLayoutDirection = (dir) => {
  if (config.layoutDirection === dir) return;
  config.layoutDirection = dir;
  if (window.lyricAPI?.setLayout) {
    window.lyricAPI.setLayout(dir);
  }
  updateLyricHotArea();
};

const toggleLayoutDirection = (e) => {
  const targetDir = isVertical.value ? 'horizontal' : 'vertical';
  setLayoutDirection(targetDir);
  if (tipState.visible && e?.currentTarget) {
    showTip(e, targetDir === 'vertical' ? '切换至横排模式' : '切换至竖排模式');
  } else {
    hideTip();
  }
};

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
  return Math.max(0, Math.min(100, Math.round(p * 10) / 10));
};

const startAnimation = () => {
  if (animationFrameId) return;
  const loop = () => {
    if (!isPlaying.value || !config.karaokeMode || !currentWords.value || currentWords.value.length === 0) {
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
  hideTip();
  if (showSettings.value) return;
  isHovered.value = false;
};

const handleDragStart = (e) => {
  hideTip();
  if (showSettings.value) return;
  if (e.target.closest('button') || e.target.closest('.settings-overlay') || e.target.closest('input')) return;
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
  hideTip();
  if (window.lyricAPI) window.lyricAPI.toggle();
};

const openSettings = () => {
  hideTip();
  showSettings.value = true;
  if (window.lyricAPI) window.lyricAPI.setIgnoreMouse(false);
};

const closeSettings = () => {
  showSettings.value = false;
  isHovered.value = false;
  if (window.lyricAPI) window.lyricAPI.setMouseAuto();
};

const lockLyric = () => {
  hideTip();
  isLocked.value = true;
  isHovered.value = false;
  if (window.lyricAPI) window.lyricAPI.setIgnoreMouse(true);
  showLockToast.value = true;
  setTimeout(() => { showLockToast.value = false; }, 4000);
};

const unlockLyric = () => {
  hideTip();
  isLocked.value = false;
  if (window.lyricAPI) window.lyricAPI.unlockLyric();
};

const handleStorageChange = (e) => {
  if (e.key === 'kg_desktop_lyric_config' && e.newValue) {
    try {
      const parsed = JSON.parse(e.newValue);
      const oldLayout = config.layoutDirection;
      Object.assign(config, parsed);
      clampSubFontSize();
      if (parsed.layoutDirection && parsed.layoutDirection !== oldLayout) {
        if (window.lyricAPI?.setLayout) {
          window.lyricAPI.setLayout(parsed.layoutDirection);
        }
      }
    } catch (err) {}
  }
};

const handleKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    closeLyricWindow();
  }
};

onMounted(() => {
  try {
    const saved = localStorage.getItem('kg_desktop_lyric_config');
    if (saved) Object.assign(config, JSON.parse(saved));
  } catch (e) {}
  if (!config.layoutDirection) {
    config.layoutDirection = 'horizontal';
  }
  if (typeof config.karaokeMode !== 'boolean') {
    config.karaokeMode = true;
  }
  clampSubFontSize();

  // 同步初始化布局给主进程
  if (window.lyricAPI?.setLayout) {
    window.lyricAPI.setLayout(config.layoutDirection);
  }

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

  window.addEventListener('storage', handleStorageChange);
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
  box-sizing: border-box;
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
  border-radius: 9999px;
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
  cursor: default;
}

.tb-sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}

/* ================= 横排默认歌词样式 ================= */
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
  transition: opacity 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: opacity, transform;
  box-sizing: border-box;
}

.lyric-body-hidden {
  opacity: 0;
}

.lyric-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 100%;
}

.lyric-col-sub {
  margin-top: 4px;
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
}

/* ================= 竖排模式样式 (layout-vertical) ================= */
.layout-vertical {
  flex-direction: column;
  align-items: center;
  padding: 4px 6px;
}

/* 竖排工具栏：紧凑 2行 (上排4个功能按钮平分，下排3个播放按钮居中) */
.layout-vertical .lyric-toolbar {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto;
  row-gap: 6px;
  width: 164px;
  padding: 8px 6px;
  border-radius: 18px;
  justify-content: center;
  align-items: center;
  margin-top: 4px;
  margin-bottom: 6px;
  box-sizing: border-box;
}

.layout-vertical .lyric-toolbar.tb-locked {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  gap: 8px;
  padding: 6px 14px;
}

.layout-vertical .tb-sep {
  display: none !important;
}

.layout-vertical .tb-btn-settings {
  grid-column: 1 / span 3;
  grid-row: 1;
  justify-self: center;
}

.layout-vertical .tb-btn-layout {
  grid-column: 4 / span 3;
  grid-row: 1;
  justify-self: center;
}

.layout-vertical .tb-btn-lock {
  grid-column: 7 / span 3;
  grid-row: 1;
  justify-self: center;
}

.layout-vertical .tb-btn-close {
  grid-column: 10 / span 3;
  grid-row: 1;
  justify-self: center;
}

.layout-vertical .tb-btn-prev {
  grid-column: 1 / span 4;
  grid-row: 2;
  justify-self: center;
}

.layout-vertical .tb-btn-play {
  grid-column: 5 / span 4;
  grid-row: 2;
  justify-self: center;
  width: 36px;
  height: 36px;
}

.layout-vertical .tb-btn-next {
  grid-column: 9 / span 4;
  grid-row: 2;
  justify-self: center;
}

/* 竖排歌词容器：采用物理横向 row-reverse，主歌词在右列，副歌词在左列，实现绝对稳定的双排并列！ */
.layout-vertical .lyric-body {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 10px 14px;
  width: 100%;
  height: 100%;
  overflow: visible;
  box-sizing: border-box;
}

.layout-vertical .lyric-col {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 100%;
  flex-shrink: 0;
  margin: 0;
}

.layout-vertical .lyric-line {
  display: block;
  text-align: center;
  max-height: 100%;
  white-space: normal;
  line-height: 1.38;
  letter-spacing: 2px;
  word-break: break-all;
  overflow-wrap: anywhere;
  -webkit-line-clamp: unset;
  -webkit-box-orient: unset;
}

.layout-vertical .lyric-main {
  font-weight: 700;
  margin: 0;
}

.layout-vertical .lyric-sub {
  font-weight: 600;
  margin: 0;
  opacity: 0.85;
}

/* 竖排下的逐字过渡动画：自上而下染色 */
.layout-vertical .k-char-box {
  display: inline-block;
  white-space: pre;
  vertical-align: top;
}

.layout-vertical .k-char-fill {
  width: 100%;
  height: 0%;
  left: 0;
  top: 0;
  will-change: height;
}

/* ================= 通用设置浮层（彻底杜绝四向移动箭头，光标正常化） ================= */
.settings-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  border-radius: 8px;
  -webkit-app-region: no-drag;
  cursor: default; /* 彻底修复：背景与非可点击区域为默认箭头 */
  user-select: none;
  -webkit-user-select: none;
  box-sizing: border-box;
  padding: 6px 16px;
}

/* ================= 横排：经典原版质感 + 逐字/副歌上下双排排版 ================= */
.settings-panel-horizontal {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(26, 26, 26, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
  cursor: default;
  -webkit-app-region: no-drag;
  box-sizing: border-box;
  max-width: calc(100% - 20px);
}

.st-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  cursor: default;
}

.st-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  cursor: default;
}

/* 字号调节区（主歌词、副歌词上下双排） */
.st-sizes {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.st-size-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.st-range {
  width: 90px;
  accent-color: #3b82f6;
  cursor: pointer;
  height: 4px;
}

.st-value {
  font-size: 12px;
  font-family: monospace;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  min-width: 20px;
  text-align: right;
  cursor: default;
}

/* 功能开关区（逐字过渡、显示副歌词上下双排！） */
.st-toggles-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  width: 120px;
}

.st-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

/* 排版分段切换按钮 */
.st-segmented {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
  cursor: default;
}

.st-seg-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.st-seg-btn:hover {
  color: #fff;
}

.st-seg-btn.st-seg-active {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

/* 颜色选择 */
.st-colors {
  display: flex;
  align-items: center;
  gap: 8px;
}

.st-color-dot {
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
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

/* 开关组件 */
.st-toggle {
  position: relative;
  width: 34px;
  height: 18px;
  border-radius: 9999px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.st-toggle-on {
  background: #3b82f6;
}

.st-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.st-toggle-on .st-toggle-knob {
  transform: translateX(16px);
}

/* 分割线 */
.st-divider {
  width: 1px;
  height: 38px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 2px;
  flex-shrink: 0;
  cursor: default;
}

/* 完成按钮 */
.st-done {
  padding: 8px 22px;
  border-radius: 14px;
  border: none;
  background: #fff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.1s ease;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transform: translateZ(0);
  will-change: background, box-shadow;
  backface-visibility: hidden;
}

.st-done:hover {
  background: #f8fafc;
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.28);
}

.st-done:active {
  transform: scale(0.96) translateZ(0);
}

/* ================= 竖排：方案 C (浮岛层级卡 Vertical Island) ================= */
.panel-island-vertical {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 184px;
  max-height: calc(100% - 20px);
  padding: 12px 10px;
  background: rgba(18, 18, 22, 0.88);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  border-radius: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  cursor: default;
  -webkit-app-region: no-drag;
  box-sizing: border-box;
}

.island-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.island-title {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  cursor: default;
}

.island-seg {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.island-seg-btn {
  padding: 2px 7px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.island-seg-btn.active {
  background: #2563eb;
  color: #fff;
}

.island-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.island-card-sep {
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 2px 0;
  cursor: default;
}

.island-slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.island-row-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  cursor: default;
}

.island-val {
  font-family: monospace;
  color: #60a5fa;
  font-weight: 700;
}

.island-range {
  width: 100%;
  accent-color: #3b82f6;
  cursor: pointer;
  height: 4px;
}

.island-card-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  cursor: default;
}

.island-colors-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 2px 2px;
  box-sizing: border-box;
}

.island-colors-grid .st-color-dot {
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  border-width: 1.5px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.island-colors-grid .st-color-dot:hover {
  transform: scale(1.12);
}

.island-colors-grid .st-color-active {
  transform: none !important;
  border-color: transparent !important;
  box-shadow: 0 0 0 2px rgba(22, 22, 26, 0.95), 0 0 0 3.5px #ffffff !important;
}

.island-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.island-toggle-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  cursor: default;
}

.island-done-btn {
  width: 100%;
  padding: 8px 0;
  border-radius: 12px;
  border: none;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin-top: 2px;
  flex-shrink: 0;
}

.island-done-btn:hover {
  background: #f1f5f9;
}

.island-done-btn:active {
  transform: scale(0.97);
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
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  pointer-events: none;
  -webkit-app-region: no-drag;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: opacity, transform;
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

/* ================= 统一软件全局风格 Tooltip 浮窗 ================= */
.lyric-tooltip {
  position: fixed;
  z-index: 1000;
  transform: translateX(-50%);
  padding: 5px 11px;
  background: rgba(18, 18, 24, 0.94);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  color: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
  pointer-events: none;
  -webkit-app-region: no-drag;
}

.lyric-tooltip.tip-top {
  transform: translate(-50%, -100%);
}

.fade-tooltip-enter-active,
.fade-tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-tooltip-enter-from,
.fade-tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, -2px);
}

.fade-tooltip-enter-from.tip-top,
.fade-tooltip-leave-to.tip-top {
  opacity: 0;
  transform: translate(-50%, calc(-100% + 2px));
}
</style>
