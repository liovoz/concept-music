<template>
  <div class="h-full overflow-y-auto custom-scrollbar flex flex-col relative bg-white text-gray-800 dark:!bg-[#141415] dark:text-[#ededed] transition-colors" id="fm-scroll-container">
    <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-50/60 to-white dark:bg-none -z-10 pointer-events-none"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">

      <!-- 未登录：统一引导登录页面 -->
      <div v-if="!userStore.isLoggedIn" class="flex-1 flex flex-col items-center justify-center relative">
        <div class="absolute inset-0 bg-white/40 dark:bg-[#19191b]/40 backdrop-blur-md z-0 rounded-3xl border border-transparent dark:border-white/[0.08]"></div>
        <div class="relative z-10 flex flex-col items-center text-center px-6">
          <div class="w-24 h-24 bg-purple-50 dark:bg-[#232325] rounded-full flex items-center justify-center mb-6 shadow-inner dark:shadow-none border border-purple-100 dark:border-white/[0.08] transition-colors">
            <AppIcon name="personal-fm" class="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 class="type-display-lg text-gray-900 dark:text-[#ededed] mb-3">私人FM</h2>
          <p class="type-body-base text-gray-500 dark:text-[#a1a1a6] mb-8 max-w-md">
            安全登录后，即可开启专属私人波段。结合您的红心收藏与听歌足迹，提供「口味推荐」「新鲜发现」「深度探索」三种差异化电台模式，好歌随时加入任意歌单。
          </p>
          <button
            @click="userStore.openLoginModal()"
            class="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full type-body-md shadow-[0_8px_20px_rgba(147,51,234,0.3)] dark:shadow-none dark:hover:shadow-[0_4px_20px_rgba(147,51,234,0.4)] transition-all transform active:scale-95 no-drag flex items-center"
          >
            立即安全登录
            <AppIcon name="chevron-right" class="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      <!-- 已登录：私人FM 主视图 -->
      <template v-else>
        <div class="flex flex-wrap items-end justify-between mb-6 w-full gap-4">
          <div class="flex-1 min-w-0">
            <h2 class="type-heading-xl text-gray-900 dark:text-[#ededed] truncate">
              私人FM <span class="type-heading-sub text-purple-600/80 dark:text-purple-400/90 ml-2">Personal FM</span>
            </h2>
            <p class="type-meta-base text-gray-600 dark:text-[#b4b4ba] mt-2">多路推荐与分层排重，告别老歌循环，发现心仪新声</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              v-if="fmStore.isInitialized"
              @click="handleForceRefresh"
              :disabled="fmStore.isLoading"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full type-body-sm font-medium bg-gray-100/80 hover:bg-purple-50 text-gray-700 hover:text-purple-600 border border-gray-200/90 dark:bg-[#19191b] dark:hover:bg-[#232325] dark:text-[#c8c8ce] dark:hover:text-[#ededed] dark:border-white/[0.08] transition-colors active:scale-[0.98] no-drag disabled:opacity-50"
              v-tooltip="'推进游标，重新拉取一批推荐'"
            >
              <AppIcon name="refresh" class="w-3.5 h-3.5" :class="{ 'animate-spin': fmStore.isLoading }" />
              <span>换一批</span>
            </button>

            <button
              @click="isPreferencesOpen = true"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full type-body-sm font-medium bg-gray-100/80 hover:bg-purple-50 text-gray-700 hover:text-purple-600 border border-gray-200/90 dark:bg-[#19191b] dark:hover:bg-[#232325] dark:text-[#c8c8ce] dark:hover:text-[#ededed] dark:border-white/[0.08] transition-colors active:scale-[0.98] no-drag"
              v-tooltip="'管理已屏蔽歌手与过滤偏好'"
            >
              <AppIcon name="filter" class="w-3.5 h-3.5" />
              <span>电台偏好</span>
              <span
                v-if="fmStore.suppressedArtists.length > 0"
                class="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 type-meta-micro"
              >
                {{ fmStore.suppressedArtists.length }}
              </span>
            </button>

            <button
              v-if="playerStore.isFmModePlaylist && playerStore.hasRegularPlaylistBackup"
              @click="handleRestoreRegularPlaylist"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full type-body-sm font-medium bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200/80 dark:bg-[#19191b] dark:hover:bg-[#232325] dark:text-[#ededed] dark:border-white/[0.08] transition-colors active:scale-[0.98] no-drag"
              v-tooltip="'退出私人FM并恢复原播放列表'"
            >
              <AppIcon name="playlist" class="w-3.5 h-3.5" />
              <span>恢复原播放列表 ({{ playerStore.regularPlaylistBackupCount }}首)</span>
            </button>
          </div>
        </div>

        <!-- 三标签模式切换 -->
        <div class="flex flex-wrap items-center gap-4 mb-8">
          <div v-squircle="{ radius: 10, smoothing: 0.6 }" class="grid grid-cols-3 gap-1 bg-gray-100/80 dark:!bg-[#19191b] p-1 rounded-lg border border-gray-200/60 dark:!border-white/[0.08] w-full sm:w-auto sm:min-w-[360px] transition-colors">
            <button
              v-for="profile in tasteProfiles"
              :key="profile.id"
              @click="switchTasteMode(profile.id)"
              v-squircle="{ radius: 6, smoothing: 0.6 }"
              class="px-4 py-1.5 rounded-md type-body-sm transition-colors no-drag whitespace-nowrap flex items-center justify-center gap-1"
              :class="fmStore.activeMode === profile.id ? 'font-semibold bg-white text-purple-600 shadow-sm dark:!bg-[#232325] dark:text-purple-300 dark:shadow-none' : 'font-medium text-gray-600 hover:text-gray-900 dark:text-[#b4b4ba] dark:hover:text-[#ededed]'"
            >
              <span>{{ profile.label }}</span>
            </button>
          </div>

          <div class="flex items-center type-meta-base text-gray-500 dark:text-[#a1a1a6] min-w-0">
            <AppIcon name="info" class="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span class="truncate">{{ fmStore.activeProfile.description }}</span>
          </div>
        </div>

        <!-- 状态 1：初次加载中 -->
        <div v-if="fmStore.isLoading && activeQueue.length === 0" class="relative flex-1 -mx-8 -mb-8 -mt-8 overflow-hidden text-gray-500 dark:text-[#a1a1a6]">
          <div class="absolute inset-0 bg-white dark:!bg-[#141415] pointer-events-none"></div>
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_52%,rgba(168,85,247,0.08),transparent_34%),radial-gradient(circle_at_82%_40%,rgba(245,158,11,0.07),transparent_30%)] dark:bg-none pointer-events-none"></div>
          <div class="relative h-full min-h-[500px] grid lg:grid-cols-[minmax(300px,38%)_minmax(0,1fr)] items-stretch gap-10 lg:gap-14 px-8 lg:px-14">
            <div class="relative flex min-h-[300px] items-center justify-center py-8 lg:h-full lg:min-h-[420px] lg:py-12">
              <div class="absolute w-72 h-72 rounded-full bg-purple-50/80 dark:bg-white/[0.02] blur-3xl"></div>
              <div class="relative w-48 h-48 rounded-full bg-white dark:bg-[#19191b] border border-transparent dark:border-white/[0.08] shadow-[0_24px_55px_rgba(126,73,222,0.12)] dark:shadow-none flex items-center justify-center">
                <div class="absolute inset-4 rounded-full border border-dashed border-purple-200 dark:border-white/[0.12]"></div>
                <div class="absolute inset-0 rounded-full border-4 border-transparent border-r-purple-500 border-b-purple-300 dark:border-r-blue-500 dark:border-b-blue-400/50 animate-spin"></div>
                <div class="w-24 h-24 rounded-full bg-gray-950 dark:bg-[#0f0f10] text-white flex flex-col items-center justify-center border border-white/[0.06]">
                  <span class="type-meta-micro font-medium">FM</span>
                  <span class="mt-1 type-meta-micro text-white/55">Tuning</span>
                </div>
              </div>
            </div>

            <div class="flex min-w-0 flex-col py-8 lg:h-full lg:min-h-[420px] lg:justify-between lg:py-12">
              <div class="inline-flex self-start items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-[#232325] text-purple-600 dark:text-blue-400 type-meta-base font-medium border border-purple-100 dark:border-white/[0.08] mb-4">
                {{ fmStore.activeProfile.label }} · {{ fmStore.activeProfile.subtitle }}
              </div>
              <div class="lg:py-8">
                <h3 class="type-display-lg text-gray-950 dark:text-[#ededed] mb-3">正在为你编排专属波段</h3>
                <p class="type-body-base text-gray-500 dark:text-[#a1a1a6] leading-7 max-w-xl">
                  正在并发拉取多路曲库，并结合你的红心、歌单与 30 天已听记录进行去重与节奏排序。
                </p>
              </div>
              <div class="grid sm:grid-cols-3 gap-3 max-w-2xl">
                <div
                  v-for="(step, idx) in loadingStageCards"
                  :key="step.tag"
                  class="rounded-2xl bg-gray-50/90 dark:bg-[#19191b] border border-gray-200/70 dark:border-white/[0.08] px-4 py-3 flex flex-col justify-between"
                >
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="type-meta-micro text-purple-600/80 dark:text-purple-400/90">{{ step.tag }}</span>
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-purple-500/75 dark:bg-purple-400/80 animate-pulse"
                      :style="{ animationDelay: `${idx * 180}ms` }"
                    ></span>
                  </div>
                  <div class="type-meta-base font-medium text-gray-800 dark:text-[#ededed]">{{ step.title }}</div>
                  <div class="type-meta-base text-gray-400 dark:text-[#85858b] mt-0.5 truncate">{{ step.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 状态 2：错误状态 -->
        <div v-else-if="fmStore.isError && activeQueue.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 text-red-500 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-500/20">
          <AppIcon name="warning" class="w-16 h-16 mb-4 text-red-300" />
          <p class="type-heading-md text-red-600 dark:text-red-300 mb-2">{{ fmStore.activeSlice.degradedNotice || '调频失败，请检查网络' }}</p>
          <div class="flex items-center gap-3 mt-4">
            <button @click="handleStartFM" class="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full type-body-md shadow-md transition-all active:scale-95 no-drag">重新调频</button>
            <button v-if="fmStore.suppressedArtists.length > 0" @click="isPreferencesOpen = true" class="px-5 py-2 bg-white dark:bg-[#232325] text-gray-600 dark:text-[#ededed] rounded-full type-body-md border border-gray-200 dark:border-white/[0.08] no-drag">管理已屏蔽歌手</button>
          </div>
        </div>

        <!-- 状态 3：正常播放态 -->
        <template v-else-if="currentFMSong">
          <!-- 降级透明提示条 -->
          <div v-if="fmStore.activeSlice.degradedNotice" class="mb-5 px-4 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 type-meta-base flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <AppIcon name="info" class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ fmStore.activeSlice.degradedNotice }}</span>
            </div>
            <button @click="handleForceRefresh" class="type-meta-base font-medium underline shrink-0 no-drag">换一批</button>
          </div>

          <div class="flex flex-col lg:flex-row items-center gap-8 mb-10">
            <!-- 封面卡片 (双层解耦遵守 AGENTS.md) -->
            <div class="flex-shrink-0 p-[4px] bg-white dark:bg-[#19191b] dark:border dark:border-white/[0.08] rounded-[24px] shadow-2xl shadow-purple-200/50 dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
              <div v-squircle="'xl'" class="w-64 h-64 lg:w-72 lg:h-72 rounded-[18px] transform-gpu [transform:translateZ(0)]">
                <img :src="currentFMSong._cover" :alt="currentFMSong._title || '电台封面'" class="w-full h-full object-cover" @error="e => e.target.src = defaultImg" />
              </div>
            </div>

            <!-- 歌曲元信息与操作栏 -->
            <div class="flex-1 min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div class="flex items-center gap-2 mb-2 max-w-full">
                <span v-if="currentFMSong._fmMeta?.channelLabel" class="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-400/25 type-meta-micro flex-shrink-0">
                  {{ currentFMSong._fmMeta.channelLabel }}
                </span>
              </div>

              <h3 class="type-display-lg text-gray-900 dark:text-[#ededed] mb-2 truncate w-full" v-tooltip="currentFMSong._title">{{ currentFMSong._title }}</h3>

              <div class="flex items-center flex-wrap justify-center lg:justify-start gap-1.5 mb-3">
                <SingerLink :singers="currentFMSong._singers" :singer-name="currentFMSong._singer" :singer-id="currentFMSong._singer_id" />
                <span v-if="currentFMSong._is_paid" class="ml-1 bg-orange-50 dark:bg-amber-500/15 text-orange-500 dark:text-amber-400 border border-orange-200 dark:border-amber-500/25 rounded song-badge shrink-0">付费</span>
                <span v-else-if="currentFMSong._is_vip" class="ml-1 bg-blue-50 dark:bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 rounded song-badge shrink-0">VIP</span>
              </div>

              <p class="type-body-sm text-gray-500 dark:text-[#b4b4ba] mb-5 truncate w-full">
                <span @click="goToAlbum(currentFMSong._album_id)" class="transition-colors" :class="currentFMSong._album_id ? 'hover:text-purple-600 dark:hover:text-blue-400 cursor-pointer' : ''">
                  ♪ {{ currentFMSong._album }}
                </span>
              </p>

              <!-- 具象化推荐理由 -->
              <div class="mb-4 px-3 py-2 inline-flex items-start rounded-xl type-meta-base font-medium bg-emerald-50/70 dark:bg-[#19191b] border border-emerald-100 dark:border-white/[0.08] text-emerald-700 dark:text-[#a1a1a6] max-w-full">
                <AppIcon name="info" class="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0 dark:text-[#4cc38a]" />
                <span class="leading-relaxed">{{ fmStore.recommendationReason }}</span>
              </div>

              <!-- 30s 高潮速听徽标 -->
              <div v-if="fmStore.isPeakPreview" class="mb-4 px-3 py-1.5 inline-flex items-center rounded-full type-meta-base font-medium"
                :class="fmStore.climaxInfo ? 'bg-purple-50 border border-purple-200 text-purple-600 dark:bg-purple-500/15 dark:border-purple-400/25 dark:text-purple-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-600 dark:bg-amber-500/15 dark:border-amber-500/25 dark:text-amber-400'">
                <AppIcon v-if="fmStore.climaxInfo" name="check" class="w-3.5 h-3.5 mr-1.5" />
                <AppIcon v-else name="spinner" spin class="w-3.5 h-3.5 mr-1.5" />
                <span>{{ fmStore.climaxInfo ? '高潮模式 · 正在播放高潮片段' : '高潮模式 · 正在定位高潮位置...' }}</span>
              </div>

              <!-- 播控与反馈操作组 -->
              <div class="flex items-center flex-wrap gap-3 sm:gap-4">
                <button @click="handlePlay" class="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-none transition-colors active:scale-95 no-drag" v-tooltip="isCurrentPlaying ? '暂停' : '播放'">
                  <AppIcon :name="isCurrentPlaying ? 'pause' : 'play'" class="w-7 h-7" :class="isCurrentPlaying ? '' : 'ml-1'" />
                </button>

                <button @click="handleNext" class="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#232325] hover:bg-gray-200 dark:hover:bg-[#2c2c2f] text-gray-500 dark:text-[#a1a1a6] hover:text-gray-700 dark:hover:text-[#ededed] flex items-center justify-center transition-colors active:scale-95 no-drag" v-tooltip="'下一首'">
                  <AppIcon name="next" class="w-5 h-5" />
                </button>

                <button
                  @click="fmStore.togglePeakPreview"
                  class="w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-95 no-drag"
                  :class="fmStore.isPeakPreview ? 'bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none' : 'bg-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-500 dark:bg-[#232325] dark:text-[#a1a1a6] dark:hover:bg-[#2c2c2f] dark:hover:text-purple-300'"
                  v-tooltip="fmStore.isPeakPreview ? '关闭 30s 速听' : '开启 30s 速听'"
                >
                  <AppIcon name="timer-30s" class="w-[19px] h-[19px]" />
                </button>

                <div ref="feedbackBoxRef" class="relative">
                  <button @click="toggleFeedback" :disabled="fmStore.isDisliking" class="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#232325] hover:bg-red-50 dark:hover:bg-red-500/15 text-gray-400 dark:text-[#a1a1a6] hover:text-red-500 dark:hover:text-[#e5484d] flex items-center justify-center transition-colors active:scale-95 no-drag disabled:opacity-50" v-tooltip="'不喜欢，换一首'">
                    <AppIcon v-if="!fmStore.isDisliking" name="ban" class="w-[18px] h-[18px]" />
                    <AppIcon v-else name="spinner" spin class="w-4 h-4" />
                  </button>
                  <transition name="fade-scale">
                    <div
                      v-if="isFeedbackOpen"
                      class="absolute left-1/2 top-14 z-30 w-64 -translate-x-1/2 rounded-2xl bg-white/95 dark:bg-[#19191b]/95 backdrop-blur-xl text-gray-800 dark:text-[#ededed] shadow-[0_20px_50px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.65)] border border-gray-200/80 dark:border-white/[0.08] p-3.5 text-left"
                    >
                      <div class="type-body-md text-gray-900 dark:text-[#ededed] mb-1">这首哪里不对？</div>
                      <div class="type-meta-base text-gray-400 dark:text-[#85858b] mb-3 leading-relaxed">选择后会直接换歌，并即时调整队列与后续推荐。</div>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="reason in feedbackReasons"
                          :key="reason"
                          @click="handleDislike(reason)"
                          class="px-3 py-1.5 rounded-full bg-gray-100/90 hover:bg-purple-600 text-gray-700 hover:text-white border border-gray-200/60 dark:bg-[#232325] dark:hover:bg-purple-600 dark:text-[#ededed] dark:hover:text-white dark:border-white/[0.06] type-meta-base font-medium transition-colors no-drag"
                        >
                          {{ reason }}
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>

                <button @click="handleLike" class="w-11 h-11 rounded-full transition-all active:scale-90 no-drag flex items-center justify-center"
                  :class="isCurrentLiked ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/20' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400 dark:bg-[#232325] dark:text-[#a1a1a6] dark:hover:bg-red-500/15 dark:hover:text-red-300'"
                  v-tooltip="isCurrentLiked ? '取消喜欢' : '喜欢'">
                  <AppIcon :name="isCurrentLiked ? 'heart-solid' : 'heart'" class="w-[18px] h-[18px]" />
                </button>

                <!-- 添加到任意歌单显式按钮 -->
                <button
                  @click="handleAddToPlaylist(currentFMSong)"
                  class="h-11 px-4 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200/80 dark:bg-[#232325] dark:hover:bg-[#2c2c2f] dark:text-purple-300 dark:border-white/[0.08] transition-all active:scale-95 no-drag flex items-center gap-1.5 type-meta-base font-medium"
                  v-tooltip="'将此歌曲加入账号下任意歌单'"
                >
                  <AppIcon name="add-playlist" class="w-[18px] h-[18px]" />
                  <span>加入歌单</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 接下来播放 / 本次已播回顾 -->
          <div class="w-full">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-4 min-w-0 flex-wrap">
                <button
                  @click="queueTab = 'upcoming'"
                  class="text-base font-semibold flex items-center gap-1.5 pb-1 border-b-2 transition-colors no-drag"
                  :class="queueTab === 'upcoming' ? 'text-gray-900 dark:text-[#ededed] border-purple-500' : 'text-gray-400 dark:text-[#85858b] border-transparent hover:text-gray-600 dark:hover:text-[#a1a1a6]'"
                >
                  <span>📻 接下来播放</span>
                </button>
                <button
                  @click="queueTab = 'history'"
                  class="text-base font-semibold flex items-center gap-1.5 pb-1 border-b-2 transition-colors no-drag"
                  :class="queueTab === 'history' ? 'text-gray-900 dark:text-[#ededed] border-purple-500' : 'text-gray-400 dark:text-[#85858b] border-transparent hover:text-gray-600 dark:hover:text-[#a1a1a6]'"
                >
                  <span>🕒 本次已播回顾</span>
                  <span v-if="fmStore.playedHistoryList.length > 0" class="type-meta-base font-normal text-gray-500 dark:text-[#98989f] tabular-nums">({{ fmStore.playedHistoryList.length }})</span>
                </button>
                <span class="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-[#232325] text-purple-600 dark:text-[#a1a1a6] border border-transparent dark:border-white/[0.08] type-meta-micro truncate max-w-[260px]">
                  {{ fmStore.freshnessHint }}
                </span>
              </div>
              <span v-if="queueTab === 'upcoming'" class="type-meta-base text-gray-500 dark:text-[#98989f] font-medium tabular-nums">队列中 {{ fmStore.remainingCount }} 首</span>
            </div>

            <!-- Tab A: 接下来播放 -->
            <template v-if="queueTab === 'upcoming'">
              <div v-if="fmStore.upcomingSongs.length === 0 && fmStore.isLoadingMore" class="space-y-2">
                <div v-for="i in 3" :key="i" class="flex items-center px-4 py-3 bg-gray-50/50 dark:bg-[#19191b] rounded-xl">
                  <div class="w-8 h-4 bg-gray-200 dark:bg-[#232325] rounded animate-pulse"></div>
                  <div class="flex-1 ml-4 h-4 bg-gray-200 dark:bg-[#232325] rounded animate-pulse max-w-md"></div>
                </div>
              </div>

              <div v-else-if="fmStore.upcomingSongs.length === 0" class="py-10 flex flex-col items-center text-gray-400 dark:text-[#85858b]">
                <p class="type-meta-base font-medium">队列已空，点击下方加载更多</p>
              </div>

              <div v-else class="space-y-1">
                <div
                  v-for="(song, idx) in displayedUpcomingSongs"
                  :key="(song._hash || '') + idx"
                  @contextmenu="handleSongContextMenu($event, song)"
                  @dblclick="fmStore.playFromQueue(idx)"
                  v-squircle="'lg'"
                  class="flex items-center px-4 py-3 rounded-[14px] hover:bg-purple-50/60 dark:hover:bg-[#19191b] group transition-colors cursor-pointer no-drag min-w-0"
                >
                  <div class="w-10 text-center type-numeric-sm font-medium text-gray-300 dark:text-[#85858b] group-hover:hidden flex-shrink-0">
                    {{ (idx + 1).toString().padStart(2, '0') }}
                  </div>
                  <div class="w-10 text-center hidden group-hover:flex justify-center text-purple-600 dark:text-purple-400 flex-shrink-0" @click.stop="fmStore.playFromQueue(idx)">
                    <AppIcon name="play" class="w-5 h-5 ml-[2px]" />
                  </div>

                  <div class="flex-1 flex items-center pl-2 pr-4 min-w-0">
                    <img :src="song._cover" :alt="song._title || '歌曲封面'" class="w-9 h-9 rounded-[8px] shadow-sm dark:shadow-none mr-3 object-cover flex-shrink-0 bg-gray-100 dark:bg-[#232325]" @error="e => e.target.src = defaultImg" />
                    <span class="truncate type-body-md text-gray-800 dark:text-[#ededed] min-w-0" v-tooltip="song._title">{{ song._title }}</span>
                    <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 dark:bg-amber-500/15 text-orange-500 dark:text-amber-400 border border-orange-200 dark:border-amber-500/25 rounded-[5px] song-badge">付费</span>
                    <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 dark:bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 rounded-[5px] song-badge">VIP</span>
                  </div>

                  <div class="w-1/4 hidden sm:block type-body-sm truncate pr-4 min-w-0">
                    <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
                  </div>
                  <div class="w-1/4 hidden md:block type-body-sm text-gray-500 dark:text-[#a1a1a6] truncate pr-4 min-w-0" v-tooltip="song._album">
                    <span @click.stop="goToAlbum(song._album_id || song.album_id)"
                      class="transition-colors"
                      :class="(song._album_id || song.album_id) ? 'hover:text-purple-600 dark:hover:text-blue-400 cursor-pointer' : ''">{{ song._album }}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      @click.stop="handleAddToPlaylist(song)"
                      class="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-100/70 dark:hover:bg-[#232325] dark:hover:text-purple-300 transition-all no-drag"
                      v-tooltip="'添加到歌单'"
                    >
                      <AppIcon name="add-playlist" class="w-4 h-4" />
                    </button>
                    <div class="w-14 shrink-0 whitespace-nowrap type-numeric-sm text-gray-400 dark:text-[#85858b] text-right">{{ song._duration }}</div>
                  </div>
                </div>

                <div v-if="hiddenUpcomingCount > 0" class="flex items-center justify-center pt-2 type-meta-base font-medium text-gray-400 dark:text-[#85858b]">
                  <span class="px-3 py-1.5 rounded-full bg-gray-50 dark:bg-[#19191b] border border-gray-100 dark:border-white/[0.08]">还有 {{ hiddenUpcomingCount }} 首在队列中，将随播放自动接上</span>
                </div>
              </div>

              <div v-if="activeQueue.length > 0 && fmStore.remainingCount <= 4 && !fmStore.isLoadingMore" class="w-full flex justify-center mt-6">
                <button @click="handleLoadMore" class="px-6 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-[#232325] dark:hover:bg-[#2c2c2f] text-purple-600 dark:text-[#ededed] border border-purple-200 dark:border-white/[0.08] rounded-full type-meta-base font-medium transition-colors no-drag flex items-center">
                  <AppIcon name="refresh" class="w-4 h-4 mr-1.5" />
                  加载更多推荐
                </button>
              </div>
            </template>

            <!-- Tab B: 本次已播回顾 -->
            <template v-else>
              <div v-if="fmStore.playedHistoryList.length === 0" class="py-10 flex flex-col items-center text-gray-500 dark:text-[#98989f]">
                <AppIcon name="history" class="w-8 h-8 mb-2 opacity-50" />
                <p class="type-meta-base">暂无本次会话已播记录</p>
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="(song, idx) in fmStore.playedHistoryList"
                  :key="(song._hash || '') + idx"
                  @contextmenu="handleSongContextMenu($event, song)"
                  @dblclick="playHistorySong(song)"
                  v-squircle="'lg'"
                  class="flex items-center px-4 py-3 rounded-[14px] hover:bg-purple-50/60 dark:hover:bg-[#19191b] group transition-colors cursor-pointer no-drag min-w-0"
                >
                  <div class="w-10 text-center type-numeric-sm font-medium text-gray-400 dark:text-[#85858b] group-hover:hidden flex-shrink-0">
                    {{ (idx + 1).toString().padStart(2, '0') }}
                  </div>
                  <div class="w-10 text-center hidden group-hover:flex justify-center text-purple-600 dark:text-purple-400 flex-shrink-0" @click.stop="playHistorySong(song)">
                    <AppIcon name="play" class="w-5 h-5 ml-[2px]" />
                  </div>

                  <div class="flex-1 flex items-center pl-2 pr-4 min-w-0">
                    <img :src="song._cover" :alt="song._title || '歌曲封面'" class="w-9 h-9 rounded-[8px] shadow-sm dark:shadow-none mr-3 object-cover flex-shrink-0 bg-gray-100 dark:bg-[#232325]" @error="e => e.target.src = defaultImg" />
                    <span class="truncate type-body-md text-gray-800 dark:text-[#ededed] min-w-0" v-tooltip="song._title">{{ song._title }}</span>
                    <span v-if="song._fmMeta?.channelLabel" class="ml-2 flex-shrink-0 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#232325] text-gray-500 dark:text-[#85858b] type-meta-micro">
                      {{ song._fmMeta.channelLabel }}
                    </span>
                  </div>

                  <div class="w-1/4 hidden sm:block type-body-sm truncate pr-4 min-w-0">
                    <SingerLink :singers="song._singers" :singer-name="song._singer" :singer-id="song._singer_id || song.singer_id" />
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      @click.stop="handleAddToPlaylist(song)"
                      class="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-100/70 dark:hover:bg-[#232325] dark:hover:text-purple-300 transition-all no-drag"
                      v-tooltip="'添加到歌单'"
                    >
                      <AppIcon name="add-playlist" class="w-4 h-4" />
                    </button>
                    <div class="w-14 shrink-0 whitespace-nowrap type-numeric-sm text-gray-400 dark:text-[#85858b] text-right">{{ song._duration }}</div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- 状态 4：未开启电台的初始欢迎页 -->
        <div v-else class="relative flex-1 -mx-8 -mb-8 -mt-8 overflow-hidden text-gray-500 dark:text-[#a1a1a6]">
          <div class="absolute inset-0 bg-white dark:!bg-[#141415] pointer-events-none"></div>
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_52%,rgba(168,85,247,0.08),transparent_34%),radial-gradient(circle_at_82%_40%,rgba(245,158,11,0.08),transparent_30%)] dark:bg-none pointer-events-none"></div>
          <div class="relative h-full min-h-[500px] px-8 lg:px-14">
            <div class="relative h-full grid lg:grid-cols-[minmax(300px,38%)_minmax(0,1fr)] items-stretch gap-10 lg:gap-14">
              <div class="relative flex min-h-[300px] items-center justify-center py-8 lg:h-full lg:min-h-[420px] lg:py-12">
                <div class="absolute inset-x-8 top-10 flex items-center gap-2 type-meta-micro font-medium text-gray-500 dark:text-[#98989f]">
                  <span class="h-px flex-1 bg-gray-200 dark:bg-white/[0.08]"></span>
                  <span>Private band</span>
                  <span class="h-px flex-1 bg-gray-200 dark:bg-white/[0.08]"></span>
                </div>

                <div class="relative w-52 h-52 rounded-full border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#19191b] shadow-[0_28px_55px_rgba(91,69,38,0.16)] dark:shadow-none flex items-center justify-center">
                  <div class="absolute inset-5 rounded-full border border-dashed border-purple-200 dark:border-white/[0.12]"></div>
                  <div class="absolute inset-12 rounded-full bg-[conic-gradient(from_120deg,#7c3aed,#22c55e,#f59e0b,#7c3aed)] opacity-20 dark:opacity-10"></div>
                  <div class="w-24 h-24 rounded-full bg-gray-950 dark:bg-[#0f0f10] text-white flex flex-col items-center justify-center shadow-xl dark:shadow-none border border-white/[0.06]">
                    <span class="type-meta-micro font-medium">FM</span>
                    <span class="mt-1 type-meta-micro text-white/55">Today</span>
                  </div>
                </div>
              </div>

              <div class="flex min-w-0 flex-col py-8 lg:h-full lg:min-h-[420px] lg:justify-between lg:py-12">
                <div class="inline-flex items-center self-start px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 type-meta-base font-medium border border-purple-100 dark:border-purple-400/25 mb-4">
                  {{ fmStore.activeProfile.label }} · {{ fmStore.activeProfile.subtitle }}
                </div>

                <div class="lg:py-8">
                  <h3 class="type-display-lg text-gray-950 dark:text-[#ededed] mb-3">今日私人波段</h3>
                  <p class="type-body-base text-gray-600 dark:text-[#b4b4ba] leading-7 max-w-xl mb-6">
                    已接入多路推荐引擎与 30 天账号级分层排重。选择任意模式立即开播，遇到的好歌可一键存入你的任意个人歌单。
                  </p>

                  <div class="grid sm:grid-cols-3 gap-3">
                    <div class="rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-gray-50/70 dark:bg-[#19191b] px-4 py-3">
                      <div class="type-meta-micro text-gray-500 dark:text-[#98989f] mb-1">Memory</div>
                      <div class="type-body-md text-gray-800 dark:text-[#ededed]">3000 首长效排重</div>
                    </div>
                    <div class="rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-gray-50/70 dark:bg-[#19191b] px-4 py-3">
                      <div class="type-meta-micro text-gray-500 dark:text-[#98989f] mb-1">Channels</div>
                      <div class="type-body-md text-gray-800 dark:text-[#ededed] truncate">{{ fmStore.activeProfile.label }}</div>
                    </div>
                    <div class="rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-gray-50/70 dark:bg-[#19191b] px-4 py-3">
                      <div class="type-meta-micro text-gray-500 dark:text-[#98989f] mb-1">Playlists</div>
                      <div class="type-body-md text-gray-800 dark:text-[#ededed]">随心加入任意歌单</div>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button @click="handleStartFM" class="px-7 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full type-body-md shadow-lg shadow-purple-200 dark:shadow-none transition-colors active:scale-[0.98] no-drag flex items-center">
                    <AppIcon name="personal-fm" class="w-5 h-5 mr-2" />
                    开启私人电台
                  </button>
                  <button
                    @click="fmStore.togglePeakPreview"
                    class="px-5 py-3 rounded-full type-body-sm font-medium border transition-colors active:scale-[0.98] no-drag flex items-center"
                    :class="fmStore.isPeakPreview ? 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-500/15 dark:border-purple-400/30 dark:text-purple-300' : 'bg-white border-gray-200 text-gray-700 hover:text-purple-600 hover:border-purple-200 dark:bg-[#19191b] dark:border-white/[0.08] dark:text-[#c8c8ce] dark:hover:text-purple-300 dark:hover:border-purple-400/30'"
                  >
                    <AppIcon name="timer-30s" class="w-[18px] h-[18px] mr-2" />
                    30s 速听
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- P2-1: 电台偏好管理弹窗 -->
    <Teleport to="body">
      <transition name="fade-scale">
        <div
          v-if="isPreferencesOpen"
          class="fixed inset-0 z-[100001] flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 no-drag"
          @click.self="isPreferencesOpen = false"
        >
          <div v-squircle="'xl'" class="w-[460px] max-w-[92vw] max-h-[82vh] bg-white dark:bg-[#141415] rounded-[20px] border border-gray-200/80 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden text-gray-800 dark:text-[#ededed]">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 class="type-body-md text-gray-900 dark:text-[#ededed]">私人FM 偏好管理</h3>
                <p class="type-meta-base text-gray-400 dark:text-[#85858b] mt-0.5">控制版本噪音过滤、波段游标与已屏蔽歌手</p>
              </div>
              <button @click="isPreferencesOpen = false" class="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232325]">
                <AppIcon name="close" class="w-4 h-4" />
              </button>
            </div>

            <div class="p-5 space-y-5 overflow-y-auto custom-scrollbar">
              <!-- 版本噪音过滤 -->
              <div class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-[#19191b] border border-gray-100 dark:border-white/[0.06]">
                <div class="min-w-0">
                  <div class="type-meta-base font-medium text-gray-900 dark:text-[#ededed]">自动过滤伴奏 / KTV / 铃声版本</div>
                  <div class="type-meta-base text-gray-400 dark:text-[#85858b] mt-0.5">屏蔽纯伴奏、消音与同曲 Live 变种穿透重复推荐</div>
                </div>
                <button
                  @click="fmStore.setFilterVersionNoise(!fmStore.preferences.filterVersionNoise)"
                  class="w-10 h-5 rounded-full transition-colors relative shrink-0"
                  :class="fmStore.preferences.filterVersionNoise ? 'bg-purple-600' : 'bg-gray-300 dark:bg-[#2c2c2f]'"
                >
                  <span
                    class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    :class="fmStore.preferences.filterVersionNoise ? 'left-[22px]' : 'left-0.5'"
                  ></span>
                </button>
              </div>

              <!-- 重置当前波段游标 -->
              <div class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-[#19191b] border border-gray-100 dark:border-white/[0.06]">
                <div class="min-w-0">
                  <div class="type-meta-base font-medium text-gray-900 dark:text-[#ededed]">重置「{{ fmStore.activeProfile.label }}」波段游标</div>
                  <div class="type-meta-base text-gray-400 dark:text-[#85858b] mt-0.5">清空当前模式的通道分页游标与缓存队列，重新开启一轮推荐</div>
                </div>
                <button
                  @click="handleResetBand"
                  class="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-[#232325] dark:hover:bg-[#2c2c2f] text-purple-600 dark:text-purple-300 type-meta-base font-medium shrink-0 transition-colors"
                >
                  立即重置
                </button>
              </div>

              <!-- 已屏蔽歌手列表 -->
              <div>
                <div class="flex items-center justify-between mb-2.5">
                  <span class="type-meta-base font-medium text-gray-800 dark:text-[#ededed]">已屏蔽歌手（30 天内不推荐）</span>
                  <span class="type-numeric-sm text-gray-400 dark:text-[#85858b]">{{ fmStore.suppressedArtists.length }} 位</span>
                </div>
                <div v-if="fmStore.suppressedArtists.length === 0" class="py-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] type-meta-base text-gray-400 dark:text-[#85858b]">
                  暂无屏蔽的歌手
                </div>
                <div v-else class="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  <div
                    v-for="artist in fmStore.suppressedArtists"
                    :key="artist.artistKey"
                    class="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#19191b] border border-gray-100 dark:border-white/[0.06]"
                  >
                    <div class="min-w-0">
                      <div class="type-meta-base font-medium text-gray-800 dark:text-[#ededed] truncate">{{ artist.artistName }}</div>
                      <div class="type-meta-base text-gray-400 dark:text-[#85858b]">因“{{ artist.reason || '不想听' }}”屏蔽</div>
                    </div>
                    <button
                      @click="fmStore.unblockArtist(artist.artistKey)"
                      class="px-2.5 py-1 rounded-lg type-meta-base font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-[#232325] transition-colors shrink-0"
                    >
                      解除屏蔽
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <BackToTop targetId="fm-scroll-container" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import { useFmStore } from '../store/fmStore';
import { FM_TASTE_PROFILES } from '../utils/fmRecommendation';
import { buildPlayPayload, normalizeSongKey } from '../utils/songHelper';
import { openSongContextMenu } from '../utils/songContextMenu';
import { openAddToPlaylistModal } from '../utils/addToPlaylist';
import BackToTop from '../components/BackToTop.vue';
import SingerLink from '../components/SingerLink.vue';

defineOptions({ name: 'PersonalFM' });

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const playerStore = usePlayerStore();
const fmStore = useFmStore();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';
const FM_VISIBLE_UPCOMING_COUNT = 5;
const feedbackReasons = ['听腻了', '不想听这个歌手', '风格不对', '太吵', '太慢', '只是换一首'];
const loadingStageCards = [
  { tag: 'RECALL', title: '多路曲库召回', desc: '结合红心收藏与波段偏好' },
  { tag: 'DEDUP', title: '30 天已听去重', desc: '过滤近期循环与版本噪音' },
  { tag: 'RANKING', title: '节奏与新鲜度重排', desc: '编排当前波段播放序列' }
];

const tasteProfiles = Object.values(FM_TASTE_PROFILES);
const isFeedbackOpen = ref(false);
const feedbackBoxRef = ref(null);
const isPreferencesOpen = ref(false);
const queueTab = ref('upcoming');

const activeQueue = computed(() => fmStore.activeSlice.queue || []);
const currentFMSong = computed(() => fmStore.currentSong);
const displayedUpcomingSongs = computed(() => fmStore.upcomingSongs.slice(0, FM_VISIBLE_UPCOMING_COUNT));
const hiddenUpcomingCount = computed(() => Math.max(0, fmStore.upcomingSongs.length - displayedUpcomingSongs.value.length));

const isCurrentPlaying = computed(() => {
  if (!currentFMSong.value || !playerStore.currentSong) return false;
  return playerStore.isPlaying && normalizeSongKey(playerStore.currentSong) === normalizeSongKey(buildPlayPayload(currentFMSong.value, defaultImg));
});

const isCurrentLiked = computed(() => {
  if (!currentFMSong.value || !userStore.isLoggedIn) return false;
  const h = String(currentFMSong.value._hash || currentFMSong.value.hash || '').toUpperCase();
  return Boolean(h && userStore.likedHashes?.includes(h));
});

const handleStartFM = () => {
  isFeedbackOpen.value = false;
  fmStore.startOrResumeFM({ forceRefresh: false });
};

const handleForceRefresh = () => {
  isFeedbackOpen.value = false;
  fmStore.startOrResumeFM({ forceRefresh: true });
};

const handleLoadMore = () => {
  fmStore.fetchBatchForMode(fmStore.activeMode, { reset: false });
};

const switchTasteMode = (mode) => {
  isFeedbackOpen.value = false;
  fmStore.switchMode(mode);
};

const handlePlay = () => {
  fmStore.togglePlayCurrent();
};

const handleNext = () => {
  isFeedbackOpen.value = false;
  fmStore.advanceNext({ isAuto: false });
};

const toggleFeedback = () => {
  if (!currentFMSong.value || fmStore.isDisliking) return;
  isFeedbackOpen.value = !isFeedbackOpen.value;
};

const handleDislike = async (reason) => {
  isFeedbackOpen.value = false;
  await fmStore.dislikeCurrent(reason);
};

const handleLike = async () => {
  if (!currentFMSong.value) return;
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal();
    return;
  }
  await userStore.toggleLikeSong(buildPlayPayload(currentFMSong.value, defaultImg));
};

const handleAddToPlaylist = (song) => {
  if (!song) return;
  openAddToPlaylistModal(song, { source: 'fm' });
};

const playHistorySong = (song) => {
  if (!song) return;
  playerStore.playFmSong(buildPlayPayload(song, defaultImg));
};

const handleSongContextMenu = (event, song) => {
  if (!song?._hash) return;
  openSongContextMenu(event, buildPlayPayload(song, defaultImg));
};

const navigateSafelyAwayFromFm = () => {
  if (route.path === '/fm') {
    const back = window.history?.state?.back;
    if (back && typeof back === 'string' && !back.startsWith('/fm')) {
      router.back();
    } else {
      router.push('/');
    }
  }
};

const handleRestoreRegularPlaylist = () => {
  fmStore.resetPeakState();
  playerStore.restoreRegularPlaylistFromFm({ navigateBack: true });
  nextTick(() => {
    navigateSafelyAwayFromFm();
  });
};

const handleResetBand = async () => {
  isPreferencesOpen.value = false;
  await fmStore.resetCurrentModeBand();
};

const goToAlbum = (id) => {
  if (id) router.push(`/album/${id}`);
};

watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      fmStore.ensureAccountContext();
    } else {
      isFeedbackOpen.value = false;
      isPreferencesOpen.value = false;
    }
  }
);

const handleOutsideFeedbackClick = (event) => {
  if (!isFeedbackOpen.value) return;
  if (feedbackBoxRef.value && !feedbackBoxRef.value.contains(event.target)) {
    isFeedbackOpen.value = false;
  }
};

const handleFeedbackEscape = (event) => {
  if (event.key === 'Escape' && isFeedbackOpen.value) {
    isFeedbackOpen.value = false;
  }
};

onMounted(() => {
  if (userStore.isLoggedIn) {
    fmStore.ensureAccountContext();
  }
  window.addEventListener('mousedown', handleOutsideFeedbackClick);
  window.addEventListener('keydown', handleFeedbackEscape);
});

onUnmounted(() => {
  window.removeEventListener('mousedown', handleOutsideFeedbackClick);
  window.removeEventListener('keydown', handleFeedbackEscape);
});

onActivated(() => {
  if (userStore.isLoggedIn) {
    fmStore.ensureAccountContext();
  }
});

onDeactivated(() => {
  isFeedbackOpen.value = false;
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }
.fade-scale-enter-active, .fade-scale-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.97); }
</style>
