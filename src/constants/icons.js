// ============================================================
// 文件：src/constants/icons.js
// 概念音乐 (Concept Music) - 全局统一矢量图标库字典
// ============================================================

/**
 * @typedef {Object} IconDef
 * @property {string} [viewBox='0 0 24 24']
 * @property {string} [fill='none']
 * @property {string} [stroke='currentColor']
 * @property {number} [strokeWidth=2]
 * @property {string} content
 */

/** @type {Record<string, IconDef>} */
export const ICONS = {
  // --- 导航系统 (Navigation) ---
  'home': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>'
  },
  'rank': {
    viewBox: '1 1 22 22',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M3 21h18"/><path d="M4 21v-7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7"/><path d="M9 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12"/><path d="M15 21v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5"/><path d="m12 3 1 2 2.2.3-1.6 1.6.4 2.1-2-1-2 1 .4-2.1L8.8 5.3 11 5z"/>'
  },
  'new-songs': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
  },
  'personal-fm': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>'
  },
  'artists': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  },
  'playlist-category': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>'
  },
  'history': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  },
  'heart': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'
  },
  'heart-solid': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    content: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>'
  },
  'my-playlists': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>'
  },
  'netease-cloud': {
    viewBox: '1.2 1.2 21.6 21.6',
    fill: 'currentColor',
    stroke: 'none',
    content: '<path d="M10.4222 11.375C10.1278 12.4026 10.4341 13.4395 11.2058 14.0282C12.267 14.8376 13.7712 14.3289 14.0796 13.0331C14.1599 12.6958 14.1833 12.311 14.1067 11.9767C13.8775 10.9756 13.586 9.98862 13.3147 8.98094C11.9843 9.13543 10.7722 10.1533 10.4222 11.375ZM15.9698 11.0879C16.2427 12.1002 16.2553 13.1053 15.8435 14.0875C14.7148 16.7784 11.1215 17.2286 9.26951 14.9136C7.96829 13.2869 7.99065 10.953 9.32982 9.18031C10.1096 8.14796 11.1339 7.47322 12.3776 7.12595C12.5007 7.09159 12.6241 7.058 12.7566 7.02157C12.6731 6.60736 12.569 6.20612 12.5143 5.79828C12.3375 4.48137 13.026 3.29477 14.2582 2.7574C15.4836 2.22294 16.9661 2.54204 17.7889 3.51738C18.1936 3.99703 18.183 4.59854 17.7631 4.98218C17.3507 5.359 16.7665 5.32761 16.3276 4.89118C16.0809 4.64585 15.8185 4.45112 15.451 4.45569C14.9264 4.46223 14.4642 4.87382 14.5058 5.39329C14.5432 5.86105 14.6785 6.32376 14.8058 6.77892C14.8276 6.85679 15.0218 6.91415 15.1436 6.9321C16.4775 7.12862 17.6476 7.66332 18.6165 8.60769C21.1739 11.1006 21.4772 15.1394 19.2882 18.0482C17.7593 20.0797 15.6785 21.2165 13.1609 21.4567C8.53953 21.8977 4.49683 18.9278 3.46188 14.3992C2.5147 10.2551 4.8397 5.83074 8.79509 4.25032C9.38067 4.01635 9.93787 4.21869 10.1664 4.74827C10.3982 5.28546 10.147 5.83389 9.55552 6.09847C7.18759 7.15787 5.73935 8.9527 5.34076 11.5215C4.80806 14.9546 6.99662 18.2982 10.3416 19.2428C13.0644 20.0117 15.9994 19.0758 17.6494 16.9123C19.2354 14.8328 19.0484 11.8131 17.2221 10.0389C16.7172 9.54838 16.1246 9.21455 15.3988 9.02564C15.5974 9.74151 15.7879 10.4136 15.9698 11.0879Z"/>'
  },
  'info': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  },

  // --- 媒体与音乐 (Media & Music) ---
  'music': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
  },
  'album': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>'
  },

  // --- 搜索与热度 (Search & Trends) ---
  'search': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
  },
  'flame': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>'
  },

  // --- 播放器控制 (Player Controls) ---
  'play': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    content: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l13-7.5a1 1 0 0 0 0-1.72l-13-7.5A1 1 0 0 0 6 4.5z"/>'
  },
  'pause': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    content: '<rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>'
  },
  'prev': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    content: '<path d="M6 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zm12.5.4a1 1 0 0 0-1.5-.86l-9 5.5a1 1 0 0 0 0 1.72l9 5.5a1 1 0 0 0 1.5-.86V5.4z"/>'
  },
  'next': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    content: '<path d="M18 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zM5.5 5.4a1 1 0 0 1 1.5-.86l9 5.5a1 1 0 0 1 0 1.72l-9 5.5a1 1 0 0 1-1.5-.86V5.4z"/>'
  },

  // --- 播放模式 (Playback Modes) ---
  'mode-sequence': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'
  },
  'mode-loop': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M11 10.5 12.5 9.5V15" stroke-width="1.8"/>'
  },
  'mode-random': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>'
  },
  'mode-order': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="11" y2="18"/><polygon points="17 15 21 18 17 21 17 15" fill="currentColor"/>'
  },

  // --- 音量与音效 (Audio & Volume) ---
  'volume-mute': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
  },
  'volume-low': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
  },
  'volume-high': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
  },
  'queue': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'
  },
  'star': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
  },
  'star-solid': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    content: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
  },
  'timer-30s': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="2" x2="12" y2="5"/>'
  },

  // --- 操作与通用动作 (Actions & Operations) ---
  'play-next': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="4" y1="6" x2="13" y2="6"/><line x1="4" y1="12" x2="11" y2="12"/><line x1="4" y1="18" x2="11" y2="18"/><polygon points="15 10 21 14 15 18 15 10" fill="currentColor"/>'
  },
  'add-playlist': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="4" y1="6" x2="14" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/><line x1="18" y1="15" x2="18" y2="21"/><line x1="15" y1="18" x2="21" y2="18"/>'
  },
  'download': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  },
  'copy': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
  },
  'share': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'
  },
  'edit': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>'
  },
  'plus': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
  },
  'trash': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'
  },
  'refresh': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'
  },
  'filter': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'
  },
  'chevron-right': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    content: '<polyline points="9 18 15 12 9 6"/>'
  },
  'chevron-left': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    content: '<polyline points="15 18 9 12 15 6"/>'
  },
  'chevron-up': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    content: '<polyline points="18 15 12 9 6 15"/>'
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    content: '<polyline points="6 9 12 15 18 9"/>'
  },
  'back-to-top': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    content: '<line x1="18" y1="6" x2="6" y2="6"/><polyline points="18 15 12 9 6 15"/><line x1="12" y1="9" x2="12" y2="21"/>'
  },

  // --- 窗口与主题 (Window & Theme) ---
  'minimize': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="4" y1="12" x2="20" y2="12"/>'
  },
  'maximize': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<rect x="3" y="3" width="18" height="18" rx="2"/>'
  },
  'close': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  },
  'sun': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
  },
  'moon': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
  },
  'logout': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
  },

  // --- 状态与反馈 (Status & Alerts) ---
  'spinner': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.5,
    content: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'
  },
  'check': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
  },
  'warning': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
  },
  'danger': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  },
  'ban': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'
  },

  // --- 桌面歌词 (Desktop Lyrics) ---
  'lock': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  },
  'unlock': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
  },
  'settings': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  },
  'palette': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/>'
  },
  'typography': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    content: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>'
  }
};
