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

**概念音乐 (Concept Music)** 是一款专为追求极致视听、海量曲库管理与丝滑交互打造的现代化 Windows 桌面音乐客户端。

客户端基于现代 Web 前端技术栈（Vue 3、Pinia、Tailwind CSS、Vite）与 Electron 桌面容器构建，内置独立轻量级音乐 API 微服务。项目涵盖全音质无损畅听、网易云与企鹅音乐歌单无缝迁移与智能去重、私人 FM 独立电台流、Windows 系统媒体控制 (SMTC) 锁屏联动、桌面横排/竖排双模态悬浮歌词、海量播放列表虚拟滚动、原生系统托盘联动、VIP 特权智能助手、Apple HIG 连续曲率超椭圆 GPU 渲染管线、全新现代拟物更新感知与紧急熔断防御体系以及全能偏好设置中心，为用户提供简洁、优雅且不受束缚的沉浸式听歌体验。

---

## 🌟 v4.0.0 核心功能全景

### 🛡️ 全新拟物更新感知与云端紧急熔断体系 (Kill Switch)
- **全新拟物磨砂玻璃弹窗**：彻底告别简陋对话框，带来媲美原生系统的现代拟物化半透明毛玻璃更新通知卡片，支持流畅的展开折叠更新日志与动态光晕。
- **国内多线路自适应高速下载**：集成 GitHub 官方通道、`ghfast` 加速镜像与 `ghproxy` 代理下载管线，自动测速并顺次平滑降级，彻底解决国内弱网环境下更新下载缓慢或超时中断的问题。
- **云端策略与高危故障紧急熔断 (Kill Switch)**：
  - 基于 GitHub 云端托管的 `version-rules.json` 策略文件，支持最低兼容版本检测（强制更新模式）；
  - **高危版本秒级熔断**：若新版遭遇致命缺陷，管理员可在云端直接将问题版本列入黑名单，全网运行该版本的客户端将在 30 秒内触发**红色高危熔断警报**并全屏阻断运行，杜绝 Bug 扩散，全力捍卫用户数据安全。

### 🎨 Apple HIG 连续曲率超椭圆与 GPU 合成渲染管线
- **5 阶连续曲率 Token 标准**：全面对标 Apple HIG 工业级超椭圆曲率标准（`xs: 5`、`sm: 8`、`md: 10`、`lg: 14`、`xl: 18`、`2xl: 24`），配合自定义指令 `v-squircle` 动态生成平滑矢量 SVG 剪裁路径。
- **物理双层解耦架构 (Dual-Layer Decoupling Standard)**：
  - 外层 Wrapper 专职负责几何尺寸、位移动画与 Tailwind `rounded-[Xpx]` 兜底阴影，内层专职负责矢量剪裁与 `transform-gpu` GPU 上下文常驻；
  - 彻底消除传统 Web 应用中常见的“直角阴影外溢”、“白色尖角撕裂”与“滚动频闪”。
- **Compositor Race Guard 竞态防护**：在带剪裁遮罩内禁用高开销的 `backdrop-blur-*`，消除 Chromium 分配 `RenderSurface` 首帧时的未裁剪 Quad 闪烁。
- **高效拦截抖动**：`squircleDirective` 内置 `areBindingsEqual` 浅深比对拦截算法，杜绝 60 FPS 组件高频重绘时的边框频闪与重排回流。

### ⚡ 高性能微任务单例 Tooltip 交互引擎
- **单例 DOM 架构**：全应用共享唯一的轻量级 Tooltip 实体节点，消除成百上千微型 DOM 节点频繁挂载卸载的内存负担。
- **微任务指针缓存与零回流卡顿**：采用微任务节流（Microtask Throttle）与指针缓存机制，杜绝鼠标在海量列表滑动时高频调用 `getBoundingClientRect()` 引发的严重同步布局回流，保证交互帧率稳定在 60 FPS。
- **全向视口边界探测防出界**：智能识别屏幕多方向边界碰撞，根据可用视口空间自适应反向翻转展示方向。

### 📥 跨平台歌单导入生态与智能去重
- **网易云与企鹅音乐歌单无缝迁移**：支持一键粘贴歌单分享链接或数字 ID，完整拉取歌单元数据、封面与多音质曲目列表。
- **容灾自愈与重试机制**：新增网络弱网重试状态（`loadMoreError`），并在列表底部提供可一键重试的交互操作。
- **基于唯一复合哈希键（mergeSongs）智能去重**：在分页拉取与“加入队列”后台分批加载过程中，建立精准去重拦截，杜绝列表滚动漂移与重复追加歌曲。

### 🪟 Windows 系统媒体控制 (SMTC) 与锁屏交互
- **锁屏与快捷控制面板联动**：通过 Chromium 原生 Media Session API 深度桥接 Windows 系统媒体传输控件 (SMTC)，支持在 **Win+L 锁屏界面** 与 **Win+A 快捷设置面板** 实时展示歌曲标题、歌手、专辑与高清封面大图。
- **系统级硬件播控接管**：无缝响应键盘多媒体按键及系统面板的播放/暂停、上一首、下一首、跳转进度交互。
- **双阶段元数据穿透与乐观更新**：切歌瞬间以纳秒级速度乐观推送元数据，音频就绪后二次穿透补全高精度封面与时长，彻底消除面板闪烁与信息滞后。
- **次声波防挂起保活通道**：创新注入近零电本次声波通道，防止 WebAudio 模式被 Chromium 静音挂起导致 SMTC 失去焦点。
- **偏好自由开关**：设置面板提供「在锁屏界面显示播放控件」独立配置开关。

### 📜 桌面悬浮歌词系统（横排 / 竖排双模态）
- **典雅竖排书卷模式**：在保留经典横向歌词的基础上，新增典雅的竖排显示模式。主歌词与翻译/音译副歌词纵向双排并列，卡拉OK逐字填充自适应垂直书写方向。
- **独立尺寸与坐标记忆**：主进程分别独立记忆横排与竖排的窗口尺寸和屏幕绝对坐标，切换形态无缝衔接。
- **多显示器视口防溢出钳制**：集成高精度屏幕边界防溢出算法，无论如何拖拽或跨屏切换，歌词窗口均严格停留在可视区域内，杜绝窗口飘逸出界。
- **悬浮工具栏与深色毛玻璃 Tooltip**：工具栏采用对称协调布局，支持横竖排一键切换；配备视口防出界保护的深色毛玻璃质感 Tooltip。
- **无感唤起不抢焦点**：采用后台非激活显示（`showInactive` 与 `focusable: false`），呼出歌词不会抢占当前游戏或办公界面的输入焦点。

### ⚡ 播放列表性能飞跃与海量歌曲管理
- **海量歌曲虚拟滚动 (Virtual Scroll)**：重构播放列表底层内存模型与哈希索引（`normKey`），播放列表抽屉引入视口动态虚拟滚动，支撑 2000+ 首歌曲秒级展开与丝滑拖拽。
- **播放列表上限档位管理**：偏好设置提供 1000 / 1500 / 2000 首容量档位（默认 1500 首），超限时智能淘汰边缘歌曲。
- **播放行为模式与 5 秒撤销机制**：支持将“播放全部”配置为“替换当前播放列表”或“合并到队首”；替换播放列表时提供 **5 秒一键撤销 (Undo)** 机制，保障播放资产安全。
- **分片防抖持久化 (Debounced Storage)**：解耦高频播放进度写入与大歌单序列化，采用防抖分片存储，彻底消除切歌时的磁盘 I/O 阻塞，客户端冷启动提速 300%。
- **队列管理操作增强**：播放抽屉支持快捷搜索过滤、当前曲目一键定位、批量多选移除以及一键清理已播放曲目功能。

### 📻 私人 FM 独立电台流模式
- **常规播放列表零污染**：私人 FM 全面重构为独立电台流模式，物理隔离常规播放队列。开启电台时完整封存常规歌单，退出时一键恢复原状。
- **独立推荐与缓冲机制**：独立维护电台预拉取队列，集成副歌高潮智能片段定位、垃圾桶淘汰与协同推荐故障自愈。

### 🎧 播放内核与音频技术
- **全音质自适应切换**：支持标准品质、HQ 高品质 (320kbps)、SQ 超品质无损 (FLAC)、Hi-Res 高解析、超清蝰蛇音效与全景声音质，智能检测资源可用性并支持顺次平滑降级。
- **WebAudio 音量增益增强 (Volume Boost)**：集成 WebAudio 数字信号处理链路，打破系统 100% 默认音量上限，提供 125%、150%、200%（最高放大 2 倍）的纯净增益，并辅以动态压缩器防止破音削波。
- **播放状态断点续播**：自动持久化保存当前的播放队列、正在播放的曲目及精确播放进度（毫秒级），重启软件无缝继续倾听。
- **6 秒进度看门狗播放假死自愈**：针对第三方音源偶发的 `00:00` 假死、网络波动断流或解码挂起实施自动检测与断点自愈重拉。

### 🔒 架构设计与安全隐私
- **硬件级凭据加密存储**：本地金库 (Vault) 保存的凭据全面采用 Electron 原生 `safeStorage`（DPAPI 加密）存储，防止明文泄露。
- **本地服务网络隔离**：本地 API 服务固定绑定监听 `127.0.0.1`，严格限制跨域访问（CORS）仅允许受信任的本地 Electron 应用。
- **音频流安全代理 (AudioProxy)**：经由本地微服务流式转发，内置防 SSRF、智能 Referer 伪装与 Range 分段支持。
- **轻量纯粹零原生编译**：全量基于纯 JavaScript 依赖构建，无需 Python、C++ 编译器等繁重环境，安装零心智负担。

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
