// ====================
// 文件：src/router/index.js
// ====================
import { createRouter, createWebHashHistory } from 'vue-router';
import Discover from '../views/Discover.vue';
import Search from '../views/Search.vue';
import PlaylistDetail from '../views/PlaylistDetail.vue';
import MyPlaylists from '../views/MyPlaylists.vue';
import RankList from '../views/RankList.vue';
import RankDetail from '../views/RankDetail.vue';
import History from '../views/History.vue'; 
import DesktopLyric from '../views/DesktopLyric.vue';
// ✨ 引入全新的歌手与专辑详情页
import ArtistDetail from '../views/ArtistDetail.vue';
import AlbumDetail from '../views/AlbumDetail.vue';
import PersonalFM from '../views/PersonalFM.vue';

const routes = [
  { path: '/', name: 'Discover', component: Discover },
  { path: '/search', name: 'Search', component: Search },
  { path: '/playlist/:id', name: 'PlaylistDetail', component: PlaylistDetail },
  { path: '/my-playlists', name: 'MyPlaylists', component: MyPlaylists },
  { path: '/rank', name: 'RankList', component: RankList },
  { path: '/rank/:id', name: 'RankDetail', component: RankDetail },
  { path: '/history', name: 'History', component: History },
  { path: '/desktop-lyric', name: 'DesktopLyric', component: DesktopLyric },
  // ✨ 注册详情页动态路由
  { path: '/artist/:id', name: 'ArtistDetail', component: ArtistDetail },
  { path: '/album/:id', name: 'AlbumDetail', component: AlbumDetail },
  { path: '/fm', name: 'PersonalFM', component: PersonalFM }
];

const router = createRouter({
  history: createWebHashHistory(), 
  routes
});

export default router;