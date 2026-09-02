import { Tray, Menu, nativeImage, globalShortcut, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { trayIcons } from './trayIcons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPersistentShortcutsEnabled() {
  try {
    const file = path.join(app.getPath('userData'), 'desktop_settings.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (typeof data.shortcutsEnabled === 'boolean') {
        return data.shortcutsEnabled;
      }
    }
  } catch (e) {}
  return true;
}

function savePersistentShortcutsEnabled(enabled) {
  try {
    const file = path.join(app.getPath('userData'), 'desktop_settings.json');
    let data = {};
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    data.shortcutsEnabled = Boolean(enabled);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

export class TrayManager {
  constructor(mainWindow, ipcMain, options = {}) {
    this.mainWindow = mainWindow;
    this.ipcMain = ipcMain;
    this.onBeforeQuit = options.onBeforeQuit || null;
    this.tray = null;
    this.isPlaying = false;
    this.currentSong = null;
    this.playMode = 'sequence';
    this.isQuitting = false;
    this.hasShownBalloon = false;
    this.lyricVisible = false;
    this.shortcutsEnabled = getPersistentShortcutsEnabled();
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

    if (this.shortcutsEnabled) {
      this._registerShortcuts();
    }
  }

  setShortcutsEnabled(enabled) {
    this.shortcutsEnabled = Boolean(enabled);
    savePersistentShortcutsEnabled(this.shortcutsEnabled);
    if (this.shortcutsEnabled) {
      this._registerShortcuts();
    } else {
      this._unregisterShortcuts();
    }
  }

  getShortcutsEnabled() {
    return this.shortcutsEnabled !== false;
  }

  _buildMenu() {
    const playPauseLabel = this.isPlaying ? '暂停' : '播放';
    const playPauseIcon = this.isPlaying ? trayIcons.get('pause') : trayIcons.get('play');

    const playModeLabels = {
      sequence: '列表循环',
      loop: '单曲循环',
      random: '随机播放'
    };
    const playModeIcons = {
      sequence: trayIcons.get('seq'),
      loop: trayIcons.get('loop'),
      random: trayIcons.get('rnd')
    };

    const currentModeLabel = playModeLabels[this.playMode] || '列表循环';
    const currentModeIcon = playModeIcons[this.playMode] || trayIcons.get('seq');
    const lyricLabel = this.lyricVisible ? '桌面歌词 ✓' : '桌面歌词';
    const lyricIcon = this.lyricVisible ? trayIcons.get('lyricsOn') : trayIcons.get('lyrics');

    return Menu.buildFromTemplate([
      { label: playPauseLabel, icon: playPauseIcon, click: () => this._sendAction('toggle-play') },
      { label: '上一首', icon: trayIcons.get('prev'), click: () => this._sendAction('prev') },
      { label: '下一首', icon: trayIcons.get('next'), click: () => this._sendAction('next') },
      { type: 'separator' },
      { label: '显示主窗口', icon: trayIcons.get('win'), click: () => this._showWindow() },
      { label: lyricLabel, icon: lyricIcon, click: () => this._sendAction('toggle-lyric') },
      { label: currentModeLabel, icon: currentModeIcon, submenu: [
        { label: '列表循环', icon: trayIcons.get('seq'), type: 'radio', checked: this.playMode === 'sequence', click: () => this._sendAction('set-mode-sequence') },
        { label: '单曲循环', icon: trayIcons.get('loop'), type: 'radio', checked: this.playMode === 'loop', click: () => this._sendAction('set-mode-loop') },
        { label: '随机播放', icon: trayIcons.get('rnd'), type: 'radio', checked: this.playMode === 'random', click: () => this._sendAction('set-mode-random') }
      ]},
      { type: 'separator' },
      { label: '关于概念音乐', icon: trayIcons.get('about'), click: () => this._showAbout() },
      { label: '检查更新', icon: trayIcons.get('update'), click: () => this._checkUpdate() },
      { type: 'separator' },
      { label: '退出', icon: trayIcons.get('quit'), click: () => this.forceQuit() }
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

  _showAbout() {
    this._showWindow();
    this._sendAction('show-about');
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
    if (this.onBeforeQuit) this.onBeforeQuit();
    this._unregisterShortcuts();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        this.mainWindow.close();
      } catch (e) {
        try { this.mainWindow.destroy(); } catch (_) {}
      }
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
    this.lyricVisible = Boolean(visible);
    this._refreshMenu();
  }

  updateTheme(theme) {
    this._refreshMenu();
  }

  getIsQuitting() {
    return this.isQuitting;
  }

  setIsQuitting(val) {
    this.isQuitting = val;
  }
}
