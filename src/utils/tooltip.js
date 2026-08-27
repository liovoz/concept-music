// ====================
// 文件：src/utils/tooltip.js
// ====================
import { reactive } from 'vue';

export const tooltipState = reactive({
  visible: false,
  text: '',
  x: 0,
  y: 0,
  isBottom: false,
  maxHeight: 320,
  activeEl: null
});

let hideTimer = null;
let showTimer = null;
let globalListenersAttached = false;

export const hideTooltip = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  tooltipState.visible = false;
  tooltipState.activeEl = null;
};

const handleGlobalPointerMove = (e) => {
  if (!tooltipState.visible || !tooltipState.activeEl) return;
  
  if (!document.body.contains(tooltipState.activeEl)) {
    hideTooltip();
    return;
  }

  const rect = tooltipState.activeEl.getBoundingClientRect();
  const buffer = 6;
  const isInside = (
    e.clientX >= rect.left - buffer &&
    e.clientX <= rect.right + buffer &&
    e.clientY >= rect.top - buffer &&
    e.clientY <= rect.bottom + buffer
  );

  if (!isInside) {
    hideTooltip();
  }
};

const handleGlobalScroll = (e) => {
  if (!tooltipState.visible || !tooltipState.activeEl) return;
  const target = e.target;
  if (target === window || target === document || target === document.documentElement || target === document.body) {
    hideTooltip();
    return;
  }
  if (target && typeof target.contains === 'function' && target.contains(tooltipState.activeEl)) {
    hideTooltip();
  }
};

const handleGlobalDismiss = () => {
  if (tooltipState.visible) {
    hideTooltip();
  }
};

const ensureGlobalListeners = () => {
  if (globalListenersAttached || typeof window === 'undefined') return;
  globalListenersAttached = true;

  window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
  window.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
  window.addEventListener('mousedown', handleGlobalDismiss, { capture: true, passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') handleGlobalDismiss();
  }, { passive: true });
  window.addEventListener('blur', handleGlobalDismiss);
  document.addEventListener('mouseleave', handleGlobalDismiss);
  document.addEventListener('visibilitychange', handleGlobalDismiss);
};

const isElementOverflowing = (el) => {
  if (el.clientWidth === 0 || el.clientHeight === 0) return false;
  if (el.scrollWidth > Math.ceil(el.clientWidth) || el.scrollHeight > Math.ceil(el.clientHeight)) return true;
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child.clientWidth > 0 && child.clientHeight > 0) {
      if (child.scrollWidth > Math.ceil(child.clientWidth) || child.scrollHeight > Math.ceil(child.clientHeight)) return true;
    }
  }
  return false;
};

const estimateTextWidth = (str) => {
  let w = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    w += (code > 255) ? 12.5 : 7.2;
  }
  return Math.min(360, Math.max(50, w + 24));
};

const positionTooltip = (el, text) => {
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  let posX = rect.left + rect.width / 2;
  const padding = 10;
  const estimatedWidth = estimateTextWidth(text);
  const halfWidth = estimatedWidth / 2;

  if (posX - halfWidth < padding) {
    posX = halfWidth + padding;
  } else if (posX + halfWidth > windowWidth - padding) {
    posX = windowWidth - halfWidth - padding;
  }

  const bottomSafeArea = 110;
  const verticalPadding = 16;
  const gap = 10;
  const approxLineCount = Math.ceil(text.length / 32);
  const estimatedHeight = Math.min(520, Math.max(48, approxLineCount * 20 + 28));
  const availableBelow = Math.max(0, windowHeight - bottomSafeArea - rect.bottom - gap);
  const availableAbove = Math.max(0, rect.top - verticalPadding - gap);
  const shouldOpenAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;

  let posY = 0;
  let isBottom = false;
  let maxHeight = 0;

  if (shouldOpenAbove) {
    posY = rect.top - gap;
    isBottom = true;
    maxHeight = Math.max(80, Math.min(520, availableAbove));
  } else {
    posY = rect.bottom + gap;
    isBottom = false;
    maxHeight = Math.max(80, Math.min(520, availableBelow || windowHeight - bottomSafeArea - posY));
  }

  tooltipState.activeEl = el;
  tooltipState.text = text;
  tooltipState.x = posX;
  tooltipState.y = posY;
  tooltipState.isBottom = isBottom;
  tooltipState.maxHeight = maxHeight;
  tooltipState.visible = true;
};

export const tooltipDirective = {
  mounted(el, binding) {
    ensureGlobalListeners();
    el.setAttribute('data-tooltip', binding.value || '');

    el._mouseenter = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      const text = el.getAttribute('data-tooltip');
      if (!text) return;

      const textContent = el.textContent.trim();
      // 只有当提示文本与元素内部文字完全一致（如单行省略歌名/专辑名）时，才要求溢出才显示；对于操作按钮说明等显式提示，无条件显示
      if (textContent.length > 0 && text === textContent) {
        if (!isElementOverflowing(el)) return;
      }

      positionTooltip(el, text);
    };

    el._mouseleave = () => {
      if (tooltipState.activeEl === el) {
        hideTooltip();
      }
    };

    if (el.getAttribute('title')) el.removeAttribute('title');
    el.addEventListener('mouseenter', el._mouseenter);
    el.addEventListener('mouseleave', el._mouseleave);
  },

  updated(el, binding) {
    const nextText = binding.value || '';
    el.setAttribute('data-tooltip', nextText);
    if (tooltipState.visible && tooltipState.activeEl === el) {
      if (!nextText) {
        hideTooltip();
      } else if (tooltipState.text !== nextText) {
        tooltipState.text = nextText;
      }
    }
    if (el.getAttribute('title')) el.removeAttribute('title');
  },

  unmounted(el) {
    el.removeEventListener('mouseenter', el._mouseenter);
    el.removeEventListener('mouseleave', el._mouseleave);
    if (tooltipState.activeEl === el) {
      hideTooltip();
    }
  }
};
