<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="updateStore.canShowFloatCard"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 backdrop-blur-md no-drag p-4 outline-none"
        @click.self="handleBackdropClick"
      >
        <div
          class="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-slate-800/80 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] w-[520px] max-w-[94vw] flex flex-col overflow-hidden transform transition-all text-slate-800 dark:text-slate-100 select-none"
        >
          <!-- 顶部装饰性极光光晕背景 -->
          <div class="absolute -top-16 -left-16 w-48 h-48 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/15 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- 头部：图标 + 标题 + 版本药丸 + 关闭按钮 -->
          <div class="relative px-6 pt-6 pb-4 border-b border-slate-100/80 dark:border-slate-800/80 bg-gradient-to-b from-blue-50/50 via-indigo-50/15 to-transparent dark:from-blue-950/25 dark:via-slate-900/50 dark:to-transparent">
            <!-- 关闭按钮 (非强制更新时展示) -->
            <button
              v-if="!updateStore.isForced && !updateStore.isBlacklisted"
              @click="updateStore.dismissCard('close')"
              class="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all duration-150 active:scale-90 border border-slate-200/50 dark:border-slate-700/50"
              v-tooltip="'关闭 (Esc)'"
            >
              <AppIcon name="close" class="w-3.5 h-3.5" />
            </button>

            <div class="flex items-start space-x-3.5">
              <!-- 图标徽章：高质感 3D 渐变 -->
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 transition-transform duration-300 hover:scale-105"
                :class="headerIconStyle.wrap"
              >
                <AppIcon :name="headerIconStyle.icon" class="w-6 h-6 text-white" />
              </div>

              <!-- 标题与版本信息 -->
              <div class="space-y-1 pr-8">
                <div class="flex items-center space-x-2">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {{ cardTitle }}
                  </h3>
                  <span
                    v-if="updateStore.isBlacklisted"
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300/60 dark:border-rose-700/60 shadow-xs flex items-center gap-1"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    版本已熔断
                  </span>
                  <span
                    v-else-if="updateStore.isForced"
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/60 shadow-xs flex items-center gap-1"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    强制安全更新
                  </span>
                  <span
                    v-else-if="updateStore.updateInfo?.version"
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50 shadow-xs flex items-center gap-1"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    v{{ updateStore.updateInfo.version }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  {{ headerSubtitle }}
                </p>
              </div>
            </div>
          </div>

          <!-- 紧急安全更新/熔断公告横幅 -->
          <div 
            v-if="updateStore.isForced || updateStore.isBlacklisted" 
            class="mx-6 mt-3 px-3.5 py-2.5 rounded-2xl text-xs flex items-start gap-3 border shadow-2xs"
            :class="updateStore.isBlacklisted ? 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200'"
          >
            <div 
              class="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
              :class="updateStore.isBlacklisted ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'"
            >
              <AppIcon :name="updateStore.isBlacklisted ? 'danger' : 'warning'" class="w-3.5 h-3.5" />
            </div>
            <div class="leading-relaxed flex-1">
              <div class="font-black text-xs mb-0.5 tracking-tight">{{ updateStore.forceTitle || (updateStore.isBlacklisted ? '版本安全熔断警报' : '强制版本升级要求') }}</div>
              <div class="opacity-90 text-[11px] leading-normal select-text">{{ updateStore.forceNotice || '当前版本已无法继续提供正常服务，请立即升级到新版本以继续使用。' }}</div>
            </div>
          </div>

          <!-- 加速通道或容灾状态条 -->
          <div 
            v-if="updateStore.channelFallbackNotice || (updateStore.updateChannel !== 'official' && updateStore.updateChannel !== 'auto')" 
            class="mx-6 mt-3 px-3 py-1.5 rounded-xl bg-blue-500/8 dark:bg-blue-400/10 text-xs text-blue-600 dark:text-blue-300 flex items-center justify-between border border-blue-500/20 font-medium"
          >
            <span class="flex items-center gap-2 truncate">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="truncate">{{ updateStore.channelFallbackNotice || updateStore.channelName }}</span>
            </span>
            <span class="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md shrink-0 border border-emerald-500/20">
              专线加速
            </span>
          </div>

          <!-- 内容区 1：发现新版本 (available) -->
          <div v-if="updateStore.status === 'available'" class="flex flex-col">
            <div class="px-6 py-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <AppIcon name="sparkles" class="w-3.5 h-3.5 text-blue-500" />
                  <span>新版特性 / CHANGELOG</span>
                </span>
                <span v-if="updateStore.updateInfo?.releaseDate" class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {{ formatDate(updateStore.updateInfo.releaseDate) }}
                </span>
              </div>

              <!-- 结构化更新日志卡片列表 -->
              <div class="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-3 max-h-72 overflow-y-auto custom-scrollbar shadow-inner">
                <!-- 导语描述 -->
                <div 
                  v-if="parsedNotesData.lead" 
                  class="p-3 mb-3 rounded-xl bg-gradient-to-r from-blue-500/8 via-indigo-500/8 to-transparent border border-blue-500/15 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal"
                  v-html="formatInline(parsedNotesData.lead)"
                ></div>

                <!-- 章节列表 -->
                <div v-if="parsedNotesData.sections.length > 0" class="space-y-4">
                  <div 
                    v-for="(section, sIdx) in parsedNotesData.sections" 
                    :key="sIdx" 
                    class="space-y-2"
                  >
                    <!-- 章节标题 -->
                    <div v-if="section.title" class="flex items-center gap-2 pt-1 border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5 sticky top-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-md z-10">
                      <span class="px-2.5 py-0.5 rounded-lg bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-300 font-black text-xs">
                        {{ section.title }}
                      </span>
                    </div>

                    <div class="space-y-1.5 pl-0.5">
                      <template v-for="(item, iIdx) in section.items" :key="iIdx">
                        <!-- 小节标题（例如：### 1. 企鹅歌单跨平台无缝导入） -->
                        <div v-if="item.type === 'subtitle'" class="pt-2 pb-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span>{{ item.text }}</span>
                        </div>

                        <!-- 列表项卡片 -->
                        <div v-else-if="item.type === 'bullet'" class="flex items-start gap-2.5 p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-100/80 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-800/60 hover:shadow-xs transition-all">
                          <span v-if="item.num" class="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600 dark:text-blue-300 text-[11px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            {{ item.num.padStart(2, '0') }}
                          </span>
                          <span v-else class="w-1.5 h-1.5 rounded-full bg-blue-500/70 mt-2 shrink-0 ml-1 mr-0.5"></span>
                          <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal select-text flex-1" v-html="formatInline(item.text)"></div>
                        </div>

                        <!-- 普通段落 -->
                        <p v-else class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed p-1" v-html="formatInline(item.text)"></p>
                      </template>
                    </div>
                  </div>
                </div>

                <p v-else class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed p-3">
                  概念音乐发布了全新版本，带来多项性能优化、国内镜像加速通道及体验修复，推荐更新以获取最佳视听体验。
                </p>
              </div>
            </div>

            <!-- 底部操作栏 -->
            <div class="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <!-- 左侧辅助快捷链接 -->
              <div class="flex items-center space-x-2.5">
                <button
                  v-if="!updateStore.isForced && !updateStore.isBlacklisted"
                  @click="updateStore.dismissCard('ignore')"
                  class="text-xs text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors font-medium"
                  v-tooltip="'跳过此版本 (不再提示)'"
                >
                  跳过此版本
                </button>
                <span v-if="!updateStore.isForced && !updateStore.isBlacklisted" class="text-slate-200 dark:text-slate-700 select-none">|</span>
                <button
                  @click="openDetails"
                  class="text-xs text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-1.5"
                  v-tooltip="'切换更新镜像加速通道'"
                >
                  <AppIcon name="settings" class="w-3.5 h-3.5" />
                  <span>线路设置</span>
                  <span class="text-[10px] text-blue-500/90 font-medium">({{ currentChannelBrief }})</span>
                </button>
              </div>

              <!-- 右侧主/次操作按钮 -->
              <div class="flex items-center space-x-2.5">
                <!-- 非强制更新：稍后提醒 -->
                <button
                  v-if="!updateStore.isForced && !updateStore.isBlacklisted"
                  @click="updateStore.dismissCard('snooze')"
                  class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all"
                  v-tooltip="'稍后提醒 (24小时内不再提示)'"
                >
                  稍后提醒
                </button>

                <!-- 强制更新或熔断模式：退出软件 -->
                <button
                  v-else
                  @click="updateStore.quitApp()"
                  class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                >
                  退出软件
                </button>

                <button
                  @click="updateStore.startDownload()"
                  class="px-6 py-2.5 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 group"
                  :class="updateStore.isBlacklisted 
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/25 hover:shadow-rose-500/35' 
                    : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 hover:shadow-blue-500/35'"
                >
                  <AppIcon :name="updateStore.isPortable ? 'share' : 'download'" class="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                  <span>{{ updateStore.isPortable ? '前往下载 Release' : '立即更新' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 内容区 2：正在下载中 (downloading) -->
          <div v-else-if="updateStore.status === 'downloading'" class="flex flex-col">
            <div class="px-6 py-8 space-y-5">
              <div class="flex justify-between items-center text-xs">
                <div class="flex items-center space-x-2.5">
                  <span class="relative flex h-2.5 w-2.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span class="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    正在极速下载安装包...
                  </span>
                </div>
                <span class="text-blue-600 dark:text-blue-400 font-mono text-xs font-black bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/40">
                  {{ updateStore.progressPercent }}% · {{ updateStore.progressSpeed }}
                </span>
              </div>

              <!-- 炫彩渐变微光进度条 -->
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
                <div
                  class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 rounded-full transition-all duration-300 relative overflow-hidden shadow-xs"
                  :style="{ width: updateStore.progressPercent + '%' }"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent w-full h-full animate-[shimmer_1.8s_infinite]"></div>
                </div>
              </div>

              <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1">
                <span class="flex items-center gap-1.5">
                  <AppIcon name="music" class="w-3.5 h-3.5 text-blue-500" />
                  <span>{{ (updateStore.isForced || updateStore.isBlacklisted) ? '正在下载最新版本，下载完成后自动提示安装' : '下载过程不影响歌曲播放，您可以继续听歌' }}</span>
                </span>
                <button
                  v-if="!updateStore.isForced && !updateStore.isBlacklisted"
                  @click="updateStore.cancelDownload()"
                  class="text-xs font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                >
                  取消下载
                </button>
              </div>
            </div>

            <div class="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span class="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>下载完成后将自动提示安装</span>
              </span>
              <button
                v-if="!updateStore.isForced && !updateStore.isBlacklisted"
                @click="updateStore.dismissCard('close')"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 shadow-2xs"
                v-tooltip="'收起窗口，下载将在后台继续进行'"
              >
                <AppIcon name="minimize-tray" class="w-3.5 h-3.5 text-slate-400" />
                <span>收起至后台下载</span>
              </button>
              <button
                v-else
                @click="updateStore.quitApp()"
                class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-700/60"
              >
                <span>退出软件</span>
              </button>
            </div>
          </div>

          <!-- 内容区 3：下载完成就绪 (downloaded) -->
          <div v-else-if="updateStore.status === 'downloaded'" class="flex flex-col">
            <div class="px-6 py-8 space-y-4 text-center">
              <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
                <AppIcon name="check" class="w-8 h-8" />
              </div>
              <div class="space-y-1.5">
                <h4 class="text-base font-black text-slate-900 dark:text-white">
                  新版本安装包已下载就绪
                </h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  新版本安装文件已在本地准备就绪！您可以现在立即重启体验新特性，或在下次退出软件时自动应用。
                </p>
              </div>
            </div>

            <div class="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
              <button
                v-if="!updateStore.isForced && !updateStore.isBlacklisted"
                @click="updateStore.dismissCard('close')"
                class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                稍后重启
              </button>
              <button
                v-else
                @click="updateStore.quitApp()"
                class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
              >
                退出软件
              </button>
              <button
                @click="updateStore.quitAndInstall()"
                class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all duration-200 flex items-center gap-2"
              >
                <AppIcon name="refresh" class="w-3.5 h-3.5" />
                <span>立即重启并安装</span>
              </button>
            </div>
          </div>

          <!-- 内容区 4：错误状态 (error) -->
          <div v-else-if="updateStore.status === 'error'" class="flex flex-col">
            <div class="px-6 py-8 space-y-3 text-center">
              <div class="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center mx-auto shadow-inner">
                <AppIcon name="danger" class="w-7 h-7" />
              </div>
              <div class="space-y-1">
                <h4 class="text-sm font-bold text-slate-800 dark:text-white">更新受到网络阻碍</h4>
                <p class="text-xs text-rose-500 dark:text-rose-400 leading-relaxed max-w-sm mx-auto">
                  {{ updateStore.errorMsg || '检测更新或下载安装包时超时，请检查网络连接或切换加速线路' }}
                </p>
              </div>
            </div>

            <div class="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
              <button
                @click="openDetails"
                class="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                切换下载线路
              </button>
              <button
                v-if="!updateStore.isForced && !updateStore.isBlacklisted"
                @click="updateStore.dismissCard('close')"
                class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
              >
                关闭
              </button>
              <button
                v-else
                @click="updateStore.quitApp()"
                class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-slate-200 dark:border-slate-700"
              >
                退出软件
              </button>
            </div>
          </div>

          <!-- 内置线路设置快捷切换浮层（彻底解决模态框遮挡全局设置菜单的痛点） -->
          <transition name="modal-fade">
            <div
              v-if="showChannelMenu"
              class="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl flex flex-col justify-between p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200"
            >
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <AppIcon name="settings" class="w-4 h-4" />
                    </div>
                    <div>
                      <h4 class="text-sm font-black text-slate-900 dark:text-white">选择下载与更新线路</h4>
                      <p class="text-[11px] text-slate-400 dark:text-slate-500">如遇下载缓慢或连接阻断，推荐切换至国内专线镜像</p>
                    </div>
                  </div>
                  <button
                    @click="showChannelMenu = false"
                    class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-400 flex items-center justify-center transition-colors"
                  >
                    <AppIcon name="close" class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div class="space-y-2">
                  <button
                    v-for="ch in channelOptions"
                    :key="ch.id"
                    @click="handleSelectChannel(ch.id)"
                    class="w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group"
                    :class="updateStore.updateChannel === ch.id
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'"
                  >
                    <div class="space-y-0.5">
                      <div class="text-xs font-bold flex items-center gap-1.5">
                        <span>{{ ch.name }}</span>
                        <span v-if="ch.id === 'auto'" class="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">推荐</span>
                      </div>
                      <div class="text-[11px] text-slate-400 dark:text-slate-500">{{ ch.desc }}</div>
                    </div>
                    <div v-if="updateStore.updateChannel === ch.id" class="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AppIcon name="check" class="w-3 h-3" />
                    </div>
                  </button>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span class="text-xs text-slate-400 dark:text-slate-500">当前已选：<strong class="text-blue-600 dark:text-blue-400">{{ currentChannelName }}</strong></span>
                <button
                  @click="showChannelMenu = false"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/20"
                >
                  确定完成
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import { useUpdateStore } from '../store/updateStore';

const updateStore = useUpdateStore();
const settingsModalRef = inject('settingsModalRef', null);

const showChannelMenu = ref(false);

const channelOptions = [
  { id: 'auto', name: '自动优选 (推荐)', desc: '智能并发测速，自动选择延迟最低的国内加速节点' },
  { id: 'ghfast', name: 'ghfast 专线', desc: '基于 CDN 极速中继，国内三大运营商访问友好稳定' },
  { id: 'ghproxy', name: 'ghproxy 镜像', desc: '稳定老牌 GitHub 代理中转节点' },
  { id: 'official', name: 'GitHub 官方直连', desc: '直连 GitHub 官方 Releases（适合已开启网络代理或海外环境）' }
];

const currentChannelName = computed(() => {
  const target = channelOptions.find(c => c.id === updateStore.updateChannel);
  return target ? target.name : '自动优选';
});

const currentChannelBrief = computed(() => {
  if (updateStore.updateChannel === 'ghfast') return 'ghfast';
  if (updateStore.updateChannel === 'ghproxy') return 'ghproxy';
  if (updateStore.updateChannel === 'official') return '官方直连';
  return '自动优选';
});

const handleSelectChannel = (id) => {
  updateStore.setChannel(id);
};

const handleBackdropClick = () => {
  if (updateStore.isForced || updateStore.isBlacklisted) return;
  updateStore.dismissCard('close');
};

const onKeyDown = (e) => {
  if (e.key === 'Escape' && updateStore.canShowFloatCard) {
    if (updateStore.isForced || updateStore.isBlacklisted) return;
    updateStore.dismissCard('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const cardTitle = computed(() => {
  if (updateStore.status === 'downloaded') return '更新已就绪';
  if (updateStore.status === 'downloading') return '新版本下载中';
  if (updateStore.status === 'error') return '更新遇到问题';
  if (updateStore.isBlacklisted) return updateStore.forceTitle || '版本已被熔断停用';
  if (updateStore.isForced) return updateStore.forceTitle || '重要安全更新';
  return '发现新版本';
});

const headerSubtitle = computed(() => {
  if (updateStore.status === 'downloaded') {
    return '安装包已在本地准备就绪，重启软件即可完成更新升级';
  }
  if (updateStore.status === 'downloading') {
    return (updateStore.isForced || updateStore.isBlacklisted)
      ? '正在下载修复版本安装包，安装完成后方可进入主系统'
      : '正在下载新版本安装包，可收起窗口在后台继续下载';
  }
  if (updateStore.status === 'error') {
    return '检测或下载过程中网络受阻，可尝试在设置中切换镜像源';
  }
  if (updateStore.isBlacklisted) {
    return '检测到当前使用的客户端版本存在重大缺陷隐患，已被熔断停用';
  }
  if (updateStore.isForced) {
    return '当前版本已低于最低运行要求，请更新后继续使用概念音乐';
  }
  return '概念音乐发布了全新版本，推荐立即更新体验最新特性与修复';
});

const headerIconStyle = computed(() => {
  if (updateStore.isBlacklisted) {
    return {
      wrap: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30',
      icon: 'danger'
    };
  }
  if (updateStore.isForced) {
    return {
      wrap: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30',
      icon: 'warning'
    };
  }
  if (updateStore.status === 'downloaded') {
    return {
      wrap: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30',
      icon: 'check'
    };
  }
  if (updateStore.status === 'downloading') {
    return {
      wrap: 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30',
      icon: 'download'
    };
  }
  if (updateStore.status === 'error') {
    return {
      wrap: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30',
      icon: 'danger'
    };
  }
  return {
    wrap: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 shadow-blue-500/30',
    icon: 'sparkles'
  };
});

/**
 * HTML 转 Markdown 自适应转换层：
 * 兼容 GitHub Releases Atom 订阅源返回的原生 HTML 标签（<p>, <h3>, <ul>, <li>, <strong>, <code> 等）
 * 并在异常时提供轻量正则降级保证，确保不论是 HTML 还是纯 Markdown 均统一步骤化为标准 Markdown
 */
const htmlToMarkdown = (html) => {
  if (!html || typeof html !== 'string') return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;

  // 1. 优先使用浏览器原生 DOMParser（完美处理嵌套列表与深层标签）
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const walk = (node, indent = '') => {
        if (node.nodeType === 3 /* TEXT_NODE */) {
          return node.textContent;
        }
        if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';

        const tag = node.tagName.toLowerCase();
        const children = Array.from(node.childNodes);

        // 过滤下载与资源类节点
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) && /(?:下载|Assets|资源下载)/i.test(node.textContent)) {
          return '';
        }

        switch (tag) {
          case 'h1':
            return `\n# ${children.map(c => walk(c)).join('').trim()}\n\n`;
          case 'h2':
            return `\n## ${children.map(c => walk(c)).join('').trim()}\n\n`;
          case 'h3':
            return `\n### ${children.map(c => walk(c)).join('').trim()}\n\n`;
          case 'h4':
          case 'h5':
          case 'h6':
            return `\n#### ${children.map(c => walk(c)).join('').trim()}\n\n`;
          case 'hr':
            return '\n---\n\n';
          case 'p':
            return `\n${children.map(c => walk(c)).join('').trim()}\n\n`;
          case 'strong':
          case 'b':
            return `**${children.map(c => walk(c)).join('').trim()}**`;
          case 'em':
          case 'i':
            return `*${children.map(c => walk(c)).join('').trim()}*`;
          case 'code':
            return `\`${node.textContent.trim()}\``;
          case 'a': {
            const href = node.getAttribute('href') || '';
            const text = children.map(c => walk(c)).join('').trim();
            return `[${text}](${href})`;
          }
          case 'br':
            return '\n';
          case 'ul':
          case 'ol': {
            let res = '\n';
            let idx = 1;
            for (const child of children) {
              if (child.nodeType === 1 && child.tagName.toLowerCase() === 'li') {
                const subLists = [];
                const inlineNodes = [];
                for (const liChild of Array.from(child.childNodes)) {
                  if (liChild.nodeType === 1 && ['ul', 'ol'].includes(liChild.tagName.toLowerCase())) {
                    subLists.push(liChild);
                  } else {
                    inlineNodes.push(liChild);
                  }
                }
                const liText = inlineNodes.map(c => walk(c)).join('').trim();
                const prefix = tag === 'ol' ? `${idx++}. ` : '- ';
                res += `${indent}${prefix}${liText}\n`;
                for (const subList of subLists) {
                  res += walk(subList, indent + '  ');
                }
              }
            }
            return res + '\n';
          }
          default:
            return children.map(c => walk(c)).join('');
        }
      };

      const result = walk(doc.body).trim();
      if (result) return result;
    } catch (e) {
      console.warn('[UpdateCard] DOMParser htmlToMarkdown fallback:', e);
    }
  }

  // 2. 正则降级方案
  let md = html;
  md = md.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, '\n#### $1\n');
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return md.replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * 结构化解析更新日志：支持 GitHub Release 完整 Markdown 规范（多级标题、导语、列表项、代码块、加粗、链接）
 */
const parsedNotesData = computed(() => {
  const notes = updateStore.updateInfo?.releaseNotes;
  if (!notes) return { lead: '', sections: [] };
  let rawText = '';
  if (typeof notes === 'string') rawText = notes.trim();
  else if (Array.isArray(notes)) {
    rawText = notes.map((item) => (typeof item === 'string' ? item : item.note || '')).join('\n').trim();
  }
  if (!rawText) return { lead: '', sections: [] };

  // 先行将可能包含的原生 HTML 进行 Markdown 自适应规整化
  const normalizedText = htmlToMarkdown(rawText);
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
  const sections = [];
  let currentSection = { title: '', items: [] };
  let lead = '';
  let isDownloadSection = false;

  for (const line of lines) {
    // 忽略下载区域与分割线
    if (line.startsWith('## 下载') || line.startsWith('## Assets') || line.startsWith('## 资源下载') || line.startsWith('请在本次 Release')) {
      isDownloadSection = true;
      continue;
    }
    if (isDownloadSection && !line.startsWith('## ') && !line.startsWith('### ')) continue;
    if (line.startsWith('---')) continue;

    // 忽略顶层独立大标题 (例如 "# v3.6.0" 或 "# Release 3.6.0")
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      continue;
    }

    // 二级大标题：## 🌟 新增功能，或者作为章节主标题的 ### (例如 ### 🐛 问题修复 (Bug Fixes))
    if (
      line.startsWith('## ') ||
      (line.startsWith('### ') && !/^\d+[.、]/.test(line.replace(/^###\s*/, '')) && (!currentSection.title || currentSection.items.length > 0))
    ) {
      isDownloadSection = false;
      if (currentSection.title || currentSection.items.length) {
        sections.push(currentSection);
      }
      currentSection = { title: line.replace(/^#{2,3}\s*/, ''), items: [] };
    } 
    // 三级/四级小节标题：### 1. 企鹅歌单... 或 #### 1. ...
    else if (line.startsWith('### ') || line.startsWith('#### ')) {
      currentSection.items.push({ type: 'subtitle', text: line.replace(/^#{3,4}\s*/, '') });
    } 
    // 无序列表：- 或 * 或 •
    else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      currentSection.items.push({ type: 'bullet', text: line.replace(/^[-*•]\s*/, '') });
    } 
    // 有序列表：1. 2.
    else if (/^\d+[.、]/.test(line)) {
      const match = line.match(/^(\d+)[.、]\s*(.*)$/);
      currentSection.items.push({
        type: 'bullet',
        num: match ? match[1] : '',
        text: match ? match[2] : line
      });
    } 
    // 普通文本或导语
    else {
      if (!currentSection.title && !lead && sections.length === 0) {
        lead = line;
      } else {
        currentSection.items.push({ type: 'paragraph', text: line });
      }
    }
  }
  if (currentSection.title || currentSection.items.length) {
    sections.push(currentSection);
  }
  return { lead, sections };
});

const formatInline = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline inline-flex items-center gap-0.5 font-medium">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 mx-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-mono text-[11px] border border-blue-200/50 dark:border-blue-800/40">$1</code>');
};

const formatDate = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
};

const openDetails = () => {
  showChannelMenu.value = true;
};
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.6);
}
</style>
