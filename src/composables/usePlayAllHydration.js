import { onUnmounted } from 'vue';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function usePlayAllHydration() {
  let activeRunId = 0;

  const cancelPlayAllHydration = () => {
    activeRunId += 1;
  };

  const runHydration = async (runId, options) => {
    const {
      sessionId,
      startPage,
      pageSize = 30,
      maxPages = 200,
      maxSongs = 5000,
      delayMs = 220,
      loadPage,
      appendSongs,
      shouldContinue = () => true,
      onError = null
    } = options;

    if (!sessionId || !startPage || typeof loadPage !== 'function' || typeof appendSongs !== 'function') return;

    let nextPage = startPage;
    let addedSongs = 0;

    for (let loadedPages = 0; loadedPages < maxPages; loadedPages += 1) {
      if (runId !== activeRunId || !shouldContinue()) return;

      let result = null;
      try {
        result = await loadPage(nextPage);
      } catch (error) {
        if (typeof onError === 'function') onError(error);
        return;
      }

      if (runId !== activeRunId || !shouldContinue()) return;

      const songs = Array.isArray(result?.songs) ? result.songs : [];
      const rawCount = Number(result?.rawCount ?? songs.length);

      if (songs.length > 0) {
        const appendResult = appendSongs(sessionId, songs);
        if (appendResult?.canceled) return;
        addedSongs += appendResult?.added ?? songs.length;
        if (addedSongs >= maxSongs) return;
      }

      if (result?.done || rawCount === 0 || rawCount < pageSize) return;

      nextPage += 1;
      if (delayMs > 0) await sleep(delayMs);
    }
  };

  const startPlayAllHydration = (options) => {
    const runId = activeRunId + 1;
    activeRunId = runId;
    runHydration(runId, options).catch(() => {});
    return runId;
  };

  onUnmounted(cancelPlayAllHydration);

  return {
    startPlayAllHydration,
    cancelPlayAllHydration
  };
}
