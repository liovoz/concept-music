<template>
  <div class="relative w-full select-none" ref="pickerRootRef">
    <!-- 1. 触发胶囊框：整框任意位置点击均可展开/收起 -->
    <button
      type="button"
      @click="toggleDropdown"
      class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all duration-150 group"
      :class="[
        isOpen 
          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-xs' 
          : 'border-gray-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-slate-600 shadow-2xs',
        disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
      ]"
    >
      <!-- 左侧：高质感等宽时间显示 -->
      <div class="flex items-center space-x-1 font-mono text-xs font-bold text-gray-800 dark:text-slate-100">
        <span class="px-1 py-0.5 rounded transition-colors" :class="isOpen ? 'text-blue-600 dark:text-blue-400' : ''">
          {{ displayHour }}
        </span>
        <span class="text-gray-400 dark:text-slate-500 font-normal">:</span>
        <span class="px-1 py-0.5 rounded transition-colors" :class="isOpen ? 'text-blue-600 dark:text-blue-400' : ''">
          {{ displayMinute }}
        </span>
      </div>

      <!-- 右侧：时钟图标与折叠指示箭头 -->
      <div class="flex items-center space-x-1.5 text-gray-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">
        <AppIcon name="clock" class="w-3.5 h-3.5" />
        <AppIcon 
          name="chevron-down" 
          class="w-3 h-3 transition-transform duration-200" 
          :class="[
            isOpen ? 'text-blue-500' : '',
            popDirection === 'up' ? (isOpen ? '' : 'rotate-180') : (isOpen ? 'rotate-180' : '')
          ]" 
        />
      </div>
    </button>

    <!-- 2. 下拉选择面板（智能自适应上/下方位 + 暂存选值） -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      :enter-from-class="popDirection === 'up' ? 'opacity-0 scale-95 translate-y-1' : 'opacity-0 scale-95 -translate-y-1'"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      :leave-to-class="popDirection === 'up' ? 'opacity-0 scale-95 translate-y-1' : 'opacity-0 scale-95 -translate-y-1'"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 z-50 w-full min-w-[200px] rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-700/80 p-2.5 space-y-2 no-drag"
        :class="[
          popDirection === 'up' 
            ? 'bottom-full mb-1.5 shadow-[0_-12px_36px_rgba(15,23,42,0.18)] dark:shadow-[0_-16px_40px_rgba(0,0,0,0.6)]' 
            : 'top-full mt-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
        ]"
      >
        <!-- 顶部列标题 -->
        <div class="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pb-1 border-b border-gray-100 dark:border-slate-800">
          <span>小时</span>
          <span>分钟</span>
        </div>

        <!-- 双列点选滚轮区域（紧凑 h-36，平滑无断层） -->
        <div class="grid grid-cols-2 gap-2">
          <!-- 小时列表 (00 ~ 23) -->
          <div 
            ref="hourListRef" 
            class="h-36 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5"
          >
            <button
              v-for="h in 24"
              :key="'h-' + (h - 1)"
              type="button"
              :ref="el => setHourRef(el, h - 1)"
              @click.stop="selectHour(h - 1)"
              class="w-full text-center py-1.5 rounded-md font-mono text-xs transition-all cursor-pointer"
              :class="draftHour === (h - 1)
                ? 'bg-blue-600 text-white font-bold shadow-xs scale-[1.02]'
                : 'text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white font-medium'"
            >
              {{ String(h - 1).padStart(2, '0') }}
            </button>
          </div>

          <!-- 分钟列表 (00 ~ 59) -->
          <div 
            ref="minuteListRef" 
            class="h-36 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5"
          >
            <button
              v-for="m in 60"
              :key="'m-' + (m - 1)"
              type="button"
              :ref="el => setMinuteRef(el, m - 1)"
              @click.stop="selectMinute(m - 1)"
              class="w-full text-center py-1.5 rounded-md font-mono text-xs transition-all cursor-pointer"
              :class="draftMinute === (m - 1)
                ? 'bg-blue-600 text-white font-bold shadow-xs scale-[1.02]'
                : 'text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white font-medium'"
            >
              {{ String(m - 1).padStart(2, '0') }}
            </button>
          </div>
        </div>

        <!-- 底部操作栏：设为当前 + 取消 + 确定 -->
        <div class="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
          <button
            type="button"
            @click.stop="setNow"
            class="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors cursor-pointer"
          >
            当前时间
          </button>
          <div class="flex items-center space-x-1.5">
            <button
              type="button"
              @click.stop="cancel"
              class="px-2 py-1 rounded text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              @click.stop="confirm"
              class="px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '07:00'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const popDirection = ref('down'); // 'down' | 'up'
const pickerRootRef = ref(null);
const hourListRef = ref(null);
const minuteListRef = ref(null);

const hourRefs = {};
const minuteRefs = {};

const setHourRef = (el, hour) => {
  if (el) hourRefs[hour] = el;
};
const setMinuteRef = (el, minute) => {
  if (el) minuteRefs[minute] = el;
};

// 解析当前传入的 HH:mm
const parseTime = (val) => {
  if (!val || typeof val !== 'string') return { h: 7, m: 0 };
  const parts = val.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return {
    h: isNaN(h) ? 7 : Math.min(23, Math.max(0, h)),
    m: isNaN(m) ? 0 : Math.min(59, Math.max(0, m))
  };
};

// 正式生效的值（来自 props）
const internalHour = ref(parseTime(props.modelValue).h);
const internalMinute = ref(parseTime(props.modelValue).m);

// 暂存草稿值（面板打开时点选，未确定前不触发外部更新）
const draftHour = ref(internalHour.value);
const draftMinute = ref(internalMinute.value);

watch(() => props.modelValue, (newVal) => {
  const { h, m } = parseTime(newVal);
  internalHour.value = h;
  internalMinute.value = m;
  if (!isOpen.value) {
    draftHour.value = h;
    draftMinute.value = m;
  }
});

// 显示的时间：展开时展示实时草稿预览，闭合时展示已确认值
const displayHour = computed(() => {
  const h = isOpen.value ? draftHour.value : internalHour.value;
  return String(h).padStart(2, '0');
});
const displayMinute = computed(() => {
  const m = isOpen.value ? draftMinute.value : internalMinute.value;
  return String(m).padStart(2, '0');
});

// 点选草稿小时/分钟（不向外触发 emit）
const selectHour = (h) => {
  draftHour.value = h;
};

const selectMinute = (m) => {
  draftMinute.value = m;
};

// 设为当前时间（更新草稿并滚动定位）
const setNow = () => {
  const now = new Date();
  draftHour.value = now.getHours();
  draftMinute.value = now.getMinutes();
  scrollToSelected();
};

// 自动居中平滑滚动到已选草稿项
const scrollToSelected = () => {
  nextTick(() => {
    setTimeout(() => {
      const targetHourEl = hourRefs[draftHour.value];
      if (targetHourEl && hourListRef.value) {
        const top = targetHourEl.offsetTop - hourListRef.value.clientHeight / 2 + targetHourEl.clientHeight / 2;
        hourListRef.value.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }

      const targetMinuteEl = minuteRefs[draftMinute.value];
      if (targetMinuteEl && minuteListRef.value) {
        const top = targetMinuteEl.offsetTop - minuteListRef.value.clientHeight / 2 + targetMinuteEl.clientHeight / 2;
        minuteListRef.value.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }, 40);
  });
};

// 点击【确定】：正式提交变更
const confirm = () => {
  internalHour.value = draftHour.value;
  internalMinute.value = draftMinute.value;
  const result = `${String(internalHour.value).padStart(2, '0')}:${String(internalMinute.value).padStart(2, '0')}`;
  emit('update:modelValue', result);
  emit('change', result);
  isOpen.value = false;
};

// 点击【取消】或点击外部：还原草稿
const cancel = () => {
  draftHour.value = internalHour.value;
  draftMinute.value = internalMinute.value;
  isOpen.value = false;
};

// 智能判断展开方向（向下还是向上翻转）
const updateDirection = () => {
  if (!pickerRootRef.value) return;
  const rect = pickerRootRef.value.getBoundingClientRect();
  const scrollParent = pickerRootRef.value.closest('.overflow-y-auto') || pickerRootRef.value.closest('.custom-scrollbar');
  const containerBottom = scrollParent ? scrollParent.getBoundingClientRect().bottom : window.innerHeight;
  const containerTop = scrollParent ? scrollParent.getBoundingClientRect().top : 0;
  
  const spaceBelow = containerBottom - rect.bottom;
  const spaceAbove = rect.top - containerTop;
  const ESTIMATED_HEIGHT = 195; // 紧凑模式后面板高度约 195px

  // 如果下方空间不够容纳且上方空间更充足，则向上翻转
  if (spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow) {
    popDirection.value = 'up';
  } else {
    popDirection.value = 'down';
  }
};

const toggleDropdown = () => {
  if (props.disabled) return;
  if (!isOpen.value) {
    updateDirection();
    draftHour.value = internalHour.value;
    draftMinute.value = internalMinute.value;
    isOpen.value = true;
    scrollToSelected();
  } else {
    cancel();
  }
};

// 点击外部区域自动还原并关闭
const handlePointerDown = (event) => {
  if (!isOpen.value) return;
  if (pickerRootRef.value && !pickerRootRef.value.contains(event.target)) {
    cancel();
  }
};

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handlePointerDown);
});
</script>

