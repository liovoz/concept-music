<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="fm-scroll-container">
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-50/60 to-white -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">

      <div class="flex items-end justify-between mb-6 w-full gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
            私人FM <span class="text-lg text-purple-500 font-bold ml-2">Personal FM</span>
          </h2>
          <p class="text-xs text-gray-500 mt-2 font-medium">根据你的口味，无限推荐好音乐</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4 mb-8">
        <div class="grid grid-cols-3 gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 w-full sm:w-auto sm:min-w-[330px]">
          <button
            v-for="profile in tasteProfiles"
            :key="profile.id"
            @click="switchTasteMode(profile.id)"
            class="px-4 py-1.5 rounded-md text-xs font-bold transition-all no-drag whitespace-nowrap"
            :class="tasteMode === profile.id ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          >
            {{ profile.label }}
          </button>
        </div>

        <div class="flex items-center text-[10px] text-gray-400 font-medium min-w-0">
          <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span class="truncate">{{ activeTasteProfile.description }}</span>
        </div>
      </div>

      <div v-if="isLoading && fmQueue.length === 0" class="relative flex-1 -mx-8 -mb-8 -mt-8 overflow-hidden text-gray-500">
        <div class="absolute inset-0 bg-white pointer-events-none"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_52%,rgba(168,85,247,0.08),transparent_34%),radial-gradient(circle_at_82%_40%,rgba(245,158,11,0.07),transparent_30%)] pointer-events-none"></div>
        <div class="relative h-full min-h-[520px] grid lg:grid-cols-[minmax(300px,38%)_minmax(0,1fr)] items-stretch gap-10 lg:gap-14 px-8 lg:px-14">
          <div class="relative flex min-h-[300px] items-center justify-center py-8 lg:h-full lg:min-h-[420px] lg:py-12">
            <div class="absolute w-72 h-72 rounded-full bg-purple-50/80 blur-3xl"></div>
            <div class="relative w-48 h-48 rounded-full bg-white shadow-[0_24px_55px_rgba(126,73,222,0.12)] flex items-center justify-center">
              <div class="absolute inset-4 rounded-full border border-dashed border-purple-200"></div>
              <div class="absolute inset-0 rounded-full border-4 border-transparent border-r-purple-500 border-b-purple-300 animate-spin"></div>
              <div class="w-24 h-24 rounded-full bg-gray-950 text-white flex flex-col items-center justify-center">
                <span class="text-[11px] font-black tracking-[0.28em] ml-1">FM</span>
                <span class="mt-1 text-[10px] text-white/55 font-bold">TUNING</span>
              </div>
            </div>
          </div>

          <div class="flex min-w-0 flex-col py-8 lg:h-full lg:min-h-[420px] lg:justify-between lg:py-12">
            <div class="inline-flex self-start items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100 mb-4">
              {{ activeTasteProfile.label }}
            </div>
            <div class="lg:py-8">
              <h3 class="text-3xl font-extrabold text-gray-950 tracking-tight mb-3">正在校准今日私人波段</h3>
              <p class="text-sm text-gray-500 leading-7 max-w-xl">
                正在避开近期重复歌曲，并按当前模式为你重新整理一组私人推荐。
              </p>
            </div>
            <div class="grid sm:grid-cols-3 gap-3 max-w-2xl">
              <div class="h-20 rounded-2xl bg-gray-50/80 border border-gray-100 animate-pulse"></div>
              <div class="h-20 rounded-2xl bg-gray-50/80 border border-gray-100 animate-pulse [animation-delay:120ms]"></div>
              <div class="h-20 rounded-2xl bg-gray-50/80 border border-gray-100 animate-pulse [animation-delay:240ms]"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="isError && fmQueue.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
        <svg class="w-16 h-16 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="text-base font-bold text-red-600 mb-2">调频失败，请检查网络</p>
        <button @click="fetchAndShow" class="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新调频</button>
      </div>

      <template v-else-if="currentFMSong">

        <div class="flex flex-col lg:flex-row items-center gap-8 mb-10">

          <div class="flex-shrink-0 p-[4px] bg-white rounded-[28px] shadow-2xl shadow-purple-200/50">
            <div class="w-64 h-64 lg:w-72 lg:h-72 rounded-[22px] overflow-hidden">
              <img :src="currentFMSong._cover" :alt="currentFMSong._name || '电台封面'" class="w-full h-full object-cover" @error="e => e.target.src = defaultImg" />
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h3 class="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2 truncate w-full" v-tooltip="currentFMSong._title">{{ currentFMSong._title }}</h3>
            <div class="items-center flex-wrap justify-center lg:justify-start gap-1 mb-3">
              <SingerLink :singers="currentFMSong._singers" :singer-name="currentFMSong._singer" :singer-id="currentFMSong._singer_id" />
              <span v-if="currentFMSong._is_paid" class="ml-1 bg-orange-50 text-orange-500 border border-orange-200 px-1.5 py-0.5 rounded text-[9px] font-bold">付费</span>
              <span v-else-if="currentFMSong._is_vip" class="ml-1 bg-blue-50 text-blue-500 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-bold">VIP</span>
            </div>
            <p class="text-sm text-gray-400 mb-6 truncate w-full">
              <span @click="goToAlbum(currentFMSong._album_id)" class="transition-colors" :class="currentFMSong._album_id ? 'hover:text-purple-600 cursor-pointer' : ''">
                ♪ {{ currentFMSong._album }}
              </span>
            </p>

            <div class="mb-4 px-3 py-2 inline-flex items-start rounded-xl text-xs font-bold bg-emerald-50/70 border border-emerald-100 text-emerald-700 max-w-full">
              <svg class="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 11a8 8 0 0116 0v3a4 4 0 01-4 4h-3l-4 3v-3H8a4 4 0 01-4-4v-3z"></path></svg>
              <span class="leading-relaxed">{{ recommendationReason }}</span>
            </div>

            <div v-if="isPeakPreview" class="mb-4 px-3 py-1.5 inline-flex items-center rounded-full text-xs font-bold"
              :class="climaxInfo ? 'bg-purple-50 border border-purple-200 text-purple-600' : 'bg-yellow-50 border border-yellow-200 text-yellow-600'">
              <svg v-if="climaxInfo" class="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <svg v-else class="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span>{{ climaxInfo ? '高潮模式 · 正在播放高潮片段' : '高潮模式 · 正在定位高潮位置...' }}</span>
            </div>

            <div class="flex items-center space-x-4">
              <button @click="handlePlay" class="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 transition-all active:scale-90 no-drag">
                <svg v-if="isCurrentPlaying" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                <svg v-else class="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              </button>

              <button @click="handleNext" class="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-all active:scale-90 no-drag" v-tooltip="'下一首'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11.555 5.168A1 1 0 0010 6v2.798l-5.445-3.63A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"/></svg>
              </button>

              <button
                @click="togglePeakPreview"
                class="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 no-drag"
                :class="isPeakPreview ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-500'"
                v-tooltip="isPeakPreview ? '关闭 30s 速听' : '开启 30s 速听'"
              >
                <svg class="w-[19px] h-[19px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 2h4M12 6V3M12 14l3-3"/>
                  <circle cx="12" cy="14" r="8"/>
                </svg>
              </button>

              <div class="relative">
                <button @click="toggleFeedback" :disabled="isDisliking" class="w-11 h-11 rounded-full bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all active:scale-90 no-drag disabled:opacity-50" v-tooltip="'不喜欢，换一首'">
                  <svg v-if="!isDisliking" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                  <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                </button>
                <div v-if="isFeedbackOpen" class="absolute left-1/2 top-14 z-30 w-64 -translate-x-1/2 rounded-2xl bg-gray-950 text-white shadow-2xl shadow-gray-900/20 border border-white/10 p-3 text-left">
                  <div class="text-sm font-bold mb-1">这首哪里不对？</div>
                  <div class="text-[11px] text-white/55 mb-3">选择后会直接换歌，并优化后面的推荐。</div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="reason in feedbackReasons"
                      :key="reason"
                      @click="handleDislike(reason)"
                      class="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-gray-950 text-xs font-bold transition-colors no-drag"
                    >
                      {{ reason }}
                    </button>
                  </div>
                </div>
              </div>

              <button @click="handleLike" class="w-11 h-11 rounded-full transition-all active:scale-90 no-drag flex items-center justify-center"
                :class="isCurrentLiked ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400'"
                v-tooltip="isCurrentLiked ? '取消喜欢' : '喜欢'">
                <svg class="w-[18px] h-[18px]" :fill="isCurrentLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 class="text-lg font-bold text-gray-800 flex items-center min-w-0">
              <span class="text-xl mr-2">📻</span>
              <span>接下来播放</span>
              <span class="ml-3 px-2 py-1 rounded-full bg-purple-50 text-purple-500 text-[10px] font-bold truncate max-w-[220px]">{{ freshnessHint }}</span>
            </h3>
            <span class="text-xs text-gray-400 font-medium">队列中 {{ remainingCount }} 首</span>
          </div>

          <div v-if="upcomingSongs.length === 0 && isLoadingMore" class="space-y-2">
            <div v-for="i in 3" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 rounded-xl">
              <div class="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div class="flex-1 ml-4 h-4 bg-gray-200 rounded animate-pulse max-w-md"></div>
            </div>
          </div>

          <div v-else-if="upcomingSongs.length === 0" class="py-10 flex flex-col items-center text-gray-300">
            <p class="text-xs font-medium">队列已空，点击下方加载更多</p>
          </div>

          <div v-else class="space-y-1">
            <div v-for="(song, idx) in displayedUpcomingSongs" :key="song._hash + idx" @contextmenu="handleSongContextMenu($event, song)" @dblclick="playFromQueue(idx)"
              class="flex items-center px-4 py-3 rounded-xl hover:bg-purple-50/60 group transition-colors cursor-pointer no-drag min-w-0">
              <div class="w-10 text-center text-sm font-bold text-gray-300 group-hover:hidden flex-shrink-0">
                {{ (idx + 1).toString().padStart(2, '0') }}
              </div>
              <div class="w-10 text-center hidden group-hover:flex justify-center text-purple-600 flex-shrink-0" @click.stop="playFromQueue(idx)">
                <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              </div>

              <div class="flex-1 flex items-center pl-2 pr-4 min-w-0">
                <img :src="song._cover" :alt="song._name || '歌曲封面'" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100" @error="e => e.target.src = defaultImg" />
                <span class="truncate text-sm text-gray-800 font-medium min-w-0" v-tooltip="song._title">{{ song._title }}</span>
                <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
                <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
              </div>

              <div class="w-1/4 hidden sm:block text-xs truncate pr-4 min-w-0">
                <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
              </div>
              <div class="w-1/4 hidden md:block text-xs text-gray-500 truncate pr-4 min-w-0" v-tooltip="song._album">
                <span @click.stop="goToAlbum(song._album_id || song.album_id)"
                  class="transition-colors"
                  :class="(song._album_id || song.album_id) ? 'hover:text-purple-600 cursor-pointer' : ''">{{ song._album }}</span>
              </div>
              <div class="w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
            </div>
            <div v-if="hiddenUpcomingCount > 0" class="flex items-center justify-center pt-2 text-[11px] font-bold text-gray-400">
              <span class="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">还有 {{ hiddenUpcomingCount }} 首在队列中，将随播放自动接上</span>
            </div>
          </div>

          <div v-if="fmQueue.length > 0 && remainingCount <= 3 && !isLoadingMore" class="w-full flex justify-center mt-6">
            <button @click="loadMore" :disabled="isLoadingMore" class="px-6 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded-full text-xs font-bold transition-all no-drag flex items-center disabled:opacity-50">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              加载更多推荐
            </button>
          </div>
        </div>

      </template>

      <div v-else class="relative flex-1 -mx-8 -mb-8 -mt-8 overflow-hidden text-gray-500">
        <div class="absolute inset-0 bg-white pointer-events-none"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_52%,rgba(168,85,247,0.08),transparent_34%),radial-gradient(circle_at_82%_40%,rgba(245,158,11,0.08),transparent_30%)] pointer-events-none"></div>
        <div class="relative h-full min-h-[520px] px-8 lg:px-14">
          <div class="relative h-full grid lg:grid-cols-[minmax(300px,38%)_minmax(0,1fr)] items-stretch gap-10 lg:gap-14">
            <div class="relative flex min-h-[300px] items-center justify-center py-8 lg:h-full lg:min-h-[420px] lg:py-12">
              <div class="absolute inset-x-8 top-10 flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-gray-400 uppercase">
                <span class="h-px flex-1 bg-gray-200"></span>
                <span>PRIVATE BAND</span>
                <span class="h-px flex-1 bg-gray-200"></span>
              </div>

              <div class="relative w-52 h-52 rounded-full border border-gray-200 bg-white shadow-[0_28px_55px_rgba(91,69,38,0.16)] flex items-center justify-center">
                <div class="absolute inset-5 rounded-full border border-dashed border-purple-200"></div>
                <div class="absolute inset-12 rounded-full bg-[conic-gradient(from_120deg,#7c3aed,#22c55e,#f59e0b,#7c3aed)] opacity-20"></div>
                <div class="w-24 h-24 rounded-full bg-gray-950 text-white flex flex-col items-center justify-center shadow-xl">
                  <span class="text-[11px] font-black tracking-[0.28em] ml-1">FM</span>
                  <span class="mt-1 text-[10px] text-white/55 font-bold">TODAY</span>
                </div>
              </div>
            </div>

            <div class="flex min-w-0 flex-col py-8 lg:h-full lg:min-h-[420px] lg:justify-between lg:py-12">
              <div class="inline-flex items-center self-start px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100 mb-4">
                {{ activeTasteProfile.label }}
              </div>

              <div class="lg:py-8">
                <h3 class="text-3xl font-extrabold text-gray-950 tracking-tight mb-3">今日私人波段</h3>
                <p class="text-sm text-gray-500 leading-7 max-w-xl mb-6">
                  为你重新调一组私人推荐，优先避开最近重复出现的歌曲，并按当前模式调整探索范围。
                </p>

                <div class="grid sm:grid-cols-3 gap-3">
                  <div class="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                    <div class="text-[10px] font-black tracking-wider text-gray-400 mb-1">RECENT</div>
                    <div class="text-sm font-extrabold text-gray-800">14 天排重</div>
                  </div>
                  <div class="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                    <div class="text-[10px] font-black tracking-wider text-gray-400 mb-1">MODE</div>
                    <div class="text-sm font-extrabold text-gray-800 truncate">{{ activeTasteProfile.label }}</div>
                  </div>
                  <div class="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                    <div class="text-[10px] font-black tracking-wider text-gray-400 mb-1">QUEUE</div>
                    <div class="text-sm font-extrabold text-gray-800">智能补队列</div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button @click="fetchAndShow" class="px-7 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-bold shadow-lg shadow-purple-200 transition-all active:scale-95 no-drag flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  开启私人电台
                </button>
                <button
                  @click="togglePeakPreview"
                  class="px-5 py-3 rounded-full text-sm font-bold border transition-all active:scale-95 no-drag flex items-center"
                  :class="isPeakPreview ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-200'"
                >
                  <svg class="w-[18px] h-[18px] mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 2h4M12 6V3M12 14l3-3"/>
                    <circle cx="12" cy="14" r="8"/>
                  </svg>
                  30s 速听
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BackToTop targetId="fm-scroll-container" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import { normalizeSongs, buildPlayPayload } from '../utils/songHelper';
import {
  FM_TASTE_PROFILES,
  MAX_FM_FETCH_RETRIES,
  MIN_FM_BATCH_SIZE,
  filterFreshSongs,
  getFreshnessHint,
  getRecommendationReason,
  loadFmMemory,
  recordFmDislike,
  recordFmServed
} from '../utils/fmRecommendation';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';
import { openSongContextMenu } from '../utils/songContextMenu';

defineOptions({ name: 'PersonalFM' });

const router = useRouter();
const userStore = useUserStore();
const playerStore = usePlayerStore();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const tasteMode = ref('familiar');
const isPeakPreview = ref(false);
const fmQueue = ref([]);
const currentFMIndex = ref(-1);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const isError = ref(false);
const isDisliking = ref(false);
const isFeedbackOpen = ref(false);
const isFMActive = ref(false);
const climaxInfo = ref(null);
const fmInitialized = ref(false);
let peakSeekScheduledForHash = null;
let peakTimerId = null;
let peakRetryCount = 0;

const tasteProfiles = Object.values(FM_TASTE_PROFILES);
const feedbackReasons = ['听腻了', '不想听这个歌手', '风格不对', '太吵', '太慢', '只是换一首'];
const FM_VISIBLE_UPCOMING_COUNT = 5;

const activeTasteProfile = computed(() => FM_TASTE_PROFILES[tasteMode.value] || FM_TASTE_PROFILES.familiar);
const freshnessHint = computed(() => getFreshnessHint(tasteMode.value));
const recommendationReason = computed(() => getRecommendationReason(tasteMode.value));

const currentFMSong = computed(() => {
  if (currentFMIndex.value >= 0 && currentFMIndex.value < fmQueue.value.length) {
    return fmQueue.value[currentFMIndex.value];
  }
  return null;
});

const upcomingSongs = computed(() => {
  if (currentFMIndex.value < 0) return fmQueue.value;
  return fmQueue.value.slice(currentFMIndex.value + 1);
});

const displayedUpcomingSongs = computed(() => upcomingSongs.value.slice(0, FM_VISIBLE_UPCOMING_COUNT));
const hiddenUpcomingCount = computed(() => Math.max(0, upcomingSongs.value.length - displayedUpcomingSongs.value.length));
const remainingCount = computed(() => upcomingSongs.value.length);

const isCurrentPlaying = computed(() => {
  if (!currentFMSong.value || !playerStore.currentSong) return false;
  return playerStore.isPlaying && playerStore.currentSong.hash === currentFMSong.value._hash;
});

const isCurrentLiked = computed(() => {
  if (!currentFMSong.value || !userStore.isLoggedIn) return false;
  return userStore.likedHashes && userStore.likedHashes.includes((currentFMSong.value._hash || '').toUpperCase());
});

const extractFMSongs = (res) => {
  const songMap = new Map();
  const getHash = (item) => item.FileHash || item.hash || item.filehash || item.SQFileHash || item.HQFileHash || item.sqhash || item['320hash'] || (item.audio_info && item.audio_info.hash_128) || '';
  const getSongId = (item) => item.MixSongID || item.mixsongid || item.album_audio_id || item.audio_id || '';
  const getName = (item) => item.SongName || item.songname || item.name || item.FileName || item.filename || item.title || item.Title;
  const isRealSong = (item) => !!(item && typeof item === 'object' && (getHash(item) || getSongId(item)) && getName(item));

  const traverse = (data, depth) => {
    if (depth > 8 || !data) return;
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (isRealSong(item)) {
          const h = getSongId(item) || getHash(item);
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

const getCurrentSongId = () => {
  if (!currentFMSong.value) return '';
  return currentFMSong.value._album_audio_id || currentFMSong.value.MixSongID || currentFMSong.value.mixsongid || currentFMSong.value.audio_id || '';
};

const getNextPoolId = (attempt = 0) => {
  const basePool = activeTasteProfile.value.poolId;
  if (attempt === 0) return basePool;
  return (basePool + attempt) % 3;
};

const buildFMParams = (action = 'play', poolId = activeTasteProfile.value.poolId) => {
  const params = {
    mode: activeTasteProfile.value.apiMode,
    action,
    song_pool_id: poolId,
    timestamp: Date.now()
  };

  if (currentFMSong.value) {
    params.hash = currentFMSong.value._hash;
    const songId = getCurrentSongId();
    if (songId) params.songid = songId;
    params.playtime = Math.floor(playerStore.currentTime || 0);
  }

  if (fmQueue.value.length > 0) {
    params.remain_songcnt = remainingCount.value;
  }

  return params;
};

const fetchRawFMSongs = async (action = 'play', poolId = activeTasteProfile.value.poolId) => {
  const res = await request.get('/personal/fm', { params: buildFMParams(action, poolId) });
  return extractFMSongs(res);
};

const collectFreshSongs = async ({ action = 'play', reset = false } = {}) => {
  const collected = [];
  let sawRawSongs = false;
  const baseQueue = reset ? [] : fmQueue.value;
  const memory = loadFmMemory();

  for (let attempt = 0; attempt <= MAX_FM_FETCH_RETRIES; attempt++) {
    const rawSongs = await fetchRawFMSongs(action, getNextPoolId(attempt));
    if (rawSongs.length > 0) sawRawSongs = true;

    const normalized = normalizeSongs(rawSongs, defaultImg).filter(song => song._hash);
    const freshSongs = filterFreshSongs(normalized, {
      currentQueue: [...baseQueue, ...collected],
      memory,
      tasteMode: tasteMode.value,
      ignoreRecent: attempt === MAX_FM_FETCH_RETRIES
    });

    collected.push(...freshSongs);
    if (collected.length >= MIN_FM_BATCH_SIZE) break;
  }

  return { songs: collected, sawRawSongs };
};

const syncToPlaylist = () => {
  if (playerStore.playlist.length > 0 && !isFMActive.value) {
    playerStore.showToast('FM 模式已替换当前播放列表');
  }
  playerStore.cancelPlayAllHydration();
  playerStore.playlist = fmQueue.value.map(song => buildPlayPayload(song, defaultImg));
};

const fetchFMSongs = async (action = 'play') => {
  const loadingRef = fmQueue.value.length === 0 ? isLoading : isLoadingMore;
  loadingRef.value = true;
  isError.value = false;

  try {
    const { songs } = await collectFreshSongs({ action, reset: fmQueue.value.length === 0 });

    if (songs.length > 0) {
      fmQueue.value.push(...songs);
      syncToPlaylist();
    }
  } catch (error) {
    if (fmQueue.value.length === 0) {
      isError.value = true;
    }
  } finally {
    loadingRef.value = false;
  }
};

const fetchAndShow = async () => {
  isLoading.value = true;
  isError.value = false;
  fmQueue.value = [];
  currentFMIndex.value = -1;
  isFMActive.value = true;
  isFeedbackOpen.value = false;
  resetPeakState();

  try {
    const { songs, sawRawSongs } = await collectFreshSongs({ action: 'play', reset: true });

    if (songs.length > 0) {
      fmQueue.value = songs;
      syncToPlaylist();
      currentFMIndex.value = 0;
      fmInitialized.value = true;

      playFMSong(songs[0]);
    } else {
      if (sawRawSongs) playerStore.showToast('这批推荐都太熟了，稍后再试一次');
      isError.value = true;
    }
  } catch (error) {
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const loadMore = () => {
  fetchFMSongs();
};

const playFMSong = (song) => {
  if (!song) return;
  isFeedbackOpen.value = false;
  recordFmServed(song);
  playerStore.playSong(buildPlayPayload(song, defaultImg));
  if (isPeakPreview.value) {
    schedulePeakSeek(song._hash);
  }
};

const handlePlay = () => {
  if (!currentFMSong.value) return;

  if (isCurrentPlaying.value) {
    playerStore.togglePlay();
  } else if (playerStore.currentSong && playerStore.currentSong.hash === currentFMSong.value._hash) {
    playerStore.togglePlay();
  } else {
    playFMSong(currentFMSong.value);
  }
};

const handleNext = () => {
  isFeedbackOpen.value = false;
  resetPeakState();
  playerStore.playNext(false);
};

const toggleFeedback = () => {
  if (!currentFMSong.value || isDisliking.value) return;
  isFeedbackOpen.value = !isFeedbackOpen.value;
};

const handleDislike = async (reason = '不喜欢') => {
  if (!currentFMSong.value || isDisliking.value) return;
  isDisliking.value = true;
  isFeedbackOpen.value = false;
  recordFmDislike(currentFMSong.value, reason);

  try {
    if (reason !== '只是换一首') {
      try {
        await request.get('/personal/fm', { params: buildFMParams('garbage') });
      } catch (e) {}
    }

    resetPeakState();

    const dislikedHash = currentFMSong.value._hash;
    fmQueue.value.splice(currentFMIndex.value, 1);

    const playlistIdx = playerStore.playlist.findIndex(s => s.hash === dislikedHash);
    if (playlistIdx !== -1) {
      playerStore.playlist.splice(playlistIdx, 1);
    }

    if (currentFMIndex.value >= fmQueue.value.length) {
      currentFMIndex.value = Math.max(0, fmQueue.value.length - 1);
    }

    if (fmQueue.value.length === 0) {
      await fetchFMSongs('play');
      currentFMIndex.value = 0;
    }

    if (fmQueue.value.length > 0 && currentFMIndex.value < fmQueue.value.length) {
      playFMSong(fmQueue.value[currentFMIndex.value]);
    }

    if (remainingCount.value <= 3) {
      fetchFMSongs();
    }
  } catch (error) {
    playerStore.showToast('操作失败，请重试');
  } finally {
    isDisliking.value = false;
  }
};

const handleLike = async () => {
  if (!currentFMSong.value) return;
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal();
    return;
  }
  await userStore.toggleLikeSong(currentFMSong.value);
};

const playFromQueue = (idx) => {
  const actualIndex = currentFMIndex.value + 1 + idx;
  if (actualIndex < 0 || actualIndex >= fmQueue.value.length) return;
  resetPeakState();
  currentFMIndex.value = actualIndex;
  playFMSong(fmQueue.value[actualIndex]);
};

const handleSongContextMenu = (event, song) => {
  if (!song._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, defaultImg));
};

const switchTasteMode = (mode) => {
  if (tasteMode.value === mode) return;
  tasteMode.value = mode;
  isFeedbackOpen.value = false;
  if (fmInitialized.value) {
    fetchAndShow();
  }
};

const togglePeakPreview = () => {
  isPeakPreview.value = !isPeakPreview.value;
  if (isPeakPreview.value && currentFMSong.value && playerStore.currentSong?.hash === currentFMSong.value._hash) {
    schedulePeakSeek(currentFMSong.value._hash);
  } else {
    resetPeakState();
  }
};

const goToAlbum = (id) => {
  if (id) router.push(`/album/${id}`);
};

const resetPeakState = () => {
  if (peakTimerId) {
    clearTimeout(peakTimerId);
    peakTimerId = null;
  }
  peakSeekScheduledForHash = null;
  climaxInfo.value = null;
  peakRetryCount = 0;
  playerStore.peakMode = false;
  playerStore.peakStartOffset = 0;
  playerStore.peakDuration = 30;
};

const toSeconds = (val) => {
  if (val == null || val <= 0) return 0;
  if (val > 600) return val / 1000;
  return val;
};

const fetchClimax = async (hash) => {
  try {
    const res = await request.get('/song/climax', { params: { hash, timestamp: Date.now() } });

    const findTimePair = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const startKeys = ['start', 'begin', 'start_time', 'begin_time', 'climax_start', 'startTime', 'beginTime'];
      const endKeys = ['end', 'stop', 'end_time', 'stop_time', 'climax_end', 'endTime'];

      const getVal = (keys, target) => {
        for (const k of keys) {
          if (target[k] != null) return Number(target[k]);
        }
        return null;
      };

      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === 'object') {
              const s = getVal(startKeys, item);
              const e = getVal(endKeys, item);
              if (s != null && s > 0) return { rawStart: s, rawEnd: (e != null && e > s) ? e : s + 30 };
            }
          }
        } else if (val && typeof val === 'object') {
          const s = getVal(startKeys, val);
          const e = getVal(endKeys, val);
          if (s != null && s > 0) return { rawStart: s, rawEnd: (e != null && e > s) ? e : s + 30 };
          const deep = findTimePair(val);
          if (deep) return deep;
        }
      }
      return null;
    };

    const raw = findTimePair(res);
    if (!raw) return null;

    return {
      start: toSeconds(raw.rawStart),
      end: toSeconds(raw.rawEnd)
    };
  } catch (e) {
    return null;
  }
};

const activatePeakMode = (startSec) => {
  playerStore.peakMode = true;
  playerStore.peakStartOffset = startSec;
  playerStore.peakDuration = 30;
  climaxInfo.value = { start: startSec, end: startSec + 30 };
  playerStore.seek(startSec);
};

const schedulePeakSeek = (hash) => {
  if (peakTimerId) {
    clearTimeout(peakTimerId);
    peakTimerId = null;
  }
  peakSeekScheduledForHash = hash;
  peakRetryCount = 0;
  climaxInfo.value = null;

  playerStore.peakMode = true;
  playerStore.peakStartOffset = 0;
  playerStore.peakDuration = 30;

  const doSeek = async () => {
    if (!isPeakPreview.value) return;
    if (!playerStore.currentSong) return;
    if (playerStore.currentSong.hash !== peakSeekScheduledForHash) return;

    if (playerStore.duration <= 0) {
      peakRetryCount++;
      if (peakRetryCount <= 6) {
        peakTimerId = setTimeout(doSeek, 300);
      }
      return;
    }

    const result = await fetchClimax(peakSeekScheduledForHash);

    if (!result || !isPeakPreview.value) return;
    if (!playerStore.currentSong || playerStore.currentSong.hash !== peakSeekScheduledForHash) return;

    const startTime = Math.min(result.start, playerStore.duration - 5);

    if (startTime >= 0) {
      activatePeakMode(startTime);
    }
  };

  peakTimerId = setTimeout(doSeek, 400);
};

watch(() => playerStore.currentSong, (newSong) => {
  if (!newSong) return;

  if (isFMActive.value) {
    const fmIndex = fmQueue.value.findIndex(s => s._hash === newSong.hash);
    if (fmIndex !== -1) {
      currentFMIndex.value = fmIndex;
      recordFmServed(fmQueue.value[fmIndex]);

      if (remainingCount.value <= 3 && !isLoadingMore.value) {
        fetchFMSongs();
      }
    }
  }

  if (isPeakPreview.value && fmInitialized.value && newSong.hash !== peakSeekScheduledForHash) {
    const isInQueue = fmQueue.value.some(s => s._hash === newSong.hash);
    if (isInQueue) {
      schedulePeakSeek(newSong.hash);
    } else {
      resetPeakState();
    }
  }
});

onActivated(() => {
  if (fmInitialized.value && fmQueue.value.length > 0) {
    isFMActive.value = true;
    syncToPlaylist();

    if (playerStore.currentSong) {
      const fmIndex = fmQueue.value.findIndex(s => s._hash === playerStore.currentSong.hash);
      if (fmIndex !== -1) {
        currentFMIndex.value = fmIndex;
      }
    }

    if (isPeakPreview.value && currentFMSong.value) {
      if (playerStore.peakMode && playerStore.peakStartOffset > 0) {
        climaxInfo.value = { start: playerStore.peakStartOffset, end: playerStore.peakStartOffset + playerStore.peakDuration };
      } else if (playerStore.currentSong && playerStore.currentSong.hash === currentFMSong.value._hash) {
        schedulePeakSeek(currentFMSong.value._hash);
      }
    }
  }
});

onDeactivated(() => {
  isFMActive.value = false;
});

onMounted(() => {
  if (fmInitialized.value) {
    isFMActive.value = true;
    if (fmQueue.value.length > 0) {
      syncToPlaylist();
    }
  }
});

onUnmounted(() => {
  isFMActive.value = false;
  if (peakTimerId) {
    clearTimeout(peakTimerId);
    peakTimerId = null;
  }
  resetPeakState();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
</style>
