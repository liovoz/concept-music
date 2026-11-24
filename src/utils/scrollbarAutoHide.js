// ====================
// 文件：src/utils/scrollbarAutoHide.js
// 全局自动隐藏滚动条调度器：滚动时浮现、停滚自动淡出、指针靠近滚动条边缘热区浮现并支持拖拽锁定
// ====================

const EDGE_THRESHOLD_PX = 14;
const HIDE_DELAY_MS = 900;

let initialized = false;

export function initAutoHideScrollbars() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const scrollTimers = new WeakMap();
  let activeEdgeEl = null;
  let isDraggingScrollbar = false;
  let moveRafId = null;
  let lastPointer = null;

  const isPointerOnScrollEdge = (el, clientX, clientY) => {
    const rect = el.getBoundingClientRect();
    const hasVertical = el.scrollHeight > el.clientHeight + 1;
    const hasHorizontal = el.scrollWidth > el.clientWidth + 1;
    const onRight =
      hasVertical &&
      rect.right - clientX >= -2 &&
      rect.right - clientX <= EDGE_THRESHOLD_PX &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    const onBottom =
      hasHorizontal &&
      rect.bottom - clientY >= -2 &&
      rect.bottom - clientY <= EDGE_THRESHOLD_PX &&
      clientX >= rect.left &&
      clientX <= rect.right;
    return onRight || onBottom;
  };

  const findEdgeScrollContainer = (target, clientX, clientY) => {
    let current = target instanceof Element ? target.closest('.custom-scrollbar') : null;
    while (current) {
      if (isPointerOnScrollEdge(current, clientX, clientY)) {
        return current;
      }
      current = current.parentElement?.closest('.custom-scrollbar') || null;
    }
    return null;
  };

  const setActiveEdge = (nextEl) => {
    if (activeEdgeEl === nextEl) return;
    if (activeEdgeEl) {
      activeEdgeEl.classList.remove('is-scrollbar-edge');
    }
    activeEdgeEl = nextEl;
    if (activeEdgeEl) {
      activeEdgeEl.classList.add('is-scrollbar-edge');
    }
  };

  const handleScroll = (event) => {
    const el = event.target;
    if (!(el instanceof Element) || !el.classList.contains('custom-scrollbar')) return;

    el.classList.add('is-scrolling');
    const prevTimer = scrollTimers.get(el);
    if (prevTimer) clearTimeout(prevTimer);

    const timer = window.setTimeout(() => {
      el.classList.remove('is-scrolling');
      scrollTimers.delete(el);
    }, HIDE_DELAY_MS);
    scrollTimers.set(el, timer);
  };

  const handlePointerMove = (event) => {
    if (isDraggingScrollbar) return;
    lastPointer = {
      target: event.target,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    if (moveRafId !== null) return;
    moveRafId = window.requestAnimationFrame(() => {
      moveRafId = null;
      if (isDraggingScrollbar || !lastPointer) return;
      setActiveEdge(findEdgeScrollContainer(lastPointer.target, lastPointer.clientX, lastPointer.clientY));
    });
  };

  const handlePointerDown = (event) => {
    const edgeEl = findEdgeScrollContainer(event.target, event.clientX, event.clientY);
    if (edgeEl) {
      setActiveEdge(edgeEl);
      isDraggingScrollbar = true;
    }
  };

  const handlePointerUp = (event) => {
    if (!isDraggingScrollbar) return;
    isDraggingScrollbar = false;
    setActiveEdge(findEdgeScrollContainer(event.target, event.clientX, event.clientY));
  };

  const resetEdgeState = () => {
    if (moveRafId !== null) {
      window.cancelAnimationFrame(moveRafId);
      moveRafId = null;
    }
    isDraggingScrollbar = false;
    lastPointer = null;
    setActiveEdge(null);
  };

  window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
  document.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', resetEdgeState, { passive: true });
  window.addEventListener('blur', resetEdgeState);
  document.documentElement.addEventListener('mouseleave', resetEdgeState);
}
