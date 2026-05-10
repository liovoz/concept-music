import { Tray, Menu, nativeImage, globalShortcut, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TrayManager {
  constructor(mainWindow, ipcMain) {
    this.mainWindow = mainWindow;
    this.ipcMain = ipcMain;
    this.tray = null;
    this.isPlaying = false;
    this.currentSong = null;
    this.playMode = 'sequence';
    this.isQuitting = false;
    this.hasShownBalloon = false;
    this.lyricVisible = false;
  }

  init(iconPath) {
    app.setAppUserModelId('概念音乐');

    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip('概念音乐');
    this.tray.setContextMenu(this._buildMenu());

    this.tray.on('double-click', () => {
      this._toggleWindow();
    });

    this._registerShortcuts();
  }

  _buildMenu() {
    const playPauseLabel = this.isPlaying ? '⏸ 暂停' : '▶ 播放';
    const playModeLabels = {
      sequence: '🔀 列表循环',
      loop: '🔁 单曲循环',
      random: '🎲 随机播放'
    };
    const playModeLabel = playModeLabels[this.playMode] || '🔀 列表循环';
    const lyricLabel = this.lyricVisible ? '🎤 桌面歌词 ✓' : '🎤 桌面歌词';

    return Menu.buildFromTemplate([
      { label: playPauseLabel, click: () => this._sendAction('toggle-play') },
      { label: '⏮ 上一首', click: () => this._sendAction('prev') },
      { label: '⏭ 下一首', click: () => this._sendAction('next') },
      { type: 'separator' },
      { label: '📋 显示主窗口', click: () => this._showWindow() },
      { label: lyricLabel, click: () => this._sendAction('toggle-lyric') },
      { label: playModeLabel, submenu: [
        { label: '🔀 列表循环', type: 'radio', checked: this.playMode === 'sequence', click: () => this._sendAction('set-mode-sequence') },
        { label: '🔁 单曲循环', type: 'radio', checked: this.playMode === 'loop', click: () => this._sendAction('set-mode-loop') },
        { label: '🎲 随机播放', type: 'radio', checked: this.playMode === 'random', click: () => this._sendAction('set-mode-random') }
      ]},
      { type: 'separator' },
      { label: 'ℹ️ 关于概念音乐', click: () => this._sendAction('show-about') },
      { label: '🔄 检查更新', click: () => this._checkUpdate() },
      { type: 'separator' },
      { label: '❌ 退出', click: () => this.forceQuit() }
    ]);
  }

  _refreshMenu() {
    if (this.tray) {
      this.tray.setContextMenu(this._buildMenu());
    }
  }

  _toggleWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.mainWindow.isVisible() && !this.mainWindow.isMinimized()) {
      this.mainWindow.hide();
    } else {
      this._showWindow();
    }
  }

  _showWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    const wasHidden = !this.mainWindow.isVisible() || this.mainWindow.isMinimized();
    if (wasHidden) {
      this.mainWindow.webContents.send('window-restored');
    }
    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
    if (wasHidden) {
      setTimeout(() => {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
        this.mainWindow.show();
        this.mainWindow.focus();
      }, 50);
    } else {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  _sendAction(action) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tray-action', action);
    }
  }

  _checkUpdate() {
    this._showWindow();
    this._sendAction('check-update');
  }

  _registerShortcuts() {
    const shortcuts = [
      { key: 'CommandOrControl+Alt+Space', action: 'toggle-play' },
      { key: 'CommandOrControl+Alt+Left', action: 'prev' },
      { key: 'CommandOrControl+Alt+Right', action: 'next' },
      { key: 'CommandOrControl+Alt+M', action: 'toggle-mute' }
    ];

    shortcuts.forEach(({ key, action }) => {
      try {
        globalShortcut.register(key, () => this._sendAction(action));
      } catch (e) {}
    });
  }

  _unregisterShortcuts() {
    try {
      globalShortcut.unregisterAll();
    } catch (e) {}
  }

  handleWindowClose() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.hide();

    if (!this.hasShownBalloon && this.tray) {
      this.tray.displayBalloon({
        title: '概念音乐',
        content: '正在后台运行，双击图标恢复窗口',
        iconType: 'info'
      });
      this.hasShownBalloon = true;
    }
  }

  forceQuit() {
    this.isQuitting = true;
    this._unregisterShortcuts();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.destroy();
    }
  }

  updateTooltip(songInfo) {
    this.currentSong = songInfo;
    if (this.tray) {
      if (songInfo) {
        this.tray.setToolTip(`概念音乐 - ${songInfo.name} - ${songInfo.singer}`);
      } else {
        this.tray.setToolTip('概念音乐');
      }
      this._refreshMenu();
    }
  }

  updatePlayState(isPlaying) {
    this.isPlaying = isPlaying;
    this._refreshMenu();
  }

  updatePlayMode(mode) {
    this.playMode = mode;
    this._refreshMenu();
  }

  updateLyricState(visible) {
    this.lyricVisible = visible;
    this._refreshMenu();
  }

  getIsQuitting() {
    return this.isQuitting;
  }

  setIsQuitting(val) {
    this.isQuitting = val;
  }
}
