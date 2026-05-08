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
import ArtistList from '../views/ArtistList.vue';
import AlbumDetail from '../views/AlbumDetail.vue';
import PersonalFM from '../views/PersonalFM.vue';
import NewSongs from '../views/NewSongs.vue';

const routes = [
  { path: '/', name: 'Discover', component: Discover },
  { path: '/search', name: 'Search', component: Search },
  { path: '/playlist/:id', name: 'PlaylistDetail', component: PlaylistDetail },
  { path: '/my-playlists', name: 'MyPlaylists', component: MyPlaylists },
  { path: '/rank', name: 'RankList', component: RankList },
  { path: '/rank/:id', name: 'RankDetail', component: RankDetail },
  { path: '/history', name: 'History', component: History },
  { path: '/desktop-lyric', name: 'DesktopLyric', component: DesktopLyric },
  { path: '/artist/:id', name: 'ArtistDetail', component: ArtistDetail },
  { path: '/artists', name: 'ArtistList', component: ArtistList },
  { path: '/album/:id', name: 'AlbumDetail', component: AlbumDetail },
  { path: '/fm', name: 'PersonalFM', component: PersonalFM },
  { path: '/new-songs', name: 'NewSongs', component: NewSongs }
];

const router = createRouter({
  history: createWebHashHistory(), 
  routes
});

export default router;