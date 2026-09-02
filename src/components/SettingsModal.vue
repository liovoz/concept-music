<template>
  <Teleport to="body">
    <transition name="fade-scale">
      <div 
        v-if="isVisible" 
        class="fixed inset-0 z-[250] flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm no-drag outline-none"
        @keydown.escape="closeModal"
        @click.self="closeModal"
        tabindex="-1"
        ref="modalContainerRef"
      >
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.22)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-gray-200/90 dark:border-slate-800 w-[720px] max-w-[92vw] h-[540px] max-h-[90vh] flex flex-col overflow-hidden relative text-gray-800 dark:text-slate-100 transition-colors duration-200">
          
          <!-- 弹窗顶栏 -->
          <div class="h-14 px-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 select-none z-10">
            <div class="flex items-center space-x-2.5">
              <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                <AppIcon name="settings" class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-sm font-extrabold tracking-wide text-gray-900 dark:text-white">偏好设置</h2>
                <p class="text-[10px] text-gray-400 dark:text-slate-500">Settings & Preferences</p>
              </div>
            </div>

            <button 
              @click="closeModal" 
              class="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all focus:outline-none"
              v-tooltip="'关闭 (Esc)'"
            >
              <AppIcon name="close" class="w-4 h-4" />
            </button>
          </div>

          <!-- 主体区域：左侧分类 Tab + 右侧设置内容 -->
          <div class="flex flex-1 min-h-0 overflow-hidden">
            
            <!-- 左侧分类导航 -->
            <nav class="w-44 border-r border-gray-200/70 dark:border-slate-800/80 p-3 space-y-1.5 shrink-0 select-none bg-slate-50/90 dark:bg-slate-950/60">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="currentTab = tab.id"
                class="w-full flex items-center px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left group relative"
                :class="currentTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200/60 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-slate-200'"
              >
                <AppIcon 
                  :name="tab.icon" 
                  class="w-4 h-4 mr-2.5 transition-transform group-hover:scale-110" 
                  :class="currentTab === tab.id ? 'text-white' : 'text-gray-400 dark:text-slate-500 group-hover:text-blue-500'" 
                />
                <span class="truncate">{{ tab.name }}</span>
                <span 
                  v-if="tab.id === 'about' && hasUpdateAvailable" 
                  class="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"
                ></span>
              </button>
            </nav>

            <!-- 右侧配置区域：高反差层次底板 -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-slate-100/50 dark:bg-slate-900/40">
              
              <!-- TAB 1: 常规与外观 -->
              <div v-show="currentTab === 'general'" class="space-y-4">
                <!-- 主题外观卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">外观主题</h3>
                  </div>
                  <div class="grid grid-cols-3 gap-2.5">
                    <div 
                      @click="handleSetTheme('light')"
                      class="p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center text-center group"
                      :class="theme === 'light' ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30' : 'border-gray-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-700/40'"
                    >
                      <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mb-1.5 shadow-inner">
                        <AppIcon name="sun" class="w-4 h-4" />
                      </div>
                      <span class="text-xs font-bold" :class="theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200'">浅色模式</span>
                    </div>

                    <div 
                      @click="handleSetTheme('dark')"
                      class="p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center text-center group"
                      :class="theme === 'dark' ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30' : 'border-gray-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-700/40'"
                    >
                      <div class="w-7 h-7 rounded-full bg-slate-800 text-blue-400 flex items-center justify-center mb-1.5 shadow-inner">
                        <AppIcon name="moon" class="w-4 h-4" />
                      </div>
                      <span class="text-xs font-bold" :class="theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200'">深色模式</span>
                    </div>

                    <div 
                      @click="handleSetTheme('system')"
                      class="p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center text-center group"
                      :class="theme === 'system' ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30' : 'border-gray-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-700/40'"
                    >
                      <div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-1.5 shadow-inner">
                        <AppIcon name="sparkles" class="w-4 h-4" />
                      </div>
                      <span class="text-xs font-bold" :class="theme === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200'">跟随系统</span>
                    </div>
                  </div>
                </section>

                <!-- 关闭窗口行为卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-2">
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">关闭主窗口时</h3>
                  </div>
                  <div class="space-y-1.5">
                    <label 
                      v-for="action in closeActions" 
                      :key="action.value"
                      @click="closeBehavior = action.value"
                      class="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all select-none border"
                      :class="closeBehavior === action.value 
                        ? 'bg-blue-50/50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-900/50' 
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/40'"
                    >
                      <div class="flex items-center space-x-3">
                        <input 
                          type="radio" 
                          name="close-behavior" 
                          :value="action.value" 
                          v-model="closeBehavior" 
                          class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600" 
                        />
                        <div>
                          <p class="text-xs font-bold text-gray-800 dark:text-slate-200">{{ action.title }}</p>
                          <p class="text-[11px] text-gray-400 dark:text-slate-500">{{ action.desc }}</p>
                        </div>
                      </div>
                      <AppIcon v-if="closeBehavior === action.value" name="check" class="w-4 h-4 text-blue-600" />
                    </label>
                  </div>
                </section>

                <!-- 启动与运行卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">开机自动启动</p>
                      </div>
                      <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 ml-3.5">登录系统时自动启动概念音乐并驻留后台</p>
                    </div>
                    <button 
                      @click="toggleAutoStart"
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                      :class="autoStartEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'"
                    >
                      <span 
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        :class="autoStartEnabled ? 'translate-x-5' : 'translate-x-0'"
                      />
                    </button>
                  </div>
                </section>

                <!-- 账号特权卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="w-1.5 h-3.5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">自动领取 VIP 特权</p>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">特权助手</span>
                      </div>
                      <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 ml-3.5">登录后在后台自动签到「1天VIP」及按时领取「3小时特权」，内置防风控智能离散调度</p>
                    </div>
                    <button 
                      type="button"
                      @click="toggleAutoClaimVip"
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                      :class="autoClaimVipEnabled ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-700'"
                    >
                      <span 
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        :class="autoClaimVipEnabled ? 'translate-x-5' : 'translate-x-0'"
                      />
                    </button>
                  </div>

                  <!-- 实时状态看板 (开启时展开) -->
                  <div 
                    v-if="autoClaimVipEnabled"
                    class="pt-3 border-t border-gray-100 dark:border-slate-800/80 grid grid-cols-3 gap-2"
                  >
                    <!-- 1. 服务运行状态 -->
                    <div class="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/40 flex flex-col justify-between">
                      <div class="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                        <span class="w-1.5 h-1.5 rounded-full" :class="userStore.isLoggedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"></span>
                        <span>{{ userStore.isLoggedIn ? '调度服务运行中' : '未登录账号' }}</span>
                      </div>
                      <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                        {{ userStore.isLoggedIn ? '后台心跳检测正常' : '登录后自动打卡' }}
                      </p>
                    </div>

                    <!-- 2. 今日 1天VIP 状态 -->
                    <div class="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex flex-col justify-between">
                      <div class="flex items-center justify-between text-gray-700 dark:text-slate-200 font-bold text-[11px]">
                        <span>👑 1天畅听VIP</span>
                        <span class="text-[10px]" :class="userStore.dayVipState?.claimed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400'">
                          {{ userStore.dayVipState?.claimed ? '已入账' : '待领取' }}
                        </span>
                      </div>
                      <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                        {{ userStore.dayVipState?.claimed ? '今日额度已完成' : '调度器将自动签到' }}
                      </p>
                    </div>

                    <!-- 3. 今日 3小时特权 进度 -->
                    <div class="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex flex-col justify-between">
                      <div class="flex items-center justify-between text-gray-700 dark:text-slate-200 font-bold text-[11px]">
                        <span>🎁 3小时特权</span>
                        <span class="text-[10px] font-mono font-bold" :class="(userStore.vipState?.count || 0) >= 8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'">
                          {{ (userStore.vipState?.count || 0) >= 8 ? '已拉满' : `${userStore.vipState?.count || 0}/8 次` }}
                        </span>
                      </div>
                      <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 truncate">
                        {{ autoVipNextActionHint }}
                      </p>
                    </div>
                  </div>
                </section>

                <!-- 缓存与存储卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">存储与缓存管理</h3>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50">
                      <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">搜索历史记录</p>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">已保存 {{ searchHistoryCount }} 条搜索历史词</p>
                      </div>
                      <button 
                        @click="handleClearSearchHistory" 
                        class="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all border border-gray-200 dark:border-slate-700"
                      >
                        清空历史
                      </button>
                    </div>
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50">
                      <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">临时网络与图片缓存</p>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">当前缓存占用: {{ formattedCacheSize }}</p>
                      </div>
                      <button 
                        @click="handleClearAppCache" 
                        :disabled="isClearingCache"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all border border-blue-200 dark:border-blue-900 disabled:opacity-50 flex items-center"
                      >
                        <AppIcon v-if="isClearingCache" name="spinner" spin class="w-3.5 h-3.5 mr-1" />
                        清理缓存
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <!-- TAB 2: 播放与音频 -->
              <div v-show="currentTab === 'playback'" class="space-y-4">
                <!-- 音量增强增益卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="w-1.5 h-3.5 bg-purple-600 rounded-full"></span>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">音量增益增强 (Volume Boost)</p>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">WebAudio</span>
                      </div>
                      <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 ml-3.5">突破系统 100% 音量上限，最高放大至 2.0 倍</p>
                    </div>
                    <button 
                      @click="toggleVolumeBoost"
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                      :class="playerStore.volumeBoostEnabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-slate-700'"
                    >
                      <span 
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        :class="playerStore.volumeBoostEnabled ? 'translate-x-5' : 'translate-x-0'"
                      />
                    </button>
                  </div>

                  <div v-if="playerStore.volumeBoostEnabled" class="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-600 dark:text-slate-300">增益倍率选择：</span>
                    <div class="flex space-x-2">
                      <button
                        v-for="lvl in [1.25, 1.5, 2]"
                        :key="lvl"
                        @click="playerStore.setVolumeBoostLevel(lvl)"
                        class="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                        :class="playerStore.volumeBoostLevel === lvl 
                          ? 'bg-purple-600 text-white shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-purple-50'"
                      >
                        {{ Math.round(lvl * 100) }}% ({{ lvl }}x)
                      </button>
                    </div>
                  </div>
                </section>

                <!-- 播放控制偏好卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">播放控制偏好</h3>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50">
                      <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">故障自动跳过</p>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">当歌曲资源失效或播放失败时，自动播放下一首</p>
                      </div>
                      <button 
                        @click="autoSkipOnError = !autoSkipOnError"
                        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="autoSkipOnError ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'"
                      >
                        <span 
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="autoSkipOnError ? 'translate-x-5' : 'translate-x-0'"
                        />
                      </button>
                    </div>

                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50">
                      <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">记忆播放列表与进度</p>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">启动软件时恢复上次的播放列表与播放模式</p>
                      </div>
                      <button 
                        @click="rememberState = !rememberState"
                        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="rememberState ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'"
                      >
                        <span 
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="rememberState ? 'translate-x-5' : 'translate-x-0'"
                        />
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <!-- TAB 3: 桌面歌词 -->
              <div v-show="currentTab === 'lyrics'" class="space-y-4">
                <!-- 桌面歌词主开关横幅 -->
                <section class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-sm flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <AppIcon name="typography" class="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p class="text-xs font-bold text-white">桌面歌词悬浮窗</p>
                      <p class="text-[11px] text-white/80 mt-0.5">开启后可在桌面上置顶展示实时歌词</p>
                    </div>
                  </div>
                  <button 
                    @click="playerStore.toggleDesktopLyric()"
                    class="px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                    :class="playerStore.isDesktopLyricVisible 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-white text-blue-600 hover:bg-blue-50'"
                  >
                    {{ playerStore.isDesktopLyricVisible ? '关闭歌词' : '开启歌词' }}
                  </button>
                </section>

                <!-- 字号调节卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">歌词字号大小</h3>
                  </div>
                  <div class="space-y-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-lg p-3.5">
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1.5">
                        <span class="text-gray-700 dark:text-slate-300">主歌词字号</span>
                        <span class="text-blue-600 font-mono">{{ lyricConfig.fontSize }} px</span>
                      </div>
                      <input 
                        type="range" 
                        min="24" 
                        max="50" 
                        v-model.number="lyricConfig.fontSize" 
                        class="w-full accent-blue-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1.5">
                        <span class="text-gray-700 dark:text-slate-300">副歌词字号</span>
                        <span class="text-blue-600 font-mono">{{ lyricConfig.subFontSize }} px</span>
                      </div>
                      <input 
                        type="range" 
                        min="14" 
                        :max="lyricConfig.fontSize - 6" 
                        v-model.number="lyricConfig.subFontSize" 
                        class="w-full accent-blue-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </section>

                <!-- 配色方案卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">主题配色方案</h3>
                  </div>
                  <div class="grid grid-cols-6 gap-2">
                    <button
                      v-for="t in lyricThemes"
                      :key="t.id"
                      @click="lyricConfig.colorTheme = t.id"
                      class="py-2.5 rounded-lg border flex flex-col items-center justify-center transition-all group"
                      :class="lyricConfig.colorTheme === t.id 
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs ring-1 ring-blue-500' 
                        : 'border-gray-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50'"
                    >
                      <div class="w-4 h-4 rounded-full mb-1 border border-black/10 shadow-xs" :style="{ backgroundColor: t.color }"></div>
                      <span class="text-[11px] font-bold text-gray-600 dark:text-slate-300">{{ t.label }}</span>
                    </button>

                    <!-- 自定义调色盘按钮 -->
                    <button
                      @click="selectCustomColorTheme"
                      class="py-2.5 rounded-lg border flex flex-col items-center justify-center transition-all group relative"
                      :class="lyricConfig.colorTheme === 'custom' 
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs ring-1 ring-blue-500' 
                        : 'border-gray-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50'"
                    >
                      <div class="w-4 h-4 rounded-full mb-1 border border-black/10 shadow-xs flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                        <img 
                          v-if="rainbowRingDataUrl" 
                          :src="rainbowRingDataUrl" 
                          class="w-full h-full block pointer-events-none select-none" 
                          alt="rainbow ring"
                        />
                      </div>
                      <span class="text-[11px] font-bold text-gray-600 dark:text-slate-300">自定义</span>
                    </button>
                  </div>

                  <!-- 选中自定义时的无极调色盘控制器 -->
                  <div 
                    v-if="lyricConfig.colorTheme === 'custom'" 
                    class="flex items-center justify-between p-3 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/80 transition-all"
                  >
                    <div class="flex items-center space-x-3">
                      <div class="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-slate-600 shadow-inner group">
                        <input 
                          type="color" 
                          v-model="lyricConfig.customColor" 
                          class="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
                          title="点击打开调色盘"
                        />
                        <div 
                          class="w-full h-full rounded-full pointer-events-none transition-transform group-hover:scale-110" 
                          :style="{ backgroundColor: lyricConfig.customColor || '#38bdf8' }"
                        ></div>
                      </div>
                      <div>
                        <div class="flex items-center space-x-1.5">
                          <p class="text-xs font-bold text-gray-800 dark:text-slate-200">无极调色盘</p>
                          <span class="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded font-medium">拾色器</span>
                        </div>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">点击色块选取任意颜色，或在右侧输入 HEX 色值</p>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <div class="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-700 dark:text-slate-200 focus-within:border-blue-500 shadow-xs">
                        <span class="text-gray-400 mr-1 select-none">#</span>
                        <input 
                          type="text" 
                          :value="lyricConfig.customColor ? lyricConfig.customColor.replace(/^#/, '') : '38bdf8'"
                          @input="handleCustomHexInput($event.target.value)"
                          class="w-16 bg-transparent outline-none uppercase font-mono text-xs text-gray-800 dark:text-slate-200"
                          maxlength="6"
                          placeholder="38bdf8"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 动画与显示卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">动画与显示</h3>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50">
                      <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">逐字卡拉OK平滑过渡</p>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">主歌词跟随演唱节奏逐字精准染色高亮</p>
                      </div>
                      <button 
                        @click="lyricConfig.karaokeMode = !lyricConfig.karaokeMode"
                        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="lyricConfig.karaokeMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'"
                      >
                        <span 
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="lyricConfig.karaokeMode ? 'translate-x-5' : 'translate-x-0'"
                        />
                      </button>
                    </div>

                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50">
                      <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-slate-200">显示副歌词（翻译/下一句）</p>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">在主歌词下方展示双语翻译或下一句预告</p>
                      </div>
                      <button 
                        @click="lyricConfig.showSub = !lyricConfig.showSub"
                        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="lyricConfig.showSub ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'"
                      >
                        <span 
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="lyricConfig.showSub ? 'translate-x-5' : 'translate-x-0'"
                        />
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <!-- TAB 4: 快捷键 -->
              <div v-show="currentTab === 'shortcuts'" class="space-y-4">
                <!-- 全局快捷键开关卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 flex items-center justify-between">
                  <div>
                    <div class="flex items-center space-x-2">
                      <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                      <p class="text-xs font-bold text-gray-800 dark:text-slate-200">启用全局快捷键</p>
                    </div>
                    <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 ml-3.5">在其他软件或桌面时也能通过热键控制播放</p>
                  </div>
                  <button 
                    @click="toggleGlobalShortcuts"
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    :class="globalShortcutsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'"
                  >
                    <span 
                      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      :class="globalShortcutsEnabled ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                </section>

                <!-- 全局快捷键一览卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">全局热键 (System Global)</h3>
                  </div>
                  <div class="bg-slate-50/70 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-gray-200/60 dark:border-slate-700/50">
                    <div 
                      v-for="(item, idx) in globalShortcutList" 
                      :key="idx"
                      class="flex items-center justify-between px-3.5 py-2 text-xs"
                      :class="idx !== 0 ? 'border-t border-gray-200/60 dark:border-slate-700/50' : ''"
                    >
                      <span class="font-medium text-gray-700 dark:text-slate-300">{{ item.name }}</span>
                      <div class="flex space-x-1">
                        <kbd 
                          v-for="k in item.keys" 
                          :key="k" 
                          class="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[11px] font-mono font-bold shadow-xs text-gray-700 dark:text-slate-200"
                        >
                          {{ k }}
                        </kbd>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 应用内快捷键一览卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4 space-y-3">
                  <div class="flex items-center space-x-2">
                    <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    <h3 class="text-xs font-bold text-gray-800 dark:text-slate-200">软件内快捷键 (In-App)</h3>
                  </div>
                  <div class="bg-slate-50/70 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-gray-200/60 dark:border-slate-700/50">
                    <div 
                      v-for="(item, idx) in localShortcutList" 
                      :key="idx"
                      class="flex items-center justify-between px-3.5 py-2 text-xs"
                      :class="idx !== 0 ? 'border-t border-gray-200/60 dark:border-slate-700/50' : ''"
                    >
                      <span class="font-medium text-gray-700 dark:text-slate-300">{{ item.name }}</span>
                      <div class="flex space-x-1">
                        <kbd 
                          v-for="k in item.keys" 
                          :key="k" 
                          class="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[11px] font-mono font-bold shadow-xs text-gray-700 dark:text-slate-200"
                        >
                          {{ k }}
                        </kbd>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <!-- TAB 5: 关于与更新 -->
              <div v-show="currentTab === 'about'" class="space-y-4">
                <!-- 软件信息 Hero 卡片 -->
                <div class="h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl relative flex items-center justify-between px-6 overflow-hidden text-white shadow-sm">
                  <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
                  <div class="flex items-center space-x-4 relative z-10">
                    <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md shadow-black/10 shrink-0">
                      <img src="/icon.ico" class="w-9 h-9" alt="概念音乐" />
                    </div>
                    <div>
                      <h3 class="text-base font-black tracking-tight">概念音乐 Desktop</h3>
                      <p class="text-xs text-white/80 font-mono mt-0.5">v{{ appVersion }}</p>
                      <p class="text-[11px] text-white/70 mt-1">回归音乐本身，听见好时光</p>
                    </div>
                  </div>
                </div>

                <!-- 检查更新交互卡片 -->
                <section class="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200/70 dark:border-slate-700/60 shadow-xs p-4">
                  
                  <template v-if="updateStatus === 'idle'">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                          <p class="text-xs font-bold text-gray-800 dark:text-slate-200">在线更新检查</p>
                        </div>
                        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 ml-3.5">检查 GitHub 官方发布的最新版本与功能更新</p>
                      </div>
                      <button 
                        @click="checkForUpdates" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <AppIcon name="refresh" class="w-3.5 h-3.5" />
                        检查更新
                      </button>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'checking'">
                    <div class="flex items-center justify-center py-4 space-x-3 text-blue-600 dark:text-blue-400 text-xs font-bold">
                      <AppIcon name="spinner" spin class="w-5 h-5" />
                      <span>正在检查最新版本，请稍候...</span>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'not-available'">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2.5">
                        <div class="w-7 h-7 rounded-full bg-green-50 text-green-500 dark:bg-green-950/60 flex items-center justify-center">
                          <AppIcon name="check" class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-xs font-bold text-gray-800 dark:text-slate-200">当前已是最新版本 (v{{ appVersion }})</p>
                          <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">无需更新，继续享受音乐吧</p>
                        </div>
                      </div>
                      <button 
                        @click="checkForUpdates" 
                        class="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-slate-700"
                      >
                        重新检查
                      </button>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'available'">
                    <div class="space-y-3">
                      <div class="flex items-center space-x-2.5">
                        <div class="w-7 h-7 rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950/60 flex items-center justify-center">
                          <AppIcon name="download" class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-xs font-bold text-gray-900 dark:text-white">发现新版本 v{{ updateInfo.version }}</p>
                          <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">包含性能优化与全新功能升级</p>
                        </div>
                      </div>
                      <div class="flex space-x-3">
                        <button 
                          @click="startDownload" 
                          class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          立即更新
                        </button>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'downloading'">
                    <div class="space-y-3">
                      <div class="flex justify-between items-center text-xs font-bold">
                        <span class="text-gray-800 dark:text-slate-200">正在下载更新安装包...</span>
                        <span class="text-blue-600 font-mono">{{ progressPercent }}% ({{ progressSpeed }})</span>
                      </div>
                      <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div class="h-full bg-blue-600 rounded-full transition-all duration-300" :style="{ width: progressPercent + '%' }"></div>
                      </div>
                      <div class="flex justify-end">
                        <button @click="cancelDownload" class="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
                          取消下载
                        </button>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'downloaded'">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2.5">
                        <div class="w-7 h-7 rounded-full bg-green-50 text-green-500 dark:bg-green-950/60 flex items-center justify-center">
                          <AppIcon name="check" class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-xs font-bold text-gray-900 dark:text-white">更新下载完成</p>
                          <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">重启软件即可完成自动升级安装</p>
                        </div>
                      </div>
                      <button 
                        @click="installUpdate" 
                        class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                      >
                        立即重启安装
                      </button>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'error'">
                    <div class="space-y-3">
                      <div class="flex items-center space-x-2.5">
                        <div class="w-7 h-7 rounded-full bg-red-50 text-red-500 dark:bg-red-950/60 flex items-center justify-center">
                          <AppIcon name="danger" class="w-4 h-4" />
                        </div>
                        <div>
                          <p class="text-xs font-bold text-red-600 dark:text-red-400">{{ isDownloadError ? '下载更新失败' : '检查更新失败' }}</p>
                          <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{{ errorMsg || '网络连接异常，请稍后重试' }}</p>
                        </div>
                      </div>
                      <div class="flex space-x-2">
                        <button @click="resetToIdle" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200">
                          返回
                        </button>
                        <button 
                          v-if="updateInfo.version" 
                          @click="openExternalLink('https://github.com/liovoz/concept-music/releases/tag/v' + updateInfo.version)" 
                          class="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                        >
                          手动下载 Release
                        </button>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="updateStatus === 'cancelled'">
                    <div class="flex items-center justify-between">
                      <p class="text-xs text-gray-600 dark:text-slate-400">下载已取消</p>
                      <button @click="resetToIdle" class="text-xs text-blue-600 font-bold">返回重试</button>
                    </div>
                  </template>
                </section>

                <!-- 外部与条款链接卡片 -->
                <section class="grid grid-cols-3 gap-2.5">
                  <div 
                    @click="openExternalLink('https://liovoz.xyz')" 
                    class="p-3 rounded-xl bg-white dark:bg-slate-800/90 hover:border-blue-300 dark:hover:border-slate-600 border border-gray-200/70 dark:border-slate-700/60 shadow-xs text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div class="min-w-0 pr-1">
                      <p class="text-xs font-bold text-gray-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">官方网站</p>
                      <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 font-mono truncate">liovoz.xyz</p>
                    </div>
                    <AppIcon name="share" class="w-3.5 h-3.5 text-gray-400 group-hover:scale-110 shrink-0 transition-transform" />
                  </div>

                  <div 
                    @click="openExternalLink('https://github.com/liovoz/concept-music')" 
                    class="p-3 rounded-xl bg-white dark:bg-slate-800/90 hover:border-blue-300 dark:hover:border-slate-600 border border-gray-200/70 dark:border-slate-700/60 shadow-xs text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div class="min-w-0 pr-1">
                      <p class="text-xs font-bold text-gray-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">GitHub 仓库</p>
                      <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 truncate">参与贡献与反馈</p>
                    </div>
                    <AppIcon name="share" class="w-3.5 h-3.5 text-gray-400 group-hover:scale-110 shrink-0 transition-transform" />
                  </div>

                  <button 
                    @click="openDisclaimer" 
                    class="p-3 rounded-xl bg-white dark:bg-slate-800/90 hover:border-blue-300 dark:hover:border-slate-600 border border-gray-200/70 dark:border-slate-700/60 shadow-xs text-left flex items-center justify-between transition-all group"
                  >
                    <div class="min-w-0 pr-1">
                      <p class="text-xs font-bold text-gray-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">免责声明与许可</p>
                      <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 truncate">查看免责条款</p>
                    </div>
                    <AppIcon name="chevron-right" class="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 shrink-0 transition-transform" />
                  </button>
                </section>
              </div>

            </div>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick, inject } from 'vue';
import { useTheme } from '../composables/useTheme';
import { usePlayerStore } from '../store/playerStore';
import { useUserStore } from '../store/userStore';
import { useSearchHistory } from '../composables/useSearchHistory';

const props = defineProps({
  initialTab: { type: String, default: 'general' }
});

const isVisible = ref(false);
const currentTab = ref('general');
const modalContainerRef = ref(null);

const { theme, setTheme } = useTheme();
const playerStore = usePlayerStore();
const userStore = useUserStore();
const { history, clearHistory, syncHistory } = useSearchHistory();
const disclaimerModalRef = inject('disclaimerModalRef', null);

const tabs = [
  { id: 'general', name: '常规与外观', icon: 'settings' },
  { id: 'playback', name: '播放与音频', icon: 'music' },
  { id: 'lyrics', name: '桌面歌词', icon: 'typography' },
  { id: 'shortcuts', name: '快捷键', icon: 'keyboard' },
  { id: 'about', name: '关于与更新', icon: 'info' }
];

// --- 1. 常规与外观 ---
const autoClaimVipEnabled = ref(localStorage.getItem('kg_desktop_auto_claim_vip') === 'true');
const liveNow = ref(Date.now());
let liveTimer = null;

watch(autoClaimVipEnabled, (val) => {
  try {
    localStorage.setItem('kg_desktop_auto_claim_vip', String(val));
  } catch (e) {}
  userStore.setAutoClaimVip(val);
});

const toggleAutoClaimVip = () => {
  autoClaimVipEnabled.value = !autoClaimVipEnabled.value;
  playerStore.showToast(autoClaimVipEnabled.value ? '已开启自动领取 VIP 特权' : '已关闭自动领取 VIP');
};

const autoVipNextActionHint = computed(() => {
  if (!userStore?.isLoggedIn) return '需先登录账号';
  const count = Number(userStore?.vipState?.count || 0);
  if (count >= 8) return '今日 8 次已全部完成';
  const lastTime = Number(userStore?.vipState?.lastTime || 0);
  const COOLDOWN_MS = 60 * 60 * 1000;
  const elapsed = (liveNow.value || Date.now()) - lastTime;
  if (lastTime > 0 && elapsed < COOLDOWN_MS) {
    const remainSec = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
    const m = Math.floor(remainSec / 60);
    const s = remainSec % 60;
    return `约 ${m}:${s.toString().padStart(2, '0')} 后打卡`;
  }
  return 'CD 就绪，即将打卡';
});

const closeActions = [
  { value: 'minimize', title: '最小化到系统托盘', desc: '继续在系统后台播放音乐' },
  { value: 'quit', title: '直接退出软件', desc: '完全关闭概念音乐程序' },
  { value: 'ask', title: '每次关闭时询问', desc: '弹出选择确认对话框' }
];
const closeBehavior = ref(localStorage.getItem('kg_desktop_close_action') || 'ask');
watch(closeBehavior, (val) => {
  localStorage.setItem('kg_desktop_close_action', val);
});

const autoStartEnabled = ref(false);
const initAutoStart = async () => {
  if (window.settingsAPI?.getAutoStart) {
    try {
      autoStartEnabled.value = await window.settingsAPI.getAutoStart();
    } catch (e) {}
  }
};
const toggleAutoStart = async () => {
  if (window.settingsAPI?.setAutoStart) {
    try {
      const next = !autoStartEnabled.value;
      autoStartEnabled.value = await window.settingsAPI.setAutoStart(next);
      playerStore.showToast(autoStartEnabled.value ? '已开启开机自启动' : '已关闭开机自启动');
    } catch (e) {
      playerStore.showToast('设置开机自启动失败');
    }
  }
};

const handleSetTheme = (mode) => {
  setTheme(mode);
};

const searchHistoryCount = computed(() => history.value.length);
const handleClearSearchHistory = () => {
  playerStore.showDialog({
    type: 'danger',
    title: '清空搜索历史',
    message: '确定要清空全部已保存的搜索历史记录吗？\n清空后将无法恢复。',
    confirmText: '确认清空',
    cancelText: '取消',
    onConfirm: () => {
      clearHistory();
      playerStore.showToast('搜索历史记录已清空');
    }
  });
};

const cacheSize = ref(0);
const isClearingCache = ref(false);
const formattedCacheSize = computed(() => {
  if (!cacheSize.value || cacheSize.value <= 0) return '0 KB';
  if (cacheSize.value > 1048576) return (cacheSize.value / 1048576).toFixed(1) + ' MB';
  return (cacheSize.value / 1024).toFixed(0) + ' KB';
});
const refreshCacheSize = async () => {
  if (window.settingsAPI?.getCacheSize) {
    try {
      cacheSize.value = await window.settingsAPI.getCacheSize();
    } catch (e) {}
  }
};
const executeClearAppCache = async () => {
  if (window.settingsAPI?.clearCache) {
    isClearingCache.value = true;
    try {
      await window.settingsAPI.clearCache();
      cacheSize.value = 0;
      playerStore.showToast('临时网络缓存已清空');
    } catch (e) {
      playerStore.showToast('清理缓存失败');
    } finally {
      isClearingCache.value = false;
    }
  } else {
    cacheSize.value = 0;
    playerStore.showToast('缓存已清空');
  }
};

const handleClearAppCache = () => {
  playerStore.showDialog({
    type: 'danger',
    title: '清理临时缓存',
    message: '确定要清理所有临时网络请求与图片缓存吗？\n清理后部分图片与数据将在下次加载时重新获取。',
    confirmText: '确认清理',
    cancelText: '取消',
    onConfirm: () => {
      executeClearAppCache();
    }
  });
};

// --- 2. 播放与音频 ---
const toggleVolumeBoost = () => {
  playerStore.toggleVolumeBoost();
};
const autoSkipOnError = ref(localStorage.getItem('kg_desktop_auto_skip') !== 'false');
watch(autoSkipOnError, (val) => {
  localStorage.setItem('kg_desktop_auto_skip', String(val));
});
const rememberState = ref(localStorage.getItem('kg_desktop_remember_state') !== 'false');
watch(rememberState, (val) => {
  localStorage.setItem('kg_desktop_remember_state', String(val));
});

// --- 3. 桌面歌词 ---
const lyricThemes = [
  { id: 'white', label: '亮白', color: '#f8fafc' },
  { id: 'red', label: '珊瑚粉', color: '#fb7185' },
  { id: 'blue', label: '天蓝', color: '#60a5fa' },
  { id: 'green', label: '翠绿', color: '#34d399' },
  { id: 'purple', label: '幻紫', color: '#a78bfa' }
];
const lyricConfig = reactive({
  fontSize: 34,
  subFontSize: 28,
  colorTheme: 'white',
  customColor: '#38bdf8',
  showSub: true,
  karaokeMode: true
});
const selectCustomColorTheme = () => {
  lyricConfig.colorTheme = 'custom';
  if (!lyricConfig.customColor) {
    lyricConfig.customColor = '#38bdf8';
  }
};
const handleCustomHexInput = (val) => {
  let clean = (val || '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  if (clean.length === 6 || clean.length === 3) {
    lyricConfig.customColor = '#' + clean;
    lyricConfig.colorTheme = 'custom';
  }
};
const rainbowRingDataUrl = computed(() => {
  if (typeof document === 'undefined') return '';
  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || !ctx.createConicGradient) return '';
    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 0.5;
    const innerR = (size / 2) * 0.35;
    const grad = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    grad.addColorStop(0, '#ff3b30');
    grad.addColorStop(0.14, '#ff9500');
    grad.addColorStop(0.28, '#ffcc00');
    grad.addColorStop(0.42, '#34c759');
    grad.addColorStop(0.56, '#00c7be');
    grad.addColorStop(0.70, '#007aff');
    grad.addColorStop(0.84, '#5856d6');
    grad.addColorStop(0.93, '#af52de');
    grad.addColorStop(0.98, '#ff2d55');
    grad.addColorStop(1, '#ff3b30');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2, false);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
});

const loadLyricConfig = () => {
  try {
    const saved = localStorage.getItem('kg_desktop_lyric_config');
    if (saved) Object.assign(lyricConfig, JSON.parse(saved));
  } catch (e) {}
};

const handleLyricStorageChange = (e) => {
  if (e.key === 'kg_desktop_lyric_config' && e.newValue) {
    try {
      const parsed = JSON.parse(e.newValue);
      Object.assign(lyricConfig, parsed);
    } catch (err) {}
  }
};
watch(lyricConfig, (v) => {
  const maxSub = v.fontSize - 6;
  if (v.subFontSize > maxSub) v.subFontSize = Math.max(14, maxSub);
  localStorage.setItem('kg_desktop_lyric_config', JSON.stringify(v));
}, { deep: true });

// --- 4. 快捷键 ---
const globalShortcutsEnabled = ref(localStorage.getItem('kg_desktop_shortcuts_enabled') !== 'false');
const initGlobalShortcuts = async () => {
  const localVal = localStorage.getItem('kg_desktop_shortcuts_enabled');
  if (localVal !== null) {
    globalShortcutsEnabled.value = localVal === 'true';
  }
  if (window.settingsAPI?.getShortcutsEnabled) {
    try {
      const val = await window.settingsAPI.getShortcutsEnabled();
      globalShortcutsEnabled.value = val;
      localStorage.setItem('kg_desktop_shortcuts_enabled', String(val));
    } catch (e) {}
  }
};
const toggleGlobalShortcuts = async () => {
  const next = !globalShortcutsEnabled.value;
  globalShortcutsEnabled.value = next;
  localStorage.setItem('kg_desktop_shortcuts_enabled', String(next));
  if (window.settingsAPI?.setShortcutsEnabled) {
    try {
      await window.settingsAPI.setShortcutsEnabled(next);
      playerStore.showToast(next ? '全局快捷键已启用' : '全局快捷键已禁用');
    } catch (e) {
      playerStore.showToast('设置快捷键失败');
    }
  } else {
    playerStore.showToast(next ? '全局快捷键已启用' : '全局快捷键已禁用');
  }
};

const globalShortcutList = [
  { name: '播放 / 暂停', keys: ['Ctrl', 'Alt', 'Space'] },
  { name: '上一首歌曲', keys: ['Ctrl', 'Alt', '←'] },
  { name: '下一首歌曲', keys: ['Ctrl', 'Alt', '→'] },
  { name: '静音 / 恢复音量', keys: ['Ctrl', 'Alt', 'M'] }
];

const localShortcutList = [
  { name: '播放 / 暂停', keys: ['Space'] },
  { name: '快进 / 快退 5秒', keys: ['←', '→'] },
  { name: '音量增加 / 减小', keys: ['↑', '↓'] },
  { name: '桌面歌词开启/关闭', keys: ['Ctrl', 'D'] }
];

// --- 5. 关于与更新 ---
const appVersion = ref(__APP_VERSION__ || '1.0.0');
const updateStatus = ref('idle');
const updateInfo = ref({});
const progressInfo = ref({ percent: 0, bytesPerSecond: 0 });
const errorMsg = ref('');
const isDownloadError = ref(false);

const hasUpdateAvailable = computed(() => updateStatus.value === 'available');

const progressSpeed = computed(() => {
  const bytes = progressInfo.value.bytesPerSecond;
  if (!bytes) return '计算中...';
  if (bytes > 1048576) return (bytes / 1048576).toFixed(2) + ' MB/s';
  return (bytes / 1024).toFixed(2) + ' KB/s';
});
const progressPercent = computed(() => Math.floor(progressInfo.value.percent || 0));

const checkForUpdates = () => {
  if (window.updaterAPI) {
    updateStatus.value = 'checking';
    window.updaterAPI.checkForUpdates();
  }
};

const startDownload = () => {
  if (window.updaterAPI) {
    updateStatus.value = 'downloading';
    progressInfo.value = { percent: 0, bytesPerSecond: 0 };
    window.updaterAPI.downloadUpdate();
  }
};

const cancelDownload = () => {
  if (window.updaterAPI) {
    window.updaterAPI.cancelDownload();
    updateStatus.value = 'cancelled';
  }
};

const installUpdate = () => {
  if (window.updaterAPI) window.updaterAPI.quitAndInstall();
};

const resetToIdle = () => {
  updateStatus.value = 'idle';
  progressInfo.value = { percent: 0, bytesPerSecond: 0 };
};

const openDisclaimer = () => {
  if (disclaimerModalRef && disclaimerModalRef.value) {
    disclaimerModalRef.value.showModal();
  }
};

const openExternalLink = (url) => {
  if (!url) return;
  if (window.settingsAPI?.openExternal) {
    window.settingsAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
};

// --- 模态窗控制 ---
const showModal = (tab = 'general') => {
  currentTab.value = tab;
  isVisible.value = true;
  closeBehavior.value = localStorage.getItem('kg_desktop_close_action') || 'ask';
  autoClaimVipEnabled.value = (localStorage.getItem('kg_desktop_auto_claim_vip') === 'true');
  syncHistory();
  loadLyricConfig();
  initAutoStart();
  initGlobalShortcuts();
  refreshCacheSize();

  if (window.updaterAPI) {
    window.updaterAPI.getAppVersion().then(ver => {
      if (ver) appVersion.value = ver;
    }).catch(() => {});
  }

  nextTick(() => {
    modalContainerRef.value?.focus();
  });
};

const closeModal = () => {
  if (updateStatus.value === 'downloading') return;
  isVisible.value = false;
};

let isListeningUpdater = false;
onMounted(() => {
  liveTimer = setInterval(() => {
    if (isVisible.value) {
      liveNow.value = Date.now();
    }
  }, 1000);
  window.addEventListener('storage', handleLyricStorageChange);
  if (window.updaterAPI && !isListeningUpdater) {
    isListeningUpdater = true;
    window.updaterAPI.onUpdateEvent((data) => {
      switch (data.type) {
        case 'checking':
          if (data.isManualCheck) updateStatus.value = 'checking';
          break;
        case 'available':
          updateInfo.value = data.info || {};
          updateStatus.value = 'available';
          break;
        case 'not-available':
          if (data.isManualCheck) updateStatus.value = 'not-available';
          break;
        case 'progress':
          updateStatus.value = 'downloading';
          progressInfo.value = data.progressObj || {};
          break;
        case 'error':
          if (updateStatus.value === 'cancelled') break;
          updateStatus.value = 'error';
          errorMsg.value = data.message || '更新检查失败';
          break;
        case 'cancelled':
          updateStatus.value = 'cancelled';
          break;
        case 'downloaded':
          updateStatus.value = 'downloaded';
          break;
      }
    });
  }
});

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer);
  window.removeEventListener('storage', handleLyricStorageChange);
});

defineExpose({
  showModal,
  closeModal
});
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.94) translateY(8px);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(203, 213, 225, 0.4);
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: rgba(203, 213, 225, 0.7);
}
</style>
