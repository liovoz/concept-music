<div align="center">
  <img src="public/icon.ico" width="88" height="88" alt="概念音乐 Logo" />
  <h1>概念音乐 (Concept Music)</h1>
  <p><b>基于 Electron + Vue 3 + Vite 构建的现代化、高性能 Windows 桌面音乐播放器</b></p>
  <p><i>回归音乐本质，听见好时光。</i></p>

  <p>
    <a href="https://github.com/liovoz/concept-music/releases"><img src="https://img.shields.io/github/v/release/liovoz/concept-music?color=3b82f6&label=Release" alt="Release"></a>
    <img src="https://img.shields.io/badge/Version-v4.0.0-blue.svg" alt="Version">
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

**概念音乐 (Concept Music)** 是一款专为追求极致视听、海量曲库管理与优雅丝滑交互打造的现代化 Windows 桌面音乐客户端。

在数字音乐平台林立、客户端日益臃肿沉重的当下，概念音乐致力于**回归纯粹而沉浸的聆听体验**。软件基于现代 Web 前端技术栈（Vue 3、Pinia、Tailwind CSS、Vite）与 Electron 桌面容器构建，内置独立轻量级音乐 API 微服务，全量采用纯 JavaScript 生态，免除了任何原生 C++ 编译负担。

软件深度整合了主流音乐平台生态与第三方音源调度体系，不仅提供高品质无损音频播放与跨平台歌单无缝迁移，更在桌面端系统级交互（Windows SMTC 锁屏联动、多模态桌面歌词、系统托盘全能播控）、图形渲染质感（Apple HIG 连续曲率超椭圆 GPU 渲染管线）以及海量歌单性能调优（虚拟滚动与分片防抖存储）上精雕细琢，力求在每一次旋律响起时，都为您呈现兼具美感与流畅度的视听盛宴。

---

## 🌟 核心功能特性

### 🎵 极致听感与全音质畅听体系
- **全音质自适应探测**：全面支持标准音质、HQ 高品质 (320kbps)、SQ 超品质无损 (FLAC)、Hi-Res 高解析、超清蝰蛇音效与全景声音质，智能检测音源可用性并遵循平滑降级链自动回退。
- **WebAudio 音量增益扩展 (Volume Boost)**：打破系统 100% 默认输出上限，提供 125%、150%、200%（最高放大 2 倍）的纯净数字信号增益，辅以动态压缩器（Dynamics Compressor）有效防止大音量削波破音。
- **断点无缝记忆与毫秒级进度续播**：自动持久化保存当前的播放队列、正在播放的曲目及精确播放进度，重启软件瞬间无缝继续倾听。
- **6 秒进度监测自愈看门狗**：针对第三方网络流偶发的 `00:00` 假死、网络抖动中断或音频上下文挂起，内置智能看门狗自动执行断点重拉与故障跳歌自愈。

### 📥 跨平台多源聚合与歌单无缝迁移
- **主流平台生态聚合**：内置丰富的推荐、歌单广场、排行榜、歌手详情、专辑分类与搜索发现页，汇聚海量曲库资源。
- **网易云音乐与企鹅音乐深度导入**：只需一键粘贴歌单分享链接或数字 ID，即可极速解析歌单元数据、专辑封面与全量曲目，支持“一键播放全部”、“分批后台加入队列”与本地收藏管理。
- **智能复合哈希去重与弱网重试**：内置基于唯一复合哈希键（`mergeSongs`）的智能去重引擎，并在弱网环境下提供容灾自愈状态与一键重试控件，杜绝列表滚动漂移与重复追加。
- **第三方音源物理隔离与 VM 沙箱**：第三方解析脚本在独立的 Node.js `vm.Script` 沙箱中执行，剥离宿主敏感接口，构建内存编译缓存池，保障运行安全与毫秒级切歌响应。

### 📻 私人 FM 独立电台流模式
- **常规播放列表零污染**：私人 FM 采用独立电台流模式，物理隔离常规播放队列。开启电台时完整封存常规歌单，退出时一键恢复原状。
- **独立推荐与智能副歌定位**：独立维护电台预拉取队列，集成副歌高潮智能片段定位、不喜切歌垃圾桶与协同推荐故障自愈算法。

### 📜 桌面悬浮歌词系统（横排 / 竖排双模态）
- **横竖排双模态自由切换**：在经典横向双行歌词的基础上，首创典雅竖排书卷模式。主歌词与翻译/音译副歌词纵向双排并列，卡拉OK逐字平滑垂直填充。
- **独立尺寸与坐标记忆**：主进程分别独立记忆横排与竖排的窗口尺寸和屏幕绝对坐标，形态切换平滑过渡。
- **多显示器视口防溢出钳制**：集成高精度屏幕边界钳制算法，无论多显示器布局如何变动或拖拽切换，歌词窗口均严格停留在可视区域内，杜绝飘逸出界。
- **无感唤起与鼠标穿透**：采用后台非激活显示（`showInactive` 与 `focusable: false`），呼出歌词不会抢占当前游戏或办公界面的输入焦点；移出热区后瞬间激活全局鼠标穿透。
- **无极调色盘与深色毛玻璃 Tooltip**：支持自由拾色器与 HEX 色值输入，悬浮工具栏配备具有视口防出界保护的深色毛玻璃质感 Tooltip。

### 🪟 Windows 系统媒体控制 (SMTC) 与锁屏交互
- **锁屏与快捷控制面板联动**：通过 Chromium 原生 Media Session API 深度桥接 Windows 系统媒体传输控件 (SMTC)，支持在 **Win+L 锁屏界面** 与 **Win+A 快捷设置面板** 实时展示歌曲标题、歌手、专辑与高清封面大图。
- **系统级硬件播控接管**：无缝响应键盘多媒体按键及系统面板的播放/暂停、上一首、下一首、跳转进度交互。
- **双阶段元数据穿透与乐观更新**：切歌瞬间以纳秒级速度乐观推送元数据，音频就绪后二次穿透补全高精度封面与时长，彻底消除面板闪烁与信息滞后。
- **次声波防挂起保活通道**：创新注入近零电本次声波通道，防止 WebAudio 模式被 Chromium 静音挂起导致 SMTC 失去焦点。

### ⚡ 海量曲库性能治理与丝滑虚拟滚动
- **海量歌曲虚拟滚动 (Virtual Scroll)**：重构播放列表底层内存模型与哈希索引（`normKey`），播放列表抽屉引入视口动态虚拟滚动，支撑 2000+ 首歌曲秒级展开与丝滑拖拽，大幅降低 DOM 节点数与内存消耗。
- **容量档位管理与 5 秒撤销机制**：偏好设置提供 1000 / 1500 / 2000 首容量档位；替换播放列表时提供 **5 秒一键撤销 (Undo)** 机制，保障用户播放资产安全。
- **分片防抖持久化 (Debounced Storage)**：解耦高频播放进度写入与大歌单序列化，采用防抖分片存储，彻底消除频繁切歌时的磁盘 I/O 阻塞，客户端冷启动提速 300%。
- **全能队列管理**：播放抽屉支持快捷搜索过滤、当前曲目一键定位、批量多选移除以及一键清理已播放曲目功能。

### 🎨 Apple HIG 连续曲率矢量设计与微动效
- **5 阶连续曲率 Token 标准**：全面对标 Apple HIG 工业级超椭圆曲率标准（`xs: 5`、`sm: 8`、`md: 10`、`lg: 14`、`xl: 18`、`2xl: 24`），配合自定义指令 `v-squircle` 动态生成平滑矢量超椭圆 SVG 剪裁路径。
- **物理双层解耦架构 (Dual-Layer Decoupling Standard)**：
  - 外层 Wrapper 专职负责几何尺寸、位移动画与 Tailwind `rounded-[Xpx]` 兜底阴影，内层专职负责矢量剪裁与 `transform-gpu` GPU 上下文常驻；
  - 彻底清除桌面端常见的“直角阴影外溢”、“白色尖角撕裂”与“滚动频闪”。
- **高性能微任务单例 Tooltip 引擎**：全应用共享唯一的轻量级 Tooltip 实体节点，采用微任务节流与指针缓存，杜绝反复调用 `getBoundingClientRect()` 引发的强制重排回流，维持稳定 60 FPS 交互。

### 👤 账号中心与特权智能助手
- **极速扫码登录**：支持多端二维码扫码登录，个人资产、我喜欢的音乐、自建歌单与听歌足迹云端实时同步。
- **智能 VIP 特权打卡助手**：
  - **后台全自动调度**：登录账号后，服务在后台自动签到领取每日「1天畅听VIP」，并按时循环打卡领取「3小时特权」（每日最多 8 次）。
  - **防风控智能离散算法**：内置 60 分钟冷却监控与 15~45 秒随机抖动延时，模拟真实行为特征，保障账号安全。
  - **实时监控看板**：在偏好设置中直观显示打卡状态、当日额度进度与下一次执行倒计时。

### 🛡️ 架构安全、网络防护与版本控制
- **硬件级凭据加密存储**：本地金库 (Vault) 保存的凭据全面采用 Electron 原生 `safeStorage`（DPAPI 加密）存储，防止明文泄露。
- **本地服务网络隔离与安全流式代理 (AudioProxy)**：本地 API 服务固定监听 `127.0.0.1` 并施加严格的 CORS 限制；所有音频流经由本地微服务代理，内置防 SSRF、智能 Referer 伪装与 Range 分段支持。
- **现代拟物更新感知与紧急熔断防御 (Kill Switch)**：
  - 支持多线路测速（GitHub 官方源、`ghfast` 加速镜像、`ghproxy` 代理下载），自动平滑降级；
  - 引入云端版本熔断策略，若线上版本遭遇严重缺陷，云端可在 30 秒内阻断受影响客户端并触发红色熔断警报，杜绝 Bug 扩散。
- **轻量纯粹零原生编译**：全量基于纯 JavaScript 依赖构建，无需 Python、C++ 编译器等繁重环境，安装与二次开发零门槛。

### ⚙️ 全能偏好设置中心
- **常规与外观**：浅色模式、深色模式及跟随系统主题无感自适应；主窗口关闭行为自定义（最小化到托盘 / 直接退出 / 每次询问）；开机自动启动项配置；一键统计与清理应用缓存及搜索历史。
- **播放与音频**：集中管理音量增益开关与倍率、SMTC 锁屏控制开关、播放列表容量上限与播放模式配置、故障自愈跳歌策略。
- **桌面歌词配置**：横排/竖排双模态定制、主/副歌词字号大小独立调节、动效开关与调色盘方案。
- **系统托盘与全局快捷键**：托盘右键菜单实时联动播放状态、多分辨率图标动态适配；内置系统全局热键总开关与全局/应用内热键自定义对照。

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

> 💡 **提示**：本项目不包含任何需要本地编译的原生 C++ 扩展，`npm install` 过程中不需要安装 Python 或 Visual Studio Build Tools。

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
| `npm run pack` | 编译前端并打包生成 Windows 安装版 (.exe) 与绿色免安装便携版 (Portable) |
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
├─ docs/                    # 系统全景架构指南 (ARCHITECTURE.md，单一可信源)
├─ electron/                # Electron 主进程模块
│  ├─ assets/tray-icons/    # 托盘右键菜单定制高分辨率原生图标
│  ├─ main.js               # 主进程入口、窗口生命周期、多窗口横竖排坐标记忆与视口防溢出钳制
│  ├─ preload.js            # 安全 ContextBridge 预加载暴露接口
│  ├─ trayManager.js        # 系统托盘菜单事件与全局快捷键调度中心
│  └─ trayIcons.js          # 原生图标动态加载器
├─ music_source/            # 第三方音源物理隔离目录与说明
│  ├─ Netease/              # 网易云音乐专用第三方音源脚本
│  ├─ QQ/                   # 企鹅音乐专用第三方音源脚本
│  └─ README.md             # 音源规范说明与开源许可
├─ public/                  # 静态公共资产 (Logo 图标等)
├─ scripts/                 # 本地环境自检、自愈及多进程启动脚本
├─ server/                  # 内置轻量级本地 API 服务端微服务
├─ src/                     # Vue 3 核心前端工程源码
│  ├─ components/           # 通用基础与业务模态框 (UpdateNotificationCard, SettingsModal, GlobalDialog, VinylTurntable 等)
│  ├─ composables/          # 组合式状态逻辑 (useTheme, useSearchHistory, usePlayAllHydration 等)
│  ├─ directives/           # 全局指令 (squircle.js 连续曲率超椭圆 GPU 剪裁)
│  ├─ layout/               # 顶栏 Header、侧边导航 Sidebar、底栏播放器 PlayerBar（含虚拟滚动抽屉）
│  ├─ router/               # 路由表定义 (发现、歌单、歌手、排行榜、FM、设置、独立桌面歌词等)
│  ├─ store/                # Pinia 全局状态仓 (playerStore 播放控制, userStore 用户数据, updateStore 版本感知与熔断)
│  ├─ utils/                # SMTC 桥接器 (mediaSessionBridge)、单例 Tooltip、HTTP 请求库、音质映射与数据规整工具
│  └─ views/                # 业务视图页面 (Discover, PlaylistDetail, DesktopLyric, PersonalFM, ...)
├─ AGENTS.md                # 长期 AI 开发助手与系统架构长期规范契约
├─ index.html               # 页面 HTML 单页入口
├─ package.json             # 依赖清单与构建打包配置
├─ version-rules.json       # 云端版本控制、升级规则与高危熔断策略清单
└─ vite.config.js           # Vite 现代化前端构建与热更新配置
```

---

## 📜 免责声明

1. 本项目为开源个人技术研究项目，专为前端工程化、Electron 跨平台桌面应用开发学习以及个人技术研究交流使用，**严禁用于任何商业营利或非法用途**。
2. 软件运行过程中获取的音频、歌词、图片、封面等相关数据均来源于各平台公开网络接口或第三方音源解析脚本，其知识产权与版权均归对应原版权方或平台所有。本项目自身不托管、不存储、不修改亦不分发任何音视频资源。
3. 本软件仅支持手机验证码登录及「酷狗概念版」官方 APP 扫码登录。用户登录凭据均通过操作系统底层硬件加密（Electron `safeStorage`）存储于本地，不向任何第三方云端服务器传输。
4. 软件内置的高品质音质探测、VIP 特权打卡助手及多平台歌单解析仅供学习测试，因平台接口策略变更或第三方网络因素导致的功能失效、账号风控等风险，均由使用者自行承担。
5. 任何个人或组织因非合理使用本项目所引起的任何纠纷、法律责任或损失，均由使用者本人自行承担，本项目开发者及贡献者不承担任何直接或间接的连带责任。

---

## 🙏 致谢与参考

- 本地内置 API 服务内核基于开源项目 [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) 进行深度定制、架构适配与并发性能重构。
- 架构全景解析详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。
- 第三方音源规则规范详见 [music_source/README.md](music_source/README.md)，音源获取与维护来源参考 GitHub 仓库 [guoyue2010/lxmusic-](https://github.com/guoyue2010/lxmusic-)。

---

## 📄 开源许可证

本项目遵循 [MIT License](LICENSE) 协议完全开源。欢迎提交 Issue 或 Pull Request 共同完善！
