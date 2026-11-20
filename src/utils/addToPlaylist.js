export const ADD_TO_PLAYLIST_EVENT = 'add-to-playlist:open';

export const openAddToPlaylistModal = (song, options = {}) => {
  if (!song || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ADD_TO_PLAYLIST_EVENT, {
      detail: {
        song,
        source: options.source || 'fm'
      }
    })
  );
};
