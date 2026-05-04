const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close')
});

contextBridge.exposeInMainWorld('updaterAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  cancelDownload: () => ipcRenderer.send('cancel-download'),
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateEvent: (callback) => ipcRenderer.on('updater-event', (_event, data) => callback(data)),
  clearVault: () => ipcRenderer.send('clear-vault')
});

contextBridge.exposeInMainWorld('lyricAPI', {
  toggle: () => ipcRenderer.send('toggle-desktop-lyric'),
  sync: (data) => ipcRenderer.send('sync-lyric', data),
  onSync: (callback) => {
    ipcRenderer.removeAllListeners('update-lyric');
    ipcRenderer.on('update-lyric', (event, data) => callback(data));
  },
  sendControl: (cmd) => ipcRenderer.send('lyric-control-cmd', cmd),
  onControl: (callback) => {
    ipcRenderer.removeAllListeners('main-lyric-control');
    ipcRenderer.on('main-lyric-control', (event, cmd) => callback(cmd));
  },
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  setMouseAuto: () => ipcRenderer.send('set-mouse-auto'),
  unlockLyric: () => ipcRenderer.send('unlock-lyric'),
  onMouseEnter: (callback) => {
    ipcRenderer.removeAllListeners('lyric-mouse-enter');
    ipcRenderer.on('lyric-mouse-enter', () => callback());
  },
  onMouseLeave: (callback) => {
    ipcRenderer.removeAllListeners('lyric-mouse-leave');
    ipcRenderer.on('lyric-mouse-leave', () => callback());
  },
  onClosed: (callback) => {
    ipcRenderer.removeAllListeners('lyric-window-closed');
    ipcRenderer.on('lyric-window-closed', () => callback());
  },
  startDrag: () => ipcRenderer.send('lyric-window-drag'),
  stopDrag: () => ipcRenderer.send('lyric-window-drag-stop')
});

contextBridge.exposeInMainWorld('apiBridge', {
  request: (config) => ipcRenderer.invoke('native-api-request', config)
});
