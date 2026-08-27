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
    <!-- 普通窗口内歌词界面 (Normal in-window lyrics page) -->
    <transition name="lyric-fade">
      <div v-if="store.isLyricsVisible && !store.isImmersiveLyrics" class="fixed top-0 left-0 w-full h-[calc(100vh-80px)] z-[45] flex flex-col no-drag overflow-hidden" :class="isDark ? 'text-slate-100' : 'text-gray-900'" tabindex="-1" @keydown.escape="store.toggleLyrics()">
        <div class="absolute inset-0 -z-30" :class="isDark ? 'bg-slate-950' : 'bg-[#f8f9fa]'"></div>
        <div class="absolute inset-0 bg-cover bg-center scale-125 transition-all duration-[2s] ease-out blur-[100px] saturate-200 -z-20" :class="isDark ? 'opacity-25' : 'opacity-40'" :style="{ backgroundImage: `url(${store.currentSong?.cover || defaultImg})` }"></div>
        <div class="absolute inset-0 backdrop-blur-3xl -z-10" :class="isDark ? 'bg-slate-950/80' : 'bg-white/60'"></div>
        
        <div v-if="store.isCurrentSongPreview" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-100/90 backdrop-blur-md border border-orange-200 text-orange-600 px-6 py-2 rounded-full text-xs font-bold shadow-lg flex items-center transition-all">
          <AppIcon name="warning" class="w-4 h-4 mr-2" />
          当前为试听片段，由于服务端直接从高潮部分截断，歌词时间轴可能无法与音频完全匹配
        </div>

        <div class="relative w-full h-16 flex items-center justify-between px-8 drag-region z-50">
          <div class="flex items-center space-x-2 no-drag">
            <button @click="store.toggleLyrics" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200/50 dark:hover:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 transition-colors" v-tooltip="'收起歌词'">
              <AppIcon name="chevron-down" class="w-7 h-7" />
            </button>
            <button @click="store.enterImmersiveLyrics" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200/50 dark:hover:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105 active:scale-95" v-tooltip="'沉浸式全屏歌词 (F11)'">
              <AppIcon name="fullscreen" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 flex flex-row px-12 lg:px-24 max-w-[1400px] mx-auto w-full z-10 gap-16 lg:gap-24 items-center">
           <div class="w-5/12 flex items-center justify-center relative">
            <div class="relative">
              <div class="w-[340px] h-[340px] xl:w-[420px] xl:h-[420px] rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-[2px] border-gray-200/50 bg-gradient-to-br from-[#111] to-[#1a1a1a]"
                   :style="{ transform: `rotate(${discRotation}deg)` }">
               <div class="absolute inset-0 rounded-full pointer-events-none opacity-40" style="background: repeating-radial-gradient(#111 0px, #1c1c1c 2px, #111 4px);"></div>
               <img :src="store.currentSong?.cover || defaultImg" :alt="store.currentSong?.name || '唱片'" class="w-[65%] h-[65%] rounded-full object-cover shadow-[0_0_20px_rgba(0,0,0,0.9)] z-10" />
              </div>
            </div>
          </div>
          
          <div class="w-7/12 flex flex-col h-[75vh] relative">
            <div class="flex flex-col items-center justify-center mb-10 flex-shrink-0 w-full transition-all">
              <div class="flex items-center justify-center mb-3 w-full">
                <h2 
                  class="font-extrabold text-gray-900 dark:text-slate-100 tracking-tight text-center line-clamp-2 max-w-[92%] break-words cursor-default"
                  :class="(store.currentSong?.name || '').length > 20 ? 'text-2xl xl:text-3xl leading-snug' : 'text-3xl xl:text-4xl'"
                  v-tooltip="store.currentSong?.name || ''"
                >
                  {{ store.currentSong?.name }}
                </h2>
              </div>
              <div class="flex items-center justify-center text-sm space-x-8 font-medium w-full">
                <!-- 专辑 -->
                <div class="max-w-[45%] flex items-center justify-center truncate">
                  <span class="text-gray-400 dark:text-slate-500 flex-shrink-0">专辑：</span>
                  <span 
                    @click="goToAlbum(store.currentSong)"
                    class="truncate transition-colors" 
                    :class="!isNeteaseImportSong(store.currentSong) && store.currentSong?.album_id ? 'text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer' : 'text-gray-500 dark:text-slate-400 cursor-default'"
                    v-tooltip="isNeteaseImportSong(store.currentSong) ? '网易导入歌曲暂不支持跳转' : store.currentSong?.album">
                    {{ store.currentSong?.album || '未知专辑' }}
                  </span>
                </div>
                
                <!-- 歌手 -->
                <div class="max-w-[45%] flex items-center justify-center truncate">
                  <span class="text-gray-400 dark:text-slate-500 flex-shrink-0">歌手：</span>
                  <SingerLink 
                    v-if="store.currentSong" 
                    :singers="store.currentSong._singers || store.currentSong.artists" 
                    :singer-name="store.currentSong.singer" 
                    :singer-id="store.currentSong.singer_id"
                    size="sm"
                    class="truncate text-sm"
                    :disabled="isNeteaseImportSong(store.currentSong)"
                    disabled-tooltip="网易导入歌曲暂不支持跳转"
                  />
                  <span v-else class="text-gray-500 dark:text-slate-400">未知歌手</span>
                </div>
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

    <!-- ✨ 沉浸式全屏歌词界面 (Immersive Fullscreen Lyrics Layer) ✨ -->
    <transition name="immersive-fade">
      <div 
        v-if="store.isLyricsVisible && store.isImmersiveLyrics" 
        class="fixed inset-0 w-screen h-screen z-[100] flex flex-col no-drag overflow-hidden select-none bg-slate-950 text-slate-100"
        :class="{ 'cursor-none': isIdle }"
        @mousemove="handleImmersiveMouseMove"
        @click="handleImmersiveMouseMove"
        tabindex="-1"
      >
        <!-- ✨ 沉浸式多引擎动态流光背景系统 (Multi-Engine Dynamic Background System) ✨ -->
        <!-- 引擎 1：🌌 梦幻星空 (Cosmic Starry Universe) -->
        <div v-if="store.immersiveBgMode === 'starry'" class="absolute inset-0 -z-30 overflow-hidden pointer-events-none bg-[#030712]">
          <div 
            class="absolute -inset-[20%] bg-cover bg-center blur-[150px] saturate-150 opacity-20 scale-110"
            :style="{ backgroundImage: `url(${store.currentSong?.cover || defaultImg})` }"
          ></div>
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/50 via-slate-950/90 to-black"></div>
          <div class="absolute inset-0 starry-dust-layer"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-indigo-500/10 blur-[160px] animate-spin-extremely-slow pointer-events-none"></div>
        </div>

        <!-- 引擎 2：🖤 纯黑极简 (Pure OLED Minimalist) -->
        <div v-else-if="store.immersiveBgMode === 'pure'" class="absolute inset-0 -z-30 overflow-hidden pointer-events-none bg-black">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.85)_100%)]"></div>
        </div>

        <!-- 引擎 3：🌈 灵动流光 (Fluid Mesh Gradient - Apple Music Style，默认) -->
        <div v-else class="absolute inset-0 -z-30 overflow-hidden pointer-events-none bg-slate-950">
          <div 
            class="absolute -inset-[25%] bg-cover bg-center blur-[120px] saturate-200 opacity-60 scale-125 transition-all duration-[3s] ease-out animate-ambient-drift"
            :style="{ backgroundImage: `url(${store.currentSong?.cover || defaultImg})` }"
          ></div>
          <div class="absolute -top-[10%] -left-[10%] w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] rounded-full bg-blue-600/30 blur-[130px] animate-fluid-blob-1 pointer-events-none mix-blend-screen"></div>
          <div class="absolute -bottom-[15%] -right-[10%] w-[70vw] h-[70vw] max-w-[850px] max-h-[850px] rounded-full bg-indigo-600/30 blur-[140px] animate-fluid-blob-2 pointer-events-none mix-blend-screen"></div>
          <div class="absolute top-[30%] -right-[15%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-purple-600/25 blur-[120px] animate-fluid-blob-3 pointer-events-none mix-blend-screen"></div>
          <div class="absolute -bottom-[10%] left-[20%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-cyan-600/20 blur-[130px] animate-fluid-blob-4 pointer-events-none mix-blend-screen"></div>
          <div class="absolute inset-0 bg-slate-950/50 backdrop-blur-3xl"></div>
        </div>

        <!-- 试听提示条 -->
        <div v-if="store.isCurrentSongPreview" class="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500/20 backdrop-blur-xl border border-orange-400/40 text-orange-200 px-6 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center transition-all">
          <AppIcon name="warning" class="w-4 h-4 mr-2 text-orange-400" />
          当前为试听片段，由于服务端直接从高潮部分截断，歌词时间轴可能无法与音频完全匹配
        </div>

        <!-- 沉浸式顶部悬浮控制栏 (Top Bar HUD) -->
        <div 
          @mouseenter="isTopBarHovered = true"
          @mouseleave="isTopBarHovered = false"
          class="relative w-full h-20 flex items-center justify-between px-10 z-50 transition-all duration-500 ease-out"
          :class="isIdle ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'"
        >
          <!-- 左侧：视觉模式切换 -->
          <div class="flex items-center">
            <!-- 模式切换胶囊 Pills -->
            <div class="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-inner">
              <button 
                @click="store.setImmersiveLyricMode('vinyl')"
                class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5"
                :class="store.immersiveLyricMode === 'vinyl' ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200'"
              >
                <AppIcon name="disc" class="w-3.5 h-3.5" />
                <span>经典黑胶</span>
              </button>
              <button 
                @click="store.setImmersiveLyricMode('fluid')"
                class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5"
                :class="store.immersiveLyricMode === 'fluid' ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200'"
              >
                <AppIcon name="sparkles" class="w-3.5 h-3.5" />
                <span>动感流体</span>
              </button>
              <button 
                @click="store.setImmersiveLyricMode('poster')"
                class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5"
                :class="store.immersiveLyricMode === 'poster' ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200'"
              >
                <AppIcon name="image" class="w-3.5 h-3.5" />
                <span>纯享海报</span>
              </button>
              <button 
                @click="store.setImmersiveLyricMode('cinematic')"
                class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5"
                :class="store.immersiveLyricMode === 'cinematic' ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-slate-200'"
              >
                <AppIcon name="film" class="w-3.5 h-3.5" />
                <span>映画光影</span>
              </button>
            </div>
          </div>

          <!-- 右侧：背景切换、字号切换、翻译切换、退出沉浸全屏 -->
          <div class="flex items-center space-x-3">
            <!-- 沉浸式背景选择下拉 -->
            <div class="relative">
              <button 
                @click.stop="toggleBgMenu"
                class="h-9 px-3 flex items-center space-x-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white backdrop-blur-md text-xs font-bold transition-all shadow-md active:scale-95"
                v-tooltip="'背景风格 (当前: ' + currentBgLabel + ')'"
              >
                <AppIcon name="palette" class="w-4 h-4" />
                <span>{{ currentBgLabel }}</span>
              </button>

              <!-- 沉浸式背景选择浮层 -->
              <div 
                v-if="isBgMenuOpen" 
                class="absolute right-0 top-11 w-36 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.2)] z-50 flex flex-col space-y-0.5 text-xs select-none"
              >
                <button 
                  v-for="item in bgOptions" 
                  :key="item.value"
                  @click.stop="selectBgMode(item.value)"
                  class="px-3.5 py-2 flex items-center justify-between text-left transition-colors font-medium rounded-xl mx-1"
                  :class="store.immersiveBgMode === item.value ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-300 hover:bg-white/10 hover:text-white'"
                >
                  <span>{{ item.icon }} {{ item.label }}</span>
                  <span v-if="store.immersiveBgMode === item.value" class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                </button>
              </div>
            </div>

            <button 
              @click="cycleFontSize"
              class="h-9 px-3 flex items-center space-x-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white backdrop-blur-md text-xs font-bold transition-all shadow-md active:scale-95"
              v-tooltip="'调节歌词字号 (当前: ' + fontSizeLabel + ')'"
            >
              <AppIcon name="font-size" class="w-4 h-4" />
              <span>{{ fontSizeLabel }}</span>
            </button>

            <button 
              @click="store.toggleImmersiveTranslation()"
              class="w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-md transition-all shadow-md active:scale-95 text-xs font-black"
              :class="store.immersiveShowTranslation ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]' : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'"
              v-tooltip="store.immersiveShowTranslation ? '隐藏翻译歌词' : '显示翻译歌词'"
            >
              译
            </button>

            <button @click.stop="store.exitImmersiveLyrics()" class="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-md ml-1" v-tooltip="'退出全屏 (ESC)'">
              <AppIcon name="close" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 沉浸式主视觉区域 (Main Content Area) -->
        <div class="flex-1 w-full max-w-[1600px] mx-auto px-8 lg:px-16 flex items-center justify-center relative overflow-hidden z-10">
          
          <!-- 模式 1：【经典黑胶模式】(Classic Vinyl) -->
          <div v-if="store.immersiveLyricMode === 'vinyl'" class="w-full h-full flex items-center justify-between gap-12 lg:gap-20">
            <!-- 左侧：唱机与唱盘 + 唱针 -->
            <div class="w-5/12 flex flex-col items-center justify-center relative select-none">
              <VinylTurntable 
                :cover="store.currentSong?.cover || defaultImg"
                :name="store.currentSong?.name || '唱片'"
                :is-playing="store.isPlaying"
                :disc-rotation="discRotation"
                size="immersive"
                :show-tonearm="false"
              />

              <!-- 歌曲核心信息展示 -->
              <div class="mt-8 flex flex-col items-center text-center max-w-[90%]">
                <h3 
                  class="font-black text-white tracking-tight line-clamp-2 w-full drop-shadow-md cursor-default"
                  :class="(store.currentSong?.name || '').length > 18 ? 'text-xl xl:text-2xl leading-snug' : 'text-2xl xl:text-3xl'"
                  v-tooltip="store.currentSong?.name || ''"
                >
                  {{ store.currentSong?.name || '概念音乐' }}
                </h3>
                <div class="flex items-center space-x-3 mt-2 text-sm text-slate-400 font-medium max-w-full truncate">
                  <span class="truncate max-w-[160px]" v-tooltip="store.currentSong?.singer || '听见好时光'">{{ store.currentSong?.singer || '听见好时光' }}</span>
                  <span v-if="store.currentSong?.album" class="text-slate-600 flex-shrink-0">•</span>
                  <span v-if="store.currentSong?.album" class="truncate max-w-[160px] text-slate-400/80" v-tooltip="store.currentSong.album">{{ store.currentSong.album }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：大字号流畅逐字歌词 -->
            <div class="w-7/12 h-[75vh] flex flex-col relative mask-gradient">
              <div v-if="parsedLyrics.length === 0" class="flex-1 flex items-center justify-center text-slate-400 text-xl font-medium tracking-widest">
                当前歌曲暂无歌词，请欣赏纯音乐
              </div>
              <ul v-else ref="immersiveLyricsContainer" class="flex-1 overflow-y-auto custom-scrollbar-hidden w-full scroll-smooth px-6 py-10">
                <div class="w-full pointer-events-none" style="height: 34vh;"></div>
                
                <li 
                  v-for="(line, index) in parsedLyrics" 
                  :key="'imm-vinyl-' + index"
                  @click="seekToLyric(line.time)"
                  class="immersive-lyric-item transition-all duration-300 ease-out origin-center cursor-pointer flex flex-col items-center justify-center text-center mb-6 w-full group"
                  :class="[
                    index === activeLyricIndex ? 'scale-[1.04]' : 'hover:scale-[1.01] opacity-40 hover:opacity-80',
                    getImmersiveFontSizeClass(index === activeLyricIndex)
                  ]"
                >
                  <!-- 逐字精准高亮 -->
                  <div v-if="index === activeLyricIndex && line.words && line.words.length > 0" class="leading-relaxed px-4 text-center lyric-inapp-karaoke font-black text-slate-500/50">
                    <span v-for="(w, wIdx) in line.words" :key="wIdx" class="k-inapp-char-box">
                      <span class="k-inapp-char-base">{{ w.text }}</span>
                      <span class="k-inapp-char-fill text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.7)]" :style="{ width: `${getInAppCharProgress(w)}%` }">
                        {{ w.text }}
                      </span>
                    </span>
                  </div>
                  <!-- 普通非逐字歌词 -->
                  <span v-else class="leading-relaxed px-4 transition-colors duration-300 font-extrabold" :class="index === activeLyricIndex ? 'text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.6)]' : 'text-slate-400 group-hover:text-slate-200'">
                    {{ line.text }}
                  </span>

                  <!-- 翻译歌词 -->
                  <span v-if="store.immersiveShowTranslation && line.translation" class="px-4 mt-2 transition-colors duration-300 leading-snug" :class="index === activeLyricIndex ? 'text-slate-300 font-semibold text-[0.65em]' : 'text-slate-500/70 font-medium text-[0.6em]'">
                    {{ line.translation }}
                  </span>
                </li>

                <div class="w-full pointer-events-none" style="height: 38vh;"></div>
              </ul>
            </div>
          </div>

          <!-- 模式 2：【动感流体大词模式】(Fluid Wave - Apple Music 风格) -->
          <div v-else-if="store.immersiveLyricMode === 'fluid'" class="w-full h-full flex flex-col justify-center relative">
            <!-- 悬浮左上角艺术徽章 -->
            <div class="absolute top-0 left-0 flex items-center space-x-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl z-20 max-w-sm">
              <div class="w-14 h-14 rounded-xl overflow-hidden shadow-lg flex-shrink-0 relative">
                <img :src="store.currentSong?.cover || defaultImg" :alt="store.currentSong?.name" class="w-full h-full object-cover" />
                <div v-if="store.isPlaying" class="absolute inset-0 bg-blue-500/20 animate-pulse"></div>
              </div>
              <div class="flex-1 min-w-0 pr-2">
                <h4 class="text-base font-extrabold text-white truncate">{{ store.currentSong?.name || '概念音乐' }}</h4>
                <p class="text-xs text-slate-400 font-medium truncate mt-0.5">{{ store.currentSong?.singer || '听见好时光' }}</p>
              </div>
            </div>

            <!-- 巨幕流动居中大词 -->
            <div class="w-full h-[76vh] flex flex-col relative mask-gradient">
              <div v-if="parsedLyrics.length === 0" class="flex-1 flex items-center justify-center text-slate-400 text-2xl font-medium tracking-widest">
                当前歌曲暂无歌词，请欣赏纯音乐
              </div>
              <ul v-else ref="immersiveLyricsContainer" class="flex-1 overflow-y-auto custom-scrollbar-hidden w-full scroll-smooth px-8 py-12">
                <div class="w-full pointer-events-none" style="height: 34vh;"></div>
                
                <li 
                  v-for="(line, index) in parsedLyrics" 
                  :key="'imm-fluid-' + index"
                  @click="seekToLyric(line.time)"
                  class="immersive-lyric-item transition-all duration-500 ease-out origin-center cursor-pointer flex flex-col items-center justify-center text-center mb-8 w-full group"
                  :class="[
                    index === activeLyricIndex ? 'scale-[1.06] opacity-100 filter-none' : 'scale-[0.98] opacity-30 hover:opacity-75 blur-[1.5px] hover:blur-0',
                    getFluidFontSizeClass(index === activeLyricIndex)
                  ]"
                >
                  <div v-if="index === activeLyricIndex && line.words && line.words.length > 0" class="leading-tight px-6 text-center lyric-inapp-karaoke font-black text-slate-600/60">
                    <span v-for="(w, wIdx) in line.words" :key="wIdx" class="k-inapp-char-box">
                      <span class="k-inapp-char-base">{{ w.text }}</span>
                      <span class="k-inapp-char-fill text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.85)]" :style="{ width: `${getInAppCharProgress(w)}%` }">
                        {{ w.text }}
                      </span>
                    </span>
                  </div>
                  <span v-else class="leading-tight px-6 transition-all duration-300 font-black" :class="index === activeLyricIndex ? 'text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.85)]' : 'text-slate-400'">
                    {{ line.text }}
                  </span>

                  <span v-if="store.immersiveShowTranslation && line.translation" class="px-6 mt-3 transition-colors duration-300 leading-normal" :class="index === activeLyricIndex ? 'text-slate-300 font-bold text-[0.55em] drop-shadow-md' : 'text-slate-500 font-medium text-[0.5em]'">
                    {{ line.translation }}
                  </span>
                </li>

                <div class="w-full pointer-events-none" style="height: 38vh;"></div>
              </ul>
            </div>
          </div>

          <!-- 模式 3：【纯享海报模式】(Stage Poster) -->
          <div v-else-if="store.immersiveLyricMode === 'poster'" class="w-full h-full flex items-center justify-between gap-12 lg:gap-20">
            <!-- 左侧：3D 悬浮超清专辑大图 (Ken Burns 呼吸动画) -->
            <div class="w-5/12 flex flex-col items-center justify-center relative select-none">
              <div class="relative group">
                <div class="w-[340px] h-[340px] xl:w-[420px] xl:h-[420px] 2xl:w-[460px] 2xl:h-[460px] rounded-3xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.7)] border border-white/20 relative bg-slate-900">
                  <img 
                    :src="store.currentSong?.cover || defaultImg" 
                    :alt="store.currentSong?.name" 
                    class="w-full h-full object-cover transition-transform duration-[12s] ease-in-out hover:scale-110"
                    :class="{ 'animate-kenburns': store.isPlaying }"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                  <div class="absolute bottom-6 left-6 right-6">
                    <span v-if="store.currentQuality" class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600/90 text-white tracking-widest shadow-md inline-block mb-1.5">{{ qualityDisplayName }}</span>
                    <h3 class="text-2xl font-black text-white truncate drop-shadow-lg">{{ store.currentSong?.name }}</h3>
                    <p class="text-sm font-semibold text-slate-300 truncate mt-0.5 drop-shadow-md">{{ store.currentSong?.singer }}</p>
                  </div>
                </div>
                <!-- 底部氛围投影光晕 -->
                <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4/5 h-10 bg-blue-600/30 blur-2xl -z-10 rounded-full"></div>
              </div>
            </div>

            <!-- 右侧：画廊级大字歌词 -->
            <div class="w-7/12 h-[75vh] flex flex-col relative mask-gradient">
              <div v-if="parsedLyrics.length === 0" class="flex-1 flex items-center justify-center text-slate-400 text-xl font-medium tracking-widest">
                当前歌曲暂无歌词，请欣赏纯音乐
              </div>
              <ul v-else ref="immersiveLyricsContainer" class="flex-1 overflow-y-auto custom-scrollbar-hidden w-full scroll-smooth px-6 py-10">
                <div class="w-full pointer-events-none" style="height: 34vh;"></div>
                
                <li 
                  v-for="(line, index) in parsedLyrics" 
                  :key="'imm-poster-' + index"
                  @click="seekToLyric(line.time)"
                  class="immersive-lyric-item transition-all duration-300 ease-out origin-center cursor-pointer flex flex-col items-center justify-center text-center mb-6 w-full group"
                  :class="[
                    index === activeLyricIndex ? 'scale-[1.04]' : 'hover:scale-[1.01] opacity-40 hover:opacity-80',
                    getImmersiveFontSizeClass(index === activeLyricIndex)
                  ]"
                >
                  <div v-if="index === activeLyricIndex && line.words && line.words.length > 0" class="leading-relaxed px-4 text-center lyric-inapp-karaoke font-black text-slate-500/50">
                    <span v-for="(w, wIdx) in line.words" :key="wIdx" class="k-inapp-char-box">
                      <span class="k-inapp-char-base">{{ w.text }}</span>
                      <span class="k-inapp-char-fill text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.7)]" :style="{ width: `${getInAppCharProgress(w)}%` }">
                        {{ w.text }}
                      </span>
                    </span>
                  </div>
                  <span v-else class="leading-relaxed px-4 transition-colors duration-300 font-extrabold" :class="index === activeLyricIndex ? 'text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.6)]' : 'text-slate-400 group-hover:text-slate-200'">
                    {{ line.text }}
                  </span>

                  <span v-if="store.immersiveShowTranslation && line.translation" class="px-4 mt-2 transition-colors duration-300 leading-snug" :class="index === activeLyricIndex ? 'text-slate-300 font-semibold text-[0.65em]' : 'text-slate-500/70 font-medium text-[0.6em]'">
                    {{ line.translation }}
                  </span>
                </li>

                <div class="w-full pointer-events-none" style="height: 38vh;"></div>
              </ul>
            </div>
          </div>

          <!-- 模式 4：【映画光影·逐字音符跳跃与空间波浪错落】(Kinetic Staggered Word Reveal) -->
          <div v-else-if="store.immersiveLyricMode === 'cinematic'" class="w-full h-full flex flex-col justify-center items-center relative overflow-hidden select-none">
            <!-- 悬浮左上角极简微型艺术徽章 (Minimalist Art Float) -->
            <div class="absolute top-0 left-0 flex items-center space-x-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-2xl z-20 max-w-sm transition-all hover:bg-white/10">
              <div class="w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 relative bg-slate-900 border border-white/15">
                <img :src="store.currentSong?.cover || defaultImg" :alt="store.currentSong?.name" class="w-full h-full object-cover" />
                <div v-if="store.isPlaying" class="absolute inset-0 bg-blue-500/20 animate-pulse"></div>
              </div>
              <div class="flex-1 min-w-0 pr-2">
                <h4 class="text-sm font-extrabold text-white truncate drop-shadow-sm">{{ store.currentSong?.name || '概念音乐' }}</h4>
                <p class="text-xs text-slate-400 font-medium truncate mt-0.5">{{ store.currentSong?.singer || '听见好时光' }}</p>
              </div>
            </div>

            <!-- 纯粹双句错落画卷视窗 (Dual-Sentence Kinetic Stage) -->
            <div class="w-full max-w-[1600px] h-[80vh] flex flex-col justify-center items-center relative px-4 sm:px-8 lg:px-12 cinematic-stage-container">
              <div v-if="parsedLyrics.length === 0" class="flex-1 flex items-center justify-center text-slate-400 text-2xl font-medium tracking-widest">
                当前歌曲暂无歌词，请欣赏纯音乐
              </div>

              <div v-else class="w-full h-full flex flex-col justify-center items-center relative mask-gradient">
                <transition name="cinematic-scene" mode="out-in">
                  <div 
                    v-if="currentPairLines.length > 0"
                    :key="'cinematic-pair-' + currentPairIndex"
                    class="cinematic-dual-scene select-none"
                  >
                    <div 
                      v-for="lineItem in currentPairLines"
                      :key="'cin-line-' + lineItem.lineIndex"
                      @click="seekToLyric(lineItem.time)"
                      class="cinematic-line-block group cursor-pointer transition-all duration-500"
                      :class="[
                        lineItem.isFirstInPair ? 'cinematic-line-first' : 'cinematic-line-second',
                        activeLyricIndex === lineItem.lineIndex ? 'is-line-active' : (activeLyricIndex > lineItem.lineIndex ? 'is-line-settled' : 'is-line-pending')
                      ]"
                    >
                      <!-- 逐字高低起伏波浪错落排布 -->
                      <div 
                        class="cinematic-wave-container"
                        :class="getCinematicFontSizeClass()"
                      >
                        <span 
                          v-for="(w, wIdx) in (lineItem.words || [])" 
                          :key="'cword-' + lineItem.lineIndex + '-' + wIdx"
                          class="cinematic-char-unit"
                          :class="{
                            'is-revealed': isWordRevealed(w),
                            'is-singing': isWordSinging(w)
                          }"
                          :style="getCinematicCharStyle(w, wIdx, (lineItem.words || []).length, lineItem.lineIndex)"
                        >
                          {{ w.text }}
                        </span>
                      </div>

                      <!-- 错位斜契译文 (Asymmetrical Offset Sub-text) -->
                      <div 
                        v-if="store.immersiveShowTranslation && lineItem.translation" 
                        class="cinematic-trans-active"
                        :class="[
                          getCinematicTransFontSizeClass(),
                          { 'is-revealed': isAnyWordRevealed(lineItem) }
                        ]"
                      >
                        <span class="cinematic-trans-badge">“</span>
                        <span class="cinematic-trans-content">{{ lineItem.translation }}</span>
                        <span class="cinematic-trans-badge">”</span>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

        </div>

        <!-- 沉浸式底部悬浮流光双层胶囊控制岛 (Harmonious Dual-Tier Liquid Glass Capsule Island) -->
        <div 
          @mouseenter="isBottomBarHovered = true"
          @mouseleave="isBottomBarHovered = false"
          class="fixed bottom-7 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out flex items-center justify-center pointer-events-auto select-none"
          :class="isIdle ? 'translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'"
        >
          <div class="h-[76px] pl-[9px] pr-4 rounded-full bg-white/[0.12] hover:bg-white/[0.15] backdrop-blur-2xl border border-white/20 shadow-[0_18px_42px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] flex items-center space-x-3.5 sm:space-x-4 text-white transition-all">
            
            <!-- 胶囊左侧：加大播放/暂停高亮圆钮，保持与外圈胶囊同心圆同曲率 -->
            <div class="flex items-center flex-shrink-0">
              <button 
                @click="store.togglePlay" 
                class="w-[58px] h-[58px] rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.7)] hover:shadow-[0_0_28px_rgba(37,99,235,0.9)] active:scale-95 transition-all no-drag"
                v-tooltip="store.isPlaying ? '暂停' : '播放'"
              >
                <AppIcon v-if="store.isLoading" name="spinner" spin class="w-[28px] h-[28px]" />
                <AppIcon v-else-if="store.isPlaying" name="pause" class="w-[29px] h-[29px]" />
                <AppIcon v-else name="play" class="w-[29px] h-[29px] ml-1" />
              </button>
            </div>

            <!-- 竖向微细分割线 -->
            <div class="w-px h-6 bg-white/15 flex-shrink-0"></div>

            <!-- 胶囊中间：【双层结构】紧凑居中歌曲名称与适度收窄进度条 -->
            <div class="flex flex-col items-center justify-center w-48 sm:w-56 md:w-64 px-1 min-w-0">
              <!-- 上层：带悬浮上下一首快捷按钮与歌名联动预览的控制行 -->
              <div 
                class="relative flex items-center justify-center w-full mb-1.5 min-w-0 group/nav h-5"
                @mouseleave="hoveredNavMode = 'none'"
              >
                <!-- 左侧：上一首快捷箭头 (悬浮在歌名栏时淡入，仅悬浮在箭头上时显示背景) -->
                <button
                  @click.stop="store.playPrev()"
                  @mouseenter="hoveredNavMode = 'prev'"
                  @mouseleave="hoveredNavMode = 'none'"
                  :disabled="!canPlayPrevOrNext"
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-transparent hover:bg-white/20 text-white/70 hover:text-white opacity-0 group-hover/nav:opacity-100 scale-75 group-hover/nav:scale-100 transition-all duration-200 active:scale-90 no-drag z-10 disabled:opacity-30 disabled:pointer-events-none"
                  v-tooltip="prevButtonTooltip"
                >
                  <AppIcon name="chevron-left" class="w-3.5 h-3.5" />
                </button>

                <!-- 中间：动态歌名显示区 (带方向微位移与对应状态角标) -->
                <div 
                  class="flex items-center justify-center max-w-[calc(100%-48px)] transition-transform duration-200 ease-out overflow-hidden"
                  :class="{
                    '-translate-x-1': hoveredNavMode === 'prev',
                    'translate-x-1': hoveredNavMode === 'next'
                  }"
                  v-tooltip="titleTooltip"
                >
                  <div 
                    ref="capsuleTitleViewportRef" 
                    class="capsule-title-viewport flex items-center min-w-0"
                    :class="{ 'is-overflowing': isCapsuleTitleOverflow }"
                  >
                    <span ref="capsuleTitleTextRef" class="capsule-title-track" :class="{ 'is-marquee': isCapsuleTitleOverflow }">
                      <span 
                        class="text-sm font-extrabold drop-shadow-sm transition-colors duration-150 capsule-title-text"
                        :class="hoveredNavMode !== 'none' ? 'text-blue-100' : 'text-white'"
                      >
                        {{ displayedTitle }}
                      </span>
                      <span 
                        v-if="isCapsuleTitleOverflow" 
                        class="text-sm font-extrabold drop-shadow-sm transition-colors duration-150 capsule-title-text capsule-title-copy"
                        :class="hoveredNavMode !== 'none' ? 'text-blue-100' : 'text-white'" 
                        aria-hidden="true"
                      >
                        {{ displayedTitle }}
                      </span>
                    </span>
                  </div>

                  <!-- 歌曲属性标签 (VIP / 试听 / 付费) -->
                  <span v-if="hoveredNavMode === 'none' && store.isCurrentSongPreview" class="ml-1.5 flex-shrink-0 bg-green-500/20 border border-green-400/40 text-green-300 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase leading-none">试听</span>
                  <span v-else-if="previewSong?.is_paid" class="ml-1.5 flex-shrink-0 bg-orange-500/20 border border-orange-400/40 text-orange-300 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none">付费</span>
                  <span v-else-if="previewSong?.is_vip" class="ml-1.5 flex-shrink-0 bg-blue-500/20 border border-blue-400/40 text-blue-300 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none">VIP</span>
                </div>

                <!-- 右侧：下一首快捷箭头 (悬浮在歌名栏时淡入，仅悬浮在箭头上时显示背景) -->
                <button
                  @click.stop="store.playNext(false)"
                  @mouseenter="hoveredNavMode = 'next'"
                  @mouseleave="hoveredNavMode = 'none'"
                  :disabled="!canPlayPrevOrNext"
                  class="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-transparent hover:bg-white/20 text-white/70 hover:text-white opacity-0 group-hover/nav:opacity-100 scale-75 group-hover/nav:scale-100 transition-all duration-200 active:scale-90 no-drag z-10 disabled:opacity-30 disabled:pointer-events-none"
                  v-tooltip="nextButtonTooltip"
                >
                  <AppIcon name="chevron-right" class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- 下层：紧凑进度条与清晰时间 -->
              <div class="w-full flex items-center space-x-2 text-[11px] font-medium text-white/70">
                <span class="w-7 text-right tabular-nums text-[11px]">{{ formatTime(peakDisplayTime) }}</span>
                <div class="flex-1 relative flex items-center h-2.5 group cursor-pointer no-drag">
                  <input type="range" min="0" :max="peakMaxDuration" :value="peakDisplayTime" @input="handleDrag" @change="handlePeakDragEnd" class="w-full absolute z-10 opacity-0 cursor-pointer h-full m-0">
                  <div class="w-full h-1 rounded-full bg-white/20 overflow-hidden transition-all group-hover:h-1.5">
                    <div class="h-full rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" :style="{ width: peakProgressPercentage + '%' }"></div>
                  </div>
                </div>
                <span class="w-7 text-left tabular-nums text-[11px]">{{ formatTime(peakMaxDuration) }}</span>
              </div>
            </div>

            <!-- 竖向微细分割线 -->
            <div class="w-px h-6 bg-white/15 flex-shrink-0"></div>

            <!-- 胶囊右侧：循环控制按钮与喜欢按钮 -->
            <div class="flex items-center space-x-2 flex-shrink-0">
              <!-- 循环模式切换 -->
              <button 
                @click.stop="store.togglePlayMode" 
                class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 transition-all active:scale-95 no-drag"
                v-tooltip="playModeTip"
              >
                <AppIcon v-if="store.playMode === 'sequence'" name="mode-sequence" class="w-4 h-4" />
                <AppIcon v-else-if="store.playMode === 'loop'" name="mode-loop" class="w-4 h-4" />
                <AppIcon v-else name="mode-random" class="w-4 h-4" />
              </button>

              <!-- 喜欢按钮 -->
              <button 
                @click.stop="store.currentSong && userStore.toggleLikeSong(store.currentSong)" 
                class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-all active:scale-90 no-drag"
                :class="{ 'opacity-50 pointer-events-none': !store.currentSong }"
                v-tooltip="isCurrentLiked ? '取消喜欢' : '添加喜欢'"
              >
                <AppIcon v-if="isCurrentLiked" name="heart-solid" class="w-4 h-4 sm:w-5 sm:h-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <AppIcon v-else name="heart" class="w-4 h-4 sm:w-5 sm:h-5 text-white/70 hover:text-red-400 transition-colors" />
              </button>
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
import VinylTurntable from '../components/VinylTurntable.vue';
import { useTheme } from '../composables/useTheme';

const store = usePlayerStore();
const userStore = useUserStore();
const router = useRouter();
const { isDark } = useTheme();
const titleViewportRef = ref(null);
const titleTextRef = ref(null);
const isTitleOverflow = ref(false);
const capsuleTitleViewportRef = ref(null);
const capsuleTitleTextRef = ref(null);
const isCapsuleTitleOverflow = ref(false);

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
  } else {
    isTitleOverflow.value = text.scrollWidth > viewport.clientWidth + 2;
  }

  const capsuleViewport = capsuleTitleViewportRef.value;
  const capsuleText = capsuleTitleTextRef.value?.querySelector('.capsule-title-text');
  if (!capsuleViewport || !capsuleText) {
    isCapsuleTitleOverflow.value = false;
  } else {
    isCapsuleTitleOverflow.value = capsuleText.scrollWidth > capsuleViewport.clientWidth + 2;
  }
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

const immersiveLyricsContainer = ref(null);
const isIdle = ref(false);
const isBottomBarHovered = ref(false);
const isTopBarHovered = ref(false);
let idleTimer = null;

const resetIdleTimer = () => {
  if (isIdle.value) isIdle.value = false;
  if (idleTimer) clearTimeout(idleTimer);
  if (store.isImmersiveLyrics) {
    if (isBgMenuOpen.value || isBottomBarHovered.value || isTopBarHovered.value) {
      return;
    }
    idleTimer = setTimeout(() => {
      if (!isBottomBarHovered.value && !isTopBarHovered.value && !isBgMenuOpen.value) {
        isIdle.value = true;
      }
    }, 3000);
  }
};

const handleImmersiveMouseMove = () => {
  resetIdleTimer();
};

const fontSizes = ['md', 'lg', 'xl'];
const cycleFontSize = () => {
  const currentIndex = fontSizes.indexOf(store.immersiveFontSize || 'lg');
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  store.setImmersiveFontSize(fontSizes[nextIndex]);
};

const fontSizeLabel = computed(() => {
  if (store.immersiveFontSize === 'md') return '中';
  if (store.immersiveFontSize === 'xl') return '特大';
  return '大';
});

const isBgMenuOpen = ref(false);
const bgOptions = [
  { value: 'fluid', label: '灵动流光', icon: '🌈' },
  { value: 'starry', label: '梦幻星空', icon: '🌌' },
  { value: 'pure', label: '纯黑极简', icon: '🖤' }
];

const currentBgLabel = computed(() => {
  const match = bgOptions.find(b => b.value === store.immersiveBgMode);
  return match ? match.label : '灵动流光';
});

const toggleBgMenu = (e) => {
  e?.stopPropagation();
  isBgMenuOpen.value = !isBgMenuOpen.value;
};

const selectBgMode = (mode) => {
  store.setImmersiveBgMode(mode);
  isBgMenuOpen.value = false;
};

watch([isBgMenuOpen, isBottomBarHovered, isTopBarHovered], () => {
  resetIdleTimer();
});

const getImmersiveFontSizeClass = (isActive) => {
  const size = store.immersiveFontSize || 'lg';
  if (size === 'md') {
    return isActive ? 'text-2xl xl:text-3xl font-black' : 'text-base xl:text-lg';
  }
  if (size === 'xl') {
    return isActive ? 'text-4xl xl:text-5xl font-black' : 'text-2xl xl:text-3xl';
  }
  return isActive ? 'text-3xl xl:text-4xl font-black' : 'text-xl xl:text-2xl';
};

const getFluidFontSizeClass = (isActive) => {
  const size = store.immersiveFontSize || 'lg';
  if (size === 'md') {
    return isActive ? 'text-3xl xl:text-4xl 2xl:text-5xl' : 'text-xl xl:text-2xl';
  }
  if (size === 'xl') {
    return isActive ? 'text-5xl xl:text-6xl 2xl:text-7xl' : 'text-3xl xl:text-4xl';
  }
  return isActive ? 'text-4xl xl:text-5xl 2xl:text-6xl' : 'text-2xl xl:text-3xl';
};

const currentPairIndex = computed(() => {
  if (activeLyricIndex.value < 0) return -1;
  return Math.floor(activeLyricIndex.value / 2);
});

const currentPairLines = computed(() => {
  if (currentPairIndex.value < 0 || parsedLyrics.value.length === 0) return [];
  const startIdx = currentPairIndex.value * 2;
  const lines = [];
  if (startIdx < parsedLyrics.value.length) {
    lines.push({ ...parsedLyrics.value[startIdx], lineIndex: startIdx, isFirstInPair: true });
  }
  if (startIdx + 1 < parsedLyrics.value.length) {
    lines.push({ ...parsedLyrics.value[startIdx + 1], lineIndex: startIdx + 1, isFirstInPair: false });
  }
  return lines;
});

const getCinematicFontSizeClass = () => {
  const size = store.immersiveFontSize || 'lg';
  if (size === 'md') {
    return 'text-2xl lg:text-3xl xl:text-4xl';
  }
  if (size === 'xl') {
    return 'text-3xl sm:text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl';
  }
  return 'text-2xl sm:text-3xl md:text-4xl xl:text-5xl 2xl:text-6xl';
};

const getCinematicTransFontSizeClass = () => {
  const size = store.immersiveFontSize || 'lg';
  if (size === 'md') {
    return 'text-sm md:text-base lg:text-lg';
  }
  if (size === 'xl') {
    return 'text-base md:text-lg lg:text-xl xl:text-2xl';
  }
  return 'text-sm sm:text-base md:text-lg xl:text-xl';
};

const getLineSeed = (lineIndex) => {
  const x = Math.sin(lineIndex * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const isWordRevealed = (w) => {
  if (!w || typeof w.startTime !== 'number') return true;
  return inAppPlayTime.value >= (w.startTime - 0.02);
};

const isWordSinging = (w) => {
  if (!w || typeof w.startTime !== 'number' || typeof w.endTime !== 'number') return false;
  const t = inAppPlayTime.value;
  return t >= (w.startTime - 0.02) && t <= (w.endTime + 0.06);
};

const isAnyWordRevealed = (line) => {
  if (!line?.words || line.words.length === 0) return true;
  return inAppPlayTime.value >= (line.words[0].startTime - 0.02);
};

const getCinematicCharStyle = (w, wIdx, totalWords, lineIndex) => {
  const seed = getLineSeed(lineIndex);
  const total = Math.max(1, totalWords);
  const normIdx = total > 1 ? wIdx / (total - 1) : 0.5;
  const waveAngle = normIdx * Math.PI * 2.2 + (seed * Math.PI);
  
  // Y 轴起伏错落幅度：约 -18px ~ +18px
  const yOffset = (Math.sin(waveAngle) * 14 + Math.cos(wIdx * 1.3) * 6 + (seed - 0.5) * 8).toFixed(1);
  // 倾斜微角：-2.8° ~ +2.8°
  const rot = (Math.cos(waveAngle) * 2.2 + (Math.sin(wIdx * 1.7) * 1.2)).toFixed(1);
  // X 轴轻微间距微调
  const xJitter = (Math.sin(wIdx * 2.1) * 3).toFixed(1);

  return {
    '--char-y': `${yOffset}px`,
    '--char-x': `${xJitter}px`,
    '--char-rot': `${rot}deg`,
  };
};

const getCinematicTranslationOffsetStyle = (lineIndex) => {
  const seed = getLineSeed(lineIndex);
  const indent = 28 + seed * 36;
  return {
    marginLeft: `${indent.toFixed(0)}px`,
    transform: `rotate(${(seed > 0.5 ? 0.7 : -0.7)}deg)`
  };
};

const handleGlobalKeyDown = (e) => {
  const target = e.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

  if (e.key === 'F11') {
    e.preventDefault();
    store.toggleImmersiveLyrics();
    return;
  }

  if (e.key === 'Escape') {
    if (store.isImmersiveLyrics) {
      e.preventDefault();
      store.exitImmersiveLyrics();
      return;
    }
  }

  if (e.code === 'Space' || e.key === 'MediaPlayPause') {
    e.preventDefault();
    store.togglePlay();
    return;
  }

  if (store.isImmersiveLyrics) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      store.seek(Math.max(0, store.currentTime - 5));
      resetIdleTimer();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      store.seek(Math.min(store.duration, store.currentTime + 5));
      resetIdleTimer();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      store.setVolume(Math.min(1, store.volume + 0.05));
      resetIdleTimer();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      store.setVolume(Math.max(0, store.volume - 0.05));
      resetIdleTimer();
    }
  }
};

onMounted(() => {
  store.initAudio();
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('resize', updateTitleOverflow);
  if (window.lyricAPI) window.lyricAPI.onReady(syncLyricToDesktop);
  if (window.windowControls?.onFullScreenChange) {
    window.windowControls.onFullScreenChange((isFs) => {
      if (!isFs && store.isImmersiveLyrics) {
        store.exitImmersiveLyrics();
      }
    });
  }
  updateTitleOverflow();
});

onUnmounted(() => {
  if (discAnimFrame) cancelAnimationFrame(discAnimFrame);
  if (idleTimer) clearTimeout(idleTimer);
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

const hoveredNavMode = ref('none'); // 'none' | 'prev' | 'next'

const prevSongInQueue = computed(() => {
  if (!store.playlist || store.playlist.length === 0) return null;
  if (store.playlist.length === 1) return store.playlist[0];
  const currentIndex = store.playlist.findIndex(s => s.hash === store.currentSong?.hash);
  if (currentIndex === -1) return store.playlist[0];
  const prevIndex = (currentIndex - 1 + store.playlist.length) % store.playlist.length;
  return store.playlist[prevIndex];
});

const nextSongInQueue = computed(() => {
  if (!store.playlist || store.playlist.length === 0) return null;
  if (store.playlist.length === 1) return store.playlist[0];
  const currentIndex = store.playlist.findIndex(s => s.hash === store.currentSong?.hash);
  if (currentIndex === -1) return store.playlist[0];
  const nextIndex = (currentIndex + 1) % store.playlist.length;
  return store.playlist[nextIndex];
});

const previewSong = computed(() => {
  if (store.playMode === 'loop' || store.playMode === 'random') {
    return store.currentSong;
  }
  if (hoveredNavMode.value === 'prev') {
    return prevSongInQueue.value || store.currentSong;
  }
  if (hoveredNavMode.value === 'next') {
    return nextSongInQueue.value || store.currentSong;
  }
  return store.currentSong;
});

const displayedTitle = computed(() => {
  if (!store.playlist || store.playlist.length === 0) {
    return store.currentSong ? store.currentSong.name : '听见好时光';
  }

  // 单曲循环模式：上下一首都锁定并提示重头播放当前歌曲
  if (store.playMode === 'loop') {
    if (hoveredNavMode.value === 'prev' || hoveredNavMode.value === 'next') {
      return '重新播放当前歌曲';
    }
    return store.currentSong ? store.currentSong.name : '听见好时光';
  }

  // 随机播放模式：清晰标明随机切歌动作
  if (store.playMode === 'random') {
    if (store.playlist.length === 1) {
      return store.currentSong ? store.currentSong.name : '听见好时光';
    }
    if (hoveredNavMode.value === 'prev') {
      return '随机播放上一首';
    }
    if (hoveredNavMode.value === 'next') {
      return '随机播放下一首';
    }
    return store.currentSong ? store.currentSong.name : '听见好时光';
  }

  // 列表循环模式：展示队列中真实的上一首 / 下一首
  if (store.playlist.length === 1) {
    return store.currentSong ? store.currentSong.name : '听见好时光';
  }
  if (hoveredNavMode.value === 'prev') {
    return prevSongInQueue.value?.name ? prevSongInQueue.value.name : (store.currentSong?.name || '暂无上一首');
  }
  if (hoveredNavMode.value === 'next') {
    return nextSongInQueue.value?.name ? nextSongInQueue.value.name : (store.currentSong?.name || '暂无下一首');
  }
  return store.currentSong ? store.currentSong.name : '听见好时光';
});

const titleTooltip = computed(() => {
  if (!store.playlist || store.playlist.length === 0) {
    return store.currentSong ? `${store.currentSong.name} - ${store.currentSong.singer || '未知歌手'}` : '';
  }

  // 单曲循环模式
  if (store.playMode === 'loop') {
    if (hoveredNavMode.value === 'prev' || hoveredNavMode.value === 'next') {
      return '单曲循环中 · 点击重新播放当前歌曲';
    }
    return store.currentSong ? `${store.currentSong.name} - ${store.currentSong.singer || '未知歌手'} (单曲循环)` : '';
  }

  // 随机播放模式
  if (store.playMode === 'random') {
    if (store.playlist.length === 1) {
      return '列表仅 1 首歌 · 点击重新播放';
    }
    if (hoveredNavMode.value === 'prev') {
      return '随机播放上一首';
    }
    if (hoveredNavMode.value === 'next') {
      return '随机播放下一首';
    }
    return store.currentSong ? `${store.currentSong.name} - ${store.currentSong.singer || '未知歌手'} (随机播放)` : '';
  }

  // 列表循环模式
  if (store.playlist.length === 1) {
    if (hoveredNavMode.value === 'prev' || hoveredNavMode.value === 'next') {
      return '列表仅 1 首歌 · 点击重新播放';
    }
    return store.currentSong ? `${store.currentSong.name} - ${store.currentSong.singer || '未知歌手'}` : '';
  }
  if (hoveredNavMode.value === 'prev') {
    return prevSongInQueue.value ? `上一首：${prevSongInQueue.value.name} - ${prevSongInQueue.value.singer || '未知歌手'}` : '暂无上一首';
  }
  if (hoveredNavMode.value === 'next') {
    return nextSongInQueue.value ? `下一首：${nextSongInQueue.value.name} - ${nextSongInQueue.value.singer || '未知歌手'}` : '暂无下一首';
  }
  return store.currentSong ? `${store.currentSong.name} - ${store.currentSong.singer || '未知歌手'}` : '';
});

const prevButtonTooltip = computed(() => {
  if (!store.playlist || store.playlist.length === 0) return '上一首';
  if (store.playMode === 'loop') return '单曲循环中 · 点击重新播放当前歌曲';
  if (store.playMode === 'random') {
    return store.playlist.length === 1 ? '列表仅 1 首歌 · 点击重新播放' : '随机播放上一首';
  }
  if (store.playlist.length === 1) return '列表仅 1 首歌 · 点击重新播放';
  return prevSongInQueue.value ? `上一首：${prevSongInQueue.value.name}` : '上一首';
});

const nextButtonTooltip = computed(() => {
  if (!store.playlist || store.playlist.length === 0) return '下一首';
  if (store.playMode === 'loop') return '单曲循环中 · 点击重新播放当前歌曲';
  if (store.playMode === 'random') {
    return store.playlist.length === 1 ? '列表仅 1 首歌 · 点击重新播放' : '随机播放下一首';
  }
  if (store.playlist.length === 1) return '列表仅 1 首歌 · 点击重新播放';
  return nextSongInQueue.value ? `下一首：${nextSongInQueue.value.name}` : '下一首';
});

const canPlayPrevOrNext = computed(() => {
  return !!(store.playlist && store.playlist.length > 0);
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
  if (lyricsContainer.value && activeLyricIndex.value >= 0) {
    const container = lyricsContainer.value;
    const lis = container.querySelectorAll('li');
    const activeEl = lis[activeLyricIndex.value];
    if (activeEl) {
      const targetScrollTop = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }

  if (immersiveLyricsContainer.value && activeLyricIndex.value >= 0) {
    const container = immersiveLyricsContainer.value;
    const lis = container.querySelectorAll('.immersive-lyric-item');
    const activeEl = lis[activeLyricIndex.value];
    if (activeEl) {
      const targetScrollTop = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
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

watch([displayedTitle, hoveredNavMode, () => store.isImmersiveLyrics, () => store.playMode], () => {
  updateTitleOverflow();
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

watch(() => store.isImmersiveLyrics, async (immersive) => {
  if (immersive) {
    resetIdleTimer();
    if (parsedLyrics.value.length === 0) fetchLyrics();
    await nextTick();
    setTimeout(() => { scrollToActiveLyric(); }, 180);
  } else {
    isIdle.value = false;
    if (idleTimer) clearTimeout(idleTimer);
  }
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
.immersive-fade-enter-active, .immersive-fade-leave-active { transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.immersive-fade-enter-from, .immersive-fade-leave-to { opacity: 0; transform: scale(0.97); }
.custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
.custom-scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
.mask-gradient { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); }

@keyframes ambient-drift {
  0% { transform: scale(1.25) rotate(0deg) translate(0px, 0px); }
  50% { transform: scale(1.35) rotate(180deg) translate(20px, -20px); }
  100% { transform: scale(1.25) rotate(360deg) translate(0px, 0px); }
}

.animate-ambient-drift {
  animation: ambient-drift 45s linear infinite;
}

@keyframes pulse-slow {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.18); opacity: 0.35; }
}

.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}

@keyframes kenburns {
  0% { transform: scale(1) translate(0, 0); }
  50% { transform: scale(1.08) translate(-1%, -1%); }
  100% { transform: scale(1) translate(0, 0); }
}

.animate-kenburns {
  animation: kenburns 20s ease-in-out infinite alternate;
}

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

.capsule-title-viewport {
  overflow: hidden;
  max-width: 100%;
  white-space: nowrap;
}

.capsule-title-viewport.is-overflowing {
  mask-image: linear-gradient(90deg, transparent 0, #000 6px, #000 calc(100% - 6px), transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 6px, #000 calc(100% - 6px), transparent 100%);
}

.capsule-title-track {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  white-space: nowrap;
}

.capsule-title-track.is-marquee {
  min-width: max-content;
  animation: capsule-title-marquee 11s linear infinite;
}

.capsule-title-viewport:hover .capsule-title-track.is-marquee {
  animation-play-state: paused;
}

.capsule-title-text {
  flex-shrink: 0;
  white-space: nowrap;
}

.capsule-title-copy {
  padding-left: 2rem;
}

@keyframes capsule-title-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-50% - 1rem)); }
}

/* 🌈 沉浸式流体色球运动 (Fluid Mesh Organic Motion) */
@keyframes fluid-blob-1 {
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(60px, -40px) scale(1.15); }
  66% { transform: translate(-40px, 50px) scale(0.9); }
}
.animate-fluid-blob-1 { animation: fluid-blob-1 18s ease-in-out infinite; }

@keyframes fluid-blob-2 {
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(-50px, 60px) scale(1.12); }
  66% { transform: translate(40px, -30px) scale(0.95); }
}
.animate-fluid-blob-2 { animation: fluid-blob-2 22s ease-in-out infinite; }

@keyframes fluid-blob-3 {
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(-60px, -50px) scale(1.2); }
}
.animate-fluid-blob-3 { animation: fluid-blob-3 16s ease-in-out infinite; }

@keyframes fluid-blob-4 {
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(70px, 40px) scale(1.18); }
}
.animate-fluid-blob-4 { animation: fluid-blob-4 20s ease-in-out infinite; }

/* 🌌 慢速旋转与星尘粒子 (Cosmic Starry Universe) */
@keyframes spin-extremely-slow {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
.animate-spin-extremely-slow { animation: spin-extremely-slow 120s linear infinite; }

.starry-dust-layer {
  background-image: 
    radial-gradient(1.5px 1.5px at 15% 20%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 35% 65%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(2px 2px at 55% 25%, rgba(199, 210, 254, 0.9), transparent),
    radial-gradient(1px 1px at 75% 80%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1.5px 1.5px at 85% 35%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(2px 2px at 25% 85%, rgba(165, 180, 252, 0.75), transparent),
    radial-gradient(1px 1px at 65% 45%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1.5px 1.5px at 45% 10%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(2px 2px at 90% 70%, rgba(255, 255, 255, 0.85), transparent),
    radial-gradient(1px 1px at 10% 50%, rgba(255, 255, 255, 0.6), transparent);
  background-size: 550px 550px;
  animation: starry-twinkle 8s ease-in-out infinite alternate;
}

@keyframes starry-twinkle {
  0% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
  100% { opacity: 0.6; transform: scale(1); }
}

/* 🎬 映画光影·逐字音符跳跃与空间波浪错落 (Kinetic Staggered Word Reveal) */
.cinematic-stage-container {
  perspective: 1400px;
  perspective-origin: 50% 50%;
}

.cinematic-dual-scene {
  width: 100%;
  max-width: 1550px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5rem 0.5rem;
  gap: 2.25rem;
}

.cinematic-line-block {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 88vw;
  box-sizing: border-box;
  transition: opacity 0.5s ease;
}

.cinematic-line-first {
  align-self: flex-start;
  align-items: flex-start;
  text-align: left;
  padding-left: clamp(1.5rem, 5vw, 6rem);
}
.cinematic-line-first .cinematic-wave-container {
  justify-content: flex-start;
}

.cinematic-line-second {
  align-self: flex-end;
  align-items: flex-end;
  text-align: right;
  padding-right: clamp(1.5rem, 5vw, 6rem);
}
.cinematic-line-second .cinematic-wave-container {
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .cinematic-line-first,
  .cinematic-line-second {
    align-self: center;
    align-items: center;
    text-align: center;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .cinematic-line-first .cinematic-wave-container,
  .cinematic-line-second .cinematic-wave-container {
    justify-content: center;
  }
}

.cinematic-line-block.is-line-settled {
  opacity: 0.88;
}

.cinematic-line-block.is-line-settled .cinematic-char-unit.is-revealed {
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.55), 0 0 30px rgba(147, 197, 253, 0.25);
}

/* 整组场景切换与消融过渡 */
.cinematic-scene-enter-active {
  transition: opacity 0.3s ease;
}
.cinematic-scene-leave-active {
  transition: opacity 0.38s cubic-bezier(0.4, 0, 1, 1), transform 0.38s cubic-bezier(0.4, 0, 1, 1), filter 0.38s cubic-bezier(0.4, 0, 1, 1);
}
.cinematic-scene-enter-from {
  opacity: 1;
}
.cinematic-scene-leave-to {
  opacity: 0;
  transform: translateY(-24px) scale(1.03);
  filter: blur(12px);
}

.cinematic-wave-container {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  font-weight: 900;
  line-height: 1.4;
  letter-spacing: -0.01em;
  max-width: 100%;
  word-break: break-word;
  padding: 1rem 0.5rem;
}

/* 单字单位（初始未唱状态：隐藏+散焦+下沉） */
.cinematic-char-unit {
  position: relative;
  display: inline-block;
  white-space: pre;
  opacity: 0;
  transform: translate3d(var(--char-x, 0px), calc(var(--char-y, 0px) + 26px), 0px) scale(0.35) rotate(calc(var(--char-rot, 0deg) * 1.5));
  filter: blur(10px);
  pointer-events: none;
  color: #ffffff;
  margin: 0 4px;
  will-change: transform, opacity, filter, text-shadow;
  transition: 
    opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.4s ease-out,
    text-shadow 0.3s ease;
}

/* 单字登场状态 (Revealed) - 弹性归位至错落波浪点 */
.cinematic-char-unit.is-revealed {
  opacity: 1;
  pointer-events: auto;
  transform: translate3d(var(--char-x, 0px), var(--char-y, 0px), 0px) scale(1) rotate(var(--char-rot, 0deg));
  filter: blur(0px);
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.7), 0 0 40px rgba(147, 197, 253, 0.35);
}

/* 单字唱响高光瞬间 (Singing / Bloom Flash) */
.cinematic-char-unit.is-singing {
  transform: translate3d(var(--char-x, 0px), var(--char-y, 0px), 0px) scale(1.12) rotate(var(--char-rot, 0deg));
  text-shadow: 
    0 0 30px rgba(255, 255, 255, 1),
    0 0 60px rgba(96, 165, 250, 0.8),
    0 0 90px rgba(168, 85, 247, 0.5);
  z-index: 10;
}

.cinematic-trans-active {
  display: inline-flex;
  align-items: center;
  color: rgba(226, 232, 240, 0.95);
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.02em;
  margin-top: 0.75rem;
  max-width: 90%;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 0, 0, 0.6);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.cinematic-line-first .cinematic-trans-active {
  margin-left: clamp(0.5rem, 2.5vw, 3rem);
  text-align: left;
}

.cinematic-line-second .cinematic-trans-active {
  margin-right: clamp(0.5rem, 2.5vw, 3rem);
  text-align: right;
}

.cinematic-trans-active.is-revealed {
  opacity: 1;
  transform: translateY(0px);
}

.cinematic-trans-badge {
  opacity: 0.75;
  font-size: 1.25em;
  margin: 0 4px;
  font-family: Georgia, serif;
  color: rgba(147, 197, 253, 0.9);
}
</style>
