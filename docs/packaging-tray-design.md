# 🖥️ 打包与窗口行为 — 完整优化方案

> **项目**: 概念音乐 Desktop (concept-music)
> **版本**: v1.2.0 规划
> **日期**: 2026-05-07

---

## 一、问题总览

| # | 问题 | 严重度 | 影响范围 |
|---|------|--------|----------|
| P1 | 安装时无法修改安装路径 | 🔴 高 | 用户体验 |
| P2 | 任务栏没有图标 | 🔴 高 | 品牌识别 |
| P3 | 点击关闭直接退出程序 | 🔴 高 | 核心交互 |

---

## 二、P1：安装路径可配置

### 2.1 当前问题

`package.json` 的 `nsis` 配置缺少关键选项，electron-builder 默认可能使用一键安装模式。

### 2.2 目标行为（对标大厂）

| 软件 | 安装方式 | 可选路径 |
|------|----------|----------|
| 网易云音乐 | NSIS 向导式 | ✅ 可修改 |
| QQ音乐 | NSIS 向导式 | ✅ 可修改 |
| Spotify | NSIS 向导式 | ✅ 可修改 |
| VS Code | NSIS 向导式 | ✅ 可修改 |

**结论**: 所有主流桌面应用均使用向导式安装，支持自定义路径。

### 2.3 解决方案

修改 `package.json` 的 `nsis` 配置：

```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "allowElevation": true,
  "perMachine": false,
  "installerIcon": "public/icon.ico",
  "uninstallerIcon": "public/icon.ico",
  "installerHeaderIcon": "public/icon.ico",
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "概念音乐",
  "deleteAppDataOnUninstall": false,
  "language": 2052
}
```

**各参数说明**:

| 参数 | 值 | 说明 |
|------|-----|------|
| `oneClick` | `false` | 禁用一键安装，启用向导式安装界面 |
| `allowToChangeInstallationDirectory` | `true` | 允许用户选择安装路径 |
| `allowElevation` | `true` | 需要管理员权限时自动提权 UAC |
| `perMachine` | `false` | 默认安装到用户目录（非 Program Files） |
| `createDesktopShortcut` | `true` | 自动创建桌面快捷方式 |
| `createStartMenuShortcut` | `true` | 自动创建开始菜单快捷方式 |
| `shortcutName` | `"概念音乐"` | 快捷方式显示名称 |
| `deleteAppDataOnUninstall` | `false` | 卸载时保留用户数据（登录状态、收藏等） |
| `language` | `2052` | 简体中文（2052 = 0x804） |

### 2.4 预期效果

```
┌─────────────────────────────────────┐
│     概念音乐 v1.2.0 安装向导        │
│                                     │
│  欢迎安装 概念音乐！                 │
│                                     │
│  [下一步]                           │
│                                     │
│  → 选择安装位置                     │
│    [C:\Users\xxx\AppData\...] [浏览] │
│    所需空间: 120 MB                 │
│                                     │
│  → 选择开始菜单文件夹               │
│    ☑ 创建桌面快捷方式                │
│    ☑ 创建快速启动栏快捷方式          │
│                                     │
│  → 准备安装                         │
│    [安装]                            │
│                                     │
│  → 安装完成                         │
│    ☑ 启动概念音乐                   │
│    [完成]                           │
└─────────────────────────────────────┘
```

---

## 三、P2：任务栏图标

### 3.1 当前问题

图标路径在打包后找不到：

```javascript
// electron/main.js L19-23
function getAppIconPath() {
  return app.isPackaged
    ? path.join(__dirname, '../dist/icon.ico')   // ❌ dist 目录下无此文件
    : path.join(__dirname, '../public/icon.ico'); // 开发环境正常
}
```

而 `package.json` 的 `files` 只包含：
```json
"files": ["dist/**/*", "electron/**/*"]  // ❌ 不含 public/icon.ico
```

### 3.2 解决方案

#### 方案 A：通过 extraResources 复制图标（推荐）

**修改 `package.json`**:
```json
"extraResources": [
  {
    "from": "server",
    "to": "server",
    "filter": ["**/*", "!node_modules/.cache"]
  },
  {
    "from": "public/icon.ico",
    "to": "icon.ico"
  }
]
```

**修改 `electron/main.js` 图标路径函数**:
```javascript
function getAppIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  return path.join(__dirname, '../public/icon.ico');
}
```

打包后文件结构：
```
resources/
  ├── app.asar          (dist + electron)
  ├── icon.ico           ← 从 public/ 复制过来
  └── server/            ← 后端服务
      └── app.js
```

#### 方案 B：将图标放入 files 数组

```json
"files": [
  "dist/**/*",
  "electron/**/*",
  "public/icon.ico"
]
```

配合 main.js 使用 `path.join(process.resourcesPath, 'app.asar.unpacked', 'public', 'icon.ico')`。

**推荐方案 A**，路径更简洁，不依赖 asar 内部结构。

### 3.3 预期效果

- ✅ Windows 任务栏显示概念音乐图标
- ✅ Alt+Tab 切换时显示正确图标
- ✅ 桌面快捷方式显示正确图标
- ✅ 开始菜单显示正确图标
- ✅ 安装/卸载向导显示正确图标

---

## 四、P3：系统托盘（核心方案）

### 4.1 主流软件行为对比

这是最复杂也最重要的功能。先看各大厂怎么做的：

#### 窗口关闭按钮行为对比

| 软件 | 点击 × 按钮 | 右键托盘 → 关闭 | Alt+F4 | 说明 |
|------|-------------|---------------|--------|------|
| **网易云音乐** | 最小化到托盘 | 退出程序 | 最小化到托盘 | 默认不退出，需主动从托盘退出 |
| **QQ音乐** | 最小化到托盘 | 退出程序 | 最小化到托盘 | 同网易云 |
| **Spotify** | **直接退出** | N/A | 直接退出 | 无托盘功能（设计理念不同） |
| **Discord** | 最小化到托盘 | 退出程序 | 最小化到托盘 | 有托盘选项开关 |
| **VS Code** | **直接关闭** | N/A | 直接关闭 | 无托盘 |
| **微信(Windows)** | 最小化到托盘 | 退出程序 | 最小化到托盘 | 托盘是核心功能 |

**结论**: 音乐类软件几乎都采用「最小化到托盘」策略，因为用户需要后台持续播放。

#### 托盘右键菜单对比

| 菜单项 | 网易云 | QQ音乐 | Discord | 推荐实现 |
|--------|--------|--------|---------|----------|
| 播放/暂停 | ✅ | ✅ | ✅ | ✅ |
| 上一首/下一首 | ✅ | ✅ | ✅ | ✅ |
| 音量调节 | ✅ 子菜单 | ✅ 子菜单 | - | ✅ 子菜单 |
| 显示主窗口 | ✅ | ✅ | ✅ | ✅ |
| 锁定歌词 | ✅ | ✅ | - | ✅（已有桌面歌词功能） |
| 播放模式 | ✅ | ✅ | - | ✅ |
| 关于/检查更新 | ✅ | ✅ | ✅ | ✅ |
| 退出 | ✅ | ✅ | ✅ | ✅ |
| 正在播放 | ✅ 歌曲名 | ✅ 歌曲名 | ✅ | ✅ 动态显示当前歌曲 |

#### 双击托盘图标行为

| 软件 | 双击行为 |
|------|----------|
| 网易云音乐 | 显示/隐藏主窗口 |
| QQ音乐 | 显示/隐藏主窗口 |
| Discord | 显示/隐藏主窗口 |
| 微信 | 显示/隐藏主窗口 |

**统一结论**: 双击 = 切换窗口显隐。

#### 托盘气泡通知

| 触发场景 | 网易云 | QQ音乐 |
|----------|--------|--------|
| 切歌时 | ✅ 显示歌曲名+歌手 | ✅ 显示歌曲信息 |
| 点击气泡 | 打开主窗口 | 打开主窗口 |

### 4.2 概念音乐托盘设计方案

#### 4.2.1 整体架构

```
┌─────────────────────────────────────────────┐
│              用户操作                        │
│                                             │
│  点击 × 按钮 ──→ mainWindow.hide()          │
│                  ──→ tray.displayBalloon()   │
│                  ──→ 托盘图标保持            │
│                                             │
│  双击托盘图标 ──→ mainWindow.show()         │
│                  或 toggleVisibility()      │
│                                             │
│  右键托盘图标 ──→ 弹出上下文菜单             │
│                                             │
│  托盘菜单"退出" ──→ isQuitting=true         │
│                   ──→ mainWindow.destroy()  │
│                   ──→ tray.destroy()        │
│                   ──→ app.quit()            │
│                                             │
│  全局快捷键       ──→ 播放/暂停等操作       │
│  (Ctrl+Alt+Space)                             │
└─────────────────────────────────────────────┘
```

#### 4.2.2 详细交互流程

##### 场景 A：点击窗口关闭按钮（×）

```
用户点击 Header.vue 的 × 按钮
    │
    ▼
前端调用 window.windowControls.close()
    │
    ▼
ipcMain 收到 'window-close'
    │
    ├─ 如果 isQuitting === true → 直接 mainWindow.close() → app.quit()
    │
    └─ 如果 isQuitting === false（默认）
         │
         ├─ mainWindow.hide()          // 隐藏窗口
         ├─ tray.displayBalloon({       // 显示气泡提示
         │     title: '概念音乐',
         │     body: '正在后台运行，双击图标恢复窗口',
         │     icon: iconPath
         │   })
         └─ （可选）记录 hide 时间戳，用于后续统计
```

##### 场景 B：双击托盘图标

```
用户双击任务栏托盘图标
    │
    ▼
tray.on('double-click')
    │
    ├─ 如果 mainWindow.isVisible()
    │   └─ mainWindow.hide()       // 窗口可见 → 隐藏
    │
    └─ 如果 !mainWindow.isVisible() || mainWindow.isMinimized()
        └─ mainWindow.show()        // 窗口不可见 → 显示并聚焦
           mainWindow.focus()
```

##### 场景 C：右键托盘菜单

```
用户右键点击托盘图标
    │
    ▼
弹出上下文菜单：
┌──────────────────────┐
│ 🎵 正在播放: 歌曲名  │ ← 动态显示当前播放的歌曲（或"未在播放"）
├──────────────────────┤
│ ▶️ / ⏸️ 播放 / 暂停   │
│ ⏮️ 上一首            │
│ ⏭️ 下一首            │
│ 🔊 音量 ████████░░  │ → hover 展开子菜单或 slider
├──────────────────────┤
│ 📋 显示主窗口         │
│ 🎤 桌面歌词          │ → toggle
│ 🔀 播放模式          │ → 列表循环/单曲循环/随机
├──────────────────────┤
│ ℹ️ 关于概念音乐       │
│ 🔄 检查更新           │
├──────────────────────┤
│ ❌ 退出              │
└──────────────────────┘
```

##### 场景 D：全局快捷键

```
全局快捷键注册（app.whenReady 时）：
    │
    ├─ Ctrl + Alt + Space  → 播放/暂停
    ├─ Ctrl + Alt + Left   → 上一首
    ├─ Ctrl + Alt + Right  → 下一首
    ├─ Ctrl + Alt + Up     → 音量增加
    ├─ Ctrl + Alt + Down   → 音量减少
    └─ Ctrl + Alt + M      → 静音切换
```

##### 场景 E：切歌时托盘通知

```
playerStore.currentSong 变化时
    │
    ├─ tray.setToolTip('正在播放: 歌曲名 - 歌手名')
    └─ tray.displayBalloon({
         title: '🎵 正在播放',
         body: '歌曲名 - 歌手名',
         icon: songCoverPath
       })
```

##### 场景 F：真正退出程序

```
两种退出路径：
    │
    ├─ 路径1: 托盘右键 → "退出"
    │   └─ isQuitting = true
    │       mainWindow.destroy()
    │       tray.destroy()
    │       app.quit()
    │
    └─ 路径2: 主窗口内设置 → "退出"（新增）
        └─ 同上
```

#### 4.2.3 代码架构设计

##### 新增模块：`electron/trayManager.js`

将所有托盘逻辑封装为独立模块，保持 `main.js` 清晰：

```
electron/
├── main.js              # 主进程入口（精简）
├── preload.js           # preload 脚本
└── trayManager.js        # 🆕 托盘管理器（新增）
```

**trayManager.js 导出接口**:

```javascript
// electron/trayManager.js
import { Tray, Menu, nativeImage } from 'electron';
import path from 'path';

export class TrayManager {
  constructor(mainWindow, playerStoreChannel) { ... }

  init(iconPath)                    // 创建托盘图标、绑定事件、注册快捷键
  destroy()                         // 销毁托盘、注销所有快捷键
  updateTooltip(songInfo)          // 更新托盘 tooltip 和气球通知
  updatePlayState(isPlaying)       // 更新播放/暂停菜单项文字
  handleWindowClose()              // 处理窗口关闭请求（hide or quit）
  forceQuit()                      // 强制退出（isQuitting=true）
  getTray()                        // 返回 tray 实例（供外部访问）
}
```

##### main.js 改动点：

```javascript
// 新增导入
import { TrayManager } from './trayManager.js';
let trayManager = null;

// createWindow 中添加关闭拦截
const createWindow = () => {
  mainWindow = new BrowserWindow({ ... });
  
  // 🆕 拦截关闭事件
  mainWindow.on('close', (e) => {
    if (!isQuitting && trayManager) {
      e.preventDefault();           // 阻止默认关闭
      trayManager.handleWindowClose();
    }
  });
};

// app.whenReady 中初始化托盘
app.whenReady().then(async () => {
  createWindow();
  await startLocalServer();
  
  // 🆕 初始化托盘管理器
  trayManager = new TrayManager(mainWindow);
  trayManager.init(getAppIconPath());
  
  initAutoUpdater();
  // ...
});
```

##### 新增 IPC 通道（供前端调用）：

```javascript
// main.js 新增
ipcMain.on('force-quit', () => {
  if (trayManager) trayManager.forceQuit();
});

ipcMain.on('update-tray-tooltip', (event, songInfo) => {
  if (trayManager) trayManager.updateTooltip(songInfo);
});

ipcMain.on('update-tray-play-state', (event, isPlaying) => {
  if (trayManager) trayManager.updatePlayState(isPlaying);
});
```

##### 前端 Sidebar.vue 新增退出选项：

在现有侧边栏底部"关于"上方添加"退出程序"选项（仅在有托盘时显示），或者通过 PlayerBar 的更多菜单提供退出入口。

#### 4.2.4 用户设置持久化

在 `userStore` 或 localStorage 中存储用户偏好：

```javascript
const TRAY_SETTINGS_KEY = 'kg_tray_settings';

// 默认配置
const defaultSettings = {
  closeToTray: true,           // 关闭时最小化到托盘
  showTrayNotification: true,  // 切歌时显示气泡通知
  globalShortcuts: true,       // 启用全局快捷键
  startMinimized: false,       // 启动时最小化到托盘
};
```

首次使用弹出引导提示：

```
┌──────────────────────────────────────┐
│  💡 提示                            │
│                                      │
│  点击关闭按钮时，概念音乐会           │
│  最小化到系统托盘继续后台播放。       │
│                                      │
│  如需完全退出，请从托盘菜单           │
│  选择"退出"。                       │
│                                      │
│  [我知道了]  [不再提示]              │
└──────────────────────────────────────┘
```

### 4.3 完整文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新增** | `electron/trayManager.js` | 托盘管理器（~250 行） |
| **修改** | `package.json` | nsis 配置 + extraResources 图标 |
| **修改** | `electron/main.js` | 导入 TrayManager、拦截 close 事件、新增 IPC |
| **可选修改** | `src/layout/Sidebar.vue` | 添加"退出程序"菜单项 |
| **可选修改** | `src/store/userStore.js` | 托盘偏好设置持久化 |

### 4.4 全局快捷键键位参考

参考主流软件的快捷键布局：

| 快捷键 | 功能 | 参考 |
|--------|------|------|
| `Ctrl + Alt + Space` | 播放/暂停 | 网易云 `Ctrl+Shift+A` |
| `Ctrl + Alt + Left` | 上一首 | 网易云 `Ctrl+Left` |
| `Ctrl + Alt + Right` | 下一首 | 网易云 `Ctrl+Right` |
| `Ctrl + Alt + Up` | 音量+ | QQMusic `Ctrl+Up` |
| `Ctrl + Alt + Down` | 音量- | QQMusic `Ctrl+Down` |
| `Ctrl + Alt + M` | 静音 | 自定义 |

> **注意**: 快捷键需要避免与系统或其他应用冲突。`Ctrl+Alt` 前缀是最安全的选择（大多数系统快捷键使用 `Win`、`Ctrl+Shift` 或纯 `Ctrl`）。

---

## 五、实施优先级建议

| 阶段 | 内容 | 工作量 | 建议 |
|------|------|--------|------|
| **Phase 1** | P1 + P2 修复（安装路径 + 图标） | ~10 分钟 | ⭐ 必须立即做 |
| **Phase 2** | P3 核心：托盘创建 + 关闭拦截 + 基础菜单 | ~2 小时 | ⭐ 核心功能 |
| **Phase 3** | 托盘增强：动态 tooltip + 切歌通知 + 播放控制 | ~1 小时 | ⭐ 体验提升 |
| **Phase 4** | 全局快捷键 | ~40 分钟 | ⭐ 锦上添花 |
| **Phase 5** | 用户偏好设置 + 首次使用引导 | ~30 分钟 | ⭐ 细节完善 |

**Phase 1 可以立即修复**（只需改 `package.json` 和 `main.js` 各几行），不影响任何现有功能。
