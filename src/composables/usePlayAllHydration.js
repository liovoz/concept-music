import { usePlayerStore } from '../store/playerStore';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let globalActiveRunId = 0;

export function usePlayAllHydration() {
  const store = usePlayerStore();

  const cancelPlayAllHydration = () => {
    globalActiveRunId += 1;
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
      onComplete = null,
      onError = null
    } = options;

    if (!sessionId || !startPage || typeof loadPage !== 'function' || typeof appendSongs !== 'function') return;

    let nextPage = startPage;
    let addedSongs = 0;

    for (let loadedPages = 0; loadedPages < maxPages; loadedPages += 1) {
      if (runId !== globalActiveRunId || !shouldContinue()) return;

      let result = null;
      try {
        result = await loadPage(nextPage);
      } catch (error) {
        if (store?.cancelPlayAllHydration) store.cancelPlayAllHydration(sessionId);
        if (typeof onError === 'function') onError(error);
        return;
      }

      if (runId !== globalActiveRunId || !shouldContinue()) return;

      const songs = Array.isArray(result?.songs) ? result.songs : [];
      const rawCount = Number(result?.rawCount ?? songs.length);

      if (songs.length > 0) {
        const appendResult = appendSongs(sessionId, songs);
        if (appendResult?.canceled) return;
        addedSongs += appendResult?.added ?? songs.length;
        if (appendResult?.full || addedSongs >= maxSongs) {
          if (store?.finishPlayAllHydration) store.finishPlayAllHydration(sessionId);
          if (typeof onComplete === 'function') onComplete({ addedSongs, full: Boolean(appendResult?.full) });
          return;
        }
      }

      if (result?.done || rawCount === 0 || rawCount < pageSize) {
        if (store?.finishPlayAllHydration) store.finishPlayAllHydration(sessionId);
        if (typeof onComplete === 'function') onComplete({ addedSongs, full: false });
        return;
      }

      nextPage += 1;
      if (delayMs > 0) await sleep(delayMs);
    }

    if (store?.finishPlayAllHydration) store.finishPlayAllHydration(sessionId);
    if (typeof onComplete === 'function') onComplete({ addedSongs, full: false });
  };

  const startPlayAllHydration = (options) => {
    const runId = globalActiveRunId + 1;
    globalActiveRunId = runId;
    runHydration(runId, options).catch(() => {});
    return runId;
  };

  return {
    startPlayAllHydration,
    cancelPlayAllHydration
  };
}
