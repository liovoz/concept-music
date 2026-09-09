<template>
  <div ref="scrollContainerRef" class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="qq-import-scroll-container">
    <div class="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 -z-10"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8 w-full">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 dark:text-slate-50 tracking-tight truncate">
            企鹅歌单 <span class="text-lg text-emerald-500 font-bold ml-2">Penguin Playlists</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-300 mt-2 font-medium">导入与管理企鹅歌单，快速播放收藏的音乐记忆</p>
        </div>

        <div class="w-full max-w-xl flex items-center gap-3 xl:flex-shrink-0">
          <div class="relative flex-1 min-w-0">
            <input
              v-model="inputValue"
              @keydown.enter="submitImport"
              class="w-full h-11 rounded-full border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-5 pr-11 text-sm font-medium text-gray-800 dark:text-slate-100 outline-none shadow-sm transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 no-drag"
              placeholder="企鹅歌单链接或 ID"
            />
            <button
              v-if="inputValue"
              @click="inputValue = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 no-drag"
              v-tooltip="'清空'"
            >
              <AppIcon name="close" class="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            @click="submitImport"
            :disabled="isImporting || !inputValue.trim()"
            class="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-bold shadow-md shadow-emerald-100 dark:shadow-none transition-all transform active:scale-95 flex items-center no-drag disabled:opacity-50 disabled:pointer-events-none"
          >
            <AppIcon v-if="isImporting" name="spinner" spin class="h-4 w-4 mr-2" />
            导入
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-0 flex flex-col lg:flex-row lg:items-start gap-6">
        <aside v-if="savedPlaylists.length > 0" class="min-w-0 lg:sticky lg:top-6 lg:w-[280px] lg:flex-shrink-0 lg:self-start lg:flex lg:min-h-0 lg:flex-col">
          <div class="flex flex-shrink-0 items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">已保存歌单</h3>
            <span class="text-xs font-medium text-gray-400">{{ savedPlaylists.length }} 个</span>
          </div>
          <div ref="savedPlaylistListRef" :style="savedPlaylistListStyle" class="custom-scrollbar flex gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 lg:block lg:min-h-0 lg:flex-1 lg:max-h-[var(--saved-playlist-list-max-height)] lg:space-y-2 lg:overflow-x-hidden lg:overflow-y-auto lg:pb-3">
            <button
              v-for="playlist in savedPlaylists"
              :key="playlist.id"
              :data-playlist-id="playlist.id"
              @click="openSavedPlaylist(playlist)"
              class="group flex w-72 flex-shrink-0 items-center min-w-0 rounded-lg border p-2.5 text-left transition-all no-drag lg:w-full"
              :class="currentId === playlist.id ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-gray-100 bg-white/80 hover:border-emerald-100 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/10'"
            >
              <img :src="playlist.cover || defaultImg" :alt="playlist.name" class="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-slate-800" @error="e => e.target.src = defaultImg" />
              <div class="min-w-0 flex-1 ml-3">
                <div class="text-sm font-bold truncate" :class="currentId === playlist.id ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-800 dark:text-slate-100'" v-tooltip="playlist.name">{{ playlist.name }}</div>
                <div class="text-xs text-gray-400 truncate mt-0.5">{{ formatSavedPlaylistMeta(playlist) }}</div>
                <div class="text-[11px] text-gray-300 mt-0.5">{{ formatSavedTime(playlist.importedAt) }}</div>
              </div>
              <span
                @click.stop="deleteSavedPlaylist(playlist.id)"
                class="w-7 h-7 ml-2 rounded-full flex items-center justify-center flex-shrink-0 text-gray-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                v-tooltip="'移除保存'"
              >
                <AppIcon name="close" class="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        </aside>

        <section class="flex-1 min-w-0 flex flex-col">
          <div v-if="isPlaylistLoading && page === 1" class="space-y-4 w-full">
            <div class="flex items-end gap-6 mb-10">
              <div class="w-48 h-48 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse flex-shrink-0"></div>
              <div class="flex-1 space-y-4">
                <div class="w-28 h-5 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
                <div class="w-2/3 h-10 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
                <div class="w-1/2 h-4 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
              </div>
            </div>
            <div v-for="i in 8" :key="i" class="flex items-center px-4 py-3 bg-gray-50/60 dark:bg-slate-900/60 rounded-xl">
              <div class="w-8 h-4 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
              <div class="flex-1 ml-4 h-4 bg-gray-200 dark:bg-slate-800 rounded animate-pulse max-w-md"></div>
            </div>
          </div>

          <div v-else-if="isError" class="w-full flex-1 flex flex-col items-center justify-center py-20 text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/40">
            <AppIcon name="warning" class="w-14 h-14 mb-4 text-emerald-300" />
            <p class="text-base font-bold text-emerald-600 dark:text-emerald-300 mb-2">{{ errorMessage }}</p>
            <button @click="openPlaylist(currentId)" class="mt-6 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
          </div>

          <div v-else-if="!playlistInfo.id" class="w-full flex-1 flex items-center justify-center py-20">
            <div class="w-full max-w-[520px] rounded-2xl border border-gray-100 bg-white/80 px-8 py-9 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 shadow-inner dark:bg-emerald-500/10 dark:text-emerald-300">
                <AppIcon name="qq-music" class="h-8 w-8" />
              </div>
              <h3 class="text-lg font-extrabold text-gray-900 dark:text-slate-50">还没有导入企鹅歌单</h3>
              <p class="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-gray-500 dark:text-slate-400">
                粘贴企鹅音乐歌单分享链接或歌单 ID，即可在此查看歌单并播放歌曲。
              </p>
              <div class="mt-6 flex flex-col items-center justify-center gap-2 text-xs font-bold text-gray-400 dark:text-slate-500 sm:flex-row">
                <span class="rounded-full bg-gray-50 px-3 py-1.5 dark:bg-slate-800">支持 y.qq.com 歌单链接</span>
                <span class="hidden h-1 w-1 rounded-full bg-gray-300 dark:bg-slate-700 sm:block"></span>
                <span class="rounded-full bg-gray-50 px-3 py-1.5 dark:bg-slate-800">支持纯数字歌单 ID</span>
              </div>
            </div>
          </div>

          <template v-else>
            <div class="flex items-end mb-10 gap-6">
              <div class="relative w-48 h-48 rounded-2xl flex-shrink-0 shadow-lg overflow-hidden border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 group">
                <img :src="playlistInfo.cover" :alt="playlistInfo.name" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" @error="e => e.target.src = defaultImg" />
                <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>

              <div class="flex flex-col justify-end flex-1 min-w-0">
                <div class="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-2">Imported Playlist</div>
                <h3 class="text-4xl font-extrabold text-gray-900 dark:text-slate-50 tracking-tight line-clamp-2 mb-3" v-tooltip="playlistInfo.name">{{ playlistInfo.name }}</h3>
                <p class="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed pr-10 cursor-default whitespace-pre-wrap" v-tooltip="playlistInfo.intro">{{ playlistInfo.intro }}</p>

                <div class="flex items-center space-x-3">
                  <button @click="playAll" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-bold shadow-md shadow-emerald-200 dark:shadow-none transition-all transform active:scale-95 flex items-center no-drag" :class="{ 'opacity-50 pointer-events-none': songs.length === 0 }">
                    <AppIcon name="play" class="w-5 h-5 mr-1" />
                    播放全部
                  </button>
                  <button
                    @click="handleAddToQueue"
                    :disabled="isAddingToQueue || songs.length === 0"
                    class="px-6 py-2.5 rounded-full text-sm font-bold transition-all transform active:scale-95 flex items-center no-drag bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300"
                    :class="{ 'opacity-60 cursor-not-allowed': isAddingToQueue || songs.length === 0 }"
                  >
                    <AppIcon v-if="isAddingToQueue" name="spinner" spin class="w-5 h-5 mr-1.5" />
                    <AppIcon v-else name="plus" class="w-5 h-5 mr-1.5" />
                    {{ isAddingToQueue ? '正在加入...' : '加入队列' }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="songs.length === 0" class="w-full flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
              <AppIcon name="music" class="w-20 h-20 mb-4 text-gray-200 dark:text-slate-800" />
              <p class="text-sm font-medium tracking-widest">暂无歌曲</p>
            </div>

            <div v-else class="w-full flex-1 flex flex-col min-w-0">
              <div class="flex items-center px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-slate-800 mb-2 min-w-0">
                <div class="w-10 text-center flex-shrink-0">#</div>
                <div class="flex-1 pl-2 min-w-0">音乐标题</div>
                <div class="w-1/4 hidden sm:block pr-4 min-w-0">歌手</div>
                <div class="w-1/4 hidden md:block pr-4 min-w-0">专辑</div>
                <div class="w-12 sm:w-16 text-right pr-4 flex-shrink-0">时长</div>
              </div>

              <div class="space-y-1 w-full">
                <div v-for="(song, index) in songs" :key="song._hash" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10 group transition-colors cursor-pointer no-drag min-w-0">
                  <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
                  <div class="w-10 text-center hidden group-hover:flex justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0" @click.stop="handlePlay(song)">
                    <AppIcon name="play" class="w-5 h-5 ml-[2px]" />
                  </div>

                  <div class="flex-1 pl-2 text-sm text-gray-800 dark:text-slate-100 font-medium flex items-center pr-4 overflow-hidden min-w-0" v-tooltip="song._title">
                    <img :src="song._cover" :alt="song._title" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100 dark:bg-slate-800" @error="e => e.target.src = defaultImg" />
                    <span class="truncate min-w-0">{{ song._title }}</span>
                    <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
                    <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
                  </div>

                  <div class="w-1/4 hidden sm:block text-xs text-gray-500 dark:text-slate-400 truncate pr-4 min-w-0" v-tooltip="song._singer">{{ song._singer }}</div>
                  <div class="w-1/4 hidden md:block text-xs text-gray-500 dark:text-slate-400 truncate pr-4 min-w-0" v-tooltip="song._album">{{ song._album }}</div>
                  <div class="w-12 sm:w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
                </div>
              </div>

              <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
                <div v-if="isLoadingMore" class="flex items-center text-emerald-500">
                  <AppIcon name="spinner" spin class="h-4 w-4 mr-2" />
                  正在获取更多歌曲...
                </div>
                <div v-else-if="!hasMore && songs.length > 0" class="text-gray-300 dark:text-slate-700 flex items-center space-x-2">
                  <span class="w-8 h-px bg-gray-200 dark:bg-slate-800"></span>
                  <span>已经到底啦</span>
                  <span class="w-8 h-px bg-gray-200 dark:bg-slate-800"></span>
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>

    <BackToTop targetId="qq-import-scroll-container" />

    <Teleport to="body">
      <transition name="qq-notice-fade">
        <div
          v-if="showQQNotice"
          class="fixed inset-0 z-[99998] flex items-center justify-center bg-gray-950/35 px-4 backdrop-blur-sm no-drag"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qq-notice-title"
        >
          <div class="w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <div class="flex items-center gap-3 border-b border-gray-100 bg-emerald-50/70 px-6 py-5 dark:border-slate-800 dark:bg-emerald-500/10">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                <AppIcon name="qq-music" class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <h3 id="qq-notice-title" class="text-lg font-extrabold text-gray-900 dark:text-slate-50">企鹅歌单使用须知</h3>
                <p class="mt-1 text-xs font-medium text-gray-500 dark:text-slate-400">导入前了解这些特性，使用会更顺手。</p>
              </div>
            </div>

            <div class="max-h-[58vh] overflow-y-auto px-6 py-5 custom-scrollbar">
              <ul class="space-y-3 text-sm font-medium leading-relaxed text-gray-600 dark:text-slate-300">
                <li v-for="(notice, index) in qqNoticeItems" :key="notice" class="flex gap-3">
                  <span class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300">{{ index + 1 }}</span>
                  <span>{{ notice }}</span>
                </li>
              </ul>

              <p class="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 dark:bg-slate-800/80 dark:text-slate-400">
                继续使用即表示你了解以上说明。
              </p>
            </div>

            <div class="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between">
              <label class="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                <input
                  v-model="dontShowQQNotice"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800"
                />
                不再提示
              </label>
              <button
                @click="closeQQNotice"
                class="h-10 rounded-full bg-emerald-500 px-6 text-sm font-bold text-white shadow-sm shadow-emerald-100 transition-colors hover:bg-emerald-600 active:scale-95 dark:shadow-none no-drag"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { usePlayerStore } from '../store/playerStore';
import { usePlayAllHydration } from '../composables/usePlayAllHydration';
import { openSongContextMenu } from '../utils/songContextMenu';
import BackToTop from '../components/BackToTop.vue';
import {
  buildQQPlayPayload,
  extractQQPlaylistId,
  normalizeQQPlaylistInfo,
  normalizeQQSongs,
} from '../utils/qqSongHelper';
import {
  getLastQQPlaylistId,
  loadSavedQQPlaylists,
  removeSavedQQPlaylist,
  saveQQPlaylistSummary,
  setLastQQPlaylistId,
} from '../utils/qqPlaylistStorage';

const route = useRoute();
const router = useRouter();
const store = usePlayerStore();
const { startPlayAllHydration, cancelPlayAllHydration } = usePlayAllHydration();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';
const pageSize = 50;
const QQ_NOTICE_ACK_KEY = 'concept_music_qq_notice_ack_v1';
const qqNoticeItems = [
  '仅支持公开可访问的企鹅音乐歌单链接或纯数字歌单 ID，私密、已下架或无权限的歌单可能无法导入。',
  '导入后歌单记录只保存在本地客户端，不会对原企鹅音乐账号和歌单产生任何影响。',
  '歌曲播放依赖本地音源解析，部分 VIP、付费、下架或版权受限歌曲可能无法播放，或只能播放较低音质。',
  '音质根据企鹅歌单返回的文件信息（标准、HQ、SQ、高解析）提供选择，实际播放音质取决于当前音源的可用性。',
  '企鹅导入歌曲暂不支持直接跳转站内歌手页或专辑页，右键菜单中仅保留支持的基础操作。',
  '歌曲较多的歌单支持分批滚动加载，首次打开较长歌单时请稍候片刻。',
];

const inputValue = ref('');
const currentId = ref('');
const playlistInfo = ref({});
const songs = ref([]);
const savedPlaylists = ref(loadSavedQQPlaylists());
const page = ref(1);
const hasMore = ref(false);
const isImporting = ref(false);
const isPlaylistLoading = ref(false);
const isLoadingMore = ref(false);
const isAddingToQueue = ref(false);
const isError = ref(false);
const errorMessage = ref('');
const loadMoreTrigger = ref(null);
const scrollContainerRef = ref(null);
const savedPlaylistListRef = ref(null);
const savedPlaylistListMaxHeight = ref(360);
const showQQNotice = ref(false);
const dontShowQQNotice = ref(true);
let observer = null;
let savedPlaylistHeightFrame = 0;
let playlistRequestSeq = 0;
const playlistSessionCache = new Map();

const playPayloads = computed(() => songs.value.map(song => buildQQPlayPayload(song, playlistInfo.value.cover || defaultImg)));
const savedPlaylistListStyle = computed(() => ({
  '--saved-playlist-list-max-height': `${savedPlaylistListMaxHeight.value}px`,
}));

const updateSavedPlaylistListHeight = () => {
  const container = scrollContainerRef.value;
  const list = savedPlaylistListRef.value;
  if (!container || !list) return;

  if (!window.matchMedia('(min-width: 1024px)').matches) {
    savedPlaylistListMaxHeight.value = 240;
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const bottomPadding = 24;
  const availableHeight = containerRect.bottom - listRect.top - bottomPadding;
  savedPlaylistListMaxHeight.value = Math.max(180, Math.floor(availableHeight));
};

const queueSavedPlaylistListHeightUpdate = () => {
  if (savedPlaylistHeightFrame) return;
  savedPlaylistHeightFrame = requestAnimationFrame(() => {
    savedPlaylistHeightFrame = 0;
    updateSavedPlaylistListHeight();
  });
};

const resetMainScrollToTop = () => {
  const container = scrollContainerRef.value;
  if (!container) return;
  container.scrollTo({ top: 0, behavior: 'auto' });
  queueSavedPlaylistListHeightUpdate();
};

const scrollSavedPlaylistIntoView = (id = currentId.value) => {
  const list = savedPlaylistListRef.value;
  const targetId = getPlaylistCacheId(id);
  if (!list || !targetId) return;

  const target = Array.from(list.querySelectorAll('[data-playlist-id]'))
    .find(item => item.dataset.playlistId === targetId);
  if (!target) return;

  const listRect = list.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const gap = 12;

  if (window.matchMedia('(min-width: 1024px)').matches) {
    if (targetRect.top < listRect.top + gap) {
      list.scrollTop -= (listRect.top + gap - targetRect.top);
    } else if (targetRect.bottom > listRect.bottom - gap) {
      list.scrollTop += (targetRect.bottom - (listRect.bottom - gap));
    }
    return;
  }

  if (targetRect.left < listRect.left + gap) {
    list.scrollLeft -= (listRect.left + gap - targetRect.left);
  } else if (targetRect.right > listRect.right - gap) {
    list.scrollLeft += (targetRect.right - (listRect.right - gap));
  }
};

const syncPlaylistScrollPositions = (id, { resetMain = true } = {}) => {
  if (resetMain) resetMainScrollToTop();
  nextTick(() => {
    queueSavedPlaylistListHeightUpdate();
    requestAnimationFrame(() => scrollSavedPlaylistIntoView(id));
  });
};

const showFirstUseNoticeIfNeeded = () => {
  try {
    showQQNotice.value = localStorage.getItem(QQ_NOTICE_ACK_KEY) !== 'true';
  } catch (error) {
    showQQNotice.value = true;
  }
};

const closeQQNotice = () => {
  if (dontShowQQNotice.value) {
    try {
      localStorage.setItem(QQ_NOTICE_ACK_KEY, 'true');
    } catch (error) {}
  }
  showQQNotice.value = false;
};

const refreshSavedPlaylists = () => {
  savedPlaylists.value = loadSavedQQPlaylists();
};

const getPlaylistCacheId = (id) => String(id || '').trim();

const rememberCurrentPlaylist = () => {
  const id = getPlaylistCacheId(currentId.value);
  if (!id || !playlistInfo.value?.id) return;

  playlistSessionCache.set(id, {
    playlistInfo: { ...playlistInfo.value },
    songs: [...songs.value],
    page: page.value,
    hasMore: hasMore.value,
  });
};

const restoreCachedPlaylist = (id) => {
  const targetId = getPlaylistCacheId(id);
  const cached = playlistSessionCache.get(targetId);
  if (!cached) return false;

  playlistRequestSeq += 1;
  currentId.value = targetId;
  playlistInfo.value = { ...cached.playlistInfo };
  songs.value = [...cached.songs];
  page.value = cached.page || 1;
  hasMore.value = !!cached.hasMore;
  isImporting.value = false;
  isPlaylistLoading.value = false;
  isLoadingMore.value = false;
  isError.value = false;
  errorMessage.value = '';
  cancelPlayAllHydration();
  store.cancelPlayAllHydration();
  nextTick(() => setupObserver());
  return true;
};

const clearPlaylistView = () => {
  playlistRequestSeq += 1;
  currentId.value = '';
  playlistInfo.value = {};
  songs.value = [];
  page.value = 1;
  hasMore.value = false;
  isImporting.value = false;
  isPlaylistLoading.value = false;
  isLoadingMore.value = false;
  isError.value = false;
  errorMessage.value = '';
  inputValue.value = '';
  cancelPlayAllHydration();
  store.cancelPlayAllHydration();
};

const formatSavedPlaylistMeta = (playlist) => {
  const countText = playlist.trackCount > 0 ? `${playlist.trackCount} 首` : '歌曲数未知';
  return playlist.creator ? `${countText} · ${playlist.creator}` : countText;
};

const formatSavedTime = (timestamp) => {
  const date = new Date(Number(timestamp || 0));
  if (Number.isNaN(date.getTime())) return '最近保存';

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
};

const openSavedPlaylist = (playlist) => {
  const id = String(playlist?.id || '').trim();
  if (!id) return;
  setLastQQPlaylistId(id);
  if (currentId.value === id) {
    if (!playlistInfo.value.id && !isPlaylistLoading.value) openPlaylist(id);
    else syncPlaylistScrollPositions(id, { resetMain: false });
    return;
  }
  if (restoreCachedPlaylist(id)) {
    router.push({ name: 'QQImportDetail', params: { id } });
    syncPlaylistScrollPositions(id);
    return;
  }
  router.push({ name: 'QQImportDetail', params: { id } });
  openPlaylist(id);
};

const deleteSavedPlaylist = (id) => {
  const targetId = String(id || '').trim();
  if (!targetId) return;

  const targetPlaylist = savedPlaylists.value.find(item => item.id === targetId);

  store.showDialog({
    type: 'danger',
    title: '移除企鹅歌单',
    message: `确定要移除「${targetPlaylist?.name || '企鹅歌单'}」吗？该操作只会移除本地保存记录，不会影响企鹅音乐原歌单。`,
    confirmText: '确认移除',
    cancelText: '取消',
    onConfirm: () => {
      playlistSessionCache.delete(targetId);
      savedPlaylists.value = removeSavedQQPlaylist(targetId);
      store.showToast('已移除保存的企鹅歌单');

      if (currentId.value !== targetId) return;

      store.clearQQImportPlaybackState();

      const nextPlaylist = savedPlaylists.value[0];
      if (nextPlaylist?.id) {
        router.replace({ name: 'QQImportDetail', params: { id: nextPlaylist.id } });
        openPlaylist(nextPlaylist.id);
        return;
      }

      setLastQQPlaylistId('');
      clearPlaylistView();
      router.replace({ name: 'QQImport' });
    },
  });
};

const setError = (message) => {
  isError.value = true;
  errorMessage.value = message;
};

const getImportErrorMessage = (error, id) => {
  const serverMessage = error?.response?.data?.msg || error?.response?.data?.message || '';
  if (serverMessage) return serverMessage;
  if (error?.code === 'QQ_PLAYLIST_NOT_FOUND') return `未找到 ID 为 ${id} 的企鹅歌单，请检查后重试`;
  return `导入失败，未找到 ID 为 ${id} 的企鹅歌单或网络暂时异常`;
};

const fetchTracks = async (targetPage = 1, targetId = currentId.value) => {
  const res = await request.get('/qq/playlist/track/all', {
    params: {
      id: targetId,
      page: targetPage,
      limit: pageSize,
      timestamp: Date.now(),
    },
  });
  const nextSongs = normalizeQQSongs(res?.songs || []);
  hasMore.value = !!res?.hasMore;
  return nextSongs;
};

const fetchPlaylist = async (id, options = {}) => {
  const {
    forceRefresh = false,
    isManualImport = false,
    notifySuccess = false,
    notifyError = true,
    saveSummary = false,
  } = options;
  if (!id) {
    const message = '缺少有效的企鹅歌单 ID';
    setError(message);
    if (notifyError) store.showToast(message);
    return;
  }

  if (!forceRefresh && restoreCachedPlaylist(id)) {
    setLastQQPlaylistId(id);
    syncPlaylistScrollPositions(id);
    return;
  }

  const requestSeq = ++playlistRequestSeq;
  currentId.value = id;
  syncPlaylistScrollPositions(id);
  if (isManualImport) isImporting.value = true;
  else isImporting.value = false;
  isPlaylistLoading.value = true;
  isError.value = false;
  page.value = 1;
  hasMore.value = false;
  playlistInfo.value = {};
  songs.value = [];
  cancelPlayAllHydration();
  store.cancelPlayAllHydration();

  try {
    const detail = await request.get('/qq/playlist/detail', {
      params: { id, timestamp: Date.now() },
    });
    if (requestSeq !== playlistRequestSeq) return;
    const nextPlaylistInfo = normalizeQQPlaylistInfo(detail?.playlist || {});
    if (!nextPlaylistInfo.id) {
      const notFoundError = new Error('未找到该企鹅歌单');
      notFoundError.code = 'QQ_PLAYLIST_NOT_FOUND';
      throw notFoundError;
    }
    const nextSongs = await fetchTracks(1, id);
    if (requestSeq !== playlistRequestSeq) return;
    playlistInfo.value = nextPlaylistInfo;
    songs.value = nextSongs;
    if (saveSummary) savedPlaylists.value = saveQQPlaylistSummary(nextPlaylistInfo);
    setLastQQPlaylistId(nextPlaylistInfo.id || id);
    rememberCurrentPlaylist();
    if (isManualImport) inputValue.value = '';
    nextTick(() => setupObserver());
    router.replace({ name: 'QQImportDetail', params: { id } });
    if (notifySuccess) {
      const count = nextPlaylistInfo.trackCount || nextSongs.length;
      store.showToast(`已导入「${nextPlaylistInfo.name}」，共 ${count} 首歌曲`);
    }
  } catch (e) {
    if (requestSeq !== playlistRequestSeq) return;
    const message = getImportErrorMessage(e, id);
    setError(message);
    if (notifyError) store.showToast(message);
  } finally {
    if (requestSeq === playlistRequestSeq) {
      if (isManualImport) isImporting.value = false;
      isPlaylistLoading.value = false;
    }
  }
};

const openPlaylist = (id) => {
  return fetchPlaylist(id, {
    forceRefresh: false,
    isManualImport: false,
    notifyError: true,
    saveSummary: false,
  });
};

const importPlaylist = (id) => {
  return fetchPlaylist(id, {
    forceRefresh: true,
    isManualImport: true,
    notifySuccess: true,
    notifyError: true,
    saveSummary: true,
  });
};

const submitImport = () => {
  const id = extractQQPlaylistId(inputValue.value);
  if (!id) {
    store.showToast('请输入有效的企鹅歌单链接或 ID');
    return;
  }
  importPlaylist(id);
};

const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value || isPlaylistLoading.value) return;
  isLoadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const nextSongs = await fetchTracks(nextPage, currentId.value);
    songs.value.push(...nextSongs);
    page.value = nextPage;
    rememberCurrentPlaylist();
  } catch (e) {
    hasMore.value = false;
    rememberCurrentPlaylist();
  } finally {
    isLoadingMore.value = false;
  }
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  }, { root: null, rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value);
};

const handlePlay = (song) => {
  store.playSong(buildQQPlayPayload(song, playlistInfo.value.cover || defaultImg));
};

const handleSongContextMenu = (event, song) => {
  openSongContextMenu(event, buildQQPlayPayload(song, playlistInfo.value.cover || defaultImg), { source: 'qq-import' });
};

const playAll = () => {
  if (songs.value.length === 0) return;
  const result = store.startPlayAllHydrationSession(playPayloads.value, { sourceKey: `qq:${currentId.value}` });
  if (!result.sessionId || !hasMore.value) return;

  const routeId = String(currentId.value);
  startPlayAllHydration({
    sessionId: result.sessionId,
    startPage: page.value + 1,
    pageSize,
    loadPage: async (nextPage) => {
      const res = await request.get('/qq/playlist/track/all', {
        params: { id: routeId, page: nextPage, limit: pageSize, timestamp: Date.now() },
        silent: true,
      });
      const normalized = normalizeQQSongs(res?.songs || []);
      return {
        rawCount: normalized.length,
        done: !res?.hasMore,
        songs: normalized.map(song => buildQQPlayPayload(song, playlistInfo.value.cover || defaultImg)),
      };
    },
    appendSongs: (sessionId, payloads) => store.extendPlayAllHydration(sessionId, payloads),
    shouldContinue: () => currentId.value === routeId && store.isPlayAllHydrationActive(result.sessionId),
  });
};

const handleAddToQueue = async () => {
  if (isAddingToQueue.value || songs.value.length === 0) return;

  if (!hasMore.value) {
    store.addSongsToPlaylist(playPayloads.value, { silent: false });
    return;
  }

  isAddingToQueue.value = true;
  const targetId = String(currentId.value);
  const targetCover = playlistInfo.value.cover || defaultImg;

  const initialResult = store.addSongsToPlaylist(playPayloads.value, { silent: true });
  let totalAdded = initialResult.added;
  let totalSkipped = initialResult.skipped;
  store.showToast(`已先将 ${initialResult.added} 首歌曲加入队列，正在后台载入剩余歌曲...`);

  let currentOffset = songs.value.length;
  const batchLimit = 200;

  try {
    let keepFetching = true;
    while (keepFetching) {
      const res = await request.get('/qq/playlist/track/all', {
        params: {
          id: targetId,
          offset: currentOffset,
          limit: batchLimit,
          timestamp: Date.now(),
        },
        silent: true,
      });

      const normalized = normalizeQQSongs(res?.songs || []);
      if (normalized.length === 0) break;

      const payloads = normalized.map(song => buildQQPlayPayload(song, targetCover));
      const batchResult = store.addSongsToPlaylist(payloads, { silent: true });
      totalAdded += batchResult.added;
      totalSkipped += batchResult.skipped;

      if (currentId.value === targetId) {
        songs.value.push(...normalized);
        hasMore.value = !!res?.hasMore;
        page.value = Math.ceil(songs.value.length / pageSize);
        rememberCurrentPlaylist();
      }

      currentOffset += normalized.length;
      if (!res?.hasMore || normalized.length < batchLimit) {
        keepFetching = false;
      }
    }

    const skippedText = totalSkipped > 0 ? `，已跳过 ${totalSkipped} 首重复歌曲` : '';
    store.showToast(`已将企鹅歌单全部歌曲加入播放列表（新增 ${totalAdded} 首${skippedText}）`);
  } catch (error) {
    console.error('[QQImport] 后台加入队列失败:', error);
    store.showToast('部分剩余歌曲加入队列失败，请检查网络');
  } finally {
    isAddingToQueue.value = false;
  }
};

watch(() => route.params.id, (id) => {
  const target = extractQQPlaylistId(id || '');
  if (target && target !== currentId.value) {
    openPlaylist(target);
  }
});

watch(savedPlaylists, () => {
  nextTick(queueSavedPlaylistListHeightUpdate);
});

onMounted(() => {
  showFirstUseNoticeIfNeeded();
  setupObserver();
  nextTick(() => {
    queueSavedPlaylistListHeightUpdate();
    scrollContainerRef.value?.addEventListener('scroll', queueSavedPlaylistListHeightUpdate, { passive: true });
    window.addEventListener('resize', queueSavedPlaylistListHeightUpdate);
  });

  const initialId = extractQQPlaylistId(route.params.id || route.query.id || '');
  if (initialId) {
    openPlaylist(initialId);
    return;
  }

  refreshSavedPlaylists();
  const savedId = getLastQQPlaylistId() || savedPlaylists.value[0]?.id || '';
  if (savedId) {
    openPlaylist(savedId);
  }
});

onUnmounted(() => {
  cancelPlayAllHydration();
  store.cancelPlayAllHydration();
  scrollContainerRef.value?.removeEventListener('scroll', queueSavedPlaylistListHeightUpdate);
  window.removeEventListener('resize', queueSavedPlaylistListHeightUpdate);
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.qq-notice-fade-enter-active,
.qq-notice-fade-leave-active {
  transition: opacity 0.2s ease;
}

.qq-notice-fade-enter-from,
.qq-notice-fade-leave-to {
  opacity: 0;
}
</style>
