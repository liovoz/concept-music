# 概念音乐 (Concept Music)

一款基于 Electron + Vue 3 + Tailwind CSS 构建的桌面端音乐播放器，支持免费领取 VIP 畅听高品质音乐。

![平台](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-30+-9EFFDB)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 功能特性

- 🎵 **在线音乐播放** — 支持酷狗音乐源，高品质音频流媒体播放
- 🎧 **多音质支持** — 标准 / 高品质 / 无损 / 超清蝰蛇 / 全景声（VIP 可选）
- 👑 **免费领取 VIP** — 每日可领取 1 天畅听 VIP + 8 次小时 VIP，自动升级最高音质
- 📋 **歌单广场** — 分类浏览海量精选歌单，热门/最新排序
- 📻 **私人FM** — 智能推荐电台，发现新音乐
- 🎤 **歌手库** — 浏览热门歌手及专辑
- 📊 **排行榜** — 实时音乐榜单追踪
- 🔍 **全局搜索** — 歌曲/歌手/专辑/歌单一站式搜索
- 💾 **我的音乐** — 收藏管理、听歌足迹、私人歌单
- 📝 **桌面歌词** — 实时同步显示桌面歌词，支持翻译歌词
- 🔄 **自动更新** — 内置更新检测机制，新版本及时推送

## 📸 界面预览

> <img width="1488" height="1029" alt="概念音乐主界面" src="https://github.com/user-attachments/assets/ba8addd1-4c1c-4ff9-8aa7-bbfe21a8a389" />

## 🚀 快速开始

### 系统要求
- Windows 10/11 (x64)

### 安装方式

**方式一：安装包（推荐）**
1. 前往 [Releases](https://github.com/liovoz/concept-music/releases) 页面
2. 下载最新的 `概念音乐 Setup x.x.x.exe`
3. 运行安装程序，按提示完成安装

**方式二：便携版**
1. 前往 [Releases](https://github.com/liovoz/concept-music/releases) 页面
2. 下载最新的 `概念音乐-x.x.x-Portable.exe`
3. 直接运行即可使用，无需安装

### VIP 领取说明

登录后即可在侧边栏免费领取 VIP：
- **每日 1 天 VIP**：每天可领取一次，领取后自动升级当前播放音质
- **小时 VIP**：每 60 分钟可领取一次，每日最多 8 次
- 领取 VIP 后，播放中的歌曲会自动切换到最高可用音质

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Electron](https://www.electronjs.org/) | 桌面应用框架 |
| [Vue 3](https://vuejs.org/) | 前端框架 |
| [Vite](https://vitejs.dev/) | 构建工具 |
| [Tailwind CSS](https://tailwindcss.com/) | 样式框架 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vue Router](https://router.vuejs.org/) | 路由管理 |
| [Axios](https://axios-http.com/) | HTTP 请求 |
| [electron-updater](https://github.com/electron/electron-updater) | 自动更新 |

## 📝 开发说明

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建前端
npm run build

# 打包发布（生成安装包 + 便携版）
npm run pack
```

## 🙇 致谢

感谢大佬的开源 API 项目：
https://github.com/MakcRe/KuGouMusicApi

## 📄 License

[MIT](LICENSE)
