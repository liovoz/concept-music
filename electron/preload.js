const { contextBridge, ipcRenderer } = require('electron');

const createListenerManager = (channel) => {
  let currentCallback = null;
  const handler = (...args) => { if (currentCallback) currentCallback(...args); };
  return {
    set: (callback) => {
      if (currentCallback) ipcRenderer.removeListener(channel, handler);
      currentCallback = callback;
      if (callback) ipcRenderer.on(channel, handler);
    },
    clear: () => {
      if (currentCallback) {
        ipcRenderer.removeListener(channel, handler);
        currentCallback = null;
      }
    }
  };
};

const closeDialogMgr = createListenerManager('trigger-close-dialog');
const windowRestoredMgr = createListenerManager('window-restored');
const updaterEventMgr = createListenerManager('updater-event');
const lyricSyncMgr = createListenerManager('update-lyric');
const lyricControlMgr = createListenerManager('main-lyric-control');
const lyricEnterMgr = createListenerManager('lyric-mouse-enter');
const lyricLeaveMgr = createListenerManager('lyric-mouse-leave');
const lyricClosedMgr = createListenerManager('lyric-window-closed');
const lyricReadyMgr = createListenerManager('lyric-window-ready');
const trayActionMgr = createListenerManager('tray-action');

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  hideToTray: () => ipcRenderer.send('window-hide-to-tray'),
  onCloseDialogTrigger: (callback) => {
    closeDialogMgr.set(callback);
  },
  onWindowRestored: (callback) => {
    windowRestoredMgr.set(callback);
  }
});

contextBridge.exposeInMainWorld('updaterAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  cancelDownload: () => ipcRenderer.send('cancel-download'),
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateEvent: (callback) => {
    updaterEventMgr.set((_event, data) => callback(data));
  },
  clearVault: () => ipcRenderer.send('clear-vault')
});

contextBridge.exposeInMainWorld('lyricAPI', {
  toggle: () => ipcRenderer.send('toggle-desktop-lyric'),
  sync: (data) => ipcRenderer.send('sync-lyric', data),
  onSync: (callback) => {
    lyricSyncMgr.set((event, data) => callback(data));
  },
  sendControl: (cmd) => ipcRenderer.send('lyric-control-cmd', cmd),
  onControl: (callback) => {
    lyricControlMgr.set((event, cmd) => callback(cmd));
  },
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  setMouseAuto: () => ipcRenderer.send('set-mouse-auto'),
  unlockLyric: () => ipcRenderer.send('unlock-lyric'),
  updateHotArea: (rect) => ipcRenderer.send('lyric-hot-area', rect),
  onMouseEnter: (callback) => {
    lyricEnterMgr.set(() => callback());
  },
  onMouseLeave: (callback) => {
    lyricLeaveMgr.set(() => callback());
  },
  onClosed: (callback) => {
    lyricClosedMgr.set(() => callback());
  },
  onReady: (callback) => {
    lyricReadyMgr.set(() => callback());
  },
  startDrag: () => ipcRenderer.send('lyric-window-drag'),
  stopDrag: () => ipcRenderer.send('lyric-window-drag-stop')
});

contextBridge.exposeInMainWorld('apiBridge', {
  request: (config) => ipcRenderer.invoke('native-api-request', config)
});

contextBridge.exposeInMainWorld('trayAPI', {
  forceQuit: () => ipcRenderer.send('force-quit'),
  updateTooltip: (songInfo) => ipcRenderer.send('update-tray-tooltip', songInfo),
  updatePlayState: (isPlaying) => ipcRenderer.send('update-tray-play-state', isPlaying),
  updatePlayMode: (mode) => ipcRenderer.send('update-tray-play-mode', mode),
  updateLyricState: (visible) => ipcRenderer.send('update-tray-lyric-state', visible),
  onTrayAction: (callback) => {
    trayActionMgr.set((event, action) => callback(action));
  }
});
