<template>
  <div ref="scrollContainerRef" class="h-full overflow-y-auto custom-scrollbar flex flex-col relative" id="netease-import-scroll-container">
    <div class="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 -z-10"></div>

    <div class="p-8 z-10 flex-1 flex flex-col min-w-0">
      <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8 w-full">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold text-gray-900 dark:text-slate-50 tracking-tight truncate">
            网易歌单 <span class="text-lg text-red-500 font-bold ml-2">Netease Playlists</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-300 mt-2 font-medium">导入与管理网易云歌单，快速播放收藏的音乐记忆</p>
        </div>

        <div class="w-full max-w-xl flex items-center gap-3 xl:flex-shrink-0">
          <div class="relative flex-1 min-w-0">
            <input
              v-model="inputValue"
              @keydown.enter="submitImport"
              class="w-full h-11 rounded-full border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-5 pr-11 text-sm font-medium text-gray-800 dark:text-slate-100 outline-none shadow-sm transition-all focus:border-red-300 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/10 no-drag"
              placeholder="网易云歌单链接或 ID"
            />
            <button
              v-if="inputValue"
              @click="inputValue = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 no-drag"
              v-tooltip="'清空'"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <button
            @click="submitImport"
            :disabled="isImporting || !inputValue.trim()"
            class="h-11 px-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md shadow-red-100 dark:shadow-none transition-all transform active:scale-95 flex items-center no-drag disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg v-if="isImporting" class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
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
            :class="currentId === playlist.id ? 'border-red-200 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10' : 'border-gray-100 bg-white/80 hover:border-red-100 hover:bg-red-50/60 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-red-500/20 dark:hover:bg-red-500/10'"
          >
            <img :src="playlist.cover || defaultImg" :alt="playlist.name" class="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-slate-800" @error="e => e.target.src = defaultImg" />
            <div class="min-w-0 flex-1 ml-3">
              <div class="text-sm font-bold truncate" :class="currentId === playlist.id ? 'text-red-600 dark:text-red-300' : 'text-gray-800 dark:text-slate-100'" v-tooltip="playlist.name">{{ playlist.name }}</div>
              <div class="text-xs text-gray-400 truncate mt-0.5">{{ formatSavedPlaylistMeta(playlist) }}</div>
              <div class="text-[11px] text-gray-300 mt-0.5">{{ formatSavedTime(playlist.importedAt) }}</div>
            </div>
            <span
              @click.stop="deleteSavedPlaylist(playlist.id)"
              class="w-7 h-7 ml-2 rounded-full flex items-center justify-center flex-shrink-0 text-gray-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              v-tooltip="'移除保存'"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
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

      <div v-else-if="isError" class="w-full flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/70 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-900/40">
        <svg class="w-14 h-14 mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
        <p class="text-base font-bold text-red-600 dark:text-red-300 mb-2">{{ errorMessage }}</p>
        <button @click="openPlaylist(currentId)" class="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 no-drag">重新加载</button>
      </div>

      <div v-else-if="!playlistInfo.id" class="w-full flex-1 flex items-center justify-center py-20">
        <div class="w-full max-w-[520px] rounded-2xl border border-gray-100 bg-white/80 px-8 py-9 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-inner dark:bg-red-500/10 dark:text-red-300">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M5 7h8" />
              <path d="M5 12h6" />
              <path d="M5 17h5" />
              <path d="M17 6v9.5" />
              <path d="M17 6l4-1v3l-4 1" />
              <path d="M17 15.5a2.5 2.5 0 1 1-1.8-2.4" />
            </svg>
          </div>
          <h3 class="text-lg font-extrabold text-gray-900 dark:text-slate-50">还没有导入网易歌单</h3>
          <p class="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-gray-500 dark:text-slate-400">
            粘贴网易云歌单链接或纯数字 ID，即可在这里查看歌单详情并播放歌曲。
          </p>
          <div class="mt-6 flex flex-col items-center justify-center gap-2 text-xs font-bold text-gray-400 dark:text-slate-500 sm:flex-row">
            <span class="rounded-full bg-gray-50 px-3 py-1.5 dark:bg-slate-800">支持 playlist 链接</span>
            <span class="hidden h-1 w-1 rounded-full bg-gray-300 dark:bg-slate-700 sm:block"></span>
            <span class="rounded-full bg-gray-50 px-3 py-1.5 dark:bg-slate-800">也支持纯数字 ID</span>
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
            <div class="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">Imported Playlist</div>
            <h3 class="text-4xl font-extrabold text-gray-900 dark:text-slate-50 tracking-tight line-clamp-2 mb-3" v-tooltip="playlistInfo.name">{{ playlistInfo.name }}</h3>
            <p class="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed pr-10 cursor-default whitespace-pre-wrap" v-tooltip="playlistInfo.intro">{{ playlistInfo.intro }}</p>

            <div class="flex items-center space-x-3">
              <button @click="playAll" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none transition-all transform active:scale-95 flex items-center no-drag" :class="{ 'opacity-50 pointer-events-none': songs.length === 0 }">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
                播放全部
              </button>
              <button @click="store.addSongsToPlaylist(playPayloads, { silent: false })" class="px-6 py-2.5 rounded-full text-sm font-bold transition-all transform active:scale-95 flex items-center no-drag bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300">
                <svg class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/></svg>
                加入队列
              </button>
            </div>
          </div>
        </div>

        <div v-if="songs.length === 0" class="w-full flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
          <svg class="w-20 h-20 mb-4 text-gray-200 dark:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 10l12-3"/></svg>
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
            <div v-for="(song, index) in songs" :key="song._hash" @contextmenu="handleSongContextMenu($event, song)" @dblclick="handlePlay(song)" class="flex items-center px-4 py-3 rounded-xl hover:bg-blue-50/60 dark:hover:bg-blue-500/10 group transition-colors cursor-pointer no-drag min-w-0">
              <div class="w-10 text-center text-sm text-gray-400 group-hover:hidden flex-shrink-0">{{ (index + 1).toString().padStart(2, '0') }}</div>
              <div class="w-10 text-center hidden group-hover:flex justify-center text-blue-600 dark:text-blue-400 flex-shrink-0" @click.stop="handlePlay(song)">
                <svg class="w-5 h-5 ml-[2px]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
              </div>

              <div class="flex-1 pl-2 text-sm text-gray-800 dark:text-slate-100 font-medium flex items-center pr-4 overflow-hidden min-w-0" v-tooltip="song._title">
                <img :src="song._cover" :alt="song._title" class="w-9 h-9 rounded shadow-sm mr-3 object-cover flex-shrink-0 bg-gray-100 dark:bg-slate-800" @error="e => e.target.src = defaultImg" />
                <span class="truncate min-w-0">{{ song._title }}</span>
                <span v-if="song._is_paid" class="ml-2 flex-shrink-0 bg-orange-50 text-orange-500 border border-orange-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">付费</span>
                <span v-else-if="song._is_vip" class="ml-2 flex-shrink-0 bg-blue-50 text-blue-500 border border-blue-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase leading-none mt-0.5">VIP</span>
              </div>

              <div class="w-1/4 hidden sm:block text-xs text-gray-500 dark:text-slate-400 truncate pr-4 min-w-0" v-tooltip="song._singer">{{ song._singer }}</div>
              <div class="w-1/4 hidden md:block text-xs text-gray-500 dark:text-slate-400 truncate pr-4 min-w-0" v-tooltip="song._album">{{ song._album }}</div>
              <div class="w-12 sm:w-16 text-xs text-gray-400 text-right pr-4 font-mono flex-shrink-0">{{ song._duration }}</div>
            </div>
          </div>

          <div ref="loadMoreTrigger" class="w-full h-20 flex items-center justify-center mt-4 text-xs font-medium">
            <div v-if="isLoadingMore" class="flex items-center text-blue-500">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
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

    <BackToTop targetId="netease-import-scroll-container" />

    <Teleport to="body">
      <transition name="netease-notice-fade">
        <div
          v-if="showNeteaseNotice"
          class="fixed inset-0 z-[99998] flex items-center justify-center bg-gray-950/35 px-4 backdrop-blur-sm no-drag"
          role="dialog"
          aria-modal="true"
          aria-labelledby="netease-notice-title"
        >
          <div class="w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <div class="flex items-center gap-3 border-b border-gray-100 bg-red-50/70 px-6 py-5 dark:border-slate-800 dark:bg-red-500/10">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 18V5l12-2v13"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
                </svg>
              </div>
              <div class="min-w-0">
                <h3 id="netease-notice-title" class="text-lg font-extrabold text-gray-900 dark:text-slate-50">网易歌单使用须知</h3>
                <p class="mt-1 text-xs font-medium text-gray-500 dark:text-slate-400">导入前了解这些限制，后面使用会更顺手。</p>
              </div>
            </div>

            <div class="max-h-[58vh] overflow-y-auto px-6 py-5 custom-scrollbar">
              <ul class="space-y-3 text-sm font-medium leading-relaxed text-gray-600 dark:text-slate-300">
                <li v-for="(notice, index) in neteaseNoticeItems" :key="notice" class="flex gap-3">
                  <span class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-[11px] font-black text-red-500 dark:bg-red-500/10 dark:text-red-300">{{ index + 1 }}</span>
                  <span>{{ notice }}</span>
                </li>
              </ul>

              <p class="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 dark:bg-slate-800/80 dark:text-slate-400">
                继续使用即表示你了解以上限制。
              </p>
            </div>

            <div class="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between">
              <label class="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                <input
                  v-model="dontShowNeteaseNotice"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-200 dark:border-slate-600 dark:bg-slate-800"
                />
                不再提示
              </label>
              <button
                @click="closeNeteaseNotice"
                class="h-10 rounded-full bg-red-500 px-6 text-sm font-bold text-white shadow-sm shadow-red-100 transition-colors hover:bg-red-600 active:scale-95 dark:shadow-none no-drag"
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
  buildNeteasePlayPayload,
  extractNeteasePlaylistId,
  normalizeNeteasePlaylistInfo,
  normalizeNeteaseSongs,
} from '../utils/neteaseSongHelper';
import {
  getLastNeteasePlaylistId,
  loadSavedNeteasePlaylists,
  removeSavedNeteasePlaylist,
  saveNeteasePlaylistSummary,
  setLastNeteasePlaylistId,
} from '../utils/neteasePlaylistStorage';

const route = useRoute();
const router = useRouter();
const store = usePlayerStore();
const { startPlayAllHydration, cancelPlayAllHydration } = usePlayAllHydration();

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';
const pageSize = 50;
const NETEASE_NOTICE_ACK_KEY = 'concept_music_netease_notice_ack_v1';
const neteaseNoticeItems = [
  '仅支持可访问的网易云歌单链接或纯数字歌单 ID，私密歌单、已删除歌单或无权限访问的歌单可能无法导入。',
  '导入后只会在本地保存歌单记录，不会修改、收藏或删除网易云音乐中的原歌单。',
  '歌曲播放依赖本地音源解析，部分 VIP、付费、下架或版权受限歌曲可能无法播放，或只能播放较低音质。',
  '音质选项根据网易返回的歌曲信息判断，实际可播放音质还会受到音源可用性影响。',
  '网易导入歌曲暂不完全支持歌手页、专辑页等站内跳转功能，右键菜单中部分普通歌曲功能也可能不可用。',
  '歌曲较多的歌单会分批加载，首次打开时请稍等片刻。',
];

const inputValue = ref('');
const currentId = ref('');
const playlistInfo = ref({});
const songs = ref([]);
const savedPlaylists = ref(loadSavedNeteasePlaylists());
const page = ref(1);
const hasMore = ref(false);
const isImporting = ref(false);
const isPlaylistLoading = ref(false);
const isLoadingMore = ref(false);
const isError = ref(false);
const errorMessage = ref('');
const loadMoreTrigger = ref(null);
const scrollContainerRef = ref(null);
const savedPlaylistListRef = ref(null);
const savedPlaylistListMaxHeight = ref(360);
const showNeteaseNotice = ref(false);
const dontShowNeteaseNotice = ref(true);
let observer = null;
let savedPlaylistHeightFrame = 0;
let playlistRequestSeq = 0;
const playlistSessionCache = new Map();

const playPayloads = computed(() => songs.value.map(song => buildNeteasePlayPayload(song, playlistInfo.value.cover || defaultImg)));
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
    showNeteaseNotice.value = localStorage.getItem(NETEASE_NOTICE_ACK_KEY) !== 'true';
  } catch (error) {
    showNeteaseNotice.value = true;
  }
};

const closeNeteaseNotice = () => {
  if (dontShowNeteaseNotice.value) {
    try {
      localStorage.setItem(NETEASE_NOTICE_ACK_KEY, 'true');
    } catch (error) {}
  }
  showNeteaseNotice.value = false;
};

const refreshSavedPlaylists = () => {
  savedPlaylists.value = loadSavedNeteasePlaylists();
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
  setLastNeteasePlaylistId(id);
  if (currentId.value === id) {
    if (!playlistInfo.value.id && !isPlaylistLoading.value) openPlaylist(id);
    else syncPlaylistScrollPositions(id, { resetMain: false });
    return;
  }
  if (restoreCachedPlaylist(id)) {
    router.push({ name: 'NeteaseImportDetail', params: { id } });
    syncPlaylistScrollPositions(id);
    return;
  }
  router.push({ name: 'NeteaseImportDetail', params: { id } });
  openPlaylist(id);
};

const deleteSavedPlaylist = (id) => {
  const targetId = String(id || '').trim();
  if (!targetId) return;

  const targetPlaylist = savedPlaylists.value.find(item => item.id === targetId);

  store.showDialog({
    type: 'danger',
    title: '移除网易歌单',
    message: `确定要移除「${targetPlaylist?.name || '网易歌单'}」吗？该操作只会移除本地保存记录，不会影响网易云音乐原歌单。`,
    confirmText: '确认移除',
    cancelText: '取消',
    onConfirm: () => {
      playlistSessionCache.delete(targetId);
      savedPlaylists.value = removeSavedNeteasePlaylist(targetId);
      store.showToast('已移除保存的网易歌单');

      if (currentId.value !== targetId) return;

      store.clearNeteaseImportPlaybackState();

      const nextPlaylist = savedPlaylists.value[0];
      if (nextPlaylist?.id) {
        router.replace({ name: 'NeteaseImportDetail', params: { id: nextPlaylist.id } });
        openPlaylist(nextPlaylist.id);
        return;
      }

      setLastNeteasePlaylistId('');
      clearPlaylistView();
      router.replace({ name: 'NeteaseImport' });
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
  if (error?.code === 'NETEASE_PLAYLIST_NOT_FOUND') return `未找到 ID 为 ${id} 的网易云歌单，请检查后重试`;
  return `导入失败，未找到 ID 为 ${id} 的网易云歌单或网络暂时异常`;
};

const fetchTracks = async (targetPage = 1, targetId = currentId.value) => {
  const res = await request.get('/netease/playlist/track/all', {
    params: {
      id: targetId,
      page: targetPage,
      limit: pageSize,
      timestamp: Date.now(),
    },
  });
  const nextSongs = normalizeNeteaseSongs(res?.songs || []);
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
    const message = '缺少有效的网易云歌单 ID';
    setError(message);
    if (notifyError) store.showToast(message);
    return;
  }

  if (!forceRefresh && restoreCachedPlaylist(id)) {
    setLastNeteasePlaylistId(id);
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
    const detail = await request.get('/netease/playlist/detail', {
      params: { id, timestamp: Date.now() },
    });
    if (requestSeq !== playlistRequestSeq) return;
    const nextPlaylistInfo = normalizeNeteasePlaylistInfo(detail?.playlist || {});
    if (!nextPlaylistInfo.id) {
      const notFoundError = new Error('未找到该网易云歌单');
      notFoundError.code = 'NETEASE_PLAYLIST_NOT_FOUND';
      throw notFoundError;
    }
    const nextSongs = await fetchTracks(1, id);
    if (requestSeq !== playlistRequestSeq) return;
    playlistInfo.value = nextPlaylistInfo;
    songs.value = nextSongs;
    if (saveSummary) savedPlaylists.value = saveNeteasePlaylistSummary(nextPlaylistInfo);
    setLastNeteasePlaylistId(nextPlaylistInfo.id || id);
    rememberCurrentPlaylist();
    if (isManualImport) inputValue.value = '';
    nextTick(() => setupObserver());
    router.replace({ name: 'NeteaseImportDetail', params: { id } });
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
  const id = extractNeteasePlaylistId(inputValue.value);
  if (!id) {
    store.showToast('请输入有效的网易云歌单链接或 ID');
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
  store.playSong(buildNeteasePlayPayload(song, playlistInfo.value.cover || defaultImg));
};

const handleSongContextMenu = (event, song) => {
  openSongContextMenu(event, buildNeteasePlayPayload(song, playlistInfo.value.cover || defaultImg), { source: 'netease-import' });
};

const playAll = () => {
  if (songs.value.length === 0) return;
  const result = store.startPlayAllHydrationSession(playPayloads.value, { sourceKey: `netease:${currentId.value}` });
  if (!result.sessionId || !hasMore.value) return;

  const routeId = String(currentId.value);
  startPlayAllHydration({
    sessionId: result.sessionId,
    startPage: page.value + 1,
    pageSize,
    loadPage: async (nextPage) => {
      const res = await request.get('/netease/playlist/track/all', {
        params: { id: routeId, page: nextPage, limit: pageSize, timestamp: Date.now() },
        silent: true,
      });
      const normalized = normalizeNeteaseSongs(res?.songs || []);
      return {
        rawCount: normalized.length,
        done: !res?.hasMore,
        songs: normalized.map(song => buildNeteasePlayPayload(song, playlistInfo.value.cover || defaultImg)),
      };
    },
    appendSongs: (sessionId, payloads) => store.extendPlayAllHydration(sessionId, payloads),
    shouldContinue: () => currentId.value === routeId && store.isPlayAllHydrationActive(result.sessionId),
  });
};

watch(() => route.params.id, (id) => {
  const target = extractNeteasePlaylistId(id || '');
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

  const initialId = extractNeteasePlaylistId(route.params.id || route.query.id || '');
  if (initialId) {
    openPlaylist(initialId);
    return;
  }

  refreshSavedPlaylists();
  const savedId = getLastNeteasePlaylistId() || savedPlaylists.value[0]?.id || '';
  if (savedId) {
    openPlaylist(savedId);
  }
});

onUnmounted(() => {
  cancelPlayAllHydration();
  store.cancelPlayAllHydration();
  scrollContainerRef.value?.removeEventListener('scroll', queueSavedPlaylistListHeightUpdate);
  window.removeEventListener('resize', queueSavedPlaylistListHeightUpdate);
  if (savedPlaylistHeightFrame) cancelAnimationFrame(savedPlaylistHeightFrame);
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.4); border-radius: 4px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(203, 213, 225, 0.8); }

.netease-notice-fade-enter-active,
.netease-notice-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.netease-notice-fade-enter-from,
.netease-notice-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .netease-notice-fade-enter-active,
  .netease-notice-fade-leave-active {
    transition: opacity 0.01s linear;
  }

  .netease-notice-fade-enter-from,
  .netease-notice-fade-leave-to {
    transform: none;
  }
}
</style>
