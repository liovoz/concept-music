import { ref, watch } from 'vue';

const STORAGE_KEY = 'kg_desktop_search_history';
const MAX_HISTORY = 15;

const loadHistoryFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
};

const history = ref(loadHistoryFromStorage());

watch(history, (val) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  } catch (e) {}
}, { deep: true });

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      history.value = loadHistoryFromStorage();
    }
  });
}

export function useSearchHistory() {
  const syncHistory = () => {
    history.value = loadHistoryFromStorage();
  };

  const addHistory = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const list = history.value.filter(item => item !== trimmed);
    list.unshift(trimmed);
    history.value = list.slice(0, MAX_HISTORY);
  };

  const removeHistory = (keyword) => {
    history.value = history.value.filter(item => item !== keyword);
  };

  const clearHistory = () => {
    history.value = [];
  };

  return { history, addHistory, removeHistory, clearHistory, syncHistory };
}

