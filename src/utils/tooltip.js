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
  hoveringTooltip: false,
  activeEl: null
});

let hideTimer = null;

export const hideTooltip = () => {
  tooltipState.visible = false;
  tooltipState.activeEl = null;
  tooltipState.hoveringTooltip = false;
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

export const tooltipDirective = {
  mounted(el, binding) {
    el.setAttribute('data-tooltip', binding.value || '');

    el._mouseenter = () => {
      if (hideTimer) clearTimeout(hideTimer);
      const text = el.getAttribute('data-tooltip');
      if (!text) return;

      const textContent = el.textContent.trim();
      if (textContent.length > 0) {
        if (!isElementOverflowing(el)) return; 
      }

      tooltipState.activeEl = el;
      tooltipState.text = text;
      
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      let posX = rect.left + rect.width / 2;
      // ✨ 核心修复：将 180 像素的流氓推挤边距缩小到合理的 20，避免图标的提示框远走高飞
      const padding = 20; 
      if (posX < padding) posX = padding;
      if (posX > window.innerWidth - padding) posX = window.innerWidth - padding;

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

      tooltipState.x = posX;
      tooltipState.y = posY;
      tooltipState.isBottom = isBottom;
      tooltipState.maxHeight = maxHeight;
      tooltipState.visible = true;
    };

    el._mouseleave = () => {
      if (tooltipState.activeEl === el) {
        hideTimer = setTimeout(() => {
          if (!tooltipState.hoveringTooltip) hideTooltip();
        }, 120);
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
        tooltipState.visible = false;
        tooltipState.activeEl = null;
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
      tooltipState.visible = false;
      tooltipState.activeEl = null;
    }
  }
};
