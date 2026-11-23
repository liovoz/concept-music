import { ref } from 'vue';

const STORAGE_KEY = 'kg_desktop_font_scale';
const STORAGE_PRESET_KEY = 'kg_desktop_font_preset';

export const FONT_SCALE_COMPACT = 'compact';
export const FONT_SCALE_STANDARD = 'standard';
export const FONT_SCALE_LARGE = 'large';

export const FONT_PRESET_MODERN = 'modern';
export const FONT_PRESET_SYSTEM = 'system';

const VALID_SCALES = [FONT_SCALE_COMPACT, FONT_SCALE_STANDARD, FONT_SCALE_LARGE];
const VALID_PRESETS = [FONT_PRESET_MODERN, FONT_PRESET_SYSTEM];

const fontScale = ref(FONT_SCALE_STANDARD);
const fontPreset = ref(FONT_PRESET_MODERN);
let initialized = false;

const applyFontScaleAttr = (value) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.fontScale = value;
};

const applyFontPresetAttr = (value) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.fontPreset = value;
};

const normalizeFontScale = (value) => {
  return VALID_SCALES.includes(value) ? value : FONT_SCALE_STANDARD;
};

const normalizeFontPreset = (value) => {
  return VALID_PRESETS.includes(value) ? value : FONT_PRESET_MODERN;
};

export function initFontScale() {
  if (initialized) return fontScale.value;
  initialized = true;

  let savedScale = FONT_SCALE_STANDARD;
  let savedPreset = FONT_PRESET_MODERN;
  try {
    if (typeof localStorage !== 'undefined') {
      savedScale = normalizeFontScale(localStorage.getItem(STORAGE_KEY));
      savedPreset = normalizeFontPreset(localStorage.getItem(STORAGE_PRESET_KEY));
    }
  } catch (e) {}

  fontScale.value = savedScale;
  fontPreset.value = savedPreset;
  applyFontScaleAttr(savedScale);
  applyFontPresetAttr(savedPreset);

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        const nextScale = normalizeFontScale(event.newValue);
        fontScale.value = nextScale;
        applyFontScaleAttr(nextScale);
      } else if (event.key === STORAGE_PRESET_KEY) {
        const nextPreset = normalizeFontPreset(event.newValue);
        fontPreset.value = nextPreset;
        applyFontPresetAttr(nextPreset);
      }
    });
  }

  return savedScale;
}

export function useFontScale() {
  if (!initialized) {
    initFontScale();
  }

  const setFontScale = (nextScale) => {
    const valid = normalizeFontScale(nextScale);
    fontScale.value = valid;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, valid);
      }
    } catch (e) {}
    applyFontScaleAttr(valid);
    return valid;
  };

  const setFontPreset = (nextPreset) => {
    const valid = normalizeFontPreset(nextPreset);
    fontPreset.value = valid;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_PRESET_KEY, valid);
      }
    } catch (e) {}
    applyFontPresetAttr(valid);
    return valid;
  };

  return {
    fontScale,
    setFontScale,
    fontPreset,
    setFontPreset,
    FONT_SCALE_COMPACT,
    FONT_SCALE_STANDARD,
    FONT_SCALE_LARGE,
    FONT_PRESET_MODERN,
    FONT_PRESET_SYSTEM
  };
}
