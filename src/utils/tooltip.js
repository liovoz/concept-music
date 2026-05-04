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
  activeEl: null
});

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

      let posY = 0;
      let isBottom = false;
      
      if (rect.bottom > windowHeight - 100) {
        posY = rect.top - 10; 
        isBottom = true;
      } else {
        posY = rect.bottom + 10; 
        isBottom = false;
      }

      tooltipState.x = posX;
      tooltipState.y = posY;
      tooltipState.isBottom = isBottom;
      tooltipState.visible = true;
    };

    el._mouseleave = () => {
      if (tooltipState.activeEl === el) {
        tooltipState.visible = false;
        tooltipState.activeEl = null;
      }
    };

    if (el.getAttribute('title')) el.removeAttribute('title');
    el.addEventListener('mouseenter', el._mouseenter);
    el.addEventListener('mouseleave', el._mouseleave);
  },
  
  updated(el, binding) {
    el.setAttribute('data-tooltip', binding.value || '');
    if (tooltipState.visible && tooltipState.activeEl === el && tooltipState.text !== binding.value) {
      tooltipState.text = binding.value;
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