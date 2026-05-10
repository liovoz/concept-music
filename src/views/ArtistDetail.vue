// ====================
// 文件：src/views/ArtistDetail.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="artist-scroll-container">
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-gray-50 to-white -z-10"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <button @click="$router.back()" class="mb-6 flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors no-drag w-fit">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        返回
      </button>

      <div class="flex items-center mb-10 gap-8">
        <div v-if="isLoading" class="w-40 h-40 rounded-full bg-gray-200 animate-pulse flex-shrink-0 shadow-md"></div>
        <div v-else class="relative w-40 h-40 rounded-full flex-shrink-0 shadow-lg overflow-hidden border-4 border-white bg-white group">
          <img :src="artistInfo.avatar || defaultImg" @error="e => e.target.src = defaultImg" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>

        <div class="flex flex-col justify-center flex-1 min-w-0">
          <div v-if="isLoading" class="w-1/3 h-10 bg-gray-200 rounded animate-pulse mb-3"></div>
          <h2 v-else class="text-4xl font-extrabold text-gray-900 tracking-tight line-clamp-1 mb-2">{{ artistInfo.name || '未知歌手' }}</h2>

          <div v-if="isLoading" class="w-1/4 h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div v-else class="flex items-center text-sm mb-4 space-x-6">
            <span class="text-gray-500 font-medium">单曲：<span class="text-gray-800 font-bold ml-1">{{ artistInfo.song_count || 0 }}</span></span>
            <span class="text-gray-500 font-medium">专辑：<span class="text-gray-800 font-bold ml-1">{{ artistInfo.album_count || 0 }}</span></span>
            <span v-if="artistInfo.fans_count" class="text-gray-500 font-medium">粉丝：<span class="text-gray-800 font-bold ml-1">{{ formatCount(artistInfo.fans_count) }}</span></span>
          </div>

          <div v-if="isLoading" class="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
          <p v-else class="text-xs text-gray-500 line-clamp-2 leading-relaxed cursor-default pr-10" v-tooltip="artistInfo.intro">{{ artistInfo.intro || '该歌手暂无简介...' }}</p>
        </div>
      </div>

      <div class="flex items-center space-x-8 border-b border-gray-100 mb-6 sticky top-0 bg-white/90 backdrop-blur-md z-20 py-2">
        <button @click="activeTab = 'songs'" class="pb-2 text-sm font-bold border-b-2 transition-all relative top-[9px] no-drag" :class="activeTab === 'songs' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">热门单曲</button>
        <button @click="activeTab = 'albums'" class="pb-2 text-sm font-bold border-b-2 transition-all relative top-[9px] no-drag" :class="activeTab === 'albums' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">全部专辑</button>
        <button @click="activeTab = 'desc'" class="pb-2 text-sm font-bold border-b-2 transition-all relative top-[9px] no-drag" :class="activeTab === 'desc' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'">歌手详情</button>
      </div>

      <div v-if="isError" class="w-full flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">获取歌手信息失败</p>
        <button @click="fetchArtistData" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="activeTab === 'songs'" class="w-full flex-1 flex flex-col min-w-0">
        <div class="mb-4 flex items-center justify-between">
          <button @click="playAllSongs" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-200 transition-all transform active:scale-95 flex items-center no-drag" :class="{'opacity-50 pointer-events-none': isLoading || songs.length === 0}">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            {{ songSort === 'hot' ? '播放全部热门单曲' : '播放全部最新单曲' }}
          </button>
          <div class="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <button @click="songSort = 'hot'" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag" :class="songSort === 'hot' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'">最热</button>
            <button @click="songSort = 'latest'" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag" :class="songSort === 'latest' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'">最新</button>
          </div>
        </div>

        <div v-if="isLoading" class="space-y-4 w-full">
          <div v-for="i in 10" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl"><div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div><div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div></div>
        </div>
        <div v-else-if="songs.length === 0" class="flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
           <svg class="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
           <p class="text-sm font-medium tracking-widest text-gray-400">该歌手暂无热歌数据</p>
        </div>
        <div v-else class="space-y-1 w-full">
          <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 mb-2 min-w-0">
            <div class="w-10 text-center flex-shrink-0">#</div><div class="flex-1 pl-2 min-w-0">音乐标题</div><div class="w-[28%] hidden md:block pr-4 min-w-0">专辑</div><div class="w-16 text-right pr-4 flex-shrink-0">时长</div>
          </div>
          <div v-for="(song, index) in songs" :key="song._hash || index" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 group transition-colors cursor-pointer no-drag min-w-0">
            <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
            <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 flex-shrink-0" @click.stop="handlePlay(song)">
               <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
            </div>
            
            <div class="flex-1 pl-2 text-sm text-gray-800 font-medium flex items-center pr-4 overflow-hidden min-w-0" v-tooltip="song._title">
              <span class="truncate min-w-0">{{ song._title }}</span>
              <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
              <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
            </div>
            
            <div class="w-[28%] hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
              <span @click.stop="goToAlbum(song._album_id)" class="transition-colors" :class="song._album_id ? 'hover:text-blue-600 cursor-pointer' : ''">{{ song._album }}</span>
            </div>
            <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
          </div>
          <div ref="loadMoreTrigger" class="w-full h-16 flex items-center justify-center mt-2 text-xs font-medium">
            <div v-if="isLoadingMore" class="flex items-center text-blue-500"><svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>加载中...</div>
            <div v-else-if="!hasMoreSongs" class="text-gray-300">没有更多歌曲了</div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'albums'" class="w-full flex-1 flex flex-col min-w-0 pb-10">
        <div v-if="isLoadingAlbums" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
          <div v-for="i in 12" :key="i" class="flex flex-col space-y-3"><div class="w-full aspect-square bg-gray-100 rounded-2xl animate-pulse"></div><div class="w-3/4 h-4 bg-gray-100 rounded animate-pulse"></div></div>
        </div>
        <div v-else-if="albums.length === 0" class="flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
           <svg class="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
           <p class="text-sm font-medium tracking-widest text-gray-400">该歌手暂无专辑数据</p>
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
          <div v-for="album in albums" :key="album.albumid" @click="goToAlbum(album.albumid)" class="flex flex-col group cursor-pointer no-drag">
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden fix-clip shadow-sm group-hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-1 bg-gray-100 border border-gray-50/50">
              <img :src="album.cover" :alt="album.albumname" @error="e => e.target.src = defaultImg" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div class="absolute -right-4 top-1/2 transform -translate-y-1/2 w-[80%] h-[80%] bg-black rounded-full shadow-[0_0_10px_rgba(0,0,0,0.4)] -z-10 group-hover:translate-x-2 transition-transform duration-500"></div>
              
              <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                </div>
              </div>
            </div>
            <div class="mt-3 flex flex-col px-1 min-w-0">
              <h4 class="text-sm font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors" v-tooltip="album.albumname">{{ album.albumname }}</h4>
              <p class="text-xs text-gray-400 mt-1.5 font-medium truncate font-mono">{{ album.publishtime ? album.publishtime.split(' ')[0] : '' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'desc'" class="w-full flex-1 flex flex-col min-w-0 pb-10">
        <div class="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <h3 class="text-sm font-bold text-gray-800 mb-4">基本资料</h3>
          <p class="text-sm text-gray-600 leading-loose whitespace-pre-wrap">{{ artistInfo.intro || '暂无详细介绍' }}</p>
        </div>
      </div>

    </div>
    <BackToTop targetId="artist-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import BackToTop from '../components/BackToTop.vue'; 

const route = useRoute();
const router = useRouter();
const store = usePlayerStore();

const activeTab = ref('songs');
const songSort = ref('hot');

const artistInfo = ref({});
const isLoading = ref(true);
const isError = ref(false);

const songs = ref([]);
const songPage = ref(1);
const hasMoreSongs = ref(true);
const isLoadingMore = ref(false);

const albums = ref([]);
const isLoadingAlbums = ref(false);

const loadMoreTrigger = ref(null);
let observer = null;

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const formatCount = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
};

const goToAlbum = (id) => {
  if (!id || id === '0') return store.showToast('暂无该专辑详情信息');
  router.push(`/album/${id}`);
};

const extractArtistInfo = (res) => {
  const data = res?.data?.info || res?.data || {};
  let avatar = data.sizable_avatar || data.imgurl || data.avatar || data.pic || '';
  if (avatar) avatar = avatar.replace(/\{size\}/g, '400');
  let intro = data.intro || data.desc || '';
  intro = intro.replace(/\\n/g, '\n');
  return {
    name: data.singername || data.author_name || '未知歌手',
    avatar: avatar,
    intro: intro,
    song_count: data.songcount || data.song_count || 0,
    album_count: data.albumcount || data.album_count || 0,
    fans_count: data.fanscount || data.fans_count || 0
  };
};

const extractSongs = (res) => {
  let validArr = [];
  if (res?.data?.info && Array.isArray(res.data.info)) validArr = res.data.info;
  else if (res?.data?.songs && Array.isArray(res.data.songs)) validArr = res.data.songs;
  else if (res?.data?.data && Array.isArray(res.data.data)) validArr = res.data.data;
  else if (res?.data && Array.isArray(res.data)) validArr = res.data;
  
  return validArr.map(item => ({
    ...item,
    name: item.name || item.SongName || item.audio_name,
    author_name: item.author_name || item.singername || item.SingerName,
    album_audio_id: item.album_audio_id || item.audio_id || item.mixsongid 
  })).filter(item => item.name && (item.hash || item.FileHash || item.album_audio_id));
};

const extractAlbums = (res) => {
  let validArr = [];
  if (res?.data?.info && Array.isArray(res.data.info)) validArr = res.data.info;
  else if (res?.data?.albums && Array.isArray(res.data.albums)) validArr = res.data.albums;
  else if (res?.data?.data && Array.isArray(res.data.data)) validArr = res.data.data;
  else if (res?.data && Array.isArray(res.data)) validArr = res.data;
  
  return validArr.map(item => {
    let cover = item.sizable_cover || item.imgurl || item.pic || item.cover || '';
    if (cover && cover.includes('{size}')) cover = cover.replace(/\{size\}/g, '400');
    else if (cover && !cover.startsWith('http')) cover = '';
    
    return { 
      ...item, 
      albumid: item.albumid || item.album_id || item.id,
      albumname: item.albumname || item.album_name || item.name, 
      publishtime: item.publishtime || item.publish_date || item.addtime, 
      cover: cover || defaultImg 
    };
  });
};

const fetchArtistData = async () => {
  const id = route.params.id;
  isLoading.value = true;
  isError.value = false;
  songPage.value = 1;
  hasMoreSongs.value = true;
  songs.value = [];
  albums.value = [];

  try {
    await request.get('/register/dev').catch(() => {});
    
    const [infoRes, songsRes] = await Promise.allSettled([
      request.get('/artist/detail', { params: { id: id, timestamp: Date.now() } }),
      request.get('/artist/audios', { params: { id: id, page: songPage.value, pagesize: 30, sort: songSort.value, timestamp: Date.now() } })
    ]);
    
    if (infoRes.status === 'fulfilled') {
      artistInfo.value = extractArtistInfo(infoRes.value);
    } else throw new Error('获取歌手详情失败');
    
    if (songsRes.status === 'fulfilled') {
      const rawSongs = extractSongs(songsRes.value);
      songs.value = normalizeSongs(rawSongs, defaultImg);
      if (rawSongs.length < 30) hasMoreSongs.value = false;
    } else hasMoreSongs.value = false;
    
  } catch (error) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const fetchAlbums = async () => {
  isLoadingAlbums.value = true;
  try {
    const res = await request.get('/artist/albums', { params: { id: route.params.id, page: 1, pagesize: 100, timestamp: Date.now() } });
    albums.value = extractAlbums(res);
  } catch (e) {
    console.warn('获取歌手专辑失败', e);
  } finally {
    isLoadingAlbums.value = false;
  }
};

const loadMoreSongs = async () => {
  if (!hasMoreSongs.value || isLoadingMore.value || activeTab.value !== 'songs') return;
  isLoadingMore.value = true;
  songPage.value += 1;
  
  try {
    const res = await request.get('/artist/audios', { params: { id: route.params.id, page: songPage.value, pagesize: 30, sort: songSort.value, timestamp: Date.now() } });
    const newRawSongs = extractSongs(res);
    if (newRawSongs.length === 0) hasMoreSongs.value = false;
    else {
      songs.value.push(...normalizeSongs(newRawSongs, defaultImg));
      if (newRawSongs.length < 30) hasMoreSongs.value = false;
    }
  } catch (error) {
    hasMoreSongs.value = false;
  } finally {
    isLoadingMore.value = false;
  }
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading.value && !isLoadingMore.value && hasMoreSongs.value && activeTab.value === 'songs') {
      loadMoreSongs();
    }
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};

watch(() => activeTab.value, (newTab) => {
  if (newTab === 'albums') fetchAlbums();
  if (newTab === 'songs') {
    setTimeout(() => { setupObserver(); }, 100);
  }
});

watch(songSort, () => {
  if (activeTab.value !== 'songs') return;
  songPage.value = 1;
  hasMoreSongs.value = true;
  songs.value = [];
  isLoading.value = true;
  request.get('/artist/audios', { params: { id: route.params.id, page: 1, pagesize: 30, sort: songSort.value, timestamp: Date.now() } })
    .then(res => {
      const rawSongs = extractSongs(res);
      songs.value = normalizeSongs(rawSongs, defaultImg);
      if (rawSongs.length < 30) hasMoreSongs.value = false;
    })
    .catch(() => { hasMoreSongs.value = false; })
    .finally(() => { isLoading.value = false; });
});

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId && route.path.startsWith('/artist/')) {
    activeTab.value = 'songs';
    songSort.value = 'hot';
    fetchArtistData().then(() => setupObserver());
  }
});

onMounted(() => { fetchArtistData().then(() => setupObserver()); });
onUnmounted(() => { if (observer) observer.disconnect(); });

const handlePlay = (song) => {
  if (!song._hash && !song._album_audio_id) return;
  store.playSong(buildPlayPayload(song, artistInfo.value.avatar || defaultImg));
};

const playAllSongs = () => {
  if (songs.value.length === 0) return;
  store.clearPlaylist();
  songs.value.forEach(song => {
     if(song._hash || song._album_audio_id) store.playlist.push(buildPlayPayload(song, artistInfo.value.avatar || defaultImg));
  });
  if(store.playlist.length > 0) store.playSong(store.playlist[0]);
};
</script>

<style scoped>
.fix-clip {
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);
  backface-visibility: hidden;
  transform: translateZ(0);
}
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>