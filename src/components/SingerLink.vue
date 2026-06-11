<template>
  <div class="inline-flex items-center flex-wrap gap-0">
    <template v-for="(singer, index) in displaySingers" :key="singer.id || index">
      <span
        @click.stop="handleClick(singer)"
        class="inline-block truncate transition-colors duration-200 text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap hover:text-blue-600 cursor-pointer"
        :class="[sizeClass, underlineClass]"
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
  }
});

const router = useRouter();

const sizeClass = computed(() => props.size === 'small' ? 'text-[11px]' : 'text-xs');
const underlineClass = computed(() => props.showUnderline ? 'hover:underline' : '');

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
  navigateArtist(router, singer);
};
</script>
