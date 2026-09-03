<div align="center">
  <img src="public/icon.ico" width="88" height="88" alt="概念音乐 Logo" />
  <h1>概念音乐 (Concept Music)</h1>
  <p><b>基于 Electron + Vue 3 + Vite 构建的现代化、高性能 Windows 桌面音乐播放器</b></p>
  <p><i>回归音乐本身，听见好时光。</i></p>

  <p>
    <a href="https://github.com/liovoz/concept-music/releases"><img src="https://img.shields.io/github/v/release/liovoz/concept-music?color=3b82f6&label=Release" alt="Release"></a>
    <img src="https://img.shields.io/badge/Platform-Windows%2010%2F11%20x64-0078d7" alt="Platform">
    <img src="https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Electron-30+-47848f?logo=electron&logoColor=white" alt="Electron">
    <img src="https://img.shields.io/badge/Vue-3.x-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3">
    <img src="https://img.shields.io/badge/Vite-5.x-646cff?logo=vite&logoColor=white" alt="Vite">
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="License"></a>
  </p>
</div>

---

## 📖 项目简介

**概念音乐** 是一款注重体验、性能与极简视觉设计的轻量级桌面音乐客户端。项目内置高性能本地音乐 API 服务，集成在线多音质播放、个性化推荐、私人 FM、网易云歌单导入、全屏沉浸歌词、桌面逐字悬浮歌词与系统托盘深度联动能力，为您提供纯净流畅的听歌享受。

---

## ✨ 功能特性

### 🎵 畅听与音质
- **全音质支持**：支持标准、HQ高品、SQ无损、Hi-Res、超清蝰蛇与全景声音质，智能检测资源可用性并平滑降级回退。
- **音量增益增强 (Volume Boost)**：集成 WebAudio 增益核心，突破系统 100% 音量上限，支持 125%、150%、200% 多档无损放大。
- **音频故障自愈**：播放异常或资源失效时智能跳过；内置连续故障熔断机制，杜绝死循环跳歌。
- **播放状态记忆**：自动记录上次播放列表、当前播放歌曲以及精确播放进度，再次启动瞬间续播。

### ⚙️ 偏好设置中心（v3.5.0 全新上线）
- **常规与外观**：支持浅色、深色以及跟随系统配色无感自适应切换；支持自定义窗口关闭行为（最小化到托盘 / 直接退出 / 每次询问）；提供开机自动启动项管理；一键查看并清理应用临时缓存与搜索历史。
- **播放与音频**：集中管理音量增益倍率、故障自动跳过策略与播放记忆开关。
- **桌面歌词配置**：独立调节主/副歌词字号大小、动效模式与主题方案。
- **快捷键看板**：内置系统全局热键总开关与全局/应用内热键对照表。
- **关于与在线更新**：集成版本检测、增量/全量更新下载、进度反馈与便携版引导。

### 👑 VIP 自动打卡助手（特权助手）
- **后台智能调度**：登录账号后，在后台全自动检测并领取每日「1天畅听VIP」及每小时「3小时特权」（每日最多 8 次）。
- **防风控离散算法**：内置 60 分钟冷却倒计时与 15~45 秒随机抖动延时，打乱请求特征，保障账号安全。
- **实时状态看板**：在设置面板中直观监控调度服务状态、VIP 入账状态与下一次执行倒计时。

### 🎤 歌词视觉体验
- **桌面逐字悬浮歌词**：
  - **无极自定义调色盘**：除了 5 款经典预设配色（亮白/珊瑚粉/天蓝/翠绿/幻紫），支持打开调色盘或直接输入 HEX 色值，智能生成协调的副歌词与发光氛围阴影。
  - **卡拉OK逐字平滑过渡**：精准跟随演唱节拍逐字平滑着色。
  - **无感唤起防抢焦点**：窗口唤起时绝不抢占前台输入焦点，游戏与全屏办公不被打扰。
  - **跨窗口实时联动**：桌面悬浮窗与主界面配置实时双向同步，支持 `Ctrl + D` 极速开关。
- **全屏沉浸歌词模式**：支持大屏动态模糊背景、全屏歌词滚动与高品质封面呈现。

### 📌 交互与系统融合
- **高品质原生系统托盘**：全面适配高分辨率图标，右键菜单实时呈现播放/暂停、循环模式、桌面歌词对勾高亮。
- **网易云歌单无缝导入**：支持一键解析网易云歌单链接并快速转换为播放队列。
- **私人 FM**：专属推荐流、喜爱歌曲标记、即时跳过与高潮副歌片段预览。
- **长列表性能优化**：播放队列引入分批虚拟加载，上千首歌曲依然秒开顺滑；歌单详情采用 SWR 缓存机制，二次访问 0 秒加载。

### 🔒 硬件级安全加固
- **安全凭据保险箱 (Vault)**：用户登录凭据与 Cookie 经由 Electron 原生 `safeStorage` 采用操作系统级硬件密钥高强度加密存储。
- **本地服务沙箱隔离**：本地 API 服务强制绑定 `127.0.0.1` 并设严格 CORS 白名单；第三方音源脚本在隔离沙箱中运行并配备内存编译缓存池。

---

## ⌨️ 快捷键指南

### 系统全局热键 (System Global)
> 无论在玩游戏、浏览网页或桌面任意位置，均可一键触发（可在偏好设置中开启或关闭）：

| 功能 | 快捷键 |
| :--- | :--- |
| 播放 / 暂停 | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>P</kbd> |
| 上一首 | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>←</kbd> |
| 下一首 | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>→</kbd> |
| 音量增加 (+5%) | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd> |
| 音量减小 (-5%) | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd> |
| 打开 / 关闭桌面歌词 | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>D</kbd> |

### 软件内快捷键 (In-App)

| 功能 | 快捷键 |
| :--- | :--- |
| 播放 / 暂停 | <kbd>Space</kbd> |
| 快退 5 秒 | <kbd>←</kbd> |
| 快进 5 秒 | <kbd>→</kbd> |
| 音量增大 / 减小 | <kbd>↑</kbd> / <kbd>↓</kbd> |
| 打开 / 关闭桌面歌词 | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| 进入 / 退出全屏 | <kbd>F11</kbd> |
| 关闭弹窗 / 退出全屏歌词 | <kbd>Esc</kbd> |

---

## 💻 环境要求

- **操作系统**：Windows 10 / 11 x64（项目构建与开发依赖亦兼容 macOS / Linux）
- **Node.js**：推荐 **Node.js 22 LTS**（最低版本要求 `>= 20`，根目录提供 `.nvmrc`）
- **包管理器**：`npm 10+`

> ⚠️ **注意**：本项目不包含任何需要本地编译的原生 C++ 扩展，`npm install` 无需安装 Python 或 Visual Studio Build Tools。不建议使用 Node.js 24 及以上实验性版本以避免三方依赖警告。

---

## 🚀 快速开始

### 1. 克隆并安装依赖
```bash
git clone https://github.com/liovoz/concept-music.git
cd concept-music

# 安装根项目与内置 API 服务依赖
npm install
```

### 2. 启动桌面开发环境
```bash
npm start
```
`npm start` 会自动校验环境完整性，先后拉起 Vite 本地前端服务与 Electron 桌面应用，Electron 会自动拉起本地内置的 API 服务（默认监听 `127.0.0.1:10420`）。

---

## 🛠️ 常用命令

| 命令 | 说明 |
| :--- | :--- |
| `npm start` | 启动 Electron + Vite 桌面热重载开发环境 |
| `npm run check:setup` | 校验本地 Electron 二进制与内置 API 依赖完整性 |
| `npm run check:setup -- --repair` | 自动修复与重新下载损坏的 Electron 运行时 |
| `npm run build` | 仅编译打包前端生产环境静态资源 (`dist/`) |
| `npm run pack` | 编译前端并打包生成 Windows 安装版 (.exe) 与绿色便携版 |
| `npm run release` | 编译并直接发布安装包至 GitHub Releases |

---

## ❓ 常见问题排查

<details>
<summary><b>1. Electron 安装较慢或提示安装失败</b></summary>

项目在根目录 `.npmrc` 中已配置了腾讯云/淘宝的 Electron 国内镜像源。如果因网络中断导致 Electron 二进制损坏，可执行以下命令一键自动修复：
```bash
npm run check:setup -- --repair
```
</details>

<details>
<summary><b>2. 误报 node-gyp 或 Python 错误</b></summary>

本项目全量采用纯 JavaScript 依赖。如果遇到此报错，说明本地遗留了脏依赖缓存，请在 PowerShell 中执行清理重装：
```powershell
Remove-Item -Recurse -Force node_modules, server\node_modules
npm install
```
</details>

---

## 📁 目录结构

```text
concept-music/
├─ .github/workflows/       # GitHub Actions 自动化构建与发布流水线
├─ electron/                # Electron 主进程、窗口管理、托盘管理、预加载脚本
│  ├─ assets/tray-icons/    # 系统托盘定制高分辨率图标
│  ├─ main.js               # 主进程入口、IPC通信、安全隔离与本地代理
│  ├─ preload.js            # 安全上下文桥接 API (ContextBridge)
│  ├─ trayManager.js        # 托盘右键菜单与全局快捷键管理
│  └─ trayIcons.js          # 原生图标动态加载器
├─ music_source/            # 第三方音源定义与协议规范
├─ public/                  # 静态资源 (应用图标等)
├─ scripts/                 # 本地环境自检、自愈与启动辅助脚本
├─ server/                  # 内置轻量级本地 KuGou API 服务内核
├─ src/                     # Vue 3 前端业务源码
│  ├─ components/           # 通用 UI 组件 (SettingsModal, GlobalDialog, ...)
│  ├─ composables/          # 组合式函数 (主题自适应, 搜索历史等)
│  ├─ layout/               # 顶栏 Header、侧边栏 Sidebar、底栏播放器 PlayerBar
│  ├─ router/               # 路由表定义
│  ├─ store/                # Pinia 全局状态仓 (playerStore, userStore)
│  ├─ utils/                # 请求封装、音质配置、快捷菜单、辅助函数
│  └─ views/                # 路由页面 (发现页, 歌单详情, 桌面歌词等)
├─ index.html
├─ package.json
└─ vite.config.js
```

---

## 📜 免责声明

1. 本项目仅供编程技术交流、学习以及个人研究使用，请勿用于任何商业用途。
2. 软件中所使用的音乐资源、图片及相关数据接口版权均归对应音乐平台所有。
3. 任何个人或组织因使用本项目产生之法律责任，均由使用者自行承担，原作者不承担任何连带责任。

---

## 🙏 致谢

- 内置音乐 API 核心基于开源项目 [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) 进行定制、性能优化与本地服务集成。
- 第三方音源规则参见 [music_source/README.md](music_source/README.md)。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议开源。
