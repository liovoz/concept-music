import { ref, watch } from 'vue'

const STORAGE_KEY = 'kg_desktop_search_history'
const MAX_HISTORY = 15

export function useSearchHistory() {
  const history = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

  watch(history, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  const addHistory = (keyword) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    const list = history.value.filter(item => item !== trimmed)
    list.unshift(trimmed)
    history.value = list.slice(0, MAX_HISTORY)
  }

  const removeHistory = (keyword) => {
    history.value = history.value.filter(item => item !== keyword)
  }

  const clearHistory = () => {
    history.value = []
  }

  return { history, addHistory, removeHistory, clearHistory }
}
