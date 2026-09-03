<div align="center">
  <img src="public/icon.ico" width="88" height="88" alt="概念音乐 Logo" />
  <h1>概念音乐 (Concept Music)</h1>
  <p><b>基于 Electron + Vue 3 + Vite 构建的现代化、高性能 Windows 桌面音乐播放器</b></p>
  <p><i>回归音乐本质，听见好时光。</i></p>

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

**概念音乐 (Concept Music)** 是一款专为追求极致视听与流畅交互打造的轻量级桌面音乐客户端。

客户端基于现代 Web 前端技术栈（Vue 3、Pinia、Tailwind CSS、Vite）与 Electron 桌面容器构建，内置独立轻量级音乐 API 服务。项目涵盖音乐探索、多音质无损畅听、网易云歌单无缝导入、私人 FM、全屏沉浸歌词、桌面逐字悬浮歌词、原生系统托盘联动、VIP 特权智能助手以及全能偏好设置中心，为用户提供简洁、优雅且不受束缚的听歌体验。

---

## 🌟 核心功能全景

### 🎧 音乐发现与海量曲库
- **发现中心**：精选每日推荐歌单、热门新歌速递、专属推荐流与特色专题榜单。
- **歌单分类广场**：涵盖华语、欧美、流行、摇滚、民谣、电子、ACG 等数十种细分音乐标签，支持多维度筛选与分页浏览。
- **权威排行榜**：同步官方权威榜单（飙升榜、热歌榜、新歌榜、原创榜等），支持榜单歌曲一键试听与批量播放。
- **歌手与专辑专题**：提供歌手全量资料库、热门单曲 Top 50、歌手名下全部专辑检索及专辑详情完整发行信息。
- **全能搜索中心**：支持单曲、歌手、专辑及歌单多维度综合搜索，配备实时搜索建议、热门搜索榜与本地历史记录管理。

### 🎛️ 播放内核与音频技术
- **全音质自适应切换**：支持标准品质、HQ 高品质 (320kbps)、SQ 超品质无损、Hi-Res 高解析、超清蝰蛇音效与全景声音质，智能检测资源可用性并支持无缝降级回退。
- **WebAudio 音量增益增强 (Volume Boost)**：集成 WebAudio 数字信号处理节点，打破系统 100% 默认音量上限，提供 125%、150%、200%（最高放大 2 倍）的纯净增益。
- **播放状态断点续播**：支持自动持久化保存当前的播放队列、正在播放的曲目及精确播放进度（毫秒级），重启软件即可无缝继续倾听。
- **音频流故障自愈跳过**：当遇到音源失效或流媒体网络中断时自动平滑跳至下一曲；内置连续多曲故障熔断机制，杜绝死循环跳歌。
- **长播放队列懒加载**：重构播放队列面板，采用分批懒加载虚拟渲染技术，即使队列容纳上千首歌曲依然丝滑流畅，唤起时自动定位当前播放曲目。

### 🎤 歌词视觉系统
- **全屏沉浸歌词模式**：
  - 支持全屏视效体验，具备自适应动态模糊背景、超大字体歌词平滑滚动与黑胶唱片/封面展示。
  - 鼠标闲置自动淡出控制控件，还原纯粹沉浸的音乐享受。
- **桌面逐字悬浮歌词**：
  - **无极自定义调色盘**：预设亮白、珊瑚粉、天蓝、翠绿、幻紫等经典方案，并支持自由拾色器与输入 6 位 HEX 色值，系统根据主色自动计算最舒适的双语副歌词与发光氛围阴影。
  - **卡拉OK逐字平滑渲染**：跟随歌曲节拍精准逐字渐变染色。
  - **无感唤起不抢焦点**：采用后台非激活显示（`showInactive` 与 `focusable: false`），呼出歌词不会抢占当前游戏或办公界面的输入焦点。
  - **双向联动与快捷控制**：支持鼠标穿透、锁定防误触、主副歌词字号独立微调，支持 `Ctrl + D` 全局/局部一键显隐。

### 📻 私人 FM 与个性化推荐
- **智能无限流**：根据听歌偏好实时计算并推送心动旋律。
- **FM 控制台**：支持一键红心收藏、丢入垃圾桶跳过，以及独特的**高潮副歌片段快速定位**功能。

### 📥 跨平台歌单导入
- **网易云歌单无缝迁移**：支持粘贴网易云音乐歌单分享链接或 ID，一键完成歌单歌曲的解析、匹配与转换，零成本导入已有歌单。

### 👤 账号中心与特权助手
- **极速扫码登录**：支持多端二维码扫码登录，个人资产、我喜欢的音乐、自建歌单与听歌足迹云端同步。
- **智能 VIP 特权打卡助手**：
  - **后台全自动调度**：登录账号后，服务在后台自动签到领取每日「1天畅听VIP」，并按时循环打卡领取「3小时特权」（每日最多 8 次）。
  - **防风控智能离散算法**：内置 60 分钟冷却监控与 15~45 秒随机抖动延时，模拟真实行为特征，保障账号安全。
  - **实时监控看板**：在偏好设置中直观显示打卡状态、当日额度进度与下一次执行倒计时。

### ⚙️ 独立偏好设置中心
- **常规与外观**：浅色模式、深色模式及跟随系统主题无感自适应；主窗口关闭行为自定义（最小化到托盘 / 直接退出 / 每次询问）；开机自动启动项配置；一键统计与清理应用缓存及搜索历史。
- **播放与音频**：集中管理音量增益开关与倍率、故障自愈跳歌策略与进度断点记忆开关。
- **桌面歌词配置**：独立调节主/副歌词字号大小、动效开关与调色盘方案。
- **快捷键看板**：内置系统全局热键总开关与全局/应用内热键对照说明。
- **关于与在线更新**：集成在线版本检测、增量与全量安装包下载进度条、便携版更新指引与更新日志查看。

### 📌 系统级融合与托盘控制
- **高保真原生系统托盘**：全面适配高分辨率图标，右键菜单实时呈现播放/暂停、循环模式、桌面歌词对勾高亮。
- **完善的后台驻留**：最小化或关闭至系统托盘后，依旧维持无缝后台播放与全局热键接管。

### 🔒 架构设计与安全隐私
- **硬件级凭据加密存储**：本地金库 (Vault) 保存的 Cookie 与 Token 全面采用 Electron 原生 `safeStorage` 进行操作系统底层硬件密钥加密，防止明文泄露。
- **本地服务网络隔离**：本地 API 服务固定绑定监听 `127.0.0.1`，严格限制跨域访问（CORS）仅允许受信任的本地 Electron 应用。
- **音源虚拟机沙箱加固**：第三方音源脚本在隔离的 Node.js VM 沙箱中受限运行，剥离 `process`、`require`、`module` 等宿主敏感接口，并建立内存编译缓存池以优化切歌性能。
- **轻量纯粹无原生编译**：全量基于纯 JavaScript 依赖构建，无需 Python、C++ 编译器等繁重环境，安装零心智负担。

---

## ⌨️ 快捷键指南

### 系统全局热键 (System Global)
> 无论处于游戏全屏、浏览器或其他办公软件中，只要开启全局热键均可随时控制：

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
| 音量增大 / 减小 (+5% / -5%) | <kbd>↑</kbd> / <kbd>↓</kbd> |
| 打开 / 关闭桌面歌词 | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| 切换全屏沉浸模式 | <kbd>F11</kbd> |
| 关闭弹窗 / 退出全屏歌词 | <kbd>Esc</kbd> |

---

## 💻 环境要求

- **支持平台**：Windows 10 / 11 x64（开发与运行环境同样兼容 macOS 与 Linux）
- **运行环境**：推荐 **Node.js 22 LTS**（最低版本要求 `>= 20`，项目已包含 `.nvmrc`）
- **包管理器**：`npm 10+`

> 💡 **提示**：本项目不包含任何需要本地编译的原生 C++ 扩展，`npm install` 过程中不需要安装 Python 或 Visual Studio Build Tools。不建议使用 Node.js 24 及以上实验性版本以避免依赖警告。

---

## 🚀 快速开始

### 1. 克隆项目仓库
```bash
git clone https://github.com/liovoz/concept-music.git
cd concept-music
```

### 2. 安装依赖
```bash
# 根目录执行，将自动安装前端项目与 server 目录下内置 API 服务的依赖
npm install
```

### 3. 启动开发环境
```bash
npm start
```
> `npm start` 会自动检查 Electron 二进制与依赖环境完整性，随后启动 Vite 前端服务并拉起 Electron 桌面客户端。客户端将自动启动本地内置 API 服务（默认监听 `127.0.0.1:10420`）。

---

## 🛠️ 常用开发与构建命令

| 命令 | 说明 |
| :--- | :--- |
| `npm start` | 启动本地桌面热重载开发环境 |
| `npm run dev` | 仅启动 Vite 网页端前端开发服务 |
| `npm run check:setup` | 检测 Electron 二进制和内置服务依赖完整性 |
| `npm run check:setup -- --repair` | 自动修复并重新下载损坏或丢失的 Electron 运行时 |
| `npm run build` | 编译前端生产静态资源到 `dist/` |
| `npm run pack` | 编译前端并打包生成 Windows 安装版 (.exe) 与绿色免安装版 (.zip / portable) |
| `npm run release` | 编译打包并通过 electron-builder 自动发布产物至 GitHub Releases |

---

## ❓ 常见问题排查 (FAQ)

<details>
<summary><b>1. Electron 下载慢或提示二进制损坏？</b></summary>

项目根目录的 `.npmrc` 已默认配置国内镜像代理。如果遇到下载中断或损坏，无需手动重新配置，直接在根目录运行：
```bash
npm run check:setup -- --repair
```
脚本将自动清除残留并从国内高速镜像重新拉取对应的二进制缓存。
</details>

<details>
<summary><b>2. 误报 node-gyp / Python / VS Build Tools 报错？</b></summary>

本项目没有任何原生编译依赖。此现象通常是因为旧项目残留或异常中断导致依赖状态不一致。请直接清理后重新安装：
```powershell
# Windows PowerShell
Remove-Item -Recurse -Force node_modules, server\node_modules
npm install
```
</details>

<details>
<summary><b>3. 便携版 (Portable) 与安装版的自动更新差异？</b></summary>

- **安装版**：支持在「设置」-「关于与更新」中一键无感检测、后台静默下载并自动安装升级。
- **便携版**：为了防止覆盖用户本地便携目录及配置数据，检测到新版本后将引导跳转至 GitHub Releases 页面，供用户按需下载绿色解压包。
</details>

---

## 📂 项目工程架构

```text
concept-music/
├─ .github/workflows/       # GitHub Actions 自动化构建与持续发布工作流
├─ electron/                # Electron 主进程模块
│  ├─ assets/tray-icons/    # 托盘右键菜单定制高分辨率原生图标
│  ├─ main.js               # 主进程入口、窗口生命周期、安全拦截与本地流媒体代理
│  ├─ preload.js            # 安全 ContextBridge 预加载暴露接口
│  ├─ trayManager.js        # 系统托盘菜单事件与全局快捷键调度中心
│  └─ trayIcons.js          # 原生图标动态加载器
├─ music_source/            # 第三方音源规则协议定义与说明
├─ public/                  # 静态公共资产 (Logo 图标等)
├─ scripts/                 # 本地环境自检、自愈及多进程启动脚本
├─ server/                  # 内置轻量级本地 KuGou API 服务端内核
├─ src/                     # Vue 3 核心前端工程源码
│  ├─ components/           # 通用基础与业务模态框组件 (SettingsModal, GlobalDialog 等)
│  ├─ composables/          # 组合式状态逻辑 (useTheme, useSearchHistory 等)
│  ├─ layout/               # 顶栏 Header、侧边导航 Sidebar、底栏播放器 PlayerBar
│  ├─ router/               # 路由表定义 (发现、歌单、歌手、排行榜、FM、设置等)
│  ├─ store/                # Pinia 全局状态仓 (playerStore 播放控制, userStore 用户数据)
│  ├─ utils/                # HTTP 请求库、音质映射、右键菜单与数据规整工具
│  └─ views/                # 业务视图页面 (Discover, PlaylistDetail, DesktopLyric, ...)
├─ index.html               # 页面 HTML 单页入口
├─ package.json             # 依赖清单与构建打包配置
└─ vite.config.js           # Vite 现代化前端构建与热更新配置
```

---

## 📜 免责声明

1. 本项目仅供前端工程化、Electron 跨平台桌面应用开发学习以及个人技术研究交流使用，**严禁用于任何商业用途**。
2. 软件运行过程中获取的音频、歌词、图片、封面等相关数据均来源于第三方合法公开网络接口，其知识产权与版权均归原版权方或对应平台所有。
3. 任何个人或组织因非合理使用本项目所引起的任何纠纷或法律责任，均由使用者自行承担，本项目创作者不承担任何连带法律责任。

---

## 🙏 致谢与参考

- 本地内置 API 服务内核基于开源项目 [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) 进行深度定制、架构适配与并发性能重构。
- 第三方音源规则规范详见 [music_source/README.md](music_source/README.md)。

---

## 📄 开源许可证

本项目遵循 [MIT License](LICENSE) 协议完全开源。欢迎提交 Issue 或 Pull Request 共同完善！
