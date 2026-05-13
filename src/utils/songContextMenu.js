export const openSongContextMenu = (event, song, options = {}) => {
  if (!event || !song) return;
  event.preventDefault();
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent('song-context-menu:open', {
    detail: {
      x: event.clientX,
      y: event.clientY,
      song,
      source: options.source || 'list',
      index: options.index ?? -1
    }
  }));
};

export const closeSongContextMenu = () => {
  window.dispatchEvent(new CustomEvent('song-context-menu:close'));
};
