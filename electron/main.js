import { app, BrowserWindow, ipcMain, dialog, protocol, net, screen, nativeTheme, shell } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { fork } from 'child_process';
import fs from 'fs';
import http from 'http'; 
import pkg from 'electron-updater';
import builderUtilRuntime from 'builder-util-runtime';
import { TrayManager } from './trayManager.js';

app.commandLine.appendSwitch('enable-transparent-visuals');

const { autoUpdater } = pkg;
const { CancellationToken } = builderUtilRuntime;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_FRONTEND_URL = 'http://127.0.0.1:5173';

function getAppIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../public/icon.ico');
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

let serverProcess = null;
let mainWindow = null; 
let lyricWindow = null; 
let isQuitting = false;
let isManualCheck = false;
let downloadCancellationToken = null; 
let trayManager = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

// --- 金库与鉴权逻辑 (保持原样) ---
let vaultMemoryCache = null;
app.on('before-quit', () => {
  isQuitting = true;
  closeLyricWindow({ destroy: true });
  if (trayManager) trayManager.setIsQuitting(true);
});
function getVaultPath() { return path.join(app.getPath('userData'), 'kugou_auth_vault.json'); }
function loadVaultCookies() {
  if (vaultMemoryCache !== null) return vaultMemoryCache; 
  try {
    const vaultPath = getVaultPath();
    if (fs.existsSync(vaultPath)) {
      vaultMemoryCache = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
      return vaultMemoryCache;
    }
  } catch (e) { console.error('读取金库失败:', e); }
  vaultMemoryCache = {}; 
  return vaultMemoryCache;
}
function saveVaultCookies(newCookiesArray) {
  if (vaultMemoryCache === null) loadVaultCookies(); 
  let changed = false;
  const protectedKeys = ['token', 'kg_mid', 'kg_dfid', 'userid', 'vip_token', 'KugooID'];
  newCookiesArray.forEach(cookieStr => {
    if (!cookieStr) return;
    const mainPart = cookieStr.split(';')[0]; 
    const parts = mainPart.split('=');
    if (parts.length >= 2 && parts[0]) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'kg_dfid' && vaultMemoryCache['token'] && vaultMemoryCache['kg_dfid']) {
         if (val !== vaultMemoryCache['kg_dfid']) return; 
      }
      if (val && val !== 'deleted' && val !== '""') {
        if (vaultMemoryCache[key] !== val) {
          vaultMemoryCache[key] = val; 
          changed = true;
        }
      } else {
        if (!protectedKeys.includes(key)) {
          if (vaultMemoryCache[key] !== undefined) {
            delete vaultMemoryCache[key];
            changed = true;
          }
        }
      }
    }
  });
  if (changed) {
    try { fs.writeFileSync(getVaultPath(), JSON.stringify(vaultMemoryCache), 'utf8'); } catch (e) {}
  }
}
ipcMain.on('clear-vault', () => {
  vaultMemoryCache = {}; 
  try {
    const vaultPath = getVaultPath();
    if (fs.existsSync(vaultPath)) fs.unlinkSync(vaultPath);
  } catch(e) {}
});

// --- 服务端逻辑 (保持原样) ---
const LOCAL_SERVER_HEALTH_URL = 'http://127.0.0.1:10420/server/now';

function isLocalServerReady(timeout = 500) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ready) => {
      if (settled) return;
      settled = true;
      resolve(ready);
    };

    const req = http.get(LOCAL_SERVER_HEALTH_URL, (res) => {
      res.resume();
      done(res.statusCode === 200 || res.statusCode === 404);
    });

    req.on('error', () => done(false));
    req.setTimeout(timeout, () => {
      req.destroy();
      done(false);
    });
  });
}

async function startLocalServer() {
  if (await isLocalServerReady()) {
    console.log('[Server] Reusing existing local API server on port 10420.');
    return;
  }

  return new Promise((resolve) => {
    let serverPath;
    let serverCwd; 
    if (app.isPackaged) {
      serverPath = path.join(process.resourcesPath, 'server', 'app.js');
      serverCwd = path.join(process.resourcesPath, 'server');
    } else {
      serverPath = path.join(__dirname, '../server', 'app.js');
      serverCwd = path.join(__dirname, '../server'); 
    }
    let serverErrorLog = '';
    serverProcess = fork(serverPath, [], {
      cwd: serverCwd, 
      env: { ...process.env, PORT: 10420, platform: 'lite', ELECTRON_RUN_AS_NODE: '1' },
      silent: true 
    });
    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      serverErrorLog += msg;
      if (msg.includes('EADDRINUSE')) {
        isLocalServerReady().then((ready) => {
          if (ready) resolve();
        });
        return;
      }
      console.error('[Server]', msg);
    });
    serverProcess.stdout.on('data', (data) => {
      console.log('[Server]', data.toString());
    });
    serverProcess.on('exit', (code) => {
      if (!isQuitting && app.isPackaged && code !== 0 && code !== null) {
        const detail = serverErrorLog.trim() || '无详细错误信息';
        dialog.showErrorBox('核心 API 崩溃', `后端服务意外退出，错误代码: ${code}\n\n${detail}`);
      }
    });
    let retryCount = 0;
    let serverReady = false;
    const pingServer = () => {
      const req = http.get(LOCAL_SERVER_HEALTH_URL, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) { serverReady = true; resolve(); }
        else handleError();
      }).on('error', handleError);
      req.setTimeout(500, () => { req.destroy(); handleError(); });
      function handleError() {
        retryCount++;
        if (retryCount >= 100) {
          if (!serverReady && mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox('后端服务启动失败', '本地 API 服务未能在规定时间内启动，部分功能可能不可用。\n请尝试重启应用。');
          }
          resolve();
        }
        else setTimeout(pingServer, 100); 
      }
    };
    setTimeout(pingServer, 200);
  });
}

function initAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (...args) => console.log('[Updater]', ...args),
    warn: (...args) => console.warn('[Updater]', ...args),
    error: (...args) => console.error('[Updater]', ...args),
    debug: (...args) => console.log('[Updater][debug]', ...args)
  };
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'liovoz',
    repo: 'concept-music'
  });

  const updaterSession = mainWindow.webContents.session;
  updaterSession.resolveProxy('https://github.com').then(proxy => {
    if (proxy && proxy !== 'DIRECT') {
      autoUpdater.session = updaterSession;
    }
  }).catch(() => {});
  const sendToWindow = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updater-event', data);
  };
  let downloadRetryCount = 0;
  const MAX_DOWNLOAD_RETRIES = 3;
  let updatePhase = null; // 'checking' | 'downloading' | null
  let isDownloadCancelled = false;

  autoUpdater.on('checking-for-update', () => { updatePhase = 'checking'; sendToWindow({ type: 'checking', isManualCheck }); });
  autoUpdater.on('update-available', (info) => { updatePhase = null; sendToWindow({ type: 'available', info, isManualCheck }); });
  autoUpdater.on('update-not-available', (info) => { updatePhase = null; sendToWindow({ type: 'not-available', info, isManualCheck }); isManualCheck = false; });
  autoUpdater.on('error', (err) => {
    const message = (err && err.message) || '';
    console.error('[Updater] error:', message);
    if (isDownloadCancelled) {
      isDownloadCancelled = false;
      updatePhase = null;
      downloadCancellationToken = null;
      downloadRetryCount = 0;
      sendToWindow({ type: 'cancelled' });
      return;
    }
    // 下载阶段的失败先静默重试，重试期间不推送错误，避免界面在“下载中/失败”之间抖动
    if (updatePhase === 'downloading' && downloadRetryCount < MAX_DOWNLOAD_RETRIES) return;
    updatePhase = null;
    sendToWindow({ type: 'error', message, isManualCheck, phase: 'download' });
    isManualCheck = false;
    downloadCancellationToken = null;
  });
  autoUpdater.on('download-progress', (progressObj) => { downloadRetryCount = 0; sendToWindow({ type: 'progress', progressObj }); });
  autoUpdater.on('update-downloaded', (info) => { updatePhase = null; sendToWindow({ type: 'downloaded', info }); downloadCancellationToken = null; downloadRetryCount = 0; });

  ipcMain.on('check-for-updates', () => {
    isManualCheck = true;
    if (!app.isPackaged) { sendToWindow({ type: 'error', message: '开发环境暂不支持自动更新，请打包后体验', isManualCheck }); isManualCheck = false; return; }
    updatePhase = 'checking';
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[Updater] checkForUpdates failed:', err && err.message);
      updatePhase = null;
      sendToWindow({ type: 'error', message: '检查更新失败，请检查网络', isManualCheck });
      isManualCheck = false;
    });
  });

  const doDownloadUpdate = () => {
    isDownloadCancelled = false;
    // electron-updater 要求传入 builder-util-runtime 的 CancellationToken（下载器内部会调用其 createPromise），
    // 传 DOM AbortSignal 会导致下载发起瞬间即抛 TypeError
    downloadCancellationToken = new CancellationToken();
    autoUpdater.downloadUpdate(downloadCancellationToken).catch(err => {
      const errMsg = (err && err.message) || '';
      if (errMsg.includes('aborted') || errMsg.includes('cancel')) {
        // 用户主动取消：CancellationError 不会触发 error 事件，在此统一发送 cancelled 状态
        downloadCancellationToken = null;
        if (isDownloadCancelled) {
          isDownloadCancelled = false;
          updatePhase = null;
          downloadRetryCount = 0;
          sendToWindow({ type: 'cancelled' });
        }
        return;
      }
      console.error('[Updater] download failed:', errMsg);
      if (downloadRetryCount < MAX_DOWNLOAD_RETRIES) {
        downloadRetryCount++;
        console.log(`[Updater] 下载重试 ${downloadRetryCount}/${MAX_DOWNLOAD_RETRIES}，3 秒后重试`);
        setTimeout(() => { doDownloadUpdate(); }, 3000);
      } else {
        updatePhase = null;
        sendToWindow({ type: 'error', message: errMsg || '下载失败，请检查网络连接', isManualCheck: true, phase: 'download' });
        downloadRetryCount = 0;
      }
      downloadCancellationToken = null;
    });
  };

  ipcMain.on('download-update', () => { downloadRetryCount = 0; updatePhase = 'downloading'; doDownloadUpdate(); });
  ipcMain.on('cancel-download', () => {
    if (downloadCancellationToken) {
      isDownloadCancelled = true;
      downloadCancellationToken.cancel();
      downloadCancellationToken = null;
      downloadRetryCount = 0;
    } else {
      sendToWindow({ type: 'cancelled' });
    }
  });
  // oneClick:false 的辅助安装器：非静默安装并在完成后拉起应用
  ipcMain.on('quit-and-install', () => autoUpdater.quitAndInstall(false, true));
  ipcMain.handle('get-app-version', () => app.getVersion());
}

// --- 桌面歌词窗口逻辑 ---
let lyricInteractive = false;
let lyricForceInteractive = false;
let lyricLocked = false;
let lyricLockedHoverCount = 0;
let lyricMouseTracker = null;
let lyricHotArea = null;
const LYRIC_LOCKED_HOVER_TICKS = 13;

function isPointInRect(point, rect) {
  if (!rect) return false;
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function closeLyricWindow({ destroy = false } = {}) {
  stopLyricMouseTracker();
  lyricInteractive = false;
  lyricForceInteractive = false;
  lyricLocked = false;
  lyricLockedHoverCount = 0;
  lyricHotArea = null;
  if (trayManager) trayManager.updateLyricState(false);
  if (lyricWindow && !lyricWindow.isDestroyed()) {
    if (destroy) lyricWindow.destroy();
    else lyricWindow.close();
  }
}

function startLyricMouseTracker() {
  if (lyricMouseTracker) return;
  lyricMouseTracker = setInterval(() => {
    if (!lyricWindow || lyricWindow.isDestroyed()) {
      stopLyricMouseTracker();
      return;
    }
    if (lyricForceInteractive) return;

    const cursorPos = screen.getCursorScreenPoint();
    const bounds = lyricWindow.getBounds();
    const inside = isPointInRect(cursorPos, bounds);

    if (lyricLocked) {
      if (lyricInteractive && inside) {
        return;
      }

      const hotArea = lyricHotArea
        ? {
            x: bounds.x + lyricHotArea.x,
            y: bounds.y + lyricHotArea.y,
            width: lyricHotArea.width,
            height: lyricHotArea.height
          }
        : null;
      const insideHotArea = isPointInRect(cursorPos, hotArea);

      if (insideHotArea) {
        lyricLockedHoverCount++;
        if (lyricLockedHoverCount >= LYRIC_LOCKED_HOVER_TICKS && !lyricInteractive) {
          lyricInteractive = true;
          lyricWindow.setIgnoreMouseEvents(false);
          lyricWindow.webContents.send('lyric-mouse-enter');
        }
      } else {
        lyricLockedHoverCount = 0;
        if (lyricInteractive) {
          lyricInteractive = false;
          lyricWindow.setIgnoreMouseEvents(true, { forward: true });
          lyricWindow.webContents.send('lyric-mouse-leave');
        }
      }
    } else {
      if (inside && !lyricInteractive) {
        lyricInteractive = true;
        lyricWindow.setIgnoreMouseEvents(false);
        lyricWindow.webContents.send('lyric-mouse-enter');
      } else if (!inside && lyricInteractive) {
        lyricInteractive = false;
        lyricWindow.setIgnoreMouseEvents(true, { forward: true });
        lyricWindow.webContents.send('lyric-mouse-leave');
      }
    }
  }, 80);
}

function stopLyricMouseTracker() {
  if (lyricMouseTracker) {
    clearInterval(lyricMouseTracker);
    lyricMouseTracker = null;
  }
}

function createLyricWindow() {
  if (lyricWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const lyricWidth = Math.min(900, screenWidth - 100);
  const lyricHeight = 160;
  const lyricX = Math.max(0, Math.floor((screenWidth - lyricWidth) / 2));
  const lyricY = Math.max(0, Math.min(60, screenHeight - lyricHeight - 10));

  lyricWindow = new BrowserWindow({
    width: lyricWidth,
    height: lyricHeight,
    x: lyricX,
    y: lyricY,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    focusable: false,
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  lyricInteractive = false;
  lyricForceInteractive = false;
  lyricLocked = false;
  lyricLockedHoverCount = 0;
  lyricWindow.setIgnoreMouseEvents(true, { forward: true });

  if (app.isPackaged) lyricWindow.loadURL('app://localhost/#/desktop-lyric');
  else lyricWindow.loadURL(`${DEV_FRONTEND_URL}/#/desktop-lyric`);

  lyricWindow.once('ready-to-show', () => {
    lyricWindow.showInactive();
    startLyricMouseTracker();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lyric-window-ready');
    if (trayManager) trayManager.updateLyricState(true);
  });
  lyricWindow.on('closed', () => {
    stopLyricMouseTracker();
    lyricWindow = null;
    lyricInteractive = false;
    lyricForceInteractive = false;
    lyricLocked = false;
    lyricLockedHoverCount = 0;
    lyricHotArea = null;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lyric-window-closed');
    if (trayManager) trayManager.updateLyricState(false);
  });
}

ipcMain.on('toggle-desktop-lyric', () => { if (lyricWindow) closeLyricWindow(); else createLyricWindow(); });
ipcMain.on('sync-lyric', (event, data) => { if (lyricWindow && !lyricWindow.isDestroyed()) lyricWindow.webContents.send('update-lyric', data); });
ipcMain.on('lyric-control-cmd', (event, cmd) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('main-lyric-control', cmd); });
ipcMain.on('lyric-hot-area', (event, rect) => {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y) || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return;
  lyricHotArea = {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height))
  };
});

ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (!lyricWindow || lyricWindow.isDestroyed()) return;
  if (ignore) {
    lyricForceInteractive = false;
    lyricLocked = true;
    lyricLockedHoverCount = 0;
    lyricInteractive = false;
    lyricWindow.setIgnoreMouseEvents(true, { forward: true });
    lyricWindow.webContents.send('lyric-mouse-leave');
  } else {
    lyricForceInteractive = true;
    lyricLocked = false;
    lyricLockedHoverCount = 0;
    lyricInteractive = true;
    lyricWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('unlock-lyric', () => {
  if (!lyricWindow || lyricWindow.isDestroyed()) return;
  lyricLocked = false;
  lyricLockedHoverCount = 0;
});

ipcMain.on('set-mouse-auto', () => {
  if (!lyricWindow || lyricWindow.isDestroyed()) return;
  lyricForceInteractive = false;
  lyricLocked = false;
  lyricInteractive = false;

  const cursorPos = screen.getCursorScreenPoint();
  const bounds = lyricWindow.getBounds();
  const inside =
    cursorPos.x >= bounds.x &&
    cursorPos.x <= bounds.x + bounds.width &&
    cursorPos.y >= bounds.y &&
    cursorPos.y <= bounds.y + bounds.height;

  if (inside) {
    lyricInteractive = true;
    lyricWindow.setIgnoreMouseEvents(false);
    lyricWindow.webContents.send('lyric-mouse-enter');
  } else {
    lyricWindow.setIgnoreMouseEvents(true, { forward: true });
    lyricWindow.webContents.send('lyric-mouse-leave');
  }
});

ipcMain.on('lyric-window-drag', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  lyricForceInteractive = true;
  const initialCursorPos = screen.getCursorScreenPoint();
  const initialWindowPos = win.getPosition();
  let lastX = initialWindowPos[0];
  let lastY = initialWindowPos[1];
  let dragging = true;
  const onMove = () => {
    if (!dragging || win.isDestroyed()) { stopDrag(); return; }
    const currentCursorPos = screen.getCursorScreenPoint();
    const newX = initialWindowPos[0] + (currentCursorPos.x - initialCursorPos.x);
    const newY = initialWindowPos[1] + (currentCursorPos.y - initialCursorPos.y);
    if (newX !== lastX || newY !== lastY) {
      win.setPosition(newX, newY);
      lastX = newX;
      lastY = newY;
    }
  };
  const stopDrag = () => {
    dragging = false;
    screen.off('display-metrics-changed', onMove);
    clearInterval(moveInterval);
    if (!win || win.isDestroyed()) return;
    lyricForceInteractive = false;
    lyricInteractive = false;
    const cursorPos = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    const inside =
      cursorPos.x >= bounds.x &&
      cursorPos.x <= bounds.x + bounds.width &&
      cursorPos.y >= bounds.y &&
      cursorPos.y <= bounds.y + bounds.height;
    if (inside) {
      lyricInteractive = true;
      win.setIgnoreMouseEvents(false);
      win.webContents.send('lyric-mouse-enter');
    } else {
      win.setIgnoreMouseEvents(true, { forward: true });
      win.webContents.send('lyric-mouse-leave');
    }
  };
  const moveInterval = setInterval(onMove, 16);
  screen.on('display-metrics-changed', onMove);
  ipcMain.once('lyric-window-drag-stop', () => { stopDrag(); });
});

// --- API 请求中心与常规逻辑 (保持原样) ---
ipcMain.handle('native-api-request', async (event, config) => {
  let targetPath = config.url;
  if (targetPath.startsWith('/api/')) targetPath = targetPath.replace(/^\/api/, '');
  else if (targetPath.startsWith('/')) targetPath = targetPath.substring(1);
  let queryString = '';
  if (config.params) {
    const params = new URLSearchParams(config.params);
    queryString = `?${params.toString()}`;
  }
  const targetUrl = `http://127.0.0.1:10420/${targetPath}${queryString}`;
  const headersObj = { ...(config.headers || {}) };
  delete headersObj['Origin']; delete headersObj['Referer']; delete headersObj['Host'];
  const vaultCookies = loadVaultCookies();
  const cookiePairs = Object.entries(vaultCookies).map(([k, v]) => `${k}=${v}`);
  if (cookiePairs.length > 0) headersObj['Cookie'] = cookiePairs.join('; ');
  let bodyData = null;
  if (config.data) {
    if (typeof config.data === 'string') bodyData = config.data;
    else { bodyData = JSON.stringify(config.data); headersObj['Content-Type'] = 'application/json'; }
  }
  const makeRequest = () => {
    return new Promise((resolve, reject) => {
      const req = http.request(targetUrl, { method: (config.method || 'GET').toUpperCase(), headers: headersObj }, (res) => {
        const setCookies = res.headers['set-cookie'] || [];
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => { const buffer = Buffer.concat(chunks); resolve({ statusCode: res.statusCode, data: buffer.toString('utf8'), setCookies }); });
        res.on('error', err => reject(err));
      });
      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    });
  };
  let attempt = 0; let finalResult = null; let lastErr = null;
  while (attempt < 5) {
    try {
      let res = await makeRequest();
      if (res.statusCode === 502 || res.statusCode === 504) {
        attempt++; lastErr = new Error(`Server returned ${res.statusCode}`);
        await new Promise(r => setTimeout(r, 500 * Math.pow(1.5, attempt - 1))); continue;
      }
      finalResult = res; break;
    } catch (e) { attempt++; lastErr = e; await new Promise(r => setTimeout(r, 500)); }
  }
  if (!finalResult) return { status: 502, data: { errcode: 502, error_msg: lastErr?.message || 'Timeout' } };
  if (finalResult.statusCode < 400 && finalResult.setCookies.length > 0) saveVaultCookies(finalResult.setCookies);
  let parsedData; try { parsedData = JSON.parse(finalResult.data); } catch(e) { parsedData = finalResult.data; }
  return { status: finalResult.statusCode, data: parsedData };
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200, height: 830, minWidth: 1100, minHeight: 740, frame: false, show: false, backgroundColor: '#ffffff',
    icon: getAppIconPath(),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, webSecurity: true }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  ipcMain.on('window-min', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize(); });
  ipcMain.on('window-max', () => { if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
  ipcMain.on('window-set-fullscreen', (event, flag) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(Boolean(flag));
    }
  });
  ipcMain.on('window-toggle-fullscreen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });
  ipcMain.handle('window-is-fullscreen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isFullScreen();
    }
    return false;
  });
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('window-fullscreen-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('window-fullscreen-changed', false);
  });
  ipcMain.on('window-close', () => {
    if (trayManager && !trayManager.getIsQuitting()) {
      trayManager.handleWindowClose();
    } else {
      mainWindow.close();
    }
  });
  ipcMain.on('window-hide-to-tray', () => {
    if (trayManager) trayManager.handleWindowClose();
    else if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
  });
  mainWindow.on('close', (e) => {
    if (trayManager && !trayManager.getIsQuitting()) {
      e.preventDefault();
      mainWindow.webContents.send('trigger-close-dialog');
    }
  });
};

app.whenReady().then(async () => {
  if (process.platform === 'linux' || process.platform === 'win32') {
    try { app.setIcon(getAppIconPath()); } catch(e) {}
  }
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let relativePath = decodeURIComponent(url.pathname);
    if (relativePath === '/') relativePath = '/index.html';
    let absolutePath = path.join(__dirname, '../dist', relativePath);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) absolutePath = path.join(__dirname, '../dist/index.html');
    return net.fetch(pathToFileURL(absolutePath).toString());
  });
  createWindow();      
  await startLocalServer(); 
  trayManager = new TrayManager(mainWindow, ipcMain, {
    onBeforeQuit: () => closeLyricWindow({ destroy: true })
  });
  trayManager.init(getAppIconPath());
  ipcMain.on('force-quit', () => {
    closeLyricWindow({ destroy: true });
    if (trayManager) trayManager.forceQuit();
    app.quit();
  });
  ipcMain.on('update-tray-tooltip', (event, songInfo) => { if (trayManager) trayManager.updateTooltip(songInfo); });
  ipcMain.on('update-tray-play-state', (event, isPlaying) => { if (trayManager) trayManager.updatePlayState(isPlaying); });
  ipcMain.on('update-tray-play-mode', (event, mode) => { if (trayManager) trayManager.updatePlayMode(mode); });
  ipcMain.on('update-tray-lyric-state', (event, visible) => { if (trayManager) trayManager.updateLyricState(visible); });
  ipcMain.on('set-theme', (event, theme) => {
    if (['dark', 'light', 'system'].includes(theme)) {
      nativeTheme.themeSource = theme;
    }
    if (trayManager) trayManager.updateTheme(theme);
  });
  ipcMain.handle('settings-get-autostart', () => {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch (e) {
      return false;
    }
  });
  ipcMain.handle('settings-set-autostart', (event, enable) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enable),
        openAsHidden: true
      });
      return app.getLoginItemSettings().openAtLogin;
    } catch (e) {
      return false;
    }
  });
  function getDirSize(dirPath) {
    let size = 0;
    try {
      if (!fs.existsSync(dirPath)) return 0;
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += getDirSize(filePath);
        } else if (file.isFile()) {
          try {
            const stats = fs.statSync(filePath);
            size += stats.size;
          } catch (e) {}
        }
      }
    } catch (e) {}
    return size;
  }

  function getAppTotalCacheSize() {
    try {
      const userData = app.getPath('userData');
      const cacheDirs = ['Cache', 'Code Cache', 'GPUCache', 'DawnCache'];
      let total = 0;
      for (const dir of cacheDirs) {
        total += getDirSize(path.join(userData, dir));
      }
      return total;
    } catch (e) {
      return 0;
    }
  }

  function clearAppCacheDirs() {
    try {
      const userData = app.getPath('userData');
      const cacheDirs = ['Cache', 'Code Cache', 'GPUCache', 'DawnCache'];
      for (const dir of cacheDirs) {
        const fullPath = path.join(userData, dir);
        try {
          if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  ipcMain.handle('settings-get-cache-size', async () => {
    try {
      let size = getAppTotalCacheSize();
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.session) {
        const sessionSize = await mainWindow.webContents.session.getCacheSize();
        size = Math.max(size, sessionSize);
      }
      return size;
    } catch (e) {}
    return 0;
  });
  ipcMain.handle('settings-clear-cache', async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.session) {
        await mainWindow.webContents.session.clearCache();
      }
      clearAppCacheDirs();
      return true;
    } catch (e) {}
    return false;
  });
  ipcMain.handle('settings-get-shortcuts-enabled', () => {
    return trayManager ? trayManager.getShortcutsEnabled() : true;
  });
  ipcMain.handle('settings-set-shortcuts-enabled', (event, enable) => {
    if (trayManager) {
      trayManager.setShortcutsEnabled(enable);
    }
    return true;
  });
  function getDesktopSettingsPath() {
    return path.join(app.getPath('userData'), 'desktop_settings.json');
  }
  function readDesktopSettings() {
    try {
      const p = getDesktopSettingsPath();
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {}
    return {};
  }
  function writeDesktopSettings(patch) {
    try {
      const p = getDesktopSettingsPath();
      let data = {};
      if (fs.existsSync(p)) {
        try { data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
      }
      Object.assign(data, patch);
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  }
  ipcMain.handle('settings-get-audio-settings', () => {
    const data = readDesktopSettings();
    return {
      autoSkipOnError: typeof data.autoSkipOnError === 'boolean' ? data.autoSkipOnError : null,
      rememberState: typeof data.rememberState === 'boolean' ? data.rememberState : null,
      volumeBoostEnabled: typeof data.volumeBoostEnabled === 'boolean' ? data.volumeBoostEnabled : null,
      volumeBoostLevel: typeof data.volumeBoostLevel === 'number' ? data.volumeBoostLevel : null
    };
  });
  ipcMain.handle('settings-set-audio-settings', (event, settings) => {
    if (!settings || typeof settings !== 'object') return false;
    const patch = {};
    if (typeof settings.autoSkipOnError === 'boolean') patch.autoSkipOnError = settings.autoSkipOnError;
    if (typeof settings.rememberState === 'boolean') patch.rememberState = settings.rememberState;
    if (typeof settings.volumeBoostEnabled === 'boolean') patch.volumeBoostEnabled = settings.volumeBoostEnabled;
    if (typeof settings.volumeBoostLevel === 'number') patch.volumeBoostLevel = settings.volumeBoostLevel;
    return writeDesktopSettings(patch);
  });
  ipcMain.on('open-external', (event, url) => {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      shell.openExternal(url);
    }
  });
  initAutoUpdater();
  if (app.isPackaged) {
    mainWindow.loadURL('app://localhost/');
    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 3000);
  } else {
    mainWindow.loadURL(DEV_FRONTEND_URL);
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && (!trayManager || trayManager.getIsQuitting())) app.quit(); });
app.on('will-quit', () => { closeLyricWindow({ destroy: true }); if (trayManager) trayManager._unregisterShortcuts(); if (serverProcess) serverProcess.kill(); });
}
