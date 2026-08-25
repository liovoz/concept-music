<script setup>
import { computed } from 'vue'
import { ICONS } from '../../constants/icons.js'

defineOptions({
  name: 'AppIcon',
  inheritAttrs: true
})

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: null
  },
  spin: {
    type: Boolean,
    default: false
  },
  strokeWidth: {
    type: [Number, String],
    default: null
  },
  fill: {
    type: String,
    default: null
  }
})

const iconDef = computed(() => {
  const def = ICONS[props.name]
  if (!def && import.meta.env?.DEV) {
    console.warn(`[AppIcon] Icon "${props.name}" not found in icons dictionary.`)
  }
  return def || ICONS['info']
})

const customStyle = computed(() => {
  if (!props.size) return {}
  const sizeStr = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: sizeStr,
    height: sizeStr
  }
})

const viewBox = computed(() => iconDef.value?.viewBox || '0 0 24 24')
const fillAttr = computed(() => props.fill || iconDef.value?.fill || 'none')
const strokeAttr = computed(() => iconDef.value?.stroke || 'currentColor')
const strokeWidthAttr = computed(() => props.strokeWidth ?? iconDef.value?.strokeWidth ?? 2)
</script>

<template>
  <svg
    v-if="iconDef"
    :viewBox="viewBox"
    :fill="fillAttr"
    :stroke="strokeAttr"
    :stroke-width="strokeWidthAttr"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="[spin ? 'animate-spin' : '']"
    :style="customStyle"
    v-html="iconDef.content"
  />
</template>
