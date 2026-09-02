import { computed, ref } from 'vue';

const STORAGE_KEY = 'kg_desktop_theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const THEME_SYSTEM = 'system';

const theme = ref(THEME_LIGHT);
let initialized = false;

const getIsSystemDark = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyThemeClass = (value) => {
  if (typeof document === 'undefined') return;
  const isDarkEffective = value === THEME_DARK || (value === THEME_SYSTEM && getIsSystemDark());
  document.documentElement.classList.toggle(THEME_DARK, isDarkEffective);
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
    if ([THEME_LIGHT, THEME_DARK, THEME_SYSTEM].includes(savedTheme)) {
      theme.value = savedTheme;
    } else {
      theme.value = THEME_LIGHT;
    }
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (theme.value === THEME_SYSTEM) {
        applyThemeClass(THEME_SYSTEM);
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange);
    }
  }

  applyThemeClass(theme.value);
  syncThemeToNative(theme.value);
};

export const useTheme = () => {
  initTheme();

  const isDark = computed(() => {
    return theme.value === THEME_DARK || (theme.value === THEME_SYSTEM && getIsSystemDark());
  });

  const setTheme = (value) => {
    const valid = [THEME_LIGHT, THEME_DARK, THEME_SYSTEM].includes(value) ? value : THEME_LIGHT;
    theme.value = valid;
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
