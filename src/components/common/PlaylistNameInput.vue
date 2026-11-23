<template>
  <div class="w-full">
    <div class="flex items-center justify-between gap-2" :class="compact ? 'mb-1.5' : 'mb-1.5'">
      <label
        :for="inputId"
        class="block type-meta-base font-medium text-gray-600 dark:text-[#a1a1a6] select-none"
      >
        {{ label }}
      </label>
      <span
        class="type-numeric-sm font-medium transition-colors select-none"
        :class="counterColorClass"
      >
        {{ validation.trimmedLength }}/{{ maxLength }}
      </span>
    </div>

    <div class="relative flex items-center">
      <input
        :id="inputId"
        ref="inputRef"
        :value="modelValue"
        type="text"
        spellcheck="false"
        autocomplete="off"
        :placeholder="placeholder"
        @input="handleInput"
        @keydown.enter="handleEnter"
        class="w-full rounded-xl border bg-white text-gray-800 dark:text-[#ededed] placeholder:text-gray-400 dark:placeholder:text-[#85858b] outline-none transition-all"
        :class="[
          compact
            ? 'h-8 pl-3 pr-8 text-xs rounded-lg dark:bg-[#141415]'
            : 'pl-3.5 pr-8 py-2.5 text-sm dark:bg-[#232325]/80',
          inputBorderClass
        ]"
      />
      <button
        v-if="modelValue"
        type="button"
        @click="clearInput"
        class="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-[#ededed] rounded-full transition-colors cursor-pointer"
        v-tooltip="'清空名称'"
      >
        <AppIcon name="close" class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="mt-1.5 min-h-[16px] flex items-center justify-between gap-2 pl-0.5">
      <p
        v-if="validation.error"
        class="type-meta-base font-medium text-red-500 dark:text-red-400 flex items-center gap-1"
      >
        <AppIcon name="warning" class="w-3 h-3 shrink-0" />
        <span>{{ validation.error }}</span>
      </p>
      <p
        v-else-if="validation.isAtLimit"
        class="type-meta-base font-medium text-amber-500 dark:text-amber-400 flex items-center gap-1"
      >
        <AppIcon name="info" class="w-3 h-3 shrink-0" />
        <span>已达到 {{ maxLength }} 字上限</span>
      </p>
      <p
        v-else
        class="type-meta-base text-gray-400 dark:text-[#85858b]"
      >
        歌单名称最多支持 {{ maxLength }} 个字符{{ validation.hasEdgeSpaces ? '（首尾空格将自动去除）' : '' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { PLAYLIST_NAME_MAX_LENGTH, validatePlaylistName } from '../../utils/playlistHelper';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  maxLength: {
    type: Number,
    default: PLAYLIST_NAME_MAX_LENGTH
  },
  label: {
    type: String,
    default: '歌单名称'
  },
  placeholder: {
    type: String,
    default: '请输入歌单名称...'
  },
  accent: {
    type: String,
    default: 'purple'
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'submit']);

const inputRef = ref(null);
const inputId = `playlist-name-input-${Math.random().toString(36).slice(2, 8)}`;

const validation = computed(() => validatePlaylistName(props.modelValue, props.maxLength));

const counterColorClass = computed(() => {
  if (validation.value.isOverLimit || validation.value.isWhitespaceOnly) {
    return 'text-red-500 dark:text-red-400 font-medium';
  }
  if (validation.value.trimmedLength >= props.maxLength) {
    return 'text-amber-500 dark:text-amber-400 font-medium';
  }
  if (validation.value.trimmedLength >= Math.floor(props.maxLength * 0.85)) {
    return 'text-amber-500/90 dark:text-amber-400/90';
  }
  return 'text-gray-400 dark:text-[#85858b]';
});

const inputBorderClass = computed(() => {
  if (validation.value.isOverLimit || validation.value.isWhitespaceOnly) {
    return 'border-red-400 dark:border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/15';
  }
  if (props.accent === 'blue') {
    return 'border-gray-200 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20';
  }
  return 'border-gray-200 dark:border-white/[0.1] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-500/20';
});

const handleInput = (event) => {
  emit('update:modelValue', event.target.value);
};

const handleEnter = (event) => {
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  emit('submit');
};

const clearInput = () => {
  emit('update:modelValue', '');
  inputRef.value?.focus();
};

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus, validation });
</script>
