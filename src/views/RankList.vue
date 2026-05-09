// ====================
// 文件：views/RankList.vue
// ====================
<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="rank-scroll-container">
    
    <div class="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-gray-50 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      
      <div class="flex items-end justify-between mb-8 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            排行榜 <span class="text-lg text-blue-500 font-bold ml-2">Top Charts</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">汇聚最新、最热、最具权威的音乐榜单</p>
        </div>
      </div>

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        <div v-for="i in 8" :key="i" class="flex p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
          <div class="w-28 h-28 rounded-xl bg-gray-200 animate-pulse flex-shrink-0"></div>
          <div class="flex-1 ml-5 flex flex-col justify-center space-y-3">
            <div class="w-1/2 h-5 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div class="w-full h-3 bg-gray-100 rounded animate-pulse"></div>
            <div class="w-5/6 h-3 bg-gray-100 rounded animate-pulse"></div>
            <div class="w-4/6 h-3 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <div v-else-if="isError" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100 mt-4">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">获取排行榜失败</p>
        <p class="text-xs text-red-400 max-w-lg text-center">{{ errorMessage }}</p>
        <button @click="fetchRankData" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="ranks.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 mt-4">
        <svg class="w-20 h-20 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        <p class="text-sm font-medium tracking-widest">暂无排行榜数据</p>
      </div>

      <div v-else class="w-full flex-1 flex flex-col min-w-0 pb-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-x-6 gap-y-6">
          <div 
            v-for="rank in ranks" 
            :key="rank._id"
            @click="goToRankDetail(rank._id)"
            class="flex items-center p-3.5 bg-white rounded-[20px] shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-100 transition-all duration-500 transform hover:-translate-y-1 cursor-pointer group no-drag"
          >
            <div class="relative w-[110px] h-[110px] rounded-xl overflow-hidden fix-clip flex-shrink-0 bg-gray-100 border border-gray-50">
              <img :src="rank._cover" :alt="rank._name" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" @error="e => e.target.src = defaultImg" />
              <div class="absolute bottom-1.5 right-1.5 bg-black/40 backdrop-blur-md text-white px-2 py-0.5 rounded-full flex items-center shadow-sm">
                <svg class="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <span class="text-[9px] font-bold tracking-wider">{{ formatPlayCount(rank._playCount) }}</span>
              </div>
              <div class="absolute inset-0 bg-black/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div class="w-10 h-10 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <svg class="w-5 h-5 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                </div>
              </div>
            </div>
            
            <div class="flex-1 min-w-0 ml-5 flex flex-col justify-center h-full">
              <h3 class="text-base font-extrabold text-gray-800 tracking-tight mb-2 truncate group-hover:text-blue-600 transition-colors" v-tooltip="rank._name">
                {{ rank._name }}
              </h3>
              
              <div v-if="rank._topSongs.length > 0" class="flex flex-col space-y-1.5">
                <div v-for="(song, idx) in rank._topSongs" :key="idx" class="flex items-center text-xs w-full">
                  <span class="text-gray-400 font-bold mr-2 w-2 text-right flex-shrink-0">{{ idx + 1 }}</span>
                  <div class="truncate flex-1 min-w-0" v-tooltip="song.name + ' - ' + song.singer">
                    <span class="text-gray-700 font-medium">{{ song.name }}</span>
                    <span class="text-gray-400 ml-1.5">- {{ song.singer }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-gray-400 font-medium flex items-center h-full">点击查看完整榜单内容</div>
            </div>

          </div>
        </div>
      </div>

    </div>

    <BackToTop targetId="rank-scroll-container" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import BackToTop from '../components/BackToTop.vue';

const router = useRouter();

const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref('');
const ranks = ref([]);
const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const formatPlayCount = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
};

const normalizeRanks = (list) => {
  return list.map(item => {
    const id = item.rankid || item.id || item.rank_id || '';
    const name = item.rankname || item.name || '未知榜单';
    let cover = item.img_9 || item.banner_9 || item.base_img || defaultImg;
    if (typeof cover === 'string') cover = cover.replace(/\{size\}/g, '400');
    const playCount = item.play_times || 0;
    const topSongs = (item.songinfo || []).slice(0, 3).map(song => ({
      name: song.name || song.songname || '未知歌曲',
      singer: song.author || song.singername || '未知歌手'
    }));
    return { _id: id, _name: name, _cover: cover, _playCount: playCount, _topSongs: topSongs };
  }).filter(item => item._id !== '');
};

const fetchRankData = async () => {
  isLoading.value = true;
  isError.value = false;
  errorMessage.value = '';
  ranks.value = [];
  try {
    await request.get('/register/dev').catch(() => {});
    const res = await request.get('/rank/list');
    if (res?.data?.info && Array.isArray(res.data.info)) {
      ranks.value = normalizeRanks(res.data.info);
    } else {
      throw new Error('未能在响应中找到 info 榜单数组');
    }
  } catch (error) {
    isError.value = true;
    errorMessage.value = error.message || '网络连接异常';
  } finally {
    isLoading.value = false;
  }
};

const goToRankDetail = (id) => {
  if (!id) return;
  router.push({ path: `/rank/${id}` });
};

onMounted(() => fetchRankData());
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