# 概念音乐 (Concept Music) 项目全景架构与技术梳理报告

> **文档版本**：v3.7.0  
> **运行环境规范**：Node.js 22 LTS / npm 10+ / Windows 10/11 x64  
> **最后更新**：2026-11-02  

---

## 1. 技术栈与关键依赖清单

本项目采用 **Electron 桌面外壳 + Vue 3 渲染端 + 内置 Node.js 本地微服务** 的多进程混合架构，全量采用纯 JavaScript（零 C++ 原生构建依赖，免除 node-gyp 与 VS Build Tools 负担）。

### 1.1 核心技术栈概览

| 维度 | 技术选型 | 版本 | 核心作用与定位 |
| :--- | :--- | :--- | :--- |
| **桌面容器** | Electron | `^30.0.0` | 跨平台桌面应用外壳，接管窗口生命周期、托盘系统、全局热键、底层硬件凭据加密与网络代理 |
| **前端框架** | Vue 3 | `^3.4.21` | 渲染进程核心 UI 框架，采用 Composition API 与 `<script setup>` |
| **前端构建** | Vite | `^5.2.0` | 现代化前端构建与 HMR 热重载工具，提供 DevServer 与相对路径资产打包 |
| **状态管理** | Pinia | `^2.1.7` | 全局状态仓（播放内核 `playerStore`、用户资产 `userStore`、更新感知 `updateStore`） |
| **路由管理** | Vue Router | `^4.6.4` | 单页路由管理（采用 `createWebHashHistory`，兼容本地文件协议与桌面歌词子路由） |
| **样式与原子化** | Tailwind CSS | `^3.4.19` | 页面样式系统，配合 PostCSS 与 Autoprefixer 实现高响应式与深浅主题自适应 |
| **网络请求** | Axios | `^1.6.8` (前端) / `^1.20.0` (后端) | 封装统一 HTTP 请求，前端集成 IPC 原生适配器 |
| **本地 API 服务** | Express | `^4.18.2` | 嵌入式本地服务，监听 `127.0.0.1:10420`，提供多平台 API 聚合、音频代理及第三方音源调度 |
| **桌面打包** | electron-builder | `^24.13.3` | 生成 NSIS 安装程序、Portable 绿色便携版及 GitHub Release 自动发布 |
| **自动更新** | electron-updater | `^6.1.8` | 增量/全量更新检测、多线路下载、断点控制与静默安装 |

### 1.2 关键工具与底层支持库

- **加密与签名**：`crypto-js` (^4.2.0)、`node-forge` (^1.3.3)、`big-integer` (^1.6.52)（酷狗客户端协议签名、解密与请求加密校验）
- **流媒体与解压**：`pako` (^2.1.0)（Gzip/Deflate 二进制解压）
- **安全与编码**：`safe-decode-uri-component` (^1.2.1)
- **二维码生成**：`qrcode` (^1.5.3)（登录二维码渲染）

---

## 2. 目录结构与职责划分

```text
concept-music/
├─ .github/
│  └─ workflows/
│     ├─ build.yml                     # 自动化打包与发布到 GitHub Releases (CI/CD)
│     └─ install-check.yml             # 跨平台 (Ubuntu/macOS/Windows) 依赖安装与 setup 校验
├─ electron/                           # [主进程模块]
│  ├─ assets/tray-icons/               # 原生系统托盘多分辨率图标资产 (.png)
│  ├─ main.js                          # Electron 主入口、单实例锁、窗口管理、SafeStorage 金库、IPC 代理
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
│  │  ├─ common/TimePicker.vue         # 时间选择器
│  │  ├─ BackToTop.vue                 # 快速回到顶部悬浮按钮
│  │  ├─ DisclaimerModal.vue           # 首次启动免责声明弹窗
│  │  ├─ GlobalDialog.vue              # 通用确认/提示模态对话框
│  │  ├─ GlobalToast.vue               # 全局轻提示 Toast
│  │  ├─ LoginModal.vue                # 扫码与手机号验证码登录弹窗
│  │  ├─ SettingsModal.vue             # 独立偏好设置中心 (外观/播放/歌词/快捷键/打卡/更新)
│  │  ├─ SingerLink.vue                # 歌手多作者可点击跳转路由链接
│  │  ├─ SongContextMenu.vue           # 歌曲列表通用右键功能菜单 (播放/下首/添加/复制/原平台)
│  │  ├─ UpdateNotificationCard.vue    # 主界面右下角非侵入式版本感知与更新浮动通知卡片
│  │  └─ VinylTurntable.vue            # 全屏歌词沉浸式黑胶唱片高拟真旋转组件
│  ├─ composables/                     # 组合式业务逻辑 (useTheme, useSearchHistory, usePlayAllHydration)
│  ├─ constants/                       # 全局常量与矢量图标集合 (icons.js)
│  ├─ layout/                          # 应用三栏主视窗骨架
│  │  ├─ Header.vue                    # 顶部导航、Windows 原生无边框控制按钮、搜索框与用户徽标
│  │  ├─ Sidebar.vue                   # 侧边栏导航 (发现/广场/榜单/歌手/FM/收藏/导入)
│  │  └─ PlayerBar.vue                 # 底部常驻播控条、WebAudio 增益菜单、音质切换、长队列抽屉
│  ├─ router/index.js                  # Vue Router 路由配置 (Hash 模式，含 DesktopLyric 独立视图)
│  ├─ store/                           # Pinia 状态管理核心
│  │  ├─ playerStore.js                # 播放核心引擎、WebAudio 节点图谱、双实例预加载、断点记忆
│  │  ├─ userStore.js                  # 账户资产、Cookie 鉴权、自建歌单增删、VIP 自动打卡助手
│  │  └─ updateStore.js                # 版本检测感知、多节点分流 (GitHub/ghfast/ghproxy)、强制熔断
│  ├─ utils/                           # 前端工具库 (IPC桥接请求封装、数据规整、Tooltip、各平台Helper)
│  ├─ views/                           # 路由视图页面 (17 个业务视图)
│  ├─ App.vue                          # 顶层根组件 (主视窗与独立桌面歌词视窗分流调度)
│  ├─ main.js                          # 前端入口文件
│  └─ style.css                        # 全局样式与自定义滚动条定义
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
   - 由 `package.json` 的 `"main": "electron/main.js"` 声明。负责单实例锁校验、拉起本地 Node 嵌入式子进程、注册自定义协议、维护主窗口与桌面歌词独立窗口、监听全局 IPC 通道。
2. **前端渲染进程入口**：[`index.html`](file:///d:/DevelopProject/concept-music/index.html) -> [`src/main.js`](file:///d:/DevelopProject/concept-music/src/main.js) -> [`src/App.vue`](file:///d:/DevelopProject/concept-music/src/App.vue)
   - 初始化 Pinia、Vue Router、主题模式 (`initTheme`)、全局指令与组件，并根据路由哈希 (`#/desktop-lyric` vs 普通页面) 决定展示主窗口还是透明歌词窗口。
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
    subgraph Electron_Main_Process [Electron 主进程 (Node.js)]
        Main["main.js<br/>窗口与生命周期管理"]
        Vault["SafeStorage 金库<br/>kugou_auth_vault.json"]
        Tray["trayManager.js<br/>托盘菜单与系统全局快捷键"]
        NativeReq["IPC Handler<br/>'native-api-request'"]
        AutoUpdate["initAutoUpdater<br/>多线路在线版本控制"]
    end

    subgraph Renderer_Process [渲染进程 (Vue 3 / Chromium)]
        AppRoot["App.vue"]
        subgraph MainWindow [主窗口视图]
            Header["Header.vue"]
            Sidebar["Sidebar.vue"]
            Views["Views (Discover, Playlist, Import...)"]
            PlayerBar["PlayerBar.vue"]
        end
        subgraph LyricWindow [独立桌面歌词窗口]
            DesktopLyric["views/DesktopLyric.vue"]
        end
        subgraph Pinia_Stores [Pinia 状态仓]
            PlayerStore["playerStore.js<br/>WebAudio & 播控内核"]
            UserStore["userStore.js<br/>鉴权 & VIP 打卡"]
            UpdateStore["updateStore.js<br/>版本感知"]
        end
        ReqAdapter["utils/request.js<br/>(IPC Adapter / Axios)"]
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
        GHRelease["GitHub / 国内加速镜像 (更新源)"]
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
    PlayerStore -- "lyricAPI.sync" --> Main -- "update-lyric" --> DesktopLyric
    DesktopLyric -- "lyricAPI.sendControl" --> Main -- "main-lyric-control" --> PlayerStore
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

#### ③ 跨平台歌单导入与第三方音源沙箱
- **物理隔离**：第三方脚本按平台分别放置在 `music_source/Netease/` 与 `music_source/QQ/`。
- **沙箱隔离运行**：本地服务使用 [`server/util/lx-source-runner.js`](file:///d:/DevelopProject/concept-music/server/util/lx-source-runner.js) 基于 Node.js `vm.Script` 创建沙箱，彻底屏蔽宿主系统的 `process`、`require`、`module` 等敏感对象，仅注入定制的 `lx.request`，同时建立了带有文件 `mtimeMs` 校验的脚本内存编译缓存池。
- **多音质降级链**：统一按 `atmos` -> `master` -> `hires` -> `flac` -> `320k` -> `128k` 进行自适应探测与顺次降级。

#### ④ 桌面逐字悬浮歌词系统
- **独立无感窗口**：主进程以 `transparent: true, frame: false, alwaysOnTop: true, showInactive: true, focusable: false` 创建歌词子窗口，加载 `/#/desktop-lyric`。
- **热区与穿透**：歌词窗口 [`src/views/DesktopLyric.vue`](file:///d:/DevelopProject/concept-music/src/views/DesktopLyric.vue) 渲染逐字卡拉OK过渡动效并向主进程同步有效交互热区；主进程以定时器轮询当前鼠标指针绝对坐标，鼠标在热区内时响应交互与拖拽，移出后立即开启全局鼠标穿透 (`setIgnoreMouseEvents(true, { forward: true })`)。

#### ⑤ 自动化 VIP 特权打卡助手
- 在 [`src/store/userStore.js`](file:///d:/DevelopProject/concept-music/src/store/userStore.js) 中集成：
  1. 登录后自动触发领取「1天畅听VIP」；
  2. 每隔 60 分钟自动调度打卡领取「3小时特权」（每日最多 8 次，累计 24 小时）；
  3. 内置 15~45 秒随机抖动延时与风控离散算法，并在设置中心提供执行倒计时与状态看板。

---

## 5. 关键文件清单与开发索引

| 文件路径 | 模块类型 | 核心用途与重要考量 |
| :--- | :--- | :--- |
| [`package.json`](file:///d:/DevelopProject/concept-music/package.json) | 根配置 | 依赖版本定义、启动脚本、electron-builder 跨平台安装包与静态资源外置打包配置 |
| [`vite.config.js`](file:///d:/DevelopProject/concept-music/vite.config.js) | 构建配置 | `base: './'` 相对路径控制（杜绝 Electron 白屏）、端口与代理设置 |
| [`version-rules.json`](file:///d:/DevelopProject/concept-music/version-rules.json) | 版本策略 | 云端在线版本规则清单、最低兼容版本阻断、高危版本黑名单熔断配置 |
| [`electron/main.js`](file:///d:/DevelopProject/concept-music/electron/main.js) | 主进程 | 单实例锁、主窗口与歌词窗口管理、SafeStorage 凭据加解密、本地服务拉起与子进程生命周期 |
| [`electron/preload.js`](file:///d:/DevelopProject/concept-music/electron/preload.js) | 桥接层 | `windowControls`、`lyricAPI`、`apiBridge`、`trayAPI`、`settingsAPI` 安全暴露 |
| [`electron/trayManager.js`](file:///d:/DevelopProject/concept-music/electron/trayManager.js) | 托盘与快捷键 | 系统托盘右键菜单状态联动、全局热键绑定与设置持久化 |
| [`server/server.js`](file:///d:/DevelopProject/concept-music/server/server.js) | 本地微服务 | Express 服务配置、CORS 控制、防 SSRF 音频代理中间件 (`/audio/proxy`)、API 自动注册 |
| [`server/util/lx-source-runner.js`](file:///d:/DevelopProject/concept-music/server/util/lx-source-runner.js) | 音源引擎 | Node.js VM 沙箱上下文构建、音源脚本编译缓存池与请求封装 |
| [`server/module/source_resolve.js`](file:///d:/DevelopProject/concept-music/server/module/source_resolve.js) | 音源调度 | 负责根据歌曲特征调用 Netease/QQ 脚本并执行多音质链路探测 |
| [`src/store/playerStore.js`](file:///d:/DevelopProject/concept-music/src/store/playerStore.js) | 状态仓 | 播放器内核：WebAudio 增益、多音质降级、长播放队列懒加载、双实例交叉加载、断点记忆 |
| [`src/store/userStore.js`](file:///d:/DevelopProject/concept-music/src/store/userStore.js) | 状态仓 | 用户资产、登录与 Token 定期刷新、自建歌单增删、VIP 自动打卡调度与冷却监控 |
| [`src/store/updateStore.js`](file:///d:/DevelopProject/concept-music/src/store/updateStore.js) | 状态仓 | 版本在线感知、更新线路选择（官方/国内高速节点）、弹窗免打扰策略与熔断响应 |
| [`src/utils/request.js`](file:///d:/DevelopProject/concept-music/src/utils/request.js) | 网络库 | 统一 Axios 封装，自动在 Electron 下使用 `ipcAdapter` 经由主进程发送请求与注入凭据 |
| [`src/utils/songHelper.js`](file:///d:/DevelopProject/concept-music/src/utils/songHelper.js) | 工具库 | 深度清洗并统一酷狗历史接口、网易、企鹅等多源异构歌曲对象 |
| [`src/views/DesktopLyric.vue`](file:///d:/DevelopProject/concept-music/src/views/DesktopLyric.vue) | 视图 | 桌面歌词主视图：卡拉OK逐字平滑渲染、无极自定义调色盘、热区汇报与播控 |
| [`src/layout/PlayerBar.vue`](file:///d:/DevelopProject/concept-music/src/layout/PlayerBar.vue) | 视图组件 | 底部播放栏：进度条、音量/增益菜单、音质菜单、黑胶转盘动画、千首大歌单滚动虚拟列表 |
| [`src/components/SettingsModal.vue`](file:///d:/DevelopProject/concept-music/src/components/SettingsModal.vue) | 弹窗组件 | 全能偏好设置中心（常规/外观、播放音频、桌面歌词、快捷键、打卡看板、关于更新） |

---

## 6. 风险、技术债与后续开发注意事项

### 6.1 潜在风险与已知隐患

1. **第三方音源的不可控性与外部协议风险**：
   - 依赖 `music_source/` 中的开源社区逆向脚本解析网易和企鹅音频。一旦平台升级加密校验、反爬风控或改版，可能导致音源瞬间失效。
   - **对策建议**：保持多源备选脚本池；严格校验返回的流媒体有效性；确保故障自愈跳歌和熔断机制持续生效。
2. **跨平台（macOS / Linux）行为差异**：
   - 当前主要为 Windows 优化，包括 NSIS/Portable 打包、托盘右键菜单行为、`safeStorage` 凭据加密底层。
   - **对策建议**：若后续支持 macOS 或 Linux，需适配各自托盘图标规范（如 macOS Template Image）、快捷键习惯及文件路径标准。
3. **固定本地服务端口 (10420) 冲突**：
   - 本地服务固定监听 `127.0.0.1:10420`。若用户系统中该端口被其他进程占用或被杀毒软件阻断，整个客户端将无法播放音频。
   - **对策建议**：未来可考虑支持动态检测备用端口，并将端口号通过 IPC 动态同步给前端。
4. **WebAudio 的 CORS 与音频中断保护**：
   - WebAudio `MediaElementAudioSourceNode` 强依赖 CORS。当网络极速切换或断流时，AudioContext 易进入 `suspended` 状态，恢复时若未处理好可能无声。
   - **对策建议**：在 `playerStore` 中保留无缝降级回退机制，当代理或解码持续失败时允许降级为原生 HTML5 Audio 直链播放。

### 6.2 现有技术债与重构机会

1. **巨型单文件代码集中度高**：
   - `src/store/playerStore.js` (2580+ 行)、`src/store/userStore.js` (1416+ 行)、`electron/main.js` (1421+ 行) 体量极大，杂糅了大量细分逻辑。
   - **改进建议**：后续可将 `playerStore` 拆分为 `audioEngine.js`（WebAudio）、`playQueue.js`（队列管理）、`qualityResolver.js`（音质解析）；将 `main.js` 拆分为 `windowManager.js`、`ipcHandlers.js`、`vault.js` 等模块。
2. **缺乏自动化测试保障 (测试缺口)**：
   - 工程目前没有任何单元测试或集成测试。核心算法（如音质降级链推算、歌曲清洗正则、时间解析、Token 刷新）完全依赖手工回归。
   - **改进建议**：建议引入 `vitest` 对 `utils/songHelper.js`、`store/playerStore.js` 中的核心计算逻辑补充单元测试。
3. **缺少 TypeScript 类型声明 (类型缺口)**：
   - 异构平台歌曲对象（Song）、音质对象（Qualities）、用户资产（VipStatus）字段繁杂，全靠可选链 `?.` 防御，容易引入拼写失误。
   - **改进建议**：可以逐步通过 JSDoc `@type` 规范关键领域模型，或在后续阶段逐步迁移核心工具库至 TypeScript。

---

## 7. 后续开发核心准则

1. **新增依赖原则**：绝对避免引入需要原生 C/C++ 编译的底层依赖，始终保持纯 JavaScript 生态，维持各平台 `npm install` 零编译报错的轻量体验。
2. **敏感凭据隔离**：严禁在前端直接读取、存储明文 Cookie 或 Token；必须始终经由 `safeStorage` 金库与主进程代理中转。
3. **音频代理规范**：任何新增的第三方流媒体解析必须正确流转至 `/audio/proxy`，确保 WebAudio 音量增益、波形分析及跨域头兼容。
4. **发布流程**：发布新版本时务必遵循：
   - 更新 `package.json` 版本号；
   - 同步校验 `version-rules.json` 中的 `latestVersion` 与版本规则；
   - 通过 Git Tag 触发 `.github/workflows/build.yml` 自动化构建。
