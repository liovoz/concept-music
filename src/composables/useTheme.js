import { computed, ref } from 'vue';

const STORAGE_KEY = 'kg_desktop_theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

const theme = ref(THEME_LIGHT);
let initialized = false;

const applyThemeClass = (value) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(THEME_DARK, value === THEME_DARK);
};

const syncThemeToNative = (val) => {
  if (typeof window !== 'undefined') {
    if (window.windowControls?.setTheme) {
      window.windowControls.setTheme(val);
    } else if (window.trayAPI?.setTheme) {
      window.trayAPI.setTheme(val);
    }
  }
};

export const initTheme = () => {
  if (initialized) return;
  initialized = true;

  if (typeof localStorage !== 'undefined') {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    theme.value = savedTheme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
  }

  applyThemeClass(theme.value);
  syncThemeToNative(theme.value);
};

export const useTheme = () => {
  initTheme();

  const isDark = computed(() => theme.value === THEME_DARK);

  const setTheme = (value) => {
    theme.value = value === THEME_DARK ? THEME_DARK : THEME_LIGHT;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme.value);
    }
    applyThemeClass(theme.value);
    syncThemeToNative(theme.value);
  };

  const toggleTheme = () => {
    setTheme(isDark.value ? THEME_LIGHT : THEME_DARK);
  };

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  };
};
