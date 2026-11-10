import { Tray, Menu, nativeImage, globalShortcut, app, BrowserWindow, screen, nativeTheme } from 'electron';
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
    this.trayWindow = null;
    this.isPlaying = false;
    this.currentSong = null;
    this.playMode = 'sequence';
    this.isQuitting = false;
    this.hasShownBalloon = false;
    this.lyricVisible = false;
    this.shortcutsEnabled = getPersistentShortcutsEnabled();
    this.lastPlacement = { alignRight: true, alignBottom: true, openSubmenuLeft: true };
    this._ipcHandlersRegistered = false;
    this._isMenuVisible = false;
    this._lastBlurTime = 0;
    this._lastShowTime = 0;
    this._lastRightClickTime = 0;
    this._isTransitioning = false;
  }

  init(iconPath) {
    app.setAppUserModelId('概念音乐');

    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip('概念音乐');

    this._createTrayWindow();
    this._registerIpcHandlers();

    // 监听系统/软件深浅色模式变更，实时向托盘窗口广播
    nativeTheme.on('updated', () => {
      this._broadcastState();
    });

    // 点击事件处理：右键弹出自定义圆角菜单，双击打开/隐藏主窗口
    this.tray.on('right-click', (event, bounds) => {
      const now = Date.now();
      // 核心防抖：Windows 任务栏在右键点击时会连续触发 WM_RBUTTONUP 和 WM_CONTEXTMENU
      // 严格过滤 300ms 内的重复事件，防止连续两次触发打开逻辑造成闪烁
      if (now - this._lastRightClickTime < 300) {
        return;
      }
      this._lastRightClickTime = now;
      this.toggleTrayWindow(bounds);
    });

    this.tray.on('double-click', () => {
      this._toggleWindow();
    });

    if (this.shortcutsEnabled) {
      this._registerShortcuts();
    }
  }

  _createTrayWindow() {
    if (this.trayWindow && !this.trayWindow.isDestroyed()) return;

    this.trayWindow = new BrowserWindow({
      width: 360,
      height: 416,
      x: -10000,
      y: -10000,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        backgroundThrottling: false // 保持后台渲染管线常驻
      }
    });

    const targetUrl = app.isPackaged
      ? 'app://localhost/#/tray-menu'
      : 'http://127.0.0.1:5173/#/tray-menu';

    this.trayWindow.loadURL(targetUrl);

    // 核心无缝架构：预先以 0 透明度在屏幕外常驻展示，彻底避免后续 hide/show 销毁重建 DWM 组合图层引起的反复闪烁
    this.trayWindow.once('ready-to-show', () => {
      try {
        this.trayWindow.setOpacity(0);
        this.trayWindow.setIgnoreMouseEvents(true);
        this.trayWindow.showInactive();
      } catch (e) {}
    });

    // 失焦自动隐藏：添加打开后 300ms 保护期，防止 Windows 任务栏焦点争抢引起的伪失焦闪闭
    this.trayWindow.on('blur', () => {
      const now = Date.now();
      if (now - this._lastShowTime < 300) {
        return;
      }
      if (!this._isMenuVisible) {
        return;
      }
      this._lastBlurTime = now;
      this.hideTrayWindow();
    });
  }

  _registerIpcHandlers() {
    if (this._ipcHandlersRegistered) return;
    this._ipcHandlersRegistered = true;

    this.ipcMain.on('tray-menu-action', (event, action) => {
      this._handleMenuAction(action);
    });

    this.ipcMain.on('tray-menu-close', () => {
      this.hideTrayWindow();
    });

    this.ipcMain.handle('get-tray-state', () => {
      return {
        state: this._getState(),
        placement: this.lastPlacement
      };
    });
  }

  _handleMenuAction(action) {
    this.hideTrayWindow();

    switch (action) {
      case 'toggle-play':
      case 'prev':
      case 'next':
      case 'toggle-lyric':
      case 'set-mode-sequence':
      case 'set-mode-loop':
      case 'set-mode-random':
        this._sendAction(action);
        break;
      case 'show-window':
        this._showWindow();
        break;
      case 'show-about':
        this._showAbout();
        break;
      case 'check-update':
        this._checkUpdate();
        break;
      case 'quit':
        this.forceQuit();
        break;
      default:
        this._sendAction(action);
        break;
    }
  }

  _getState() {
    return {
      isPlaying: this.isPlaying,
      playMode: this.playMode,
      lyricVisible: this.lyricVisible,
      currentSong: this.currentSong,
      isDark: nativeTheme.shouldUseDarkColors
    };
  }

  _broadcastState() {
    if (this._isMenuVisible && this.trayWindow && !this.trayWindow.isDestroyed() && this.trayWindow.webContents) {
      try {
        this.trayWindow.webContents.send('tray-state-update', {
          state: this._getState(),
          placement: this.lastPlacement
        });
      } catch (e) {}
    }
  }

  toggleTrayWindow(bounds) {
    if (this._isTransitioning) return;
    const now = Date.now();
    // 防抖保护：若在 250ms 内刚触发过 blur（如右键点击托盘图标导致菜单先失焦），则不重复切出切入
    if (this._lastBlurTime && (now - this._lastBlurTime < 250)) {
      return;
    }
    if (this._isMenuVisible) {
      this.hideTrayWindow();
    } else {
      this.showTrayWindow(bounds);
    }
  }

  async showTrayWindow(trayBounds) {
    if (this._isTransitioning || this._isMenuVisible) return;
    this._isTransitioning = true;
    try {
      if (!this.trayWindow || this.trayWindow.isDestroyed()) {
        this._createTrayWindow();
      }

      // 1. 确保在定位和渲染准备期间透明度绝对为 0（对用户完全不可见）
      try {
        this.trayWindow.setOpacity(0);
        this.trayWindow.setIgnoreMouseEvents(true);
      } catch (e) {}

      // 获取当前鼠标位置与显示器
      const cursor = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(cursor) || screen.getPrimaryDisplay();
      const { workArea, bounds: displayBounds } = display;
      const screenRightEdge = workArea.x + workArea.width;
      const screenBottomEdge = workArea.y + workArea.height;

      // 判断任务栏是否在底部：当屏幕底部存在非工作区且工作区起点为 0 时，任务栏位于屏幕底部
      const taskbarAtBottom = (displayBounds.height - workArea.height) >= 20 && (workArea.y === displayBounds.y);
      // 光标落在工作区底部之外，或距离底部 4px 以内，即明确判定为任务栏图标点击
      const isTaskbarClick = taskbarAtBottom && (cursor.y >= screenBottomEdge - 4);

      let targetX = cursor.x;
      let targetY = cursor.y;

      if (isTaskbarClick) {
        // 在任务栏图标上点击：若 trayBounds 确实位于任务栏区域，几何中心对齐托盘图标
        if (trayBounds && typeof trayBounds.x === 'number' && trayBounds.width > 0 && trayBounds.y >= screenBottomEdge - 10) {
          targetX = Math.round(trayBounds.x + trayBounds.width / 2);
        }
      }
      // 注意：在 Windows 隐藏托盘抽屉（NotifyIconOverflowWindow）内点击时，cursor.x / cursor.y 才是最真实精确的图标点击坐标，杜绝被主任务栏折叠箭头位置误导！

      const windowWidth = 360;
      const windowHeight = 416;
      const cardWidth = 192;
      const submenuWidth = 144;
      const cardMargin = 8;
      const cardBottomPadding = 6; // pb-1.5
      const cardBottomInWinY = windowHeight - cardBottomPadding; // 410

      // 判断右侧是否有足够空间展开 144px 二级子菜单
      // 主菜单卡片宽度为 192px（居中对齐 targetX 时右半边占 96px）
      // 二级子菜单需要 144px 宽度 + 6px 间隙 + 14px 屏幕安全边距 = 164px
      const canOpenRight = (targetX + Math.round(cardWidth / 2) + submenuWidth + 14) <= screenRightEdge;
      const openSubmenuLeft = !canOpenRight;

      // 水平定位：无论二级菜单向左还是向右展开，主菜单卡片在屏幕上的中心始终精确对齐 targetX
      let winX = 0;
      if (openSubmenuLeft) {
        // 卡片靠窗口右侧 (justify-end pr-2)，卡片中心在窗口坐标系的 X 坐标为：360 - 8 - 96 = 256
        const cardCenterInWinX = windowWidth - cardMargin - Math.round(cardWidth / 2); // 256
        winX = targetX - cardCenterInWinX;
      } else {
        // 卡片靠窗口左侧 (justify-start pl-2)，卡片中心在窗口坐标系的 X 坐标为：8 + 96 = 104
        const cardCenterInWinX = cardMargin + Math.round(cardWidth / 2); // 104
        winX = targetX - cardCenterInWinX;
      }

      // 严格钳制在屏幕工作区可视范围内
      winX = Math.max(workArea.x + 4, Math.min(winX, screenRightEdge - windowWidth - 4));

      // 垂直定位：
      let winY = 0;
      if (isTaskbarClick) {
        // 在任务栏点击：菜单底部紧贴任务栏上沿 4px
        winY = (screenBottomEdge - 4) - cardBottomInWinY;
      } else {
        // 在隐藏托盘或其他工作区区域点击：菜单底部紧贴用户点击点上方 4px
        winY = (targetY - 4) - cardBottomInWinY;
      }

      // 严格钳制在屏幕工作区可视范围内
      winY = Math.max(workArea.y + 4, Math.min(winY, (screenBottomEdge - 4) - cardBottomInWinY));

      this.lastPlacement = { openSubmenuLeft };

      // 2. 将窗口移动至目标位置（此时透明度为 0，移动过程完全隐蔽）
      this.trayWindow.setBounds({
        x: Math.round(winX),
        y: Math.round(winY),
        width: windowWidth,
        height: windowHeight
      });

      // 3. 在窗口呈现前，预先同步最新状态与深浅色模式，并等待 Vue nextTick + requestAnimationFrame 渲染就绪
      if (this.trayWindow && !this.trayWindow.isDestroyed() && this.trayWindow.webContents) {
        try {
          const payloadStr = JSON.stringify({ state: this._getState(), placement: this.lastPlacement });
          await this.trayWindow.webContents.executeJavaScript(`window.__setTrayPlacement && window.__setTrayPlacement(${payloadStr});`);
        } catch (e) {}
      }

      // 4. 确保窗口在底层已处于展示状态（初次若未呈现则激活）
      if (!this.trayWindow.isVisible()) {
        this.trayWindow.showInactive();
      }

      // 5. 瞬间恢复交互与透明度（0 到 1 硬件级一次性显现，绝无 DWM 历史脏帧与二次闪烁）
      this.trayWindow.setIgnoreMouseEvents(false);
      this.trayWindow.setOpacity(1);
      this.trayWindow.focus();

      this._isMenuVisible = true;
      this._lastShowTime = Date.now();
    } finally {
      this._isTransitioning = false;
    }
  }

  hideTrayWindow() {
    if (!this._isMenuVisible) return;
    this._isMenuVisible = false;
    if (this.trayWindow && !this.trayWindow.isDestroyed()) {
      try {
        // 不调用 BrowserWindow.hide()，而是设为 0 透明度并移至屏幕外，彻底杜绝 DWM 表面销毁重建造成的反复弹闪
        this.trayWindow.setOpacity(0);
        this.trayWindow.setIgnoreMouseEvents(true);
        this.trayWindow.setPosition(-10000, -10000);
      } catch (e) {}
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
    if (this.trayWindow && !this.trayWindow.isDestroyed()) {
      try {
        this.trayWindow.destroy();
      } catch (e) {}
      this.trayWindow = null;
    }
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
    }
    this._broadcastState();
  }

  updatePlayState(isPlaying) {
    this.isPlaying = isPlaying;
    this._broadcastState();
  }

  updatePlayMode(mode) {
    this.playMode = mode;
    this._broadcastState();
  }

  updateLyricState(visible) {
    this.lyricVisible = Boolean(visible);
    this._broadcastState();
  }

  updateTheme(theme) {
    if (['dark', 'light', 'system'].includes(theme)) {
      nativeTheme.themeSource = theme;
    }
    this._broadcastState();
  }

  getIsQuitting() {
    return this.isQuitting;
  }

  setIsQuitting(val) {
    this.isQuitting = val;
  }
}
