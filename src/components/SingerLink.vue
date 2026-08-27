<template>
  <div class="inline-flex items-center flex-wrap gap-0">
    <template v-for="(singer, index) in displaySingers" :key="singer.id || index">
      <span
        @click.stop="handleClick(singer)"
        class="inline-block truncate transition-colors duration-200 text-gray-500 dark:text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap"
        :class="[sizeClass, underlineClass, disabledClass]"
        v-tooltip="disabled ? disabledTooltip : ''"
      >
        {{ singer.name }}<span v-if="index < displaySingers.length - 1" class="mx-0.5">,</span>
      </span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { goToArtist as navigateArtist } from '../utils/artistNavigation';
import { isUnknownSinger } from '../utils/songHelper';

const props = defineProps({
  singers: {
    type: Array,
    default: () => []
  },
  singerName: {
    type: String,
    default: ''
  },
  singerId: {
    type: [String, Number],
    default: ''
  },
  size: {
    type: String,
    default: 'default'
  },
  showUnderline: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  disabledTooltip: {
    type: String,
    default: '暂不支持跳转'
  }
});

const router = useRouter();

const sizeClass = computed(() => {
  if (props.size === 'small') return 'text-[11px]';
  if (props.size === 'sm' || props.size === 'medium' || props.size === 'md') return 'text-sm';
  return 'text-xs';
});
const underlineClass = computed(() => props.showUnderline ? 'hover:underline' : '');
const disabledClass = computed(() => props.disabled ? 'cursor-default hover:text-gray-500 dark:hover:text-slate-400' : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400');

const displaySingers = computed(() => {
  if (props.singers && props.singers.length > 0) {
    return props.singers.filter(s => s && s.name);
  }

  if (props.singerName && props.singerName.trim() && !isUnknownSinger(props.singerName)) {
    const id = props.singerId ? String(props.singerId) : '';
    return [{ id, name: props.singerName.trim() }];
  }

  return [];
});

const handleClick = (singer) => {
  if (props.disabled) return;
  navigateArtist(router, singer);
};
</script>
