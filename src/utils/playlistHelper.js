import { normalizeSongKey } from './songHelper.js';

export const PLAYLIST_NAME_MAX_LENGTH = 40;

/**
 * 校验歌单名称合法性与字数限制
 * @param {string} rawName
 * @param {number} maxLength
 */
export const validatePlaylistName = (rawName = '', maxLength = PLAYLIST_NAME_MAX_LENGTH) => {
  const raw = String(rawName ?? '');
  const trimmed = raw.trim();
  const rawLength = raw.length;
  const trimmedLength = trimmed.length;
  const isWhitespaceOnly = rawLength > 0 && trimmedLength === 0;
  const overCount = Math.max(0, trimmedLength - maxLength);
  const isOverLimit = overCount > 0;
  const isAtLimit = trimmedLength === maxLength && rawLength >= maxLength;
  const hasEdgeSpaces = rawLength > trimmedLength && trimmedLength > 0;

  let error = '';
  if (isWhitespaceOnly) {
    error = '歌单名称不能仅包含空格';
  } else if (isOverLimit) {
    error = `歌单名称超出 ${maxLength} 字限制，请删减 ${overCount} 个字符`;
  }

  return {
    raw,
    trimmed,
    rawLength,
    trimmedLength,
    overCount,
    isEmpty: trimmedLength === 0,
    isWhitespaceOnly,
    isOverLimit,
    isAtLimit,
    hasEdgeSpaces,
    isValid: trimmedLength > 0 && !isOverLimit,
    error
  };
};

/**
 * 为 Toast 格式化歌单名称，避免超长名称撑高或破坏气泡排版
 */
export const formatPlaylistNameForToast = (name = '', maxLen = 18) => {
  const clean = String(name || '').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
};

/**
 * 判断是否为暂不支持写入云端歌单的外部导入歌曲
 */
export const isUnsupportedCloudPlaylistSong = (song) => {
  if (!song || typeof song !== 'object') return false;
  const rawHash = String(song._hash || song.hash || '').trim();
  const canonical = normalizeSongKey(song);
  return (
    song.source === 'netease-import'
    || song.source === 'qq-import'
    || /^netease:/i.test(rawHash)
    || /^qq:/i.test(rawHash)
    || canonical.startsWith('netease:')
    || canonical.startsWith('qq:')
    || Boolean(song.neteaseId || song.qqMid)
  );
};

/**
 * 提取用于云端添加歌单的酷狗音频 Hash（排除 mix:/netease:/qq: 伪标识）
 */
export const resolveCloudSongHash = (song) => {
  if (!song || typeof song !== 'object') return '';
  const candidates = [
    song.hash,
    song._hash,
    song.FileHash,
    song.filehash,
    song['320hash'],
    song.HQFileHash,
    song.hqhash,
    song.sqhash,
    song.SQFileHash,
    song.qualities?.standard,
    song._qualities?.standard,
    song.qualities?.hq,
    song._qualities?.hq,
    song.qualities?.sq,
    song._qualities?.sq,
    song.audio_info?.hash_128,
    song.audio_info?.hash_320,
    song.audio_info?.hash_flac
  ];

  for (const item of candidates) {
    const val = String(item || '').trim();
    if (!val) continue;
    if (/^(netease|qq|mix):/i.test(val)) continue;
    return val.toUpperCase();
  }
  return '';
};

/**
 * 提取歌曲的多维指纹（各音质 Hash + mixsongid/album_audio_id），用于歌单曲目去重比对
 */
export const extractSongTrackFingerprints = (song) => {
  if (!song || typeof song !== 'object') return [];
  const fingerprints = new Set();

  const hashCandidates = [
    song.hash,
    song._hash,
    song.FileHash,
    song.filehash,
    song['320hash'],
    song.HQFileHash,
    song.hqhash,
    song.sqhash,
    song.SQFileHash,
    song.hash_high,
    song.HighFileHash,
    song.hash_viper_clear,
    song.hash_viper_atmos,
    song.audio_info?.hash_128,
    song.audio_info?.hash_320,
    song.audio_info?.hash_flac,
    song.audio_info?.hash_high,
    song.audio_info?.hash_viper_clear,
    song.audio_info?.hash_viper_atmos,
    ...(song.qualities && typeof song.qualities === 'object' ? Object.values(song.qualities) : []),
    ...(song._qualities && typeof song._qualities === 'object' ? Object.values(song._qualities) : []),
    ...(Array.isArray(song.relate_goods) ? song.relate_goods.map((g) => g?.hash) : [])
  ];

  for (const raw of hashCandidates) {
    const val = String(raw || '').trim();
    if (!val || /^(netease|qq|mix):/i.test(val)) continue;
    fingerprints.add(`HASH:${val.toUpperCase()}`);
  }

  const mixId = String(
    song.album_audio_id
    || song._album_audio_id
    || song.mixsongid
    || song.MixSongID
    || song.audio_id
    || ''
  ).trim();
  if (mixId && mixId !== '0' && mixId !== 'undefined' && mixId !== 'null') {
    fingerprints.add(`MIX:${mixId}`);
  }

  return Array.from(fingerprints);
};
