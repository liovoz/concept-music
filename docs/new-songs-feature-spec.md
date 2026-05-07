# 🎵 新歌速递功能 — 详细开发文档

> **项目**: 概念音乐 Desktop (concept-music)
> **版本**: v1.2.0 规划
> **日期**: 2026-05-07
> **作者**: AI 开发助手

---

## 一、功能概述

### 1.1 功能定位

"新歌速递"是一个面向音乐爱好者的新歌发现页面，聚合酷狗平台最新发布的歌曲，按语种/地区分类展示，帮助用户第一时间发现和收听新上架的音乐作品。

### 1.2 核心价值

| 维度 | 说明 |
|------|------|
| **内容时效性** | 聚合酷狗最新发布歌曲，数据每日更新，确保用户"先听为快" |
| **分类浏览** | 支持全部/华语/欧美/韩国/日本五大分类，精准匹配用户口味 |
| **即听即播** | 单击播放、双击播放、播放全部，零摩擦从发现到收听 |
| **视觉体验** | 延续概念音乐极简白色系设计，融入渐变色彩与微动效 |

### 1.3 与现有功能的关系

```
首页（每日推荐 + 精选歌单）
  ├── 排行榜 ← 已有，偏"热度排行"
  ├── 私人FM ← 已有，偏"个性化推荐"
  └── 新歌速递 ← 🆕 偏"时效性发现"，填补"新歌发现"空白
```

**新歌速递**与排行榜、私人FM形成互补三角：
- **排行榜** = 热度驱动（什么歌最火）
- **私人FM** = 算法驱动（什么歌适合你）
- **新歌速递** = 时效驱动（什么歌刚发布）

---

## 二、技术基础

### 2.1 后端 API 现状

后端接口 `/top/song` **已完整实现**，无需任何后端改动。

**文件**: `server/module/top_song.js`

```javascript
module.exports = (params, useAxios) => {
  const dataMap = {
    rank_id: params?.type || 21608,   // 分类 ID
    userid: params?.userid || params?.cookie?.userid || 0,
    page: params?.page || 1,           // 分页页码
    pagesize: params?.pagesize || 30,  // 每页条数
    tags: [],
  };
  return useAxios({
    url: '/musicadservice/container/v1/newsong_publish',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
```

**请求参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | Number | 21608 | 分类 rank_id，控制语种/地区筛选 |
| `page` | Number | 1 | 分页页码 |
| `pagesize` | Number | 30 | 每页返回条数 |

**分类 rank_id 映射**（需开发时通过 API 实测确认）:

| 分类 | rank_id（预期） | 说明 |
|------|-----------------|------|
| 全部 | 21608 | 默认值，聚合所有语种新歌 |
| 华语 | 待确认 | 内地 + 港台新歌 |
| 欧美 | 待确认 | 欧美新歌 |
| 韩国 | 待确认 | 韩语新歌 |
| 日本 | 待确认 | 日语新歌 |

> ⚠️ **重要**: rank_id 的具体值需要在开发阶段通过调用 `/top/song?type=XXX` 逐一测试确认。可参考酷狗官网新歌首发页面的分类 Tab 对应的请求参数。

### 2.2 前端现状

- **无任何前端页面或组件**调用 `/top/song` 接口
- **侧边栏**无"新歌速递"入口
- **路由表**无对应路由

### 2.3 可复用的基础设施

| 模块 | 文件 | 复用方式 |
|------|------|----------|
| HTTP 请求 | `src/utils/request.js` | 直接使用 `request.get('/top/song', { params })` |
| 歌曲标准化 | `src/utils/songHelper.js` | `normalizeSongs()` + `buildPlayPayload()` |
| 歌手链接 | `src/components/SingerLink.vue` | 歌手名可点击跳转详情 |
| 回到顶部 | `src/components/BackToTop.vue` | 长列表滚动回顶 |
| 播放器 Store | `src/store/playerStore.js` | `playSong()` / `clearPlaylist()` / `playlist` |
| 用户 Store | `src/store/userStore.js` | 登录状态、喜欢列表 |

---

## 三、功能设计

### 3.1 页面结构

```
┌──────────────────────────────────────────────────────┐
│  新歌速递  New Releases                              │
│  发现最新上架的好音乐                                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ 全部 │ 华语 │ 欧美 │ 韩国 │ 日本             │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ # │ 封面 │ 歌曲标题     │ 歌手   │ 专辑 │时长│    │
│  │ 1 │ 🖼️  │ 歌曲A        │ 歌手X  │ 专辑 │3:45│    │
│  │ 2 │ 🖼️  │ 歌曲B  [VIP] │ 歌手Y  │ 专辑 │4:12│    │
│  │ 3 │ 🖼️  │ 歌曲C        │ 歌手Z  │ 专辑 │2:58│    │
│  │ ...                                          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │          正在加载更多... / 已经到底了           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⬆ 回到顶部]                                        │
└──────────────────────────────────────────────────────┘
```

### 3.2 交互流程

```
用户点击侧边栏"新歌速递"
    │
    ▼
路由跳转至 /new-songs
    │
    ▼
默认加载"全部"分类第1页（30条）
    │
    ├── 加载中 → 显示骨架屏
    ├── 加载成功 → 渲染歌曲列表
    └── 加载失败 → 显示错误提示 + 重试按钮
    │
    ▼
用户操作：
    ├── 切换分类 Tab → 重新加载对应分类
    ├── 双击歌曲 → 立即播放该歌曲
    ├── 单击播放图标 → 立即播放该歌曲
    ├── 点击"播放全部" → 清空播放列表，将当前列表全部加入并播放第一首
    ├── 点击歌手名 → 跳转歌手详情页
    ├── 点击专辑名 → 跳转专辑详情页
    ├── 滚动到底部 → 自动加载下一页
    └── 切换分类 → 重置页码，重新加载
```

### 3.3 状态管理

本功能**不需要新建 Store**，所有状态在组件内部管理即可（与 History.vue、RankList.vue 保持一致）。

**组件内状态**:

| 状态 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `activeCategory` | String | `'all'` | 当前选中的分类 |
| `songs` | Array | `[]` | 当前分类下的歌曲列表 |
| `isLoading` | Boolean | `false` | 首次加载中 |
| `isLoadingMore` | Boolean | `false` | 加载更多中 |
| `isError` | Boolean | `false` | 加载失败 |
| `page` | Number | `1` | 当前页码 |
| `hasMore` | Boolean | `true` | 是否还有更多数据 |

---

## 四、UI 设计规范

### 4.1 整体风格

延续概念音乐现有设计语言：

| 属性 | 规范 |
|------|------|
| 背景渐变 | `from-emerald-50/60 to-white`（绿色系，区别于首页蓝色、FM紫色、排行榜灰色） |
| 页面标题 | `text-3xl font-extrabold text-gray-900 tracking-tight` |
| 英文副标题 | `text-lg text-emerald-500 font-bold ml-2` |
| 描述文字 | `text-xs text-gray-500 mt-2 font-medium` |

### 4.2 分类 Tab 栏

参考私人 FM 的模式切换按钮样式，使用 pill-shaped 分段控件：

```
┌──────────────────────────────────────────┐
│  全部  │  华语  │  欧美  │  韩国  │  日本  │
└──────────────────────────────────────────┘
```

- 容器: `bg-gray-50 p-1 rounded-lg border border-gray-100`
- 未选中: `text-gray-500 hover:text-gray-700`
- 选中: `bg-white text-emerald-600 shadow-sm`
- 字号: `text-xs font-bold`
- 内边距: `px-4 py-1.5`

### 4.3 歌曲列表

与 History.vue、PersonalFM.vue 的"接下来播放"列表保持一致的表格式布局：

**表头**:
```
# │ 音乐标题 │ 歌手 │ 专辑 │ 时长
```

**每行结构**:
```
[序号/播放图标] [封面 40x40] [歌曲名 + VIP/付费标签] [歌手链接] [专辑名] [时长]
```

**交互效果**:
- 行 hover: `hover:bg-emerald-50/60`
- 序号 → 播放图标: `group-hover:hidden / hidden group-hover:flex`
- 歌曲名 hover: `group-hover:text-emerald-600`
- VIP 标签: `bg-blue-50 text-blue-500 border border-blue-200`
- 付费标签: `bg-orange-50 text-orange-500 border border-orange-200`

### 4.4 加载状态

| 状态 | 展示 |
|------|------|
| 首次加载 | 10 行骨架屏（与 History.vue 一致） |
| 加载更多 | 底部旋转加载图标 + "正在获取更多新歌..." |
| 加载失败 | 红色错误卡片 + 重试按钮 |
| 空数据 | 灰色图标 + "暂无新歌数据" |
| 到底 | "已经到底了 · 没有更多新歌了" |

### 4.5 播放全部按钮

位于页面标题右侧，与 Discover.vue 的"播放全部"按钮样式一致：

```
[▶ 播放全部]
```

- 样式: `px-5 py-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 border border-gray-100 rounded-full text-xs font-bold`
- 仅在歌曲列表非空时显示

---

## 五、详细实现方案

### 5.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/views/NewSongs.vue` | 新歌速递页面组件 |

### 5.2 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/router/index.js` | 添加 `/new-songs` 路由 |
| `src/layout/Sidebar.vue` | 在"在线音乐"区域添加"新歌速递"导航项 |

### 5.3 路由配置

```javascript
// src/router/index.js
import NewSongs from '../views/NewSongs.vue';

const routes = [
  // ... 现有路由
  { path: '/new-songs', name: 'NewSongs', component: NewSongs },
];
```

### 5.4 侧边栏导航

在"在线音乐"分组中，在"排行榜"和"私人FM"之间插入"新歌速递"：

```
在线音乐
  ├── 首页        → /
  ├── 排行榜      → /rank
  ├── 新歌速递    → /new-songs    ← 🆕
  └── 私人FM      → /fm
```

导航项样式：
- 选中态: `font-medium bg-emerald-100 text-emerald-600`（绿色系，与页面主题色一致）
- 图标: 使用闪电/火箭/音符 SVG，表示"最新/快速"
- 推荐图标 SVG（闪电）:
  ```html
  <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
      d="M13 10V3L4 14h7v7l9-11h-7z"/>
  </svg>
  ```

### 5.5 NewSongs.vue 组件核心逻辑

#### 5.5.1 分类定义

```javascript
const CATEGORIES = [
  { key: 'all', label: '全部', rankId: 21608 },
  { key: 'cn', label: '华语', rankId: null },   // 待 API 实测确认
  { key: 'eu', label: '欧美', rankId: null },   // 待 API 实测确认
  { key: 'kr', label: '韩国', rankId: null },   // 待 API 实测确认
  { key: 'jp', label: '日本', rankId: null },   // 待 API 实测确认
];
```

#### 5.5.2 数据获取

```javascript
const fetchSongs = async (isLoadMore = false) => {
  if (!isLoadMore) {
    songs.value = [];
    page.value = 1;
    hasMore.value = true;
    isLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }
  isError.value = false;

  try {
    const currentCategory = CATEGORIES.find(c => c.key === activeCategory.value);
    const res = await request.get('/top/song', {
      params: {
        type: currentCategory.rankId,
        page: page.value,
        pagesize: 30,
        timestamp: Date.now(),
      }
    });

    const rawSongs = extractSongs(res);
    if (rawSongs.length > 0) {
      const normalized = normalizeSongs(rawSongs, defaultImg);
      if (isLoadMore) {
        songs.value.push(...normalized);
      } else {
        songs.value = normalized;
      }
      hasMore.value = rawSongs.length >= 30;
    } else {
      hasMore.value = false;
    }
  } catch (error) {
    if (!isLoadMore) isError.value = true;
    hasMore.value = false;
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};
```

#### 5.5.3 歌曲数据提取

复用与 History.vue / PersonalFM.vue 相同的 `extractSongs()` 递归遍历模式，从 API 响应中深度提取歌曲对象：

```javascript
const extractSongs = (res) => {
  const songMap = new Map();
  const getHash = (item) => item.FileHash || item.hash || item.filehash || ...;
  const getName = (item) => item.SongName || item.songname || item.name || ...;
  const isRealSong = (item) => !!(item && typeof item === 'object' && getHash(item) && getName(item));

  const traverse = (data, depth) => {
    if (depth > 20 || !data) return;
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (isRealSong(item)) {
          const h = getHash(item);
          if (!songMap.has(h)) songMap.set(h, item);
        } else {
          traverse(item, depth + 1);
        }
      });
      return;
    }
    if (typeof data === 'object') {
      Object.values(data).forEach(val => traverse(val, depth + 1));
    }
  };
  traverse(res, 0);
  return Array.from(songMap.values());
};
```

#### 5.5.4 无限滚动加载

使用 `IntersectionObserver` 实现底部自动加载（与 History.vue 一致）：

```javascript
const loadMoreTrigger = ref(null);
let observer = null;

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading.value && !isLoadingMore.value && hasMore.value) {
      page.value++;
      fetchSongs(true);
    }
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};
```

#### 5.5.5 分类切换

```javascript
const switchCategory = (key) => {
  if (activeCategory.value === key) return;
  activeCategory.value = key;
  fetchSongs(false);
};
```

#### 5.5.6 播放功能

```javascript
const handlePlay = (song) => {
  if (!song._hash) return;
  playerStore.playSong(buildPlayPayload(song, defaultImg));
};

const playAll = () => {
  if (songs.value.length === 0) return;
  playerStore.clearPlaylist();
  songs.value.forEach(song => {
    if (song._hash) playerStore.playlist.push(buildPlayPayload(song, defaultImg));
  });
  if (playerStore.playlist.length > 0) playerStore.playSong(playerStore.playlist[0]);
};
```

---

## 六、预期结果

### 6.1 功能验收标准

| # | 验收项 | 预期结果 |
|---|--------|----------|
| 1 | 侧边栏入口 | "在线音乐"分组下显示"新歌速递"导航项，带闪电图标 |
| 2 | 路由跳转 | 点击"新歌速递"跳转至 `/new-songs`，侧边栏高亮 |
| 3 | 页面加载 | 默认加载"全部"分类，显示 30 首新歌 |
| 4 | 分类切换 | 点击"华语/欧美/韩国/日本"Tab，重新加载对应分类歌曲 |
| 5 | 骨架屏 | 首次加载时显示 10 行骨架屏动画 |
| 6 | 歌曲播放 | 双击歌曲或点击播放图标，立即播放 |
| 7 | 播放全部 | 点击"播放全部"按钮，清空当前列表并播放所有新歌 |
| 8 | 无限滚动 | 滚动到底部自动加载下一页 |
| 9 | 歌手跳转 | 点击歌手名跳转至歌手详情页 |
| 10 | 专辑跳转 | 点击专辑名跳转至专辑详情页 |
| 11 | VIP/付费标识 | VIP 歌曲显示蓝色 VIP 标签，付费歌曲显示橙色付费标签 |
| 12 | 错误处理 | 网络异常时显示错误卡片和重试按钮 |
| 13 | 到底提示 | 无更多数据时显示"已经到底了"提示 |
| 14 | 回到顶部 | 页面右下角显示回到顶部按钮 |

### 6.2 性能预期

| 指标 | 目标值 |
|------|--------|
| 首屏加载时间 | < 1.5s（本地 API 代理） |
| 分类切换响应 | < 1s |
| 滚动加载触发 | 距底部 100px 时预加载 |
| 内存占用 | 单分类列表 ≤ 300 首歌曲后停止自动加载 |

---

## 七、用户体验优化

### 7.1 视觉层次优化

| 优化点 | 方案 |
|--------|------|
| **主题色区分** | 使用翡翠绿（emerald）作为页面主题色，与首页蓝色、FM紫色、排行榜灰色形成视觉区分，用户一眼可知当前所在页面 |
| **渐变背景** | 顶部 `from-emerald-50/60 to-white` 渐变，营造清新活力感，契合"新歌"主题 |
| **序号高亮** | 前 3 首歌曲序号使用不同颜色强调（金/银/铜），增加浏览趣味性 |
| **封面悬浮** | 歌曲封面 hover 时微缩放 `scale-110`，增加交互反馈 |

### 7.2 交互体验优化

| 优化点 | 方案 |
|--------|------|
| **分类切换防抖** | 快速点击分类 Tab 时，仅执行最后一次请求，避免并发请求导致数据错乱 |
| **切换分类保留滚动** | 切换分类后自动滚动到页面顶部，避免用户在新数据中处于中间位置 |
| **播放状态同步** | 当前正在播放的歌曲在列表中显示播放动画（音波图标），与 PlayerBar 状态实时同步 |
| **空状态引导** | 无数据时显示友好提示 + 引导按钮，而非空白页面 |
| **加载更多节流** | IntersectionObserver 触发后设置 loading 锁，防止重复请求 |

### 7.3 数据展示优化

| 优化点 | 方案 |
|--------|------|
| **去重处理** | 使用 Map 以 hash 为 key 去重，防止分页加载时出现重复歌曲 |
| **封面容错** | 图片加载失败时回退到默认封面图，避免破图 |
| **歌手名智能展示** | 使用 SingerLink 组件，多歌手分别可点击跳转 |
| **时长格式化** | 统一 `MM:SS` 格式，未知时长显示 `--:--` |
| **VIP 标识精准** | 复用 songHelper 的 VIP/付费判断逻辑，确保标识准确 |

### 7.4 可访问性优化

| 优化点 | 方案 |
|--------|------|
| **Tooltip 提示** | 歌曲名、专辑名超长截断时显示完整文本的 tooltip |
| **键盘导航** | 歌曲列表支持 Tab 键聚焦，Enter 键播放 |
| **焦点可见** | 所有可交互元素聚焦时显示可见焦点环 |

---

## 八、开发任务清单

### Phase 1: 核心功能（必须）

- [ ] **T1**: 创建 `src/views/NewSongs.vue` 页面组件
  - 页面框架（标题、描述、渐变背景）
  - 分类 Tab 栏
  - 歌曲列表（表头 + 行模板）
  - 骨架屏 / 错误状态 / 空状态
  - 数据获取逻辑（fetchSongs + extractSongs）
  - 无限滚动加载（IntersectionObserver）
  - 播放功能（单曲播放 + 播放全部）
  - 歌手/专辑跳转

- [ ] **T2**: 修改 `src/router/index.js`
  - 添加 `/new-songs` 路由

- [ ] **T3**: 修改 `src/layout/Sidebar.vue`
  - 在"排行榜"和"私人FM"之间添加"新歌速递"导航项
  - 添加闪电 SVG 图标
  - 配置路由高亮（emerald 色系）

### Phase 2: API 适配（必须）

- [ ] **T4**: 实测确认各分类的 rank_id 值
  - 调用 `/top/song?type=21608` 确认默认分类
  - 逐一测试其他 rank_id，确认华语/欧美/韩国/日本对应的值
  - 如果 API 不支持分类筛选，则前端自行根据歌曲语种字段过滤

### Phase 3: 体验优化（推荐）

- [ ] **T5**: 前 3 首歌曲序号高亮（金/银/铜色）
- [ ] **T6**: 当前播放歌曲在列表中显示播放动画
- [ ] **T7**: 分类切换防抖 + 自动回顶
- [ ] **T8**: 回到顶部组件集成

### Phase 4: 可选增强（未来迭代）

- [ ] **T9**: 新歌时间标签（如"刚刚"、"1小时前"、"今天"）
- [ ] **T10**: 首页 Discover.vue 增加"新歌速递"预览卡片（展示前 6 首新歌）
- [ ] **T11**: 本地缓存机制（localStorage 缓存当日新歌数据，减少重复请求）

---

## 九、风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| rank_id 分类值不确定 | 无法实现分类筛选 | 1. 开发阶段实测确认；2. 若 API 不支持分类，前端根据 `language` 字段过滤；3. 最坏情况仅提供"全部"分类 |
| API 响应格式不一致 | 歌曲数据提取失败 | 使用递归遍历 extractSongs() 深度提取，兼容各种嵌套格式 |
| 新歌数据量少 | 某些分类（如日本）歌曲较少 | 减小 pagesize 或合并分类，显示友好的"暂无更多"提示 |
| 分页数据重复 | 同一首歌出现在不同页 | 使用 Map 以 hash 去重 |
| VIP 试听限制 | 非 VIP 用户播放受限 | 复用现有 VIP 试听机制，播放结束弹出升级提示 |

---

## 十、测试要点

### 10.1 功能测试

| 测试场景 | 操作 | 预期 |
|----------|------|------|
| 首次进入 | 点击侧边栏"新歌速递" | 页面加载，显示"全部"分类歌曲列表 |
| 分类切换 | 依次点击"华语/欧美/韩国/日本" | 每次切换重新加载对应分类数据 |
| 播放歌曲 | 双击列表中的歌曲 | 歌曲开始播放，PlayerBar 更新 |
| 播放全部 | 点击"播放全部"按钮 | 播放列表清空并替换为当前新歌列表 |
| 无限滚动 | 滚动到页面底部 | 自动加载下一页数据 |
| 歌手跳转 | 点击歌手名 | 跳转至歌手详情页 |
| 专辑跳转 | 点击专辑名 | 跳转至专辑详情页 |
| 网络异常 | 断网后加载页面 | 显示错误卡片和重试按钮 |
| 重复切换 | 快速切换分类 Tab | 仅最后一次切换生效，无数据错乱 |

### 10.2 边界测试

| 测试场景 | 预期 |
|----------|------|
| 某分类无数据 | 显示空状态提示 |
| 封面图加载失败 | 回退到默认封面 |
| 超长歌曲名/歌手名 | 文本截断 + tooltip 显示完整内容 |
| 播放 VIP 歌曲（非 VIP 用户） | 正常触发试听机制 |

---

## 附录 A: 文件变更清单

```
新增:
  src/views/NewSongs.vue

修改:
  src/router/index.js       (+2 行: import + route)
  src/layout/Sidebar.vue    (+6 行: 导航项)
```

## 附录 B: 与现有页面的样式对照

| 页面 | 主题色 | 渐变背景 | Tab 样式 |
|------|--------|----------|----------|
| 首页 Discover | blue-500 | `from-blue-50/80 to-white` | 无 |
| 排行榜 RankList | blue-500 | `from-gray-50 to-white` | 无 |
| 私人FM PersonalFM | purple-500 | `from-purple-50/60 to-white` | pill 分段控件 |
| 听歌足迹 History | blue-500 | `from-blue-50/50 to-white` | 下划线 Tab |
| **新歌速递 NewSongs** | **emerald-500** | **`from-emerald-50/60 to-white`** | **pill 分段控件** |
