// ====================
// 文件：src/layout/PlayerBar.vue
// ====================
<template>
  <footer class="h-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-8px_28px_rgba(0,0,0,0.35)] relative min-w-0 transition-colors duration-200">
    
    <transition name="fade">
      <div v-if="store.isError" class="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-lg shadow-md text-xs font-medium flex items-center z-[60]">
        <AppIcon name="danger" class="w-4 h-4 mr-2" />
        {{ store.errorMessage }}
        <button @click="store.clearError" class="ml-3 text-red-400 hover:text-red-700 no-drag"><AppIcon name="close" class="w-3 h-3" /></button>
      </div>
    </transition>

    <div class="flex items-center w-[320px]">
      <div 
        @click="openLyricsPage" 
        class="relative w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 flex-shrink-0 flex items-center justify-center text-gray-300 dark:text-slate-500 overflow-hidden cursor-pointer group shadow-sm hover:shadow transition-all"
        v-tooltip="'展开/收起歌词'"
      >
        <img v-if="store.currentSong && store.currentSong.cover" :src="store.currentSong.cover" :alt="store.currentSong.name || '歌曲封面'" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <AppIcon v-else name="album" class="w-6 h-6 transition-transform duration-500 group-hover:scale-105" />
        
        <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
          <AppIcon v-if="!store.isLyricsVisible" name="chevron-up" class="w-5 h-5 text-white drop-shadow-md transform translate-y-1 group-hover:translate-y-0 transition-all duration-300" />
          <AppIcon v-else name="chevron-down" class="w-5 h-5 text-white drop-shadow-md transform -translate-y-1 group-hover:translate-y-0 transition-all duration-300" />
        </div>
      </div>
      
      <div class="ml-3 overflow-hidden flex flex-col justify-center">
        <div class="flex items-center">
          <span ref="titleViewportRef" class="player-title-viewport text-sm font-bold text-gray-800 dark:text-slate-100" v-tooltip="store.currentSong?.name">
            <span ref="titleTextRef" class="player-title-track" :class="{ 'is-marquee': isTitleOverflow }">
              <span class="player-title-text">{{ store.currentSong ? store.currentSong.name : '听见好时光' }}</span>
              <span v-if="isTitleOverflow" class="player-title-text player-title-copy" aria-hidden="true">{{ store.currentSong ? store.currentSong.name : '听见好时光' }}</span>
            </span>
          </span>
          <span v-if="store.isCurrentSongPreview" class="ml-2 flex-shrink-0 bg-green-50 text-green-600 border border-green-200 px-1 py-0.5 rounded text-[8px] font-black tracking-widest uppercase leading-none mt-0.5 shadow-sm">试听</span>
          <span v-else-if="store.currentSong?.is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
          <span v-else-if="store.currentSong?.is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
        </div>
        <div class="flex items-center mt-0.5 space-x-2">
          <SingerLink v-if="store.currentSong" :singers="store.currentSong._singers || store.currentSong.artists" :singer-name="store.currentSong.singer" :singer-id="store.currentSong.singer_id" size="small" :disabled="isNeteaseImportSong(store.currentSong)" disabled-tooltip="网易导入歌曲暂不支持跳转" />
          <span v-else class="text-xs text-gray-500 truncate font-medium">Concept Music Desktop</span>
        </div>
      </div>

      <div class="ml-4 flex-shrink-0" v-if="store.currentSong">
         <button @click="userStore.toggleLikeSong(store.currentSong)" class="no-drag p-1.5 rounded-full transition-all focus:outline-none transform active:scale-90" v-tooltip="isCurrentLiked ? '取消喜欢' : '添加喜欢'">
            <AppIcon v-if="isCurrentLiked" name="heart-solid" class="w-5 h-5 text-red-500 drop-shadow-sm" />
            <AppIcon v-else name="heart" class="w-5 h-5 text-gray-400 hover:text-red-400" />
         </button>
      </div>
    </div>

    <div class="flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
      <div class="flex items-center space-x-5" :class="{ 'opacity-50 pointer-events-none': !store.currentSong }">
        <button @click="store.togglePlayMode" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all no-drag relative" v-tooltip="playModeTip">
           <AppIcon v-if="store.playMode === 'sequence'" name="mode-sequence" class="w-4 h-4" />
           <AppIcon v-else-if="store.playMode === 'loop'" name="mode-loop" class="w-4 h-4" />
           <AppIcon v-else name="mode-random" class="w-4 h-4" />
        </button>

        <button @click="store.playPrev" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all no-drag" v-tooltip="'上一首'"><AppIcon name="prev" class="w-5 h-5" /></button>
        
        <button @click="store.togglePlay" class="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)] no-drag transform active:scale-95 transition-all">
          <AppIcon v-if="store.isLoading" name="spinner" spin class="h-5 w-5" />
          <AppIcon v-else-if="store.isPlaying" name="pause" class="w-5 h-5" />
          <AppIcon v-else name="play" class="w-5 h-5 ml-[2px]" />
        </button>
        
        <button @click="store.playNext(false)" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all no-drag" v-tooltip="'下一首'"><AppIcon name="next" class="w-5 h-5" /></button>
      </div>
      
      <div class="w-full flex items-center space-x-3 mt-2 text-[11px] font-medium" :class="store.peakMode ? 'text-purple-400' : 'text-gray-400', { 'opacity-50 pointer-events-none': !store.currentSong }">
        <span class="w-8 text-right">{{ formatTime(peakDisplayTime) }}</span>
        <div class="flex-1 relative flex items-center h-4 group no-drag">
          <input type="range" min="0" :max="peakMaxDuration" :value="peakDisplayTime" @input="handleDrag" @change="handlePeakDragEnd" class="w-full absolute z-10 opacity-0 cursor-pointer h-full m-0">
          <div class="w-full h-1.5 rounded-full overflow-hidden pointer-events-none transition-all group-hover:h-2" :class="store.peakMode ? 'bg-purple-100' : 'bg-gray-200'">
            <div class="h-full rounded-full pointer-events-none" :class="store.peakMode ? 'bg-purple-500' : 'bg-blue-600'" :style="{ width: peakProgressPercentage + '%' }"></div>
          </div>
        </div>
        <span class="w-8 text-left">{{ formatTime(peakMaxDuration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end w-[360px] space-x-4 text-gray-500 dark:text-slate-400 pr-2">
       
       <button @click="store.toggleDesktopLyric" class="no-drag cursor-pointer font-bold tracking-wide transition-all min-w-[32px] h-7 px-2 flex items-center justify-center text-[13px] rounded-md border relative flex-shrink-0" :class="store.isDesktopLyricVisible ? 'border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:border-blue-400/30 dark:text-blue-300' : 'border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-slate-700 dark:hover:bg-slate-800 text-gray-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'" v-tooltip="'开启/关闭桌面歌词'">
         词
       </button>

       <div v-if="store.currentSong" ref="qualityMenuRef" class="relative flex flex-col items-center justify-center no-drag z-[60]">
         <div @click="qualityMenuOpen = !qualityMenuOpen" class="cursor-pointer font-bold tracking-wide uppercase transition-all h-7 px-2.5 flex items-center text-[13px] rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-slate-700 dark:hover:bg-slate-800 text-gray-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400" v-tooltip="'音质选择'">
           {{ qualityDisplayName }}
         </div>
         
         <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 pb-2 transition-all duration-300 origin-bottom" :class="qualityMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'">
           <div class="flex flex-col bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl overflow-hidden w-32 py-1.5 relative">
             <div class="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none"></div>

             <div v-for="(q, index) in qualityMenuOptions" :key="q.key" @click="handleQualitySelect(q)"
                  class="text-xs py-2.5 font-bold transition-all relative z-10 flex items-center justify-between px-4"
                  v-tooltip="q.disabled ? '当前网易歌曲未提供该音质' : ''"
                  :class="[
                    index !== qualityOptions.length - 1 ? 'border-b border-gray-50/50' : '',
                    q.disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer',
                    !q.disabled && store.currentQuality === q.key ? 'text-blue-600 bg-blue-50/50' : '',
                    !q.disabled && store.currentQuality !== q.key ? 'text-gray-600 hover:bg-gray-50' : ''
                  ]">
               <div class="flex items-center">
                 <span v-if="store.currentQuality === q.key" class="absolute left-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm"></span>
                 <span :class="{'ml-1': store.currentQuality === q.key}">{{ q.name }}</span>
               </div>
               <span v-if="q.isVip" class="border px-1 py-[1px] rounded text-[7px] font-black tracking-widest uppercase transform scale-90 origin-right ml-2 shadow-sm" :class="q.disabled ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-blue-50 text-blue-600 border-blue-200'">VIP</span>
             </div>
           </div>
         </div>
       </div>

       <button ref="playlistBtnRef" @click="store.togglePlaylist" class="no-drag transition-colors relative hover:text-blue-600 flex-shrink-0" v-tooltip="'播放列表'">
         <AppIcon name="queue" class="w-5 h-5" />
       </button>

       <div class="flex items-center space-x-2 group w-40 flex-shrink-0">
         <div ref="boostMenuRef" class="relative flex-shrink-0">
           <button
             @click="boostMenuOpen = !boostMenuOpen"
             class="no-drag w-7 h-7 rounded-md flex items-center justify-center transition-all focus:outline-none"
             :class="store.volumeBoostEnabled ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800'"
             v-tooltip="boostTip"
           >
             <AppIcon name="new-songs" class="w-4 h-4" />
           </button>
           <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 transition-all duration-200 origin-bottom z-[70]" :class="boostMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'">
             <div class="w-44 rounded-xl border border-gray-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.14)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] p-2">
               <button @click="store.toggleVolumeBoost()" class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors no-drag" :class="store.volumeBoostEnabled ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'">
                 <span>音量增强</span>
                 <span class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors" :class="store.volumeBoostEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'">
                   <span class="inline-block h-3 w-3 rounded-full bg-white transition-transform" :class="store.volumeBoostEnabled ? 'translate-x-3.5' : 'translate-x-0.5'"></span>
                 </span>
               </button>
               <div class="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
                 <button v-for="level in boostLevels" :key="level.value" @click="store.setVolumeBoostLevel(level.value); store.setVolumeBoostEnabled(true)" class="no-drag rounded-md px-2 py-1.5 text-[11px] font-black transition-all" :class="store.volumeBoostEnabled && store.volumeBoostLevel === level.value ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300'">
                   {{ level.label }}
                 </button>
               </div>
             </div>
           </div>
         </div>
         <button @click="store.toggleMute" class="no-drag text-gray-400 hover:text-blue-600 transition-colors focus:outline-none" v-tooltip="store.volume === 0 ? '恢复音量' : '静音'">
            <AppIcon v-if="store.volume === 0" name="volume-mute" class="w-4 h-4" />
            <AppIcon v-else-if="store.volume < 0.5" name="volume-low" class="w-4 h-4" />
            <AppIcon v-else name="volume-high" class="w-4 h-4" />
          </button>
          <div class="flex-1 relative flex items-center h-4 no-drag">
            <input type="range" min="0" max="1" step="0.01" :value="store.volume" @input="(e) => store.setVolume(Number(e.target.value))" class="w-full absolute z-10 opacity-0 cursor-pointer h-full m-0">
            <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden pointer-events-none transition-all group-hover:h-2">
              <div class="h-full bg-blue-600 rounded-full pointer-events-none" :style="{ width: (store.volume * 100) + '%' }"></div>
            </div>
          </div>
       </div>
    </div>

    <transition name="slide-up">
      <div v-if="store.isPlaylistVisible" ref="playlistPanelRef" class="absolute bottom-24 right-6 w-[400px] min-h-[380px] max-h-[65vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_18px_56px_rgba(0,0,0,0.55)] flex flex-col z-[90] overflow-hidden text-gray-800 dark:text-slate-100" tabindex="-1" @keydown.escape="store.isPlaylistVisible = false">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/60">
          <h3 class="font-bold text-gray-800 text-sm">当前播放队列 <span class="text-gray-400 font-normal ml-1">({{ store.playlist.length }}首)</span></h3>
          <button @click="store.clearPlaylist" class="text-xs text-gray-500 hover:text-blue-600 transition-colors no-drag">清空</button>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col">
          <div v-if="store.playlist.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400">
            <AppIcon name="album" class="w-12 h-12 mb-3 text-gray-200" />
            <p class="text-xs font-medium">你还没有添加任何歌曲</p>
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="(song, index) in store.playlist"
              :key="song.hash + '_' + index"
              @contextmenu="handlePlaylistContextMenu($event, song, index)"
              @mouseenter="playlistHoverIndex = index"
              @mouseleave="playlistHoverIndex = -1"
              class="group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
              :style="getPlaylistRowStyle(song, index)"
            >
              <div class="flex items-center flex-1 overflow-hidden">
                <div class="w-4 h-4 mr-3 flex items-center justify-center flex-shrink-0">
                  <AppIcon v-if="store.currentSong?.hash === song.hash && store.isPlaying" name="volume-high" class="w-4 h-4 text-blue-600 animate-pulse" />
                  <span v-else class="text-xs text-gray-400 dark:text-slate-400 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">{{ index + 1 }}</span>
                </div>
                <div class="flex-1 pl-2 text-xs font-medium flex flex-col justify-center overflow-hidden">
                  <div class="flex items-center">
                    <span class="truncate text-gray-800 dark:text-slate-100" :class="{ '!text-blue-600 dark:!text-blue-400': store.currentSong?.hash === song.hash }">{{ song.name }}</span>
                    <span v-if="song.is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none">付费</span>
                    <span v-else-if="song.is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none">VIP</span>
                  </div>
                  <SingerLink :singers="song._singers || song.artists" :singer-name="song.singer" :singer-id="song.singer_id" size="small" :disabled="isNeteaseImportSong(song)" disabled-tooltip="网易导入歌曲暂不支持跳转" />
                </div>
              </div>
              <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                <button @click.stop="store.playSong(song)" class="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 no-drag"><AppIcon name="play" class="w-4 h-4" /></button>
                <button @click.stop="store.removeFromPlaylist(index)" class="text-gray-400 dark:text-slate-500 hover:text-red-500 p-1 no-drag"><AppIcon name="close" class="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </footer>

  <Teleport to="body">
    <transition name="lyric-fade">
      <div v-if="store.isLyricsVisible" class="fixed top-0 left-0 w-full h-[calc(100vh-80px)] z-[45] flex flex-col no-drag overflow-hidden" :class="isDark ? 'text-slate-100' : 'text-gray-900'" tabindex="-1" @keydown.escape="store.toggleLyrics()">
        <div class="absolute inset-0 -z-30" :class="isDark ? 'bg-slate-950' : 'bg-[#f8f9fa]'"></div>
        <div class="absolute inset-0 bg-cover bg-center scale-125 transition-all duration-[2s] ease-out blur-[100px] saturate-200 -z-20" :class="isDark ? 'opacity-25' : 'opacity-40'" :style="{ backgroundImage: `url(${store.currentSong?.cover || defaultImg})` }"></div>
        <div class="absolute inset-0 backdrop-blur-3xl -z-10" :class="isDark ? 'bg-slate-950/80' : 'bg-white/60'"></div>
        
        <div v-if="store.isCurrentSongPreview" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-100/90 backdrop-blur-md border border-orange-200 text-orange-600 px-6 py-2 rounded-full text-xs font-bold shadow-lg flex items-center transition-all">
          <AppIcon name="warning" class="w-4 h-4 mr-2" />
          当前为试听片段，由于服务端直接从高潮部分截断，歌词时间轴可能无法与音频完全匹配
        </div>

        <div class="relative w-full h-16 flex items-center justify-between px-8 drag-region z-50">
          <button @click="store.toggleLyrics" class="no-drag w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200/50 dark:hover:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 transition-colors" v-tooltip="'收起歌词'">
            <AppIcon name="chevron-down" class="w-7 h-7" />
          </button>
        </div>

        <div class="flex-1 flex flex-row px-12 lg:px-24 max-w-[1400px] mx-auto w-full z-10 gap-16 lg:gap-24 items-center">
           <div class="w-5/12 flex items-center justify-center relative">
            <div class="relative">
              <div class="w-[340px] h-[340px] xl:w-[420px] xl:h-[420px] rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-[2px] border-gray-200/50 bg-gradient-to-br from-[#111] to-[#1a1a1a]"
                   :style="{ transform: `rotate(${discRotation}deg)` }">
               <div class="absolute inset-0 rounded-full pointer-events-none opacity-40" style="background: repeating-radial-gradient(#111 0px, #1c1c1c 2px, #111 4px);"></div>
               <div class="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-50" style="background: conic-gradient(from 45deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0) 70%);"></div>
               <img :src="store.currentSong?.cover || defaultImg" :alt="store.currentSong?.name || '唱片'" class="w-[65%] h-[65%] rounded-full object-cover shadow-[0_0_20px_rgba(0,0,0,0.9)] z-10" />
              </div>
            </div>
          </div>
          
          <div class="w-7/12 flex flex-col h-[75vh] relative">
            <div class="flex flex-col items-center justify-center mb-10 flex-shrink-0 w-full transition-all">
              <div class="flex items-center justify-center mb-4 w-full">
                <h2 class="text-3xl xl:text-4xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight truncate max-w-[80%] text-center">{{ store.currentSong?.name }}</h2>
              </div>
              <div class="flex items-center justify-center text-sm text-gray-500 dark:text-slate-400 space-x-8 font-medium w-full">
                <span 
                  @click="goToAlbum(store.currentSong)"
                  class="truncate max-w-[45%] text-center transition-colors" 
                  :class="!isNeteaseImportSong(store.currentSong) && store.currentSong?.album_id ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default'"
                  v-tooltip="isNeteaseImportSong(store.currentSong) ? '网易导入歌曲暂不支持跳转' : store.currentSong?.album">
                  专辑：{{ store.currentSong?.album || '未知专辑' }}
                </span>
                <span class="truncate max-w-[45%] text-center transition-colors flex items-center justify-center gap-1" :class="isNeteaseImportSong(store.currentSong) ? 'pointer-events-none cursor-default' : ''" v-tooltip="isNeteaseImportSong(store.currentSong) ? '网易导入歌曲暂不支持跳转' : store.currentSong?.singer">
                  <span class="flex-shrink-0">歌手：</span><SingerLink v-if="store.currentSong" :singers="store.currentSong._singers || store.currentSong.artists" :singer-name="store.currentSong.singer" :singer-id="store.currentSong.singer_id" />
                </span>
              </div>
            </div>
            
            <div class="flex-1 relative mask-gradient overflow-hidden w-full">
              <div v-if="parsedLyrics.length === 0" class="absolute inset-0 flex items-center justify-center px-4">
                <p class="text-xl text-gray-400 font-medium tracking-widest text-center">当前歌曲暂无歌词，请欣赏纯音乐</p>
              </div>
              
              <ul v-else ref="lyricsContainer" class="absolute inset-0 overflow-y-auto custom-scrollbar-hidden w-full scroll-smooth px-4">
                <div class="w-full pointer-events-none" style="height: 38vh;"></div>
                
                <li v-for="(line, index) in parsedLyrics" :key="index"
                    @click="seekToLyric(line.time)"
                    class="transition-all duration-300 ease-out origin-center cursor-pointer flex flex-col items-center justify-center text-center group mb-4 lg:mb-5 w-full"
                    :class="index === activeLyricIndex ? 'scale-[1.03]' : 'hover:scale-[1.01]'">
                  <!-- 激活行且有逐字数据 -->
                  <div v-if="index === activeLyricIndex && line.words && line.words.length > 0"
                       class="leading-relaxed px-4 text-center lyric-inapp-karaoke font-bold text-xl lg:text-2xl text-gray-400/50 dark:text-slate-500/60">
                    <span v-for="(w, wIdx) in line.words" :key="wIdx" class="k-inapp-char-box">
                      <span class="k-inapp-char-base">{{ w.text }}</span>
                      <span class="k-inapp-char-fill text-gray-900 dark:text-slate-50"
                            :style="{ width: `${getInAppCharProgress(w)}%` }">
                        {{ w.text }}
                      </span>
                    </span>
                  </div>
                  <!-- 非激活行或无逐字数据的行 -->
                  <span v-else
                        class="leading-relaxed px-4 transition-colors duration-300"
                        :class="index === activeLyricIndex ? 'text-gray-900 dark:text-slate-50 font-bold text-xl lg:text-2xl' : 'text-gray-400 dark:text-slate-500 font-normal text-lg lg:text-xl hover:text-gray-500 dark:hover:text-slate-300'">
                    {{ line.text }}
                  </span>
                  <span v-if="line.translation" class="px-4 mt-1 transition-colors duration-300 leading-snug"
                        :class="index === activeLyricIndex ? 'text-gray-500 dark:text-slate-300 font-semibold text-[0.85em] lg:text-base' : 'text-gray-300/60 dark:text-slate-600 font-medium text-[0.8em] lg:text-sm'">
                    {{ line.translation }}
                  </span>
                </li>
                
                <div class="w-full pointer-events-none" style="height: 38vh;"></div>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore, QUALITY_CONFIG } from '../store/playerStore';
import { useUserStore } from '../store/userStore';
import request from '../utils/request';
import { openSongContextMenu } from '../utils/songContextMenu';
import SingerLink from '../components/SingerLink.vue';
import { useTheme } from '../composables/useTheme';

const store = usePlayerStore();
const userStore = useUserStore();
const router = useRouter();
const { isDark } = useTheme();
const titleViewportRef = ref(null);
const titleTextRef = ref(null);
const isTitleOverflow = ref(false);

const discRotation = ref(0);
let discAnimFrame = null;
let discLastTime = 0;
let discSpeed = 0;
const DISC_RPM = 360 / 20;
const DISC_FRICTION = 0.985;

const updateTitleOverflow = async () => {
  await nextTick();
  const viewport = titleViewportRef.value;
  const text = titleTextRef.value?.querySelector('.player-title-text');
  if (!viewport || !text) {
    isTitleOverflow.value = false;
    return;
  }
  isTitleOverflow.value = text.scrollWidth > viewport.clientWidth + 2;
};

const animateDisc = (timestamp) => {
  if (!discLastTime) discLastTime = timestamp;
  const dt = Math.min((timestamp - discLastTime) / 1000, 0.1);
  discLastTime = timestamp;

  if (store.isPlaying) {
    discSpeed = DISC_RPM;
  } else {
    discSpeed *= Math.pow(DISC_FRICTION, dt * 60);
    if (discSpeed < 0.1) {
      discSpeed = 0;
      discLastTime = 0;
      discAnimFrame = null;
      return;
    }
  }
  discRotation.value = (discRotation.value + discSpeed * dt) % 360;
  discAnimFrame = requestAnimationFrame(animateDisc);
};

const startDiscAnimation = () => {
  if (!discAnimFrame) {
    discLastTime = 0;
    discAnimFrame = requestAnimationFrame(animateDisc);
  }
};

watch(() => store.isPlaying, (playing) => {
  if (playing) startDiscAnimation();
});

startDiscAnimation();

const playlistPanelRef = ref(null);
const playlistBtnRef = ref(null);
const qualityMenuRef = ref(null);
const qualityMenuOpen = ref(false);
const boostMenuRef = ref(null);
const boostMenuOpen = ref(false);
const playlistHoverIndex = ref(-1);
const boostLevels = [
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' }
];

const qualityOptions = QUALITY_CONFIG.map(q => ({
  ...q,
  short: q.name.includes(' ') ? q.name.split(' ')[1] : q.name.replace('音质', '').replace('超清', ''),
  isVip: ['viper_atmos', 'viper_clear', 'high', 'sq'].includes(q.key)
}));

const qualityMenuOptions = computed(() => qualityOptions.map(q => ({
  ...q,
  disabled: isNeteaseImportSong(store.currentSong) && !store.currentSong?.qualities?.[q.key]
})));

const qualityDisplayName = computed(() => {
  return qualityOptions.find(q => q.key === store.currentQuality)?.short || '标准';
});

const handleQualitySelect = (quality) => {
  if (quality.disabled) {
    store.showToast('当前网易歌曲未提供该音质');
    return;
  }
  qualityMenuOpen.value = false;
  store.switchQuality(quality.key);
};

const boostTip = computed(() => {
  if (boostMenuOpen.value) return '';
  return store.volumeBoostEnabled ? `音量增强：${Math.round(store.volumeBoostLevel * 100)}%` : '音量增强：关';
});

const goToArtist = (id) => {
  if (!id || id === '0') return store.showToast('暂无该歌手详情信息');
  if (store.isLyricsVisible) store.toggleLyrics();
  if (store.isPlaylistVisible) store.isPlaylistVisible = false;
  router.push(`/artist/${id}`);
};

const goToAlbum = (song) => {
  if (isNeteaseImportSong(song)) return;
  const id = song?.album_id;
  if (!id || id === '0') return store.showToast('暂无该专辑详情信息');
  if (store.isLyricsVisible) store.toggleLyrics();
  if (store.isPlaylistVisible) store.isPlaylistVisible = false;
  router.push(`/album/${id}`);
};

const handleClickOutside = (event) => {
  if (store.isPlaylistVisible) {
    const isClickInsidePanel = playlistPanelRef.value?.contains(event.target);
    const isClickOnBtn = playlistBtnRef.value?.contains(event.target);
    const isClickOnQualityMenu = qualityMenuRef.value?.contains(event.target);
    const isClickOnBoostMenu = boostMenuRef.value?.contains(event.target);
    if (!isClickInsidePanel && !isClickOnBtn && !isClickOnQualityMenu && !isClickOnBoostMenu) {
      store.isPlaylistVisible = false;
    }
  }
  if (qualityMenuOpen.value) {
    const isClickOnQualityMenu = qualityMenuRef.value?.contains(event.target);
    if (!isClickOnQualityMenu) {
      qualityMenuOpen.value = false;
    }
  }
  if (boostMenuOpen.value) {
    const isClickOnBoostMenu = boostMenuRef.value?.contains(event.target);
    if (!isClickOnBoostMenu) {
      boostMenuOpen.value = false;
    }
  }
};

const handleGlobalKeyDown = (e) => {
  const target = e.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
  if (e.code === 'Space' || e.key === 'MediaPlayPause') {
    e.preventDefault();
    store.togglePlay();
  }
};

onMounted(() => {
  store.initAudio();
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('resize', updateTitleOverflow);
  if (window.lyricAPI) window.lyricAPI.onReady(syncLyricToDesktop);
  updateTitleOverflow();
});

onUnmounted(() => {
  if (discAnimFrame) cancelAnimationFrame(discAnimFrame);
  stopInAppLyricAnim();
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('resize', updateTitleOverflow);
  if (window.lyricAPI) window.lyricAPI.onReady(null);
});

const isDragging = ref(false);
const dragTime = ref(0);

const displayTime = computed(() => {
  return isDragging.value ? dragTime.value : store.currentTime;
});

const peakDisplayTime = computed(() => {
  if (!store.peakMode) return displayTime.value;
  if (isDragging.value) return dragTime.value;
  const elapsed = store.currentTime - store.peakStartOffset;
  return Math.max(0, Math.min(elapsed, store.peakDuration));
});

const peakMaxDuration = computed(() => {
  if (!store.peakMode) return store.duration || 0;
  return store.peakDuration || 30;
});

const progressPercentage = computed(() => {
  if (!store.duration) return 0;
  return (displayTime.value / store.duration) * 100;
});

const peakProgressPercentage = computed(() => {
  if (store.peakMode) {
    const maxD = store.peakDuration || 30;
    if (maxD <= 0) return 0;
    return (peakDisplayTime.value / maxD) * 100;
  }
  return progressPercentage.value;
});

const isCurrentLiked = computed(() => {
  if (!store.currentSong) return false;
  return userStore.likedHashes.includes((store.currentSong.hash || '').toUpperCase());
});

const getPlaylistRowStyle = (song, index) => {
  const isCurrent = store.currentSong?.hash === song.hash;
  const isHovered = playlistHoverIndex.value === index;

  if (isDark.value) {
    if (isCurrent && isHovered) return { backgroundColor: 'rgba(51, 65, 85, 0.92)' };
    if (isCurrent) return { backgroundColor: 'rgba(30, 41, 59, 0.86)' };
    if (isHovered) return { backgroundColor: 'rgba(30, 41, 59, 0.78)' };
    return { backgroundColor: 'transparent' };
  }

  if (isCurrent && isHovered) return { backgroundColor: 'rgba(219, 234, 254, 0.86)' };
  if (isCurrent) return { backgroundColor: 'rgba(239, 246, 255, 0.76)' };
  if (isHovered) return { backgroundColor: 'rgba(249, 250, 251, 0.95)' };
  return { backgroundColor: 'transparent' };
};

const playModeTip = computed(() => {
  if (store.playMode === 'sequence') return '列表循环';
  if (store.playMode === 'loop') return '单曲循环';
  return '随机播放';
});

const handlePlaylistContextMenu = (event, song, index) => {
  openSongContextMenu(event, song, { source: 'playlist', index });
};

const handleDrag = (e) => {
  isDragging.value = true;
  dragTime.value = Number(e.target.value);
};

const handlePeakDragEnd = (e) => {
  if (store.peakMode) {
    store.seek(store.peakStartOffset + Number(e.target.value));
  } else {
    store.seek(Number(e.target.value));
  }
  isDragging.value = false;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const isLyricLoading = ref(false);
const parsedLyrics = ref([]);
const lyricsContainer = ref(null);
const lyricError = ref(''); 
const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const isNeteaseImportSong = (song) => {
  return song?.source === 'netease-import' || String(song?.hash || '').startsWith('netease:');
};

const getNeteaseSongId = (song) => {
  return String(song?.neteaseId || song?.songId || song?.id || song?.hash || '')
    .replace(/^netease:/, '')
    .trim();
};

const parseTimedLyricRows = (lyricStr = '') => {
  const rows = [];
  const lrcExp = /\[(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  lyricStr.split('\n').forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    const matches = [...line.matchAll(lrcExp)];
    if (matches.length === 0) return;

    const text = line.replace(lrcExp, '').trim();
    if (!text) return;

    matches.forEach(match => {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      let ms = 0;
      if (msStr.length === 1) ms = parseInt(msStr, 10) * 100;
      else if (msStr.length === 2) ms = parseInt(msStr, 10) * 10;
      else ms = parseInt(msStr, 10);
      rows.push({ time: (min * 60) + sec + (ms / 1000), text });
    });
  });

  return rows.sort((a, b) => a.time - b.time);
};

const parseLyrics = (lyricStr, translationArr) => {
  if (!lyricStr) return [];
  const lines = lyricStr.split('\n');
  const result = [];
  const lrcExp = /\[(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const krcExp = /^\[(\d+),(\d+)\]/;

  let offset = 0;
  const offsetMatch = lyricStr.match(/\[offset:([+-]?\d+)\]/i);
  if (offsetMatch) offset = parseInt(offsetMatch[1], 10) / 1000;

  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    const krcMatch = line.match(krcExp);
    if (krcMatch) {
      const lineStartSec = (parseInt(krcMatch[1], 10) / 1000) + offset;
      const lineDurationSec = Math.max(0.1, parseInt(krcMatch[2], 10) / 1000);
      const afterKrc = line.replace(krcExp, '');

      const words = [];
      const wordRegex = /<(\d+),(\d+),\d*>([^<]*)/g;
      let match;
      while ((match = wordRegex.exec(afterKrc)) !== null) {
        const relStartMs = parseInt(match[1], 10);
        const durMs = parseInt(match[2], 10);
        const wordText = match[3];
        if (wordText) {
          const wStart = lineStartSec + (relStartMs / 1000);
          const wDur = Math.max(0.01, durMs / 1000);
          words.push({
            text: wordText,
            startTime: wStart,
            duration: wDur,
            endTime: wStart + wDur
          });
        }
      }

      const text = words.length > 0
        ? words.map(w => w.text).join('').trim()
        : afterKrc.replace(/<\d+,\d+,\d+(?:,\d+)?>/g, '').trim();

      if (text) {
        let finalWords = words;
        if (finalWords.length === 0) {
          const chars = Array.from(text);
          if (chars.length > 0) {
            const charDur = lineDurationSec / chars.length;
            finalWords = chars.map((ch, cIdx) => ({
              text: ch,
              startTime: lineStartSec + (cIdx * charDur),
              duration: charDur,
              endTime: lineStartSec + ((cIdx + 1) * charDur)
            }));
          }
        }
        const translation = getTranslationForLine(translationArr, lineStartSec, lineIndex);
        result.push({
          time: lineStartSec,
          duration: lineDurationSec,
          text,
          words: finalWords,
          translation
        });
        lineIndex++;
      }
      continue;
    }

    const matches = [...line.matchAll(lrcExp)];
    if (matches.length > 0) {
      const cleanLine = line.replace(/<\d+,\d+,\d+(?:,\d+)?>/g, '');
      const text = cleanLine.replace(lrcExp, '').trim();
      if (text) {
        matches.forEach(match => {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const msStr = match[3] || '0';
          let ms = 0;
          if (msStr.length === 1) ms = parseInt(msStr, 10) * 100;
          else if (msStr.length === 2) ms = parseInt(msStr, 10) * 10;
          else ms = parseInt(msStr, 10);
          const timeInSeconds = (min * 60) + sec + (ms / 1000) + offset;
          const translation = getTranslationForLine(translationArr, timeInSeconds, lineIndex);
          result.push({
            time: timeInSeconds,
            duration: 0,
            text,
            words: [],
            translation
          });
        });
        lineIndex++;
      }
    }
  }

  result.sort((a, b) => a.time - b.time);

  for (let i = 0; i < result.length; i++) {
    if (!result[i].duration || result[i].duration <= 0) {
      const next = result[i + 1];
      const dur = next ? Math.max(0.5, Math.min(10, next.time - result[i].time)) : 4.5;
      result[i].duration = dur;
    }
    if (!result[i].words || result[i].words.length === 0) {
      const chars = Array.from(result[i].text);
      if (chars.length > 0) {
        const charDur = result[i].duration / chars.length;
        result[i].words = chars.map((ch, cIdx) => ({
          text: ch,
          startTime: result[i].time + (cIdx * charDur),
          duration: charDur,
          endTime: result[i].time + ((cIdx + 1) * charDur)
        }));
      }
    }
  }

  return result;
};

const getTranslationForLine = (translationArr, time, lineIndex) => {
  if (!Array.isArray(translationArr)) return '';
  const timedTranslation = translationArr.find(item => {
    return item && typeof item === 'object' && Math.abs(Number(item.time) - time) < 0.35;
  });
  if (timedTranslation) return timedTranslation.text || '';
  return typeof translationArr[lineIndex] === 'string' ? translationArr[lineIndex] : '';
};

const fetchNeteaseLyrics = async (targetHash) => {
  const neteaseId = getNeteaseSongId(store.currentSong);
  if (!neteaseId) throw new Error('缺少网易云歌曲 ID');

  const res = await request.get('/netease/lyric', {
    params: { id: neteaseId, timestamp: Date.now() },
    silent: true,
  });

  if (store.currentSong?.hash !== targetHash) return;

  const rawStr = res?.lrc?.lyric || res?.lyric || '';
  if (!rawStr) throw new Error('网易云暂无该歌曲歌词');

  const translationRows = parseTimedLyricRows(res?.tlyric?.lyric || '');
  const parsed = parseLyrics(rawStr, translationRows);
  if (parsed.length === 0) throw new Error('未能提取出有效时间轴');
  parsedLyrics.value = parsed;
};

const fetchLyrics = async () => {
  if (!store.currentSong) {
    parsedLyrics.value = [];
    lyricError.value = '';
    return;
  }
  const targetHash = store.currentSong.hash;
  isLyricLoading.value = true;
  parsedLyrics.value = [];
  lyricError.value = '';
  
  try {
    if (isNeteaseImportSong(store.currentSong)) {
      await fetchNeteaseLyrics(targetHash);
      return;
    }

    const keywordStr = store.currentSong.singer ? `${store.currentSong.singer} - ${store.currentSong.name}` : store.currentSong.name;
    const standardHash = store.currentSong.qualities?.standard || store.currentSong.hash;

    let candidatesList = [];
    if (standardHash) {
      const res1 = await request.get('/search/lyric', { params: { keywords: keywordStr, hash: standardHash, man: 'yes', timestamp: Date.now() }, silent: true }).catch(() => null);
      if (res1?.candidates?.length > 0) candidatesList = res1.candidates;
    }

    if (candidatesList.length === 0) {
      const durationMs = store.duration ? Math.floor(store.duration * 1000) : 0;
      let params = { keywords: keywordStr, man: 'yes', timestamp: Date.now() };
      if (durationMs > 0) params.duration = durationMs;
      const res2 = await request.get('/search/lyric', { params, silent: true }).catch(() => null);
      if (res2?.candidates?.length > 0) candidatesList = res2.candidates;
    }

    if (candidatesList.length === 0) throw new Error('未找到该歌曲的歌词通行证');
    let candidate = candidatesList.find(c => c.product_from !== 'ugc');
    if (!candidate) candidate = candidatesList[0]; 
    if (!candidate || !candidate.id || !candidate.accesskey) throw new Error('歌词数据异常');
    
    const resLyr = await request.get('/lyric', { params: { id: candidate.id, accesskey: candidate.accesskey, decode: true, timestamp: Date.now() }, silent: true });
    if (store.currentSong?.hash !== targetHash) return;

    const rawStr = resLyr.decodeContent || resLyr.content || '';
    if (!rawStr) throw new Error('API 返回了空歌词文本');

    const translationArr = resLyr.translation || null;
    const parsed = parseLyrics(rawStr, translationArr);
    if (parsed.length === 0) throw new Error('未能提取出有效时间轴。');
    parsedLyrics.value = parsed;
  } catch (error) {
    if (store.currentSong?.hash !== targetHash) return; 
    parsedLyrics.value = [];
    lyricError.value = error.message;
  } finally {
    if (store.currentSong?.hash === targetHash) isLyricLoading.value = false;
  }
};

const activeLyricIndex = computed(() => {
  if (parsedLyrics.value.length === 0) return -1;
  const time = store.currentTime;
  if (time < parsedLyrics.value[0].time) return -1;
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (time >= parsedLyrics.value[i].time) return i;
  }
  return -1;
});

const scrollToActiveLyric = () => {
  if (!lyricsContainer.value || activeLyricIndex.value < 0) return;
  const container = lyricsContainer.value;
  const lis = container.querySelectorAll('li');
  const activeEl = lis[activeLyricIndex.value];
  if (activeEl) {
    const targetScrollTop = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
  }
};

const syncLyricToDesktop = () => {
  if (window.lyricAPI && store.isDesktopLyricVisible) {
    let curr = '听见好时光';
    let next = '概念音乐 Desktop';
    let trans = '';
    let words = [];
    let lineStartTime = 0;
    let lineDuration = 0;
    
    if (parsedLyrics.value.length > 0 && activeLyricIndex.value >= 0) {
      const curLine = parsedLyrics.value[activeLyricIndex.value];
      const nextLine = parsedLyrics.value[activeLyricIndex.value + 1];
      curr = curLine?.text || curr;
      next = nextLine?.text || '';
      trans = curLine?.translation || '';
      if (Array.isArray(curLine?.words)) {
        words = curLine.words.map(w => ({
          text: String(w.text || ''),
          startTime: Number(w.startTime || 0),
          duration: Number(w.duration || 0),
          endTime: Number(w.endTime || 0)
        }));
      }
      lineStartTime = Number(curLine?.time ?? 0);
      lineDuration = Number(curLine?.duration ?? (nextLine ? Math.max(0.5, nextLine.time - curLine.time) : 5));
    } else if (store.currentSong) {
      curr = store.currentSong.name || curr;
      next = store.currentSong.singer || '';
    }
    
    try {
      window.lyricAPI.sync({
        currentText: String(curr),
        nextText: String(next),
        currentTranslation: String(trans),
        isPlaying: Boolean(store.isPlaying),
        currentTime: Number(store.currentTime || 0),
        lineStartTime,
        lineDuration,
        words,
        lineIndex: activeLyricIndex.value,
        sentAt: Date.now()
      });
    } catch (err) {
      console.error('syncLyricToDesktop error:', err);
    }
  }
};

const inAppPlayTime = ref(0);
let inAppAnimFrame = null;
let lastAudioTime = 0;
let lastAudioTimestamp = performance.now();

const getInAppCharProgress = (w) => {
  const t = inAppPlayTime.value;
  if (!w || !w.duration || t <= w.startTime) return 0;
  if (t >= w.endTime) return 100;
  const p = ((t - w.startTime) / w.duration) * 100;
  return Math.max(0, Math.min(100, p));
};

const startInAppLyricAnim = () => {
  if (inAppAnimFrame) return;
  const loop = () => {
    if (!store.isLyricsVisible || !store.isPlaying) {
      inAppAnimFrame = null;
      return;
    }
    const elapsed = (performance.now() - lastAudioTimestamp) / 1000;
    inAppPlayTime.value = lastAudioTime + elapsed;
    inAppAnimFrame = requestAnimationFrame(loop);
  };
  inAppAnimFrame = requestAnimationFrame(loop);
};

const stopInAppLyricAnim = () => {
  if (inAppAnimFrame) {
    cancelAnimationFrame(inAppAnimFrame);
    inAppAnimFrame = null;
  }
};

watch(activeLyricIndex, () => {
  scrollToActiveLyric();
  syncLyricToDesktop();
});

watch(() => store.isPlaying, () => {
  syncLyricToDesktop();
});

watch([() => store.isLyricsVisible, () => store.isPlaying], ([visible, playing]) => {
  if (visible && playing) {
    lastAudioTime = store.currentTime;
    lastAudioTimestamp = performance.now();
    inAppPlayTime.value = store.currentTime;
    startInAppLyricAnim();
  } else {
    stopInAppLyricAnim();
    inAppPlayTime.value = store.currentTime;
  }
});

watch(() => store.currentTime, (t) => {
  lastAudioTime = t;
  lastAudioTimestamp = performance.now();
  if (!store.isPlaying || !store.isLyricsVisible) {
    inAppPlayTime.value = t;
  }
  if (store.isDesktopLyricVisible) {
    syncLyricToDesktop();
  }
});

watch(() => store.isDesktopLyricVisible, (visible) => {
  if (visible) {
    if (parsedLyrics.value.length === 0) fetchLyrics();
    syncLyricToDesktop();
  }
});

watch(() => store.currentSong?.hash, (newHash) => {
  parsedLyrics.value = [];
  lyricError.value = '';
  updateTitleOverflow();
  syncLyricToDesktop();
  if (newHash && (store.isLyricsVisible || store.isDesktopLyricVisible)) fetchLyrics();
});

watch(() => store.isLyricsVisible, async (visible) => {
  if (visible && parsedLyrics.value.length === 0) fetchLyrics();
  if (visible && parsedLyrics.value.length > 0) {
    await nextTick();
    setTimeout(() => { scrollToActiveLyric(); }, 150);
  }
});

watch(parsedLyrics, async (newLyrics) => {
  if (store.isLyricsVisible && newLyrics.length > 0) {
    await nextTick();
    setTimeout(() => { scrollToActiveLyric(); }, 150);
  }
  syncLyricToDesktop();
});

const seekToLyric = (time) => {
  if (time > store.duration) {
    if (store.isCurrentSongPreview) {
      store.showToast('试听版时长有限，无法跨越到音频空白区');
    }
    return;
  }
  store.seek(time);
};

const openLyricsPage = () => {
  store.toggleLyrics();
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 10px); }
.lyric-fade-enter-active, .lyric-fade-leave-active { transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1); }
.lyric-fade-enter-from, .lyric-fade-leave-to { opacity: 0; transform: scale(0.97); }
.custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
.custom-scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
.mask-gradient { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); }

.lyric-inapp-karaoke {
  position: relative;
  display: block;
  text-align: center;
  max-width: 100%;
  word-break: break-word;
  white-space: normal;
}

.k-inapp-char-box {
  position: relative;
  display: inline-block;
  white-space: pre;
  vertical-align: baseline;
}

.k-inapp-char-base {
  display: inline;
  color: inherit;
}

.k-inapp-char-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  overflow: hidden;
  white-space: pre;
  pointer-events: none;
  will-change: width;
}

.player-title-viewport {
  display: inline-flex;
  max-width: 190px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.player-title-track {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.player-title-track.is-marquee {
  min-width: max-content;
  animation: player-title-marquee 11s linear infinite;
}

.player-title-viewport:hover .player-title-track.is-marquee {
  animation-play-state: paused;
}

.player-title-text {
  flex-shrink: 0;
}

.player-title-copy {
  padding-left: 2.5rem;
}

@keyframes player-title-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-50% - 1.25rem)); }
}
</style>
