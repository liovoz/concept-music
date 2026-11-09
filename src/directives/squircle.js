// ==========================================
// 文件：src/directives/squircle.js
// 职责：Vue 3 全局指令 v-squircle
// 功能：利用 ResizeObserver 动态响应尺寸变化，应用纯矢量 Apple 连续曲率超椭圆
// 强化：支持 5 阶 Apple HIG 曲率 Token、内置智能边框自愈引擎 (360° 等宽 SVG Vector Stroke)、
//       全自动嗅探 CSS 边框宽度与颜色、深浅模式及类名变更 MutationObserver 响应式监听、
//       SVG 描边硬件加速色彩平滑过渡、原生过渡滞留抑制与高 DPI 子像素抗锯齿保护
// ==========================================
import { getSquircleSvgPath } from '../utils/squircle.js';

export const SQUIRCLE_TOKENS = {
  xs: 5,    // 徽章、微标签
  sm: 8,    // 次级按钮、单选卡片项、输入框
  md: 10,   // 分类 Tabs、主行动 CTA 按钮
  lg: 14,   // 内容配置卡片 (section)、横幅 Banner
  xl: 18,   // 弹窗主视口底板、浮窗
  '2xl': 24 // 大型对话框主视口底板 (Sheet/Dialog)
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
      borderColor: val.borderColor || '',
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

/**
 * 自动嗅探与中和 CSS 边框
 * 原理：通过 getComputedStyle 获取元素实际渲染的 border-width 与 border-color。
 * 当检测到有效边框时，将 CSS borderColor 置为 transparent（保留 borderWidth 避免布局回流），
 * 并返回有效宽度与颜色供 SVG 等宽矢量描边引擎使用。
 */
function sniffAndNeutralizeBorder(el, opts) {
  if (!el || typeof window === 'undefined') {
    return { borderWidth: 0, borderColor: '', topW: 0, leftW: 0 };
  }
  const safeOpts = opts || el.__squircleOptions || {};

  // 若已有缓存的边框计算信息，直接复用，杜绝重复调用 getComputedStyle 与引发回流抖动
  if (el.__squircleBorderInfo) {
    return el.__squircleBorderInfo;
  }

  // 临时压制宿主元素可能存在的 transition，防止 getComputedStyle 读取到向目标色补间的过渡初值 rgba(0, 0, 0, 0)
  const prevTransition = el.style.transition;
  el.style.setProperty('transition', 'none', 'important');

  // 临时移除可能已内联设置的 transparent 样式，以便准确探测 CSS 类名中的原生边框颜色
  if (el.__squircleBorderOverridden) {
    el.style.removeProperty('border-color');
  }

  const cs = window.getComputedStyle(el);
  const topW = parseFloat(cs.borderTopWidth) || 0;
  const rightW = parseFloat(cs.borderRightWidth) || 0;
  const bottomW = parseFloat(cs.borderBottomWidth) || 0;
  const leftW = parseFloat(cs.borderLeftWidth) || 0;
  const maxW = Math.max(topW, rightW, bottomW, leftW);

  // 若开发者显式指定了 border > 0，则优先遵循开发者指定
  if (safeOpts.border > 0) {
    if (maxW > 0) {
      el.style.setProperty('border-color', 'transparent', 'important');
      el.__squircleBorderOverridden = true;
    }
    if (prevTransition) {
      el.style.transition = prevTransition;
    } else {
      el.style.removeProperty('transition');
    }
    const info = {
      borderWidth: safeOpts.border,
      borderColor: safeOpts.borderColor || 'currentColor',
      topW,
      leftW
    };
    el.__squircleBorderInfo = info;
    return info;
  }

  const bStyle = cs.borderTopStyle;
  const bColor = cs.borderTopColor;

  const isVisibleColor = bColor && bColor !== 'transparent' && bColor !== 'rgba(0, 0, 0, 0)';
  const hasValidBorder = maxW > 0 && bStyle !== 'none' && isVisibleColor;

  if (hasValidBorder) {
    // 抑制 CSS transition-all 对 border-color 的补间拦截，防止产生 150ms 渐变消隐滞留
    if (cs.transitionProperty && (cs.transitionProperty.includes('all') || cs.transitionProperty.includes('border-color'))) {
      el.style.transitionProperty = cs.transitionProperty.replace(/border-color/g, 'none').replace(/\ball\b/g, 'background-color, color, box-shadow, transform, opacity');
      el.__squircleTransitionOverridden = true;
    }

    // 中和原生的 CSS 边框颜色，防止 Skia 正圆弧在超椭圆裁切下被削薄
    // 保留 borderWidth 保证盒模型（Box Sizing）不发生任何回流或内边距突变
    el.style.setProperty('border-color', 'transparent', 'important');
    el.__squircleBorderOverridden = true;

    if (prevTransition) {
      el.style.transition = prevTransition;
    } else {
      el.style.removeProperty('transition');
    }

    const info = {
      borderWidth: maxW,
      borderColor: bColor,
      topW,
      leftW
    };
    el.__squircleBorderInfo = info;
    return info;
  } else {
    if (el.__squircleBorderOverridden) {
      el.style.removeProperty('border-color');
      el.__squircleBorderOverridden = false;
    }
    if (el.__squircleTransitionOverridden) {
      el.style.removeProperty('transition-property');
      el.__squircleTransitionOverridden = false;
    }

    if (prevTransition) {
      el.style.transition = prevTransition;
    } else {
      el.style.removeProperty('transition');
    }

    const info = { borderWidth: 0, borderColor: '', topW: 0, leftW: 0 };
    el.__squircleBorderInfo = info;
    return info;
  }
}

function updateElementSquircle(el, opts, entry) {
  if (!el) return;
  const safeOpts = opts || el.__squircleOptions || normalizeOptions();
  const { width, height } = getElementLayoutSize(el, entry);

  if (width === 0 || height === 0) return;
  el.__squircleLastW = width;
  el.__squircleLastH = height;

  // 1. 嗅探并中和边框（获取边框物理厚度与 Padding Box 偏移）
  const { borderWidth, borderColor, topW, leftW } = sniffAndNeutralizeBorder(el, safeOpts);

  // 2. 缓存键：尺寸、曲率、边框厚度与颜色全要素比对，避免高频无意义重绘
  const cacheKey = `${width}_${height}_${safeOpts.radius}_${safeOpts.smoothing}_${borderWidth}_${borderColor}_${safeOpts.topLeft}_${safeOpts.topRight}_${safeOpts.bottomLeft}_${safeOpts.bottomRight}`;
  if (el.__squircleCacheKey === cacheKey) return;
  el.__squircleCacheKey = cacheKey;

  // 3. 计算外部主体裁剪路径
  const outerPath = getSquircleSvgPath({
    width,
    height,
    cornerRadius: safeOpts.radius,
    topLeftCornerRadius: safeOpts.topLeft,
    topRightCornerRadius: safeOpts.topRight,
    bottomLeftCornerRadius: safeOpts.bottomLeft,
    bottomRightCornerRadius: safeOpts.bottomRight,
    cornerSmoothing: safeOpts.smoothing,
    preserveSmoothing: safeOpts.preserveSmoothing,
  });

  if (outerPath) {
    el.style.clipPath = `path('${outerPath}')`;
  }

  // 4. 等宽矢量边框 (SVG Stroke) 渲染与更新
  if (borderWidth > 0) {
    // 确保宿主具备定位上下文（不覆盖已有 relative/absolute/fixed）
    const computedPosition = window.getComputedStyle(el).position;
    if (computedPosition === 'static') {
      el.style.position = 'relative';
      el.__squirclePositionOverridden = true;
    }

    let svg = el.querySelector(':scope > .__squircle_border');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', '__squircle_border');
      svg.style.position = 'absolute';
      svg.style.overflow = 'visible';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '10';
      // 强力 CSS 隔离：阻断 Flex/Grid 间距工具类（如 space-x-* / space-y-*）与继承样式的侵入
      svg.style.setProperty('margin', '0', 'important');
      svg.style.setProperty('padding', '0', 'important');
      svg.style.setProperty('border', 'none', 'important');
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('fill', 'none');
      pathEl.style.transition = 'stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
      svg.appendChild(pathEl);
      el.appendChild(svg);
    }

    // 强行突破父级 Padding Box 束缚，与宿主 Border Box 像素严密对齐，消除右侧与底侧截断
    svg.style.setProperty('margin', '0', 'important');
    svg.style.setProperty('padding', '0', 'important');
    svg.style.setProperty('border', 'none', 'important');
    svg.style.top = `-${topW || 0}px`;
    svg.style.left = `-${leftW || 0}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.overflow = 'visible';

    const strokeEl = svg.querySelector('path');
    if (strokeEl) {
      // 外路径同形双倍自裁切描边架构：
      // 直接复用与宿主 clip-path 完全相同的 outerPath，stroke 设为 2 倍 borderWidth。
      // 外侧一半（borderWidth）被宿主的 clip-path 硬件级微米级精度彻底裁除，
      // 留存在容器内侧的一半即为数学上 100% 绝对同心平行、贴合边缘的等宽内描边！
      // 彻底消除由于内缩算法非同心导致的四角空隙与深浅模式切换时的线条伪影。
      strokeEl.setAttribute('d', outerPath);
      strokeEl.setAttribute('stroke', borderColor);
      strokeEl.setAttribute('stroke-width', String(borderWidth * 2));
      strokeEl.removeAttribute('transform');
    }
  } else {
    // 若无边框或已被清空，移除残留的矢量边框层
    const existingSvg = el.querySelector(':scope > .__squircle_border');
    if (existingSvg) {
      existingSvg.remove();
    }
  }
}

// 全局活跃超椭圆元素集合（用于主题切换时全量通知刷新）
const activeSquircleElements = new Set();
let globalThemeObserver = null;

function ensureGlobalThemeObserver() {
  if (globalThemeObserver || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  globalThemeObserver = new MutationObserver(() => {
    activeSquircleElements.forEach((el) => {
      if (el && el.__squircleUpdate) {
        // 主题切换时清理缓存与边框嗅探信息，强制响应新主题
        el.__squircleBorderInfo = null;
        el.__squircleCacheKey = null;
        el.__squircleUpdate();
      }
    });
  });
  if (document.documentElement) {
    globalThemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
  }
}

function areBindingsEqual(newVal, oldVal) {
  if (newVal === oldVal) return true;
  if (!newVal || !oldVal) return false;
  if (typeof newVal === 'object' && typeof oldVal === 'object') {
    const keysA = Object.keys(newVal);
    const keysB = Object.keys(oldVal);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (newVal[k] !== oldVal[k]) return false;
    }
    return true;
  }
  return false;
}

export const squircleDirective = {
  mounted(el, binding) {
    const opts = normalizeOptions(binding.value);
    el.__squircleOptions = opts;

    let rafId = null;
    const update = (entry) => {
      if (entry) {
        const { width, height } = getElementLayoutSize(el, entry);
        if (width === el.__squircleLastW && height === el.__squircleLastH && el.__squircleCacheKey) {
          return; // 尺寸未发生整数像素变化，免疫 CSS Transform 亚像素抖动
        }
        el.__squircleLastW = width;
        el.__squircleLastH = height;
      }
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateElementSquircle(el, el.__squircleOptions, entry);
      });
    };

    el.__squircleUpdate = update;
    activeSquircleElements.add(el);
    ensureGlobalThemeObserver();

    // 1. ResizeObserver 监听自身几何尺寸变化（动态排版、内容展开）
    const ro = new ResizeObserver((entries) => {
      const entry = entries && entries[0];
      update(entry);
    });
    ro.observe(el);
    el.__squircleObserver = ro;

    // 2. MutationObserver 仅监听元素自身的 class 变更（如选中激活态切换、深色模式类名变更）
    const mo = new MutationObserver(() => {
      el.__squircleBorderInfo = null;
      el.__squircleCacheKey = null; // 清除缓存以读取新状态
      update();
    });
    mo.observe(el, {
      attributes: true,
      attributeFilter: ['class']
    });
    el.__squircleMutationObserver = mo;

    // 初始立即执行一次
    update();
  },

  updated(el, binding) {
    if (areBindingsEqual(binding.value, binding.oldValue)) {
      return;
    }
    const newOpts = normalizeOptions(binding.value);
    el.__squircleOptions = newOpts;
    el.__squircleBorderInfo = null;
    el.__squircleCacheKey = null;
    if (el.__squircleUpdate) {
      el.__squircleUpdate();
    }
  },

  unmounted(el) {
    activeSquircleElements.delete(el);

    if (el.__squircleObserver) {
      el.__squircleObserver.disconnect();
      delete el.__squircleObserver;
    }
    if (el.__squircleMutationObserver) {
      el.__squircleMutationObserver.disconnect();
      delete el.__squircleMutationObserver;
    }

    if (el.__squircleBorderOverridden) {
      el.style.removeProperty('border-color');
      delete el.__squircleBorderOverridden;
    }
    if (el.__squircleTransitionOverridden) {
      el.style.removeProperty('transition-property');
      delete el.__squircleTransitionOverridden;
    }
    if (el.__squirclePositionOverridden) {
      el.style.removeProperty('position');
      delete el.__squirclePositionOverridden;
    }

    const svg = el.querySelector(':scope > .__squircle_border');
    if (svg) svg.remove();

    delete el.__squircleUpdate;
    delete el.__squircleOptions;
    delete el.__squircleBorderInfo;
    delete el.__squircleCacheKey;
    delete el.__squircleLastW;
    delete el.__squircleLastH;
  }
};
