# 概念音乐 (Concept Music) 项目全景架构与技术梳理报告

> **文档版本**：v4.0.0  
> **运行环境规范**：Node.js 22 LTS / npm 10+ / Windows 10/11 x64  
> **最后更新**：2026-11-10  

---

## 1. 技术栈与关键依赖清单

本项目采用 **Electron 桌面外壳 + Vue 3 渲染端 + 内置 Node.js 本地微服务** 的多进程混合架构，全量采用纯 JavaScript（零 C++ 原生构建依赖，免除 node-gyp 与 VS Build Tools 负担）。

### 1.1 核心技术栈概览

| 维度 | 技术选型 | 版本 | 核心作用与定位 |
| :--- | :--- | :--- | :--- |
| **桌面容器** | Electron | `^30.0.0` | 跨平台桌面应用外壳，接管窗口生命周期、多窗口调度、托盘系统、全局热键、底层硬件凭据加密、视口边界钳制与网络代理 |
| **前端框架** | Vue 3 | `^3.4.21` | 渲染进程核心 UI 框架，采用 Composition API 与 `<script setup>` |
| **前端构建** | Vite | `^5.2.0` | 现代化前端构建与 HMR 热重载工具，提供 DevServer 与相对路径资产打包 |
| **状态管理** | Pinia | `^2.1.7` | 全局状态仓（播放内核 `playerStore`、用户资产 `userStore`、更新感知与熔断 `updateStore`） |
| **路由管理** | Vue Router | `^4.6.4` | 单页路由管理（采用 `createWebHashHistory`，兼容本地文件协议与桌面歌词子路由） |
| **样式与原子化** | Tailwind CSS | `^3.4.19` | 页面样式系统，配合 PostCSS 与 Autoprefixer 实现高响应式与深浅主题自适应 |
| **网络请求** | Axios | `^1.6.8` (前端) / `^1.20.0` (后端) | 封装统一 HTTP 请求，前端集成 IPC 原生适配器 |
| **本地 API 服务** | Express | `^4.18.2` | 嵌入式本地服务，监听 `127.0.0.1:10420`，提供多平台 API 聚合、音频代理及第三方音源调度 |
| **系统媒体控制** | Media Session API | Chromium 原生 | 桥接 Windows 系统媒体传输控件 (SMTC)，支持 Win+L 锁屏与 Win+A 快捷控制 |
| **桌面打包** | electron-builder | `^24.13.3` | 生成 NSIS 安装程序、Portable 绿色便携版及 GitHub Release 自动发布 |
| **自动更新** | electron-updater | `^6.1.8` | 增量/全量更新检测、多线路国内高速镜像分流、断点续传与静默安装 |

### 1.2 关键工具与底层支持库

- **图形渲染管线与超椭圆**：内置 `v-squircle` 指令与 Apple HIG 连续曲率矢量算法（GPU 硬件加速与物理双层解耦）。
- **交互单例引擎**：轻量级单例 Tooltip 引擎（微任务指针缓存节流、防溢出与零回流抖动）。
- **系统级媒体会话**：内置 `mediaSessionBridge.js` 原生实现双阶段乐观更新与 WebAudio 次声波保活通道。
- **加密与签名**：`crypto-js` (^4.2.0)、`node-forge` (^1.3.3)、`big-integer` (^1.6.52)（酷狗客户端协议签名、解密与请求加密校验）。
- **流媒体与解压**：`pako` (^2.1.0)（Gzip/Deflate 二进制解压）。
- **安全与编码**：`safe-decode-uri-component` (^1.2.1)。
- **二维码生成**：`qrcode` (^1.5.3)（登录二维码渲染）。

---

## 2. 目录结构与职责划分

```text
concept-music/
├─ .github/
│  └─ workflows/
│     ├─ build.yml                     # 自动化打包与发布到 GitHub Releases (CI/CD)
│     └─ install-check.yml             # 跨平台 (Ubuntu/macOS/Windows) 依赖安装与 setup 校验
├─ docs/                               # [项目核心技术文档]
│  └─ ARCHITECTURE.md                  # 全景系统架构书、设计铁律与开发指引 (单一可信源)
├─ electron/                           # [主进程模块]
│  ├─ assets/tray-icons/               # 原生系统托盘多分辨率图标资产 (.png)
│  ├─ main.js                          # Electron 主入口、单实例锁、多窗口与横竖排歌词坐标记忆、SafeStorage 金库、IPC 代理
│  ├─ preload.js                       # 渲染进程安全桥接隔离层 (ContextBridge)
│  ├─ trayIcons.js                     # 托盘菜单原生图标动态生成与加载器
│  └─ trayManager.js                   # 系统托盘菜单事件调度、状态同步与系统全局热键
├─ music_source/                       # [第三方音源物理隔离目录]
│  ├─ Netease/                         # 网易云音乐专用第三方解析脚本
│  ├─ QQ/                              # 企鹅音乐专用第三方解析脚本
│  └─ README.md                        # 音源开源许可、引用规范与免责声明
├─ public/                             # 静态资源 (应用 Logo 图标 icon.ico 等)
├─ scripts/                            # [工程脚本与自愈保障]
│  ├─ check-node-version.mjs           # Node.js >= 20 运行时版本门禁
│  ├─ check-setup.mjs                  # Electron 二进制完整性检查与自动国内镜像自愈修复
│  ├─ install-server-deps.mjs          # server/ 独立目录依赖自动安装脚本
│  ├─ postinstall.mjs                  # npm install 后置钩子，联动检查与环境就绪
│  └─ start-electron-dev.mjs           # 本地双进程智能拉起脚本 (Vite + Electron)
├─ server/                             # [内置本地轻量级 API 微服务]
│  ├─ module/                          # 80+ 个业务 API 路由模块 (酷狗、网易、企鹅、音源调度、VIP打卡)
│  ├─ util/                            # 服务端通用工具集 (VM 沙箱、源调度器、防 SSRF 音频代理、加解密)
│  ├─ app.js                           # 本地服务端启动引导器 (包含防孤儿僵尸进程断开机制)
│  ├─ server.js                        # Express 核心服务工厂、CORS 白名单、AudioProxy 跨域代理
│  └─ package.json                     # 本地服务端独立依赖清单
├─ src/                                # [Vue 3 渲染进程源码]
│  ├─ components/                      # 基础交互组件与全局模态框
│  │  ├─ common/AppIcon.vue            # 全局统一内联 SVG 图标渲染组件
│  │  ├─ common/TimePicker.vue         # 时间选择器组件
│  │  ├─ BackToTop.vue                 # 快速回到顶部悬浮按钮
│  │  ├─ DisclaimerModal.vue           # 首次启动免责声明弹窗
│  │  ├─ GlobalDialog.vue              # 通用确认/提示模态对话框
│  │  ├─ GlobalToast.vue               # 全局轻提示 Toast（支持带撤销 Action）
│  │  ├─ LoginModal.vue                # 扫码与手机号验证码登录弹窗
│  │  ├─ SettingsModal.vue             # 偏好设置中心 (外观/播放/歌词横竖排/SMTC/快捷键/打卡/更新)
│  │  ├─ SingerLink.vue                # 歌手多作者可点击跳转路由链接
│  │  ├─ SongContextMenu.vue           # 歌曲列表通用右键功能菜单 (播放/下首/添加/复制/原平台)
│  │  ├─ UpdateNotificationCard.vue    # 全功能版本感知、国内多线路下载与紧急熔断升级卡片
│  │  └─ VinylTurntable.vue            # 全屏歌词沉浸式黑胶唱片高拟真旋转组件
│  ├─ composables/                     # 组合式业务逻辑 (useTheme, useSearchHistory, usePlayAllHydration)
│  ├─ constants/                       # 全局常量与矢量图标集合 (icons.js)
│  ├─ directives/                      # 全局自定义指令 (squircle.js 连续曲率超椭圆指令)
│  ├─ layout/                          # 应用三栏主视窗骨架
│  │  ├─ Header.vue                    # 顶部导航、Windows 原生无边框控制按钮、搜索框与用户徽标
│  │  ├─ Sidebar.vue                   # 侧边栏导航 (发现/广场/榜单/歌手/FM/收藏/导入)
│  │  └─ PlayerBar.vue                 # 底部播控条、WebAudio增益、音质切换、海量虚拟滚动播放列表抽屉
│  ├─ router/index.js                  # Vue Router 路由配置 (Hash 模式，含 DesktopLyric 独立视图)
│  ├─ store/                           # Pinia 状态管理核心
│  │  ├─ playerStore.js                # 播放内核：WebAudio链路、分片防抖存储、虚拟索引、看门狗、FM电台解耦
│  │  ├─ userStore.js                  # 账户资产、Cookie 鉴权、自建歌单增删、VIP 自动打卡助手
│  │  └─ updateStore.js                # 版本检测感知、多节点分流 (GitHub/ghfast/ghproxy)、强制熔断
│  ├─ utils/                           # 前端工具库
│  │  ├─ appState.js                   # 全局前后台状态与事件总线
│  │  ├─ artistNavigation.js           # 歌手跨平台跳转调度
│  │  ├─ fmRecommendation.js           # 私人 FM 推荐引擎与协同推荐
│  │  ├─ mediaSessionBridge.js         # Windows SMTC 系统媒体控制与锁屏桥接
│  │  ├─ neteasePlaylistStorage.js     # 网易歌单持久化缓存
│  │  ├─ neteaseSongHelper.js          # 网易歌曲数据清洗与适配
│  │  ├─ qqPlaylistStorage.js          # 企鹅歌单持久化缓存
│  │  ├─ qqSongHelper.js               # 企鹅歌曲数据清洗与适配
│  │  ├─ request.js                    # 统一 Axios 封装与 IPC 原生适配器
│  │  ├─ songContextMenu.js            # 歌曲右键菜单上下文数据组装
│  │  ├─ songHelper.js                 # 核心歌曲规范化器 (`normalizeSongKey`, `buildPlayPayload`)
│  │  ├─ squircle.js                   # Apple HIG 连续曲率超椭圆矢量计算与缓存生成引擎
│  │  └─ tooltip.js                    # 悬浮提示高性能微任务单例引擎
│  ├─ views/                           # 路由视图页面 (17 个业务视图，含横竖排 DesktopLyric、PersonalFM 等)
│  ├─ App.vue                          # 顶层根组件 (主视窗与独立桌面歌词视窗分流调度、SMTC 全局挂载)
│  ├─ main.js                          # 前端入口文件
│  └─ style.css                        # 全局样式、Squircle 变量与自定义滚动条定义
├─ AGENTS.md                           # AI 编程助手与开发者长期上下文契约 (不可违背)
├─ index.html                          # 单页应用 HTML 入口
├─ package.json                        # 客户端项目描述与 electron-builder 构建配置
├─ tailwind.config.js                  # Tailwind 原子化 CSS 配置
├─ version-rules.json                  # 云端版本控制、强制更新与高危黑名单熔断规则表
└─ vite.config.js                      # Vite 现代化前端构建与开发配置 (相对路径 `./` 与 API 反代)
```

---

## 3. 入口与运行规范

### 3.1 核心入口文件梳理

1. **桌面主进程入口**：[`electron/main.js`](file:///d:/DevelopProject/concept-music/electron/main.js)
   - 由 `package.json` 的 `"main": "electron/main.js"` 声明。负责单实例锁校验、拉起本地 Node 嵌入式子进程、注册自定义协议、维护主窗口与桌面歌词独立窗口（横竖排尺寸与坐标独立记忆及防出界钳制）、监听全局 IPC 通道与安全金库加解密。
2. **前端渲染进程入口**：[`index.html`](file:///d:/DevelopProject/concept-music/index.html) -> [`src/main.js`](file:///d:/DevelopProject/concept-music/src/main.js) -> [`src/App.vue`](file:///d:/DevelopProject/concept-music/src/App.vue)
   - 初始化 Pinia、Vue Router、主题模式 (`initTheme`)、全局指令与组件，并根据路由哈希 (`#/desktop-lyric` vs 普通页面) 决定展示主窗口还是透明歌词窗口，同时挂载 Windows SMTC 全局播控联动。
3. **本地后端服务入口**：[`server/app.js`](file:///d:/DevelopProject/concept-music/server/app.js) -> [`server/server.js`](file:///d:/DevelopProject/concept-music/server/server.js)
   - 由主进程通过 Node `fork` 派生子进程启动。监听 `process.on('disconnect')` 确保主进程退出时子进程立即自毁，防止孤儿进程长期占用 `10420` 端口。

### 3.2 运行与构建命令速查

```bash
# 1. 启动全功能本地桌面开发环境 (开发推荐)
npm start
# 流程：check-setup 检查修复环境 -> 启动 Vite (:5173) -> 拉起 Electron -> Electron 内部启动 Server (:10420)

# 2. 仅启动网页端前端调试 (用于纯前端 UI 开发)
npm run dev

# 3. 依赖自检与 Electron 二进制自愈修复
npm run check:setup
npm run check:setup -- --repair

# 4. 前端静态资源编译打包
npm run build

# 5. 生成生产发布版安装包 (Windows x64 NSIS 安装程序 + Portable 免安装绿色版)
npm run pack

# 6. 打包并自动推送 Release 产物至 GitHub
npm run release
```

### 3.3 环境变量配置

- `.env.example` -> `.env`：
  - `VITE_API_TARGET=http://127.0.0.1:10420`：开发阶段前端代理转发至本地微服务端口；
  - `PORT=10420`、`HOST=127.0.0.1`：本地微服务绑定地址。

---

## 4. 核心业务逻辑与数据流转

### 4.1 整体架构调用关系

```mermaid
flowchart TB
    subgraph OS_System [操作系统层 (Windows 10/11)]
        SMTC["系统媒体传输控件 (SMTC)<br/>Win+L 锁屏 / Win+A 快捷控制"]
        ScreenMonitors["多显示器桌面视口边界"]
    end

    subgraph Electron_Main_Process [Electron 主进程 (Node.js)]
        Main["main.js<br/>窗口与生命周期管理"]
        LyricWinMgr["歌词窗口管理<br/>横/竖排独立坐标记忆 & 防溢出钳制"]
        Vault["SafeStorage 金库<br/>kugou_auth_vault.json (DPAPI)"]
        Tray["trayManager.js<br/>托盘菜单与系统全局快捷键"]
        NativeReq["IPC Handler<br/>'native-api-request'"]
        AutoUpdate["initAutoUpdater<br/>多线路在线版本控制"]
    end

    subgraph Renderer_Process [渲染进程 (Vue 3 / Chromium)]
        AppRoot["App.vue"]
        subgraph MainWindow [主窗口视图]
            Header["Header.vue"]
            Sidebar["Sidebar.vue"]
            Views["Views (Discover, PersonalFM, Playlist...)"]
            PlayerBar["PlayerBar.vue<br/>虚拟滚动抽屉 & 批量管理"]
        end
        subgraph LyricWindow [独立桌面歌词窗口]
            DesktopLyric["views/DesktopLyric.vue<br/>横排/竖排双模态 & 卡拉OK"]
        end
        subgraph Pinia_Stores [Pinia 状态仓]
            PlayerStore["playerStore.js<br/>WebAudio & 虚拟索引 & 6s看门狗"]
            UserStore["userStore.js<br/>鉴权 & VIP 打卡"]
            UpdateStore["updateStore.js<br/>版本感知 & 紧急熔断响应"]
        end
        SMTCBridge["mediaSessionBridge.js<br/>乐观推送 & 次声波保活"]
        ReqAdapter["utils/request.js<br/>(IPC Adapter / Axios)"]
        SquircleEngine["directives/squircle.js<br/>Apple HIG 超椭圆渲染"]
        TooltipEngine["utils/tooltip.js<br/>微任务节流单例 Tooltip"]
    end

    subgraph Local_Server_Process [本地 API 服务进程 (:10420)]
        ExpressApp["server.js / app.js"]
        AudioProxy["/audio/proxy<br/>防SSRF & 跨域流式代理"]
        Modules["module/*.js<br/>80+ 个功能路由"]
        VMRunner["lx-source-runner.js<br/>Node.js VM 沙箱"]
    end

    subgraph External_Services [外部网络服务]
        KGCloud["酷狗官方服务端"]
        MusicSource["第三方音源脚本 (music_source/)"]
        CDNAudio["各平台音频 CDN 流媒体"]
        GHRelease["GitHub / 国内加速镜像 (更新与熔断源)"]
    end

    %% 连接关系
    MainWindow --> Pinia_Stores
    Pinia_Stores --> ReqAdapter
    ReqAdapter -- "window.apiBridge.request" --> NativeReq
    NativeReq <--> Vault
    NativeReq -- "Local HTTP" --> ExpressApp
    ExpressApp --> Modules --> KGCloud
    ExpressApp --> AudioProxy
    Modules --> VMRunner --> MusicSource
    PlayerStore -- "Audio.src" --> AudioProxy --> CDNAudio
    PlayerStore <--> SMTCBridge <--> SMTC
    PlayerStore -- "lyricAPI.sync" --> Main -- "update-lyric" --> DesktopLyric
    DesktopLyric -- "lyricAPI.sendControl" --> Main -- "main-lyric-control" --> PlayerStore
    DesktopLyric -- "lyricAPI.toggleMode" --> LyricWinMgr <--> ScreenMonitors
    Tray -- "tray-action" --> AppRoot
    UpdateStore <--> AutoUpdate <--> GHRelease
```

### 4.2 核心业务流程与机制解析

#### ① 鉴权金库与请求闭环（SafeStorage Vault）
- **安全保障**：所有从登录或接口响应中获得的敏感凭据（`token`、`kg_mid`、`kg_dfid`、`userid`、`vip_token` 等）统一由 Electron 底层 `safeStorage`（DPAPI 硬件级加密）写入本地 `userData/kugou_auth_vault.json`。
- **透明注入**：前端请求统一通过 [`src/utils/request.js`](file:///d:/DevelopProject/concept-music/src/utils/request.js) 的 `ipcAdapter` 路由至主进程 [`electron/main.js`](file:///d:/DevelopProject/concept-music/electron/main.js) 的 `native-api-request` 处理器；主进程自动解密并注入 Cookie，返回结果时拦截 `Set-Cookie` 写回金库。渲染端无明文泄露风险，彻底消除跨域限制。

#### ② 播放引擎与 WebAudio 增益流
- **双 Audio 交替加载**：[`src/store/playerStore.js`](file:///d:/DevelopProject/concept-music/src/store/playerStore.js) 维护 `audioA` 和 `audioB`。当正在播放当前歌曲时，`preloadAudio` 提前在后台静默预拉取下一首音频流，切歌时瞬间切换，彻底消除切歌卡顿。
- **Volume Boost 与压限**：集成 WebAudio API 节点链路：
  $$\text{AudioElement} \rightarrow \text{MediaElementAudioSourceNode} \rightarrow \text{GainNode (1.25x/1.5x/2.0x)} \rightarrow \text{DynamicsCompressorNode} \rightarrow \text{AudioDestinationNode}$$
  加入动态压缩器以防止高倍增益带来的数码破音削波。
- **流媒体跨域代理 (AudioProxy)**：WebAudio 处理流媒体必须开启 `crossOrigin = 'anonymous'`，部分第三方 CDN 缺乏 CORS 头会导致音频挂起或静音。因此所有经过 WebAudio 的流统一经由本地 `http://127.0.0.1:10420/audio/proxy?url=...` 代理，内置防 SSRF、智能 Referer 伪装与 Range 分段支持。

#### ③ Windows 系统媒体控制 (SMTC) 与锁屏交互桥接
- **原生能力桥接**：通过 Chromium 原生 `navigator.mediaSession` 桥接 Windows 系统媒体传输控件 (SMTC)，支持在 Windows 锁屏界面 (Win+L) 与系统快捷控制面板 (Win+A) 实时显示歌曲标题、歌手、专辑及封面大图。
- **播控双向联动**：响应系统多媒体硬件按键及界面按钮（播放、暂停、上一首、下一首、跳转进度），与 `playerStore` 实现纳秒级同步。
- **乐观更新与双阶段元数据穿透**：切歌瞬间先以乐观元数据直推 SMTC，音频流解析完成时二次更新准确时长与高质量封面，彻底消除了 Win+A 面板的滞后与标题闪烁。
- **次声波保活机制**：针对 WebAudio 模式可能被 Chromium 判定为空闲而静音挂起导致 SMTC 失去焦点的边界问题，注入轻量近零电本次声波通道保持会话活跃。用户亦可在偏好设置中随时关闭该功能。

#### ④ 海量歌单虚拟滚动与分片防抖持久化引擎
- **容量治理与智能淘汰**：偏好设置新增播放列表上限档位（1000/1500/2000 首，默认 1500 首），队列超限时依据播放状态智能淘汰队尾或已播放歌曲，并配以明确的 UI 反馈。
- **播放行为模式与 5 秒撤销**：新增“播放全部”行为模式（“替换当前播放列表”与“合并到队首”），替换大歌单时提供 5 秒一键撤销（Undo）机制，保障用户播放资产安全。
- **可视区间虚拟滚动 (Virtual Scroll)**：`PlayerBar.vue` 播放列表抽屉集成动态虚拟滚动算法，通过哈希索引（`normKey`、`rebuildPlaylistKeyMap`）与滚动锚定，仅渲染可视视口前后缓冲歌曲，支撑 2000+ 首海量歌曲秒级展开与丝滑滚动。
- **分片防抖持久化 (Debounced Chunked Storage)**：将高频轻量的播放进度持久化与沉重的大歌单序列化解耦。歌单列表采用防抖分片批量写入，显著降低频繁切歌时的磁盘 I/O 阻塞，应用冷启动提速 300%。
- **播放异常自愈看门狗**：引入 6 秒进度监测看门狗（Watchdog），针对第三方音源偶发的 `00:00` 假死、网络中断挂起或音频上下文失联实施自动断点自愈与音源重试重拉。

#### ⑤ Apple HIG 连续曲率超椭圆（Squircle）渲染与 GPU 合成管线
- **连续曲率 Token 规范**：全站统一采用 5 阶 Apple HIG 连续曲率标准（`xs: 5`, `sm: 8`, `md: 10`, `lg: 14`, `xl: 18`, `2xl: 24`），配合自定义指令 `v-squircle` 动态生成平滑矢量超椭圆 SVG 剪裁路径。
- **物理双层解耦架构 (Dual-Layer Decoupling Standard)**：
  - 凡需要展示超椭圆连续曲率的卡片/封面，**严禁在同一个 DOM 节点上混合使用 `transition-transform`、`transform`、`box-shadow` 或 `overflow-hidden`**；
  - **外层 Wrapper 规范**：专职负责宽高比、鼠标悬浮位移动画（如 `hover:-translate-y-1`）、外发散阴影（`shadow-*`），且必须显式声明 Tailwind `rounded-[Xpx]` 兜底类，消除直角阴影与白色三角隙；
  - **内层 Squircle 规范**：专职矢量剪裁，配置 `transform-gpu [transform:translateZ(0)]` 常驻 GPU 合成上下文；**严禁声明 `overflow-hidden`**，消除矩形与超椭圆剪裁冲突。
- **Compositor Race Guard 竞态防护**：在带 `clip-path` 的图片容器内部禁用 `backdrop-blur-*`，改用纯净的高性能微半透明遮罩（`bg-black/35`），杜绝 Chromium 分配 `RenderSurface` 首帧时渲染未剪裁直角 Quad 的视觉伪影。
- **指令比对拦截**：`squircleDirective` 在更新钩子中通过 `areBindingsEqual` 深度拦截无效参数变动，彻底杜绝 60 FPS 组件重绘时的边框频闪与 Layout 抖动。

#### ⑥ 高性能微任务单例 Tooltip 引擎
- **单例架构**：全应用共享唯一的轻量级 Tooltip DOM 节点，避免成百上千个微型 DOM 节点的无谓创建与销毁。
- **微任务指针缓存与零回流卡顿**：采用微任务节流（Microtask Throttle）与指针坐标缓存，彻底消除了鼠标高频滑动时反复触发 `getBoundingClientRect()` 引发的强制同步布局回流，使大列表交互帧率稳定维持在 60 FPS。
- **反向视口遮挡防溢出**：根据屏幕可视视口动态判断边缘碰撞，自适应反向翻转展示方向。

#### ⑦ 多源导入生态与智能去重加载机制
- **容灾自愈与重试**：在网易云与 QQ 音乐歌单导入页面（`NeteaseImport.vue`、`QQImport.vue`）新增网络异常自愈状态（`loadMoreError`），并在列表底部提供可一键重试的交互控件。
- **复合哈希智能去重**：建立基于唯一复合哈希键（`mergeSongs`）的去重过滤机制，在常规分页加载及“加入队列”后台分批加载过程中，彻底杜绝分页漂移与重复追加歌曲，保护 DOM 列表与播放队列纯净。

#### ⑧ 云端版本控制、多线路更新与紧急熔断防御体系 (Kill Switch)
- **云端策略驱动**：客户端启动与手动检查时，自动从 GitHub 官方 Raw 及国内高速镜像通道拉取根目录 [`version-rules.json`](file:///d:/DevelopProject/concept-music/version-rules.json)。
- **三级防护与紧急熔断**：
  1. **普通升级感知**：检测到 `latestVersion > 本地版本` 时，弹出全新现代拟物磨砂玻璃通知卡片，支持用户自主选择“立即更新”或“下次再说”；
  2. **强制更新模式**：当本地版本低于 `minSupportedVersion` 或全局开启 `forceUpdate: true` 时，激活强制更新模式，遮罩不可关闭，引导升级；
  3. **高危版本紧急熔断 (Kill Switch)**：若新版发布后遭遇严重高危 Bug（如崩溃、闪退或数据破坏），管理员只需在 GitHub 直接编辑 `version-rules.json` 将该版本写入 `blacklistedVersions`（如 `["3.6.3"]`），全网运行该版本的客户端将在 30 秒内立即触发**红色高危警报熔断阻断**，锁定主界面并禁止继续播放，彻底阻断 Bug 扩散。
- **国内多线路自适应加速**：集成 GitHub 官方下载、`ghfast` 加速镜像与 `ghproxy` 代理下载链路，自动测速并顺次平滑降级，确保国内弱网环境下安装包秒级高速下载。

#### ⑨ 跨平台歌单导入与第三方音源沙箱
- **物理隔离**：第三方脚本按平台分别放置在 `music_source/Netease/` 与 `music_source/QQ/`。
- **沙箱隔离运行**：本地服务使用 [`server/util/lx-source-runner.js`](file:///d:/DevelopProject/concept-music/server/util/lx-source-runner.js) 基于 Node.js `vm.Script` 创建沙箱，彻底屏蔽宿主系统的 `process`、`require`、`module` 等敏感对象，仅注入定制的 `lx.request`，同时建立了带有文件 `mtimeMs` 校验的脚本内存编译缓存池。
- **多音质降级链**：统一按 `atmos` -> `master` -> `hires` -> `flac` -> `320k` -> `128k` 进行自适应探测与顺次降级。

#### ⑩ 桌面逐字悬浮歌词系统（横排/竖排双模态与边界钳制）
- **独立无感窗口**：主进程以 `transparent: true, frame: false, alwaysOnTop: true, showInactive: true, focusable: false` 创建歌词子窗口，加载 `/#/desktop-lyric`。
- **横排/竖排双模态**：支持常规横向双行歌词与典雅竖排书卷模式。竖排模式下主副歌词纵向并列排列，卡拉OK进度逐字垂直平滑填充。
- **多显示器视口防溢出钳制**：主进程为横排与竖排模式分别提供独立的尺寸与屏幕绝对坐标记忆。在模式切换或窗口拖拽结束时，动态计算所有已连接显示器的几何工作区，施加防溢出钳制算法，严防歌词窗口飘出屏幕可视范围。
- **热区穿透与深色毛玻璃 Tooltip**：歌词组件以节流形式计算交互热区边界向主进程汇报，移出后立即开启全局鼠标穿透 (`setIgnoreMouseEvents(true, { forward: true })`)。

#### ⑪ 自动化 VIP 特权打卡助手
- 在 [`src/store/userStore.js`](file:///d:/DevelopProject/concept-music/src/store/userStore.js) 中集成：
  1. 登录后自动触发领取「1天畅听VIP」；
  2. 每隔 60 分钟自动调度打卡领取「3小时特权」（每日最多 8 次，累计 24 小时）；
  3. 内置 15~45 秒随机抖动延时与风控离散算法，并在设置中心提供执行倒计时与状态看板。

---

## 5. 关键文件清单与开发索引

| 文件相对路径 | 模块类型 | 核心用途与重要考量 |
| :--- | :--- | :--- |
| [`package.json`](file:///d:/DevelopProject/concept-music/package.json) | 根配置 | 依赖版本定义、启动脚本、electron-builder 跨平台安装包与静态资源外置打包配置 |
| [`vite.config.js`](file:///d:/DevelopProject/concept-music/vite.config.js) | 构建配置 | `base: './'` 相对路径控制（杜绝 Electron 白屏）、端口与本地微服务代理设置 |
| [`version-rules.json`](file:///d:/DevelopProject/concept-music/version-rules.json) | 版本策略 | 云端在线版本规则清单、最低兼容版本阻断、高危版本黑名单熔断配置 (云端与本地对齐) |
| [`electron/main.js`](file:///d:/DevelopProject/concept-music/electron/main.js) | 主进程 | 单实例锁、多窗口调度、横竖排歌词独立坐标记忆与视口钳制、SafeStorage 金库、IPC 原生网络代理 |
| [`electron/preload.js`](file:///d:/DevelopProject/concept-music/electron/preload.js) | 桥接层 | `windowControls`、`lyricAPI`、`apiBridge`、`trayAPI`、`settingsAPI` 安全暴露 (ContextBridge) |
| [`electron/trayManager.js`](file:///d:/DevelopProject/concept-music/electron/trayManager.js) | 托盘与快捷键 | 系统托盘右键菜单状态联动、全局热键绑定与设置持久化 |
| [`server/server.js`](file:///d:/DevelopProject/concept-music/server/server.js) | 本地微服务 | Express 服务配置、CORS 控制、防 SSRF 音频代理中间件 (`/audio/proxy`)、API 自动注册 |
| [`server/util/lx-source-runner.js`](file:///d:/DevelopProject/concept-music/server/util/lx-source-runner.js) | 音源引擎 | Node.js VM 沙箱上下文构建、音源脚本编译缓存池与请求封装 |
| [`server/module/source_resolve.js`](file:///d:/DevelopProject/concept-music/server/module/source_resolve.js) | 音源调度 | 负责根据歌曲特征调用 Netease/QQ 脚本并执行多音质链路探测 |
| [`src/store/playerStore.js`](file:///d:/DevelopProject/concept-music/src/store/playerStore.js) | 状态仓 | 播放器内核：WebAudio 增益、多音质降级、海量队列索引、分片防抖存储、6s看门狗自愈、FM解耦 |
| [`src/store/userStore.js`](file:///d:/DevelopProject/concept-music/src/store/userStore.js) | 状态仓 | 用户资产、登录与 Token 定期刷新、自建歌单增删、VIP 自动打卡调度与冷却监控 |
| [`src/store/updateStore.js`](file:///d:/DevelopProject/concept-music/src/store/updateStore.js) | 状态仓 | 版本在线感知、更新线路自适应测速 (GitHub/ghfast/ghproxy)、弹窗免打扰与高危熔断响应 |
| [`src/utils/squircle.js`](file:///d:/DevelopProject/concept-music/src/utils/squircle.js) | 渲染引擎 | Apple HIG 连续曲率超椭圆路径计算、贝塞尔曲线参数平滑与 SVG 剪裁缓存池 |
| [`src/directives/squircle.js`](file:///d:/DevelopProject/concept-music/src/directives/squircle.js) | 指令系统 | `v-squircle` 指令：GPU 合成加速绑定、`areBindingsEqual` 浅深比对与 60FPS 抗频闪拦截 |
| [`src/utils/tooltip.js`](file:///d:/DevelopProject/concept-music/src/utils/tooltip.js) | 交互引擎 | 全局单例 Tooltip 引擎、微任务节流指针缓存、全向视口边界探测防出界 |
| [`src/utils/mediaSessionBridge.js`](file:///d:/DevelopProject/concept-music/src/utils/mediaSessionBridge.js) | 系统桥接 | Windows 系统媒体控制 (SMTC) 与锁屏交互桥接、双阶段乐观更新与次声波保活通道 |
| [`src/composables/usePlayAllHydration.js`](file:///d:/DevelopProject/concept-music/src/composables/usePlayAllHydration.js) | 逻辑复用 | 歌单/专辑/排行榜全量分页分段补水灌入机制，支持取消、超限拦截与平滑追加 |
| [`src/utils/request.js`](file:///d:/DevelopProject/concept-music/src/utils/request.js) | 网络库 | 统一 Axios 封装，自动在 Electron 下使用 `ipcAdapter` 经由主进程发送请求与注入凭据 |
| [`src/utils/songHelper.js`](file:///d:/DevelopProject/concept-music/src/utils/songHelper.js) | 工具库 | 统一跨平台歌曲标准化器 (`normalizeSongKey`, `buildPlayPayload`)、多源异构数据清洗 |
| [`src/views/DesktopLyric.vue`](file:///d:/DevelopProject/concept-music/src/views/DesktopLyric.vue) | 视图 | 桌面歌词主视图：横排/竖排双模态切换、卡拉OK垂直/水平逐字平滑渲染、深色毛玻璃 Tooltip、热区汇报 |
| [`src/layout/PlayerBar.vue`](file:///d:/DevelopProject/concept-music/src/layout/PlayerBar.vue) | 视图组件 | 底部播放栏：进度条、WebAudio 增益、音质菜单、海量歌曲虚拟滚动抽屉、快捷搜索与批量移除 |
| [`src/components/UpdateNotificationCard.vue`](file:///d:/DevelopProject/concept-music/src/components/UpdateNotificationCard.vue) | 弹窗组件 | 全新拟物磨砂玻璃更新弹窗、下载进度与线路切换、高危故障熔断全屏阻断卡片 |
| [`src/components/SettingsModal.vue`](file:///d:/DevelopProject/concept-music/src/components/SettingsModal.vue) | 弹窗组件 | 全能偏好设置中心（常规/外观、播放音频/SMTC、桌面歌词横竖排定制、快捷键、打卡看板、关于更新） |

---

## 6. 风险、技术债与后续开发注意事项

### 6.1 潜在风险与已知隐患

1. **第三方音源的不可控性与外部协议风险**：
   - 依赖 `music_source/` 中的开源社区第三方脚本（来源参考 GitHub 仓库 [guoyue2010/lxmusic-](https://github.com/guoyue2010/lxmusic-)）解析网易和企鹅音频。一旦平台升级加密校验、反爬风控或改版，可能导致音源瞬间失效。
   - **对策建议**：保持多源备选脚本池；严格校验返回的流媒体有效性；确保 6 秒进度看门狗和故障自动自愈跳歌持续生效。
2. **跨平台（macOS / Linux）行为差异**：
   - 当前主要针对 Windows 深度优化（NSIS/Portable、SMTC 锁屏控制、托盘右键菜单行为、`safeStorage` DPAPI 凭据加密底层）。
   - **对策建议**：若后续支持 macOS 或 Linux，需适配各自系统的媒体控制器规范、托盘图标规范（如 macOS Template Image）及文件路径标准。
3. **固定本地服务端口 (10420) 冲突**：
   - 本地服务固定监听 `127.0.0.1:10420`。若用户系统中该端口被其他进程占用或被杀毒软件阻断，整个客户端将无法播放音频。
   - **对策建议**：未来可考虑支持动态检测备用端口，并将端口号通过 IPC 动态同步给前端。
4. **WebAudio 的 CORS 与音频中断保护**：
   - WebAudio `MediaElementAudioSourceNode` 强依赖 CORS。当网络极速切换或断流时，AudioContext 易进入 `suspended` 状态，恢复时若未处理好可能无声。
   - **对策建议**：在 `playerStore` 中保留无缝降级回退机制，当代理或解码持续失败时允许降级为原生 HTML5 Audio 直链播放。

### 6.2 现有技术债与后续重构机会

1. **超大型单文件代码集中度高**：
   - 当前核心业务组件与状态仓代码体量较大：
     - `src/store/playerStore.js` (3900+ 行)
     - `src/layout/PlayerBar.vue` (3100+ 行)
     - `src/views/DesktopLyric.vue` (1650+ 行)
     - `electron/main.js` (1530+ 行)
     - `src/components/SettingsModal.vue` (1690+ 行)
   - **改进建议**：后续可将 `playerStore` 进一步按领域拆分（如 `audioPipeline.js`、`queueStorage.js`、`fmStream.js`）；将 `PlayerBar.vue` 内部的虚拟滚动抽屉拆分为独立的子组件。
2. **缺乏自动化测试保障 (测试缺口)**：
   - 工程目前暂无自动化单元测试或集成测试。核心算法（如音质降级链推算、歌曲规范化哈希生成 `normalizeSongKey`、虚拟滚动切片计算、Token 刷新）依赖手工回归。
   - **改进建议**：建议引入 `vitest` 对 `utils/songHelper.js`、`utils/squircle.js`、`utils/mediaSessionBridge.js` 中的核心无副作用纯函数补充单元测试。
3. **缺少 TypeScript 类型声明 (类型缺口)**：
   - 异构平台歌曲对象（Song）、音质对象（Qualities）、用户资产（VipStatus）字段繁杂，全靠可选链 `?.` 防御，存在拼写疏漏风险。
   - **改进建议**：逐步通过 JSDoc `@type` 规范关键领域模型，或在后续阶段逐步迁移核心工具库至 TypeScript。

---

## 7. 后续开发核心准则 (Hard Constraints)

1. **纯 JavaScript 生态，绝对禁止引入原生编译依赖**：
   - 严禁引入任何需要 `node-gyp`、Python 或 VS Build Tools 的原生插件，维持各平台 `npm install` 零编译报错的轻量体验。
2. **凭据安全与金库隔离**：
   - 严禁在前端直接读取、存储明文 Cookie 或 Token；必须始终经由 `safeStorage`（DPAPI 加密）金库与主进程透明代理中转。
3. **音频代理规范 (AudioProxy)**：
   - 任何流向 WebAudio 的第三方流媒体必须正确流转至本地微服务代理 `/audio/proxy`，确保 Range 分段与 CORS 响应头完整，杜绝静音与跨域中断。
4. **第三方音源沙箱与物理隔离**：
   - 第三方脚本保持在 `music_source/Netease/` 与 `music_source/QQ/` 物理隔离，由 `lx-source-runner.js` 在 Node.js `vm.Script` 沙箱中执行；音质遵循平滑降级链。
5. **系统媒体控制 (SMTC) 桥接规范**：
   - 新增任何全局播放状态变更必须经过 `mediaSessionBridge.js` 同步 Windows SMTC，结合乐观推送与 18Hz 次声波保活通道防止被系统静音挂起。
6. **大容量歌单与电台流隔离规范**：
   - 常规播放列表引入虚拟滚动与分片防抖存储机制（支持 1000/1500/2000 档位管理），严禁破坏歌曲内存模型与哈希索引 (`normKey`)；
   - 私人 FM 采用独立电台流模式，物理隔离常规播放队列，严禁在电台流逻辑中污染或重置用户当前的常规播放列表。
7. **Apple HIG 连续曲率与物理双层解耦规范**：
   - 凡需要展示连续曲率超椭圆的卡片，必须遵循外层负责尺寸、位移动画与 Tailwind `rounded-[Xpx]` 兜底阴影，内层负责 `v-squircle` 与 `transform-gpu` 矢量剪裁；带剪裁容器内禁用 `backdrop-blur-*`。
8. **桌面歌词双模态与视口防溢出规范**：
   - 桌面歌词支持横排/竖排双模态，窗口尺寸与位置需在主进程独立记忆，窗口拖拽与定位需严格遵循屏幕多监视器边界钳制算法，防止歌词溢出不可视区域。
9. **版本发布流程**：
   - 发布新版本时务必遵循：更新 `package.json` 版本号；同步校验 `version-rules.json` 中的 `latestVersion` 与版本规则；通过 Git Tag 触发 `.github/workflows/build.yml` 自动化构建。
