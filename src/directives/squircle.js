// ==========================================
// 文件：src/directives/squircle.js
// 职责：Vue 3 全局指令 v-squircle
// 功能：利用 ResizeObserver 动态响应尺寸变化，应用纯矢量 Apple 连续曲率超椭圆
// 强化：支持 5 阶 Apple HIG 曲率 Token、内置等宽矢量边框 (SVG Stroke)
// ==========================================
import { getSquircleSvgPath } from '../utils/squircle.js';

export const SQUIRCLE_TOKENS = {
  xs: 5,   // 徽章、微标签
  sm: 8,   // 次级按钮、单选卡片项、输入框
  md: 10,  // 分类 Tabs、主行动 CTA 按钮
  lg: 14,  // 内容配置卡片 (section)、横幅 Banner
  xl: 18,  // 弹窗主视口底板、浮窗
};

/**
 * 规范化入参配置
 * 支持格式：
 * - v-squircle (默认 8px, 0.6 平滑度)
 * - v-squircle="'lg'" (快捷 Token: 14px)
 * - v-squircle="14" (数值半径)
 * - v-squircle="{ size: 'lg', border: 2, borderColor: '#3b82f6' }"
 * - v-squircle="{ radius: 14, smoothing: 0.6, border: 1, borderColor: 'rgba(...)' }"
 */
function normalizeOptions(val) {
  if (val === undefined || val === null || val === '') {
    return { radius: SQUIRCLE_TOKENS.sm, smoothing: 0.6, border: 0 };
  }
  if (typeof val === 'string') {
    const tokenRadius = SQUIRCLE_TOKENS[val] ?? parseFloat(val);
    return { radius: isNaN(tokenRadius) ? SQUIRCLE_TOKENS.sm : tokenRadius, smoothing: 0.6, border: 0 };
  }
  if (typeof val === 'number') {
    return { radius: val, smoothing: 0.6, border: 0 };
  }
  if (typeof val === 'object') {
    let radius = val.radius;
    if (radius === undefined && val.size && SQUIRCLE_TOKENS[val.size]) {
      radius = SQUIRCLE_TOKENS[val.size];
    }
    return {
      radius: radius ?? SQUIRCLE_TOKENS.sm,
      smoothing: val.smoothing ?? 0.6,
      border: Number(val.border) || 0,
      borderColor: val.borderColor || 'currentColor',
      topLeft: val.topLeft,
      topRight: val.topRight,
      bottomLeft: val.bottomLeft,
      bottomRight: val.bottomRight,
      preserveSmoothing: val.preserveSmoothing ?? true,
    };
  }
  return { radius: SQUIRCLE_TOKENS.sm, smoothing: 0.6, border: 0 };
}

function getElementLayoutSize(el, entry) {
  // 1. 优先从 ResizeObserverEntry 获取原生 borderBoxSize（严格不受祖先 CSS Transform 缩放影响）
  if (entry && entry.borderBoxSize && entry.borderBoxSize.length > 0) {
    const inlineSize = Math.round(entry.borderBoxSize[0].inlineSize);
    const blockSize = Math.round(entry.borderBoxSize[0].blockSize);
    if (inlineSize > 0 && blockSize > 0) {
      return { width: inlineSize, height: blockSize };
    }
  }
  // 2. 采用 offsetWidth / offsetHeight（元素本地布局像素尺寸，免疫任何 scale 动画干扰）
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (w > 0 && h > 0) {
    return { width: w, height: h };
  }
  // 3. 最终兜底回退
  const rect = el.getBoundingClientRect();
  return { width: Math.round(rect.width), height: Math.round(rect.height) };
}

function updateElementSquircle(el, opts, entry) {
  if (!el) return;
  const { width, height } = getElementLayoutSize(el, entry);

  if (width === 0 || height === 0) return;

  // 缓存前次计算的尺寸与参数，避免无意义的重绘与动效帧颠簸
  const cacheKey = `${width}_${height}_${opts.radius}_${opts.smoothing}_${opts.border}_${opts.borderColor}_${opts.topLeft}_${opts.topRight}_${opts.bottomLeft}_${opts.bottomRight}`;
  if (el.__squircleCacheKey === cacheKey) return;
  el.__squircleCacheKey = cacheKey;

  // 1. 计算外部主体裁剪路径
  const outerPath = getSquircleSvgPath({
    width,
    height,
    cornerRadius: opts.radius,
    topLeftCornerRadius: opts.topLeft,
    topRightCornerRadius: opts.topRight,
    bottomLeftCornerRadius: opts.bottomLeft,
    bottomRightCornerRadius: opts.bottomRight,
    cornerSmoothing: opts.smoothing,
    preserveSmoothing: opts.preserveSmoothing,
  });

  if (outerPath) {
    el.style.clipPath = `path('${outerPath}')`;
    if (!el.style.willChange.includes('clip-path')) {
      el.style.willChange = el.style.willChange ? `${el.style.willChange}, clip-path` : 'clip-path';
    }
  }

  // 2. 边框处理：若配置了 border，注入/更新精确等宽矢量描边 SVG
  if (opts.border > 0) {
    // 确保宿主具备定位上下文（不覆盖已有 relative/absolute/fixed）
    const computedPosition = window.getComputedStyle(el).position;
    if (computedPosition === 'static') {
      el.style.position = 'relative';
    }

    let svg = el.querySelector(':scope > .__squircle_border');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', '__squircle_border');
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '20';
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('fill', 'none');
      svg.appendChild(pathEl);
      el.appendChild(svg);
    }

    const strokeEl = svg.querySelector('path');
    if (strokeEl) {
      // 矢量描边居中算法：按描边宽度半值 (border / 2) 内缩，实现全周 360° 绝对等宽
      const inset = opts.border / 2;
      const innerW = Math.max(0, width - opts.border);
      const innerH = Math.max(0, height - opts.border);
      const innerR = Math.max(0, opts.radius - inset);

      const strokePath = getSquircleSvgPath({
        width: innerW,
        height: innerH,
        cornerRadius: innerR,
        topLeftCornerRadius: opts.topLeft !== undefined ? Math.max(0, opts.topLeft - inset) : undefined,
        topRightCornerRadius: opts.topRight !== undefined ? Math.max(0, opts.topRight - inset) : undefined,
        bottomLeftCornerRadius: opts.bottomLeft !== undefined ? Math.max(0, opts.bottomLeft - inset) : undefined,
        bottomRightCornerRadius: opts.bottomRight !== undefined ? Math.max(0, opts.bottomRight - inset) : undefined,
        cornerSmoothing: opts.smoothing,
        preserveSmoothing: opts.preserveSmoothing,
      });

      strokeEl.setAttribute('d', strokePath);
      strokeEl.setAttribute('stroke', opts.borderColor);
      strokeEl.setAttribute('stroke-width', opts.border);
      strokeEl.setAttribute('transform', `translate(${inset}, ${inset})`);
    }
  } else {
    // 若未配置边框或被清空，移除残留的矢量边框层
    const existingSvg = el.querySelector(':scope > .__squircle_border');
    if (existingSvg) {
      existingSvg.remove();
    }
  }
}

export const squircleDirective = {
  mounted(el, binding) {
    const opts = normalizeOptions(binding.value);
    el.__squircleOptions = opts;

    let rafId = null;
    const update = (entry) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateElementSquircle(el, el.__squircleOptions, entry);
      });
    };

    el.__squircleUpdate = update;

    // 使用 ResizeObserver 监听元素自身尺寸变化（响应式排版、动态内容增减）
    const observer = new ResizeObserver((entries) => {
      const entry = entries && entries[0];
      update(entry);
    });

    observer.observe(el);
    el.__squircleObserver = observer;

    // 初始立即执行一次
    update();
  },

  updated(el, binding) {
    const newOpts = normalizeOptions(binding.value);
    el.__squircleOptions = newOpts;
    if (el.__squircleUpdate) {
      el.__squircleUpdate();
    }
  },

  unmounted(el) {
    if (el.__squircleObserver) {
      el.__squircleObserver.disconnect();
      delete el.__squircleObserver;
    }
    const svg = el.querySelector(':scope > .__squircle_border');
    if (svg) svg.remove();

    delete el.__squircleUpdate;
    delete el.__squircleOptions;
    delete el.__squircleCacheKey;
  }
};
