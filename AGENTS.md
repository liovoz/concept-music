# 概念音乐 (Concept Music) AI 编程助手工作守则

本文件作为当前项目的长期指引与上下文契约，在任何新会话或代码改动时自动生效。

---

## 1. 核心架构认知与文档索引

- **项目架构全貌**：完整技术栈、目录职责、音频流转与数据安全规范详见 [`docs/ARCHITECTURE.md`](file:///d:/DevelopProject/concept-music/docs/ARCHITECTURE.md)。
- **核心业务改动准则**：在涉及播放内核（`playerStore.js`）、鉴权金库与网络代理（`main.js`、`request.js`）、第三方音源调度（`lx-source-runner.js`、`source_resolve.js`）或跨模块重构时，**必须优先查阅 `docs/ARCHITECTURE.md`**，保持系统设计理念一致。

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
5. **文档维护原则**：
   - 日常代码修改（如修复 Bug、新增局部页面、调整组件样式）**无需**更新 `docs/ARCHITECTURE.md`；
   - 仅在发生**重大架构演进**（如拆分巨型 Store、改动底层加密协议、新增多平台音源架构）时，顺带同步更新 `docs/ARCHITECTURE.md`。
