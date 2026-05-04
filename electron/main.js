// ====================
// 文件：electron/main.js
// ====================
import { app, BrowserWindow, ipcMain, dialog, protocol, net, screen } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { fork } from 'child_process';
import fs from 'fs';
import http from 'http'; 
import pkg from 'electron-updater';

app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-http-cache');

const { autoUpdater } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAppIconPath() {
  return app.isPackaged
    ? path.join(__dirname, '../dist/icon.ico')
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

// --- 金库与鉴权逻辑 (保持原样) ---
let vaultMemoryCache = null;
app.on('before-quit', () => { isQuitting = true; });
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
function startLocalServer() {
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
      env: { ...process.env, PORT: 10420, ELECTRON_RUN_AS_NODE: '1' },
      silent: true 
    });
    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      serverErrorLog += msg;
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
    const pingServer = () => {
      const req = http.get('http://127.0.0.1:10420/server/now', (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) resolve();
        else handleError();
      }).on('error', handleError);
      req.setTimeout(500, () => { req.destroy(); handleError(); });
      function handleError() {
        retryCount++;
        if (retryCount >= 100) resolve(); 
        else setTimeout(pingServer, 100); 
      }
    };
    setTimeout(pingServer, 200);
  });
}

function initAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  const sendToWindow = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updater-event', data);
  };
  autoUpdater.on('checking-for-update', () => sendToWindow({ type: 'checking', isManualCheck }));
  autoUpdater.on('update-available', (info) => sendToWindow({ type: 'available', info, isManualCheck }));
  autoUpdater.on('update-not-available', (info) => { sendToWindow({ type: 'not-available', info, isManualCheck }); isManualCheck = false; });
  autoUpdater.on('error', (err) => { sendToWindow({ type: 'error', message: err.message, isManualCheck }); isManualCheck = false; downloadCancellationToken = null; });
  autoUpdater.on('download-progress', (progressObj) => sendToWindow({ type: 'progress', progressObj }));
  autoUpdater.on('update-downloaded', (info) => { sendToWindow({ type: 'downloaded', info }); downloadCancellationToken = null; });
  ipcMain.on('check-for-updates', () => {
    isManualCheck = true; 
    if (!app.isPackaged) { sendToWindow({ type: 'error', message: '开发环境暂不支持自动更新，请打包后体验', isManualCheck }); isManualCheck = false; return; }
    autoUpdater.checkForUpdates().catch(err => { sendToWindow({ type: 'error', message: '检查更新失败，请检查网络', isManualCheck }); isManualCheck = false; });
  });
  ipcMain.on('download-update', () => { downloadCancellationToken = new AbortController(); autoUpdater.downloadUpdate(downloadCancellationToken.signal).catch(() => {}); });
  ipcMain.on('cancel-download', () => { if (downloadCancellationToken) { downloadCancellationToken.abort(); downloadCancellationToken = null; } });
  ipcMain.on('quit-and-install', () => autoUpdater.quitAndInstall());
  ipcMain.handle('get-app-version', () => app.getVersion());
}

// --- 桌面歌词窗口逻辑 ---
let lyricInteractive = false;
let lyricForceInteractive = false;
let lyricLocked = false;
let lyricLockedHoverCount = 0;
let lyricMouseTracker = null;

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
    const inside =
      cursorPos.x >= bounds.x &&
      cursorPos.x <= bounds.x + bounds.width &&
      cursorPos.y >= bounds.y &&
      cursorPos.y <= bounds.y + bounds.height;

    if (lyricLocked) {
      if (inside) {
        lyricLockedHoverCount++;
        if (lyricLockedHoverCount >= 8 && !lyricInteractive) {
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
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  lyricWindow = new BrowserWindow({
    width: Math.min(900, screenWidth - 100),
    height: 160,
    x: Math.floor((screenWidth - 900) / 2),
    y: 60,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
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
  else lyricWindow.loadURL('http://localhost:5173/#/desktop-lyric');

  lyricWindow.once('ready-to-show', () => {
    lyricWindow.show();
    startLyricMouseTracker();
  });
  lyricWindow.on('closed', () => {
    stopLyricMouseTracker();
    lyricWindow = null;
    lyricInteractive = false;
    lyricForceInteractive = false;
    lyricLocked = false;
    lyricLockedHoverCount = 0;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lyric-window-closed');
  });
}

ipcMain.on('toggle-desktop-lyric', () => { if (lyricWindow) lyricWindow.close(); else createLyricWindow(); });
ipcMain.on('sync-lyric', (event, data) => { if (lyricWindow && !lyricWindow.isDestroyed()) lyricWindow.webContents.send('update-lyric', data); });
ipcMain.on('lyric-control-cmd', (event, cmd) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('main-lyric-control', cmd); });

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
  const moveHandler = setInterval(() => {
    if (win.isDestroyed()) { clearInterval(moveHandler); return; }
    const currentCursorPos = screen.getCursorScreenPoint();
    const newX = initialWindowPos[0] + (currentCursorPos.x - initialCursorPos.x);
    const newY = initialWindowPos[1] + (currentCursorPos.y - initialCursorPos.y);
    if (newX !== lastX || newY !== lastY) {
      win.setPosition(newX, newY);
      lastX = newX;
      lastY = newY;
    }
  }, 16);
  ipcMain.once('lyric-window-drag-stop', () => {
    clearInterval(moveHandler);
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
  });
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
    width: 1150, height: 800, minWidth: 1024, minHeight: 700, frame: false, show: false, backgroundColor: '#ffffff',
    icon: getAppIconPath(),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, webSecurity: true }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  ipcMain.on('window-min', () => mainWindow.minimize());
  ipcMain.on('window-max', () => { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
  ipcMain.on('window-close', () => mainWindow.close());
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
  initAutoUpdater();
  if (app.isPackaged) {
    mainWindow.loadURL('app://localhost/');
    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 3000);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { if (serverProcess) serverProcess.kill(); });