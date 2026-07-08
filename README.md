# 概念音乐

概念音乐是一款基于 Electron、Vue 3 和 Vite 构建的 Windows 桌面音乐播放器。项目内置本地 KuGou API 服务，支持在线播放、歌单、排行榜、搜索、私人 FM、桌面歌词、系统托盘控制、多音质播放和自动更新。

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-30+-9EFFDB)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- 在线播放：通过内置本地 API 服务获取音乐数据与播放地址。
- 多音质选择：支持标准、HQ、SQ、Hi-Res、超清蝰蛇、全景声等音质入口，并可根据可用性自动回退。
- 发现页：聚合每日推荐与精选歌单。
- 歌单广场：按分类浏览歌单，支持歌单详情、分页加载和一键播放全部。
- 排行榜：浏览榜单列表和榜单歌曲详情。
- 搜索：支持歌曲搜索、综合搜索、搜索历史和结果播放。
- 歌手与专辑：支持歌手详情、热门单曲、专辑列表、专辑详情与跨页面跳转。
- 私人 FM：支持 FM 队列、相似推荐、喜欢/不喜欢、跳过和高潮片段播放。
- 我的音乐：支持登录、我的歌单、喜欢列表、听歌足迹等账号相关能力。
- 播放器：支持播放/暂停、上一首、下一首、进度拖动、音量控制、播放队列和播放模式切换。
- 桌面歌词：独立歌词窗口，支持同步歌词、翻译歌词、拖动、锁定和主播放器控制。
- 系统托盘：支持托盘菜单控制播放、切换播放模式、显示/隐藏桌面歌词和检查更新。
- 音量增强：支持多档增益和本地音频代理回放。
- 自动更新：基于 `electron-updater` 从 GitHub Releases 检查和下载新版本。

## 环境要求

- Windows 10/11 x64
- Node.js 20 或更高版本
- npm 10 或更高版本

## 快速开始

克隆项目后，在项目根目录执行：

```bash
npm install
npm start
```

`npm install` 会安装根项目依赖，并自动安装 `server` 目录下的内置 API 服务依赖。`npm start` 会先检查 Electron 和 server 依赖是否完整，然后启动 Vite 开发服务，并在 Vite 就绪后打开 Electron 应用。Electron 主进程会自动拉起本地 API 服务，默认监听 `127.0.0.1:10420`。

## 常用命令

```bash
npm start
```

启动桌面开发环境。

```bash
npm run check:setup
```

检查 Electron 二进制和内置 API 服务依赖是否完整。

```bash
npm run build
```

构建前端资源。

```bash
npm run pack
```

打包 Windows 安装版和便携版。

```bash
npm run release
```

发布到 GitHub Releases。发布前需要配置 GitHub Token，并确认 `package.json` 中的 `build.publish.owner` 与 `build.publish.repo` 指向正确仓库。

## 仓库上传注意

请只提交源码、配置、锁文件和必要静态资源。以下内容属于本地依赖、缓存、临时文件或构建产物，不应上传到 GitHub：

- `node_modules/`
- `server/node_modules/`
- `.pnpm-store/`
- `dist/`
- `release/`
- `Temp/`
- `.gstack/`
- `.agents/`
- `design/`
- `.env` 和 `.env.*`

`server/.env.example` 可以提交；真实密钥、Cookie、Token、证书和私钥必须只放在本地环境变量或 `.env` 中。

## Electron 安装失败处理

项目已在 `.npmrc` 中配置 Electron 和 electron-builder 的国内镜像。若仍遇到类似下面的错误：

```text
Electron failed to install correctly, please delete node_modules/electron and try installing again
```

请在项目根目录执行：

```bash
npm run check:setup -- --repair
```

如果修复失败，请删除 `node_modules` 后重新安装：

```bash
npm install
```

## 项目结构

```text
.
├─ .github/workflows/       # GitHub Actions 构建与发布流程
├─ electron/                # Electron 主进程、预加载脚本、托盘管理
├─ public/                  # 应用图标等静态资源
├─ scripts/                 # 安装检查与本地开发启动脚本
├─ server/                  # 内置 KuGou API 服务
├─ src/                     # Vue 3 前端应用
│  ├─ components/           # 通用组件
│  ├─ composables/          # 组合式逻辑
│  ├─ layout/               # 顶栏、侧边栏、播放器
│  ├─ router/               # 页面路由
│  ├─ store/                # Pinia 状态管理
│  ├─ utils/                # 请求、歌曲标准化、菜单等工具
│  └─ views/                # 业务页面
├─ index.html
├─ package.json
├─ package-lock.json
└─ vite.config.js
```

## 免责声明

本项目仅用于学习、研究和个人技术交流。请尊重音乐版权和相关平台规则，不要将本项目用于商业用途或任何违法违规场景。使用过程中产生的账号、版权、网络或第三方接口风险由使用者自行承担。

## 致谢

内置 API 服务基于 KuGouMusicApi 项目能力进行集成与适配：

https://github.com/MakcRe/KuGouMusicApi

## 许可证

[MIT](LICENSE)
