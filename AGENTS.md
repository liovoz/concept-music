# 概念音乐 (Concept Music) AI 编程助手工作守则

本文件作为当前项目的长期指引与上下文契约，在任何新会话或代码改动时自动生效。

---

## 1. 核心架构认知与文档索引

- **项目架构全貌**：完整技术栈、目录职责、音频流转与数据安全规范详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。
- **核心业务改动准则**：在涉及播放内核（`playerStore.js`）、鉴权金库与网络代理（`main.js`、`request.js`）、系统媒体会话（`mediaSessionBridge.js`）、第三方音源调度（`lx-source-runner.js`、`source_resolve.js`）或跨模块重构时，**必须优先查阅 `docs/ARCHITECTURE.md`**，保持系统设计理念一致。

---

## 2. 关键架构铁律 (Hard Constraints)

1. **纯 JavaScript 生态，绝对禁止引入原生编译依赖**：
   - 本项目零 C/C++ 编译负担。严禁引入需要 `node-gyp`、Python 或 VS Build Tools 的原生插件，确保 `npm install` 零门槛。
2. **凭据安全与金库隔离**：
   - 严禁在渲染端或 localStorage 中存储任何明文账号 Token 或敏感 Cookie；
   - 敏感凭据统一由主进程 `safeStorage`（DPAPI 加密）持久化管理，渲染层通过 `window.apiBridge.request` 经主进程透明代理。
3. **音频代理规范 (AudioProxy)**：
   - 所有流向 WebAudio（音量增益、压限）的音频流必须走本地微服务代理 `http://127.0.0.1:10420/audio/proxy?url=...`，确保 CORS 响应头和 Range 分段支持，杜绝静音与跨域中断。
4. **第三方音源沙箱与降级链**：
   - 第三方脚本保持在 `music_source/Netease/` 与 `music_source/QQ/` 物理隔离，由 `lx-source-runner.js` 在 Node.js `vm.Script` 沙箱中执行；
   - 音质遵循 `atmos` -> `master` -> `hires` -> `flac` -> `320k` -> `128k` 平滑降级。
5. **系统媒体控制 (SMTC) 桥接规范**：
   - 系统级媒体控制必须统一经由 `src/utils/mediaSessionBridge.js` 处理，结合状态乐观更新、双阶段元数据穿透推送与次声波保活机制，防止 WebAudio 模式被 Chromium 静音挂起。
6. **大容量歌单与电台流隔离规范**：
   - 常规播放列表引入了虚拟滚动与分片防抖存储机制（支持 1000/1500/2000 档位管理），严禁破坏歌曲内存模型与哈希索引 (`normKey`)；
   - 私人 FM 采用独立电台流模式，物理隔离常规播放队列，严禁在电台流逻辑中污染或重置用户当前的常规播放列表。
7. **桌面歌词双模态与视口防溢出**：
   - 桌面歌词支持横排/竖排双模态，窗口尺寸与位置需在主进程独立记忆，窗口拖拽与定位需严格遵循屏幕多监视器边界钳制算法，防止歌词溢出不可视区域。
8. **文档维护原则**：
   - 日常代码微调（如样式微调、局部文案修正）**无需**更新 `docs/ARCHITECTURE.md`；
   - 在发生**核心架构演进**（如状态仓重构、新增系统级桥接、变动底层安全金库或多平台音源架构）时，顺带同步更新 `docs/ARCHITECTURE.md`。
