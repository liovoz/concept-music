import { computed, ref } from 'vue';

const STORAGE_KEY = 'kg_desktop_theme';
const STORAGE_SCHEDULE_ENABLED_KEY = 'kg_desktop_theme_schedule_enabled';
const STORAGE_LIGHT_TIME_KEY = 'kg_desktop_theme_light_time';
const STORAGE_DARK_TIME_KEY = 'kg_desktop_theme_dark_time';

export const THEME_DARK = 'dark';
export const THEME_LIGHT = 'light';
export const THEME_SYSTEM = 'system';

const DEFAULT_LIGHT_TIME = '07:00';
const DEFAULT_DARK_TIME = '19:00';

const theme = ref(THEME_LIGHT);
const isScheduleEnabled = ref(false);
const scheduleLightTime = ref(DEFAULT_LIGHT_TIME);
const scheduleDarkTime = ref(DEFAULT_DARK_TIME);
const currentTimeMinutes = ref(new Date().getHours() * 60 + new Date().getMinutes());

let initialized = false;
let scheduleTimer = null;
let heartbeatTimer = null;

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

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

export const getScheduledThemeForTime = (now = new Date()) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lightMinutes = parseTimeToMinutes(scheduleLightTime.value);
  const darkMinutes = parseTimeToMinutes(scheduleDarkTime.value);

  if (lightMinutes === darkMinutes) {
    return THEME_LIGHT;
  }

  if (lightMinutes < darkMinutes) {
    return (currentMinutes >= lightMinutes && currentMinutes < darkMinutes) ? THEME_LIGHT : THEME_DARK;
  } else {
    // 跨午夜时间段 (例如 20:00 到 06:00 为浅色，其余为深色)
    return (currentMinutes >= lightMinutes || currentMinutes < darkMinutes) ? THEME_LIGHT : THEME_DARK;
  }
};

const getNextSwitchInfo = (now = new Date()) => {
  if (!isScheduleEnabled.value) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lightMinutes = parseTimeToMinutes(scheduleLightTime.value);
  const darkMinutes = parseTimeToMinutes(scheduleDarkTime.value);

  let diffToLight = lightMinutes - currentMinutes;
  if (diffToLight <= 0) diffToLight += 24 * 60;

  let diffToDark = darkMinutes - currentMinutes;
  if (diffToDark <= 0) diffToDark += 24 * 60;

  if (diffToLight < diffToDark) {
    return {
      targetTheme: THEME_LIGHT,
      targetTime: scheduleLightTime.value,
      minutesUntil: diffToLight
    };
  } else {
    return {
      targetTheme: THEME_DARK,
      targetTime: scheduleDarkTime.value,
      minutesUntil: diffToDark
    };
  }
};

const applyThemeValue = (val) => {
  const valid = [THEME_LIGHT, THEME_DARK, THEME_SYSTEM].includes(val) ? val : THEME_LIGHT;
  theme.value = valid;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, valid);
  }
  applyThemeClass(valid);
  syncThemeToNative(valid);
};

const planNextSwitchTimeout = () => {
  if (scheduleTimer) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }

  if (!isScheduleEnabled.value) return;

  const now = new Date();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();
  const next = getNextSwitchInfo(now);
  if (!next) return;

  const msUntilNext = Math.max(1000, (next.minutesUntil * 60 - seconds) * 1000 - ms + 500);

  scheduleTimer = setTimeout(() => {
    checkAndApplySchedule();
  }, msUntilNext);
};

const checkAndApplySchedule = (force = false) => {
  if (!isScheduleEnabled.value) return;

  const now = new Date();
  currentTimeMinutes.value = now.getHours() * 60 + now.getMinutes();

  const scheduledTheme = getScheduledThemeForTime(now);

  if (theme.value !== scheduledTheme || force) {
    applyThemeValue(scheduledTheme);
  }

  planNextSwitchTimeout();
};

const startScheduleEngine = () => {
  stopScheduleEngine();
  checkAndApplySchedule();

  heartbeatTimer = setInterval(() => {
    checkAndApplySchedule();
  }, 30000);
};

const stopScheduleEngine = () => {
  if (scheduleTimer) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
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

    const savedSchedule = localStorage.getItem(STORAGE_SCHEDULE_ENABLED_KEY);
    isScheduleEnabled.value = savedSchedule === 'true';

    const savedLight = localStorage.getItem(STORAGE_LIGHT_TIME_KEY);
    if (savedLight && /^([01]\d|2[0-3]):[0-5]\d$/.test(savedLight)) {
      scheduleLightTime.value = savedLight;
    }

    const savedDark = localStorage.getItem(STORAGE_DARK_TIME_KEY);
    if (savedDark && /^([01]\d|2[0-3]):[0-5]\d$/.test(savedDark)) {
      scheduleDarkTime.value = savedDark;
    }
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      // 仅当用户明确设置为跟随系统且未启用定时切换时，才响应操作系统的颜色方案
      if (theme.value === THEME_SYSTEM && !isScheduleEnabled.value) {
        applyThemeClass(THEME_SYSTEM);
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange);
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isScheduleEnabled.value) {
        checkAndApplySchedule();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      if (isScheduleEnabled.value) {
        checkAndApplySchedule();
      }
    });
  }

  if (isScheduleEnabled.value) {
    startScheduleEngine();
    const scheduled = getScheduledThemeForTime();
    theme.value = scheduled;
  }

  applyThemeClass(theme.value);
  syncThemeToNative(theme.value);
};

export const useTheme = () => {
  initTheme();

  const isDark = computed(() => {
    return theme.value === THEME_DARK || (theme.value === THEME_SYSTEM && getIsSystemDark());
  });

  const nextSwitchInfo = computed(() => {
    if (!isScheduleEnabled.value) return null;
    const _ = currentTimeMinutes.value;
    return getNextSwitchInfo();
  });

  // 方案2：用户手动设定主题时（点击浅色/深色/跟随系统或顶栏图标），严格互斥关闭自动定时切换
  const setTheme = (value) => {
    const valid = [THEME_LIGHT, THEME_DARK, THEME_SYSTEM].includes(value) ? value : THEME_LIGHT;
    let wasScheduleDisabled = false;

    if (isScheduleEnabled.value) {
      setScheduleEnabled(false);
      wasScheduleDisabled = true;
    }

    applyThemeValue(valid);
    return { wasScheduleDisabled, theme: valid };
  };

  const toggleTheme = () => {
    const target = isDark.value ? THEME_LIGHT : THEME_DARK;
    return setTheme(target);
  };

  const setScheduleEnabled = (enabled) => {
    const next = Boolean(enabled);
    isScheduleEnabled.value = next;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_SCHEDULE_ENABLED_KEY, next ? 'true' : 'false');
    }

    if (next) {
      startScheduleEngine();
      const scheduled = getScheduledThemeForTime();
      applyThemeValue(scheduled);
    } else {
      stopScheduleEngine();
    }
  };

  const setScheduleTimes = ({ lightTime, darkTime }) => {
    if (lightTime && typeof lightTime === 'string') {
      scheduleLightTime.value = lightTime;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_LIGHT_TIME_KEY, lightTime);
      }
    }
    if (darkTime && typeof darkTime === 'string') {
      scheduleDarkTime.value = darkTime;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_DARK_TIME_KEY, darkTime);
      }
    }
    if (isScheduleEnabled.value) {
      checkAndApplySchedule(true);
    }
  };

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    isScheduleEnabled,
    scheduleLightTime,
    scheduleDarkTime,
    setScheduleEnabled,
    setScheduleTimes,
    nextSwitchInfo
  };
};
