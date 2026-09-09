const defaultCover = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const formatDuration = (duration = 0) => {
  let seconds = Number(duration || 0);
  if (seconds > 36000) seconds = Math.floor(seconds / 1000);
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return seconds > 0 ? `${mins}:${secs}` : '--:--';
};

const normalizeArtists = (singers = []) => {
  if (!Array.isArray(singers)) {
    if (typeof singers === 'string' && singers.trim()) {
      return singers.split(/[,、/]/).map(name => ({ id: '', name: name.trim() })).filter(Boolean);
    }
    return [];
  }
  return singers
    .map(item => ({
      id: String(item?.mid || item?.id || ''),
      name: String(item?.name || item?.title || '').trim(),
    }))
    .filter(item => item.name);
};

const getAlbumCover = (album = {}) => {
  const mid = album.mid || album.pmid;
  if (mid) {
    return `https://y.gtimg.cn/music/photo_new/T002R300x300M000${mid}.jpg`;
  }
  return '';
};

export const buildQQQualities = (song = {}) => {
  const mid = String(song.mid || song.songmid || song.qqMid || song.id || '').trim();
  if (!mid) return {};

  const file = song.file || {};
  const qualities = { standard: mid };

  if (Number(file.size_320mp3 || file.size320 || 0) > 0) {
    qualities.hq = mid;
  }
  if (Number(file.size_flac || file.sizeflac || file.sizeape || 0) > 0) {
    qualities.sq = mid;
  }
  if (Number(file.size_hires || file.size24bit || file.size_new?.[0] || 0) > 0) {
    qualities.high = mid;
  }

  return qualities;
};

export const isQQMusicDomain = (hostname = '') => {
  return /^(?:[a-zA-Z0-9-]+\.)*(?:qq\.com)$/i.test(hostname);
};

export const extractQQShortUrl = (value = '') => {
  const raw = String(value || '').trim();
  const matched = raw.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*qq\.com\/base\/fcgi-bin\/u\?__=[a-zA-Z0-9_-]+/i);
  return matched ? matched[0] : '';
};

export const extractQQPlaylistId = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // 1. 纯数字 ID（企鹅音乐歌单 ID 通常为 7-14 位数字，防止 123 等非合法短数字误判）
  if (/^\d{7,14}$/.test(raw)) {
    return raw;
  }

  // 2. 从可能包含文字的分享文本中提取 URL
  const urlMatch = raw.match(/https?:\/\/[^\s\u4e00-\u9fa5"'<>]+/i);
  const candidate = urlMatch ? urlMatch[0] : raw;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();

    if (isQQMusicDomain(hostname)) {
      const pathMatch = url.pathname.match(/(?:playlist|playsquare|taoge|details)\/(\d{7,14})/i);
      if (pathMatch && pathMatch[1]) return pathMatch[1];

      const paramId = url.searchParams.get('id') || url.searchParams.get('disstid');
      if (paramId && /^\d{7,14}$/.test(paramId)) return paramId;
    }
  } catch (e) {
    // 允许非标准 URL 匹配
  }

  // 3. 非标准或残缺 URL 容错匹配（必须包含 qq.com 且包含合法的 7-14 位 ID）
  if (/qq\.com/i.test(raw)) {
    const matched = raw.match(/(?:playlist\/|playsquare\/|disstid=|id=|taoge\/|details\/)(\d{7,14})/i);
    if (matched && matched[1]) return matched[1];
  }

  return '';
};

export const normalizeQQPlaylistInfo = (playlist = {}) => ({
  id: String(playlist.id || ''),
  name: playlist.name || playlist.title || '企鹅歌单',
  intro: playlist.intro || playlist.desc || '该歌单来自企鹅音乐导入',
  cover: playlist.cover || playlist.picurl || defaultCover,
  trackCount: Number(playlist.trackCount || playlist.songnum || 0),
  creator: playlist.creator?.nickname || playlist.creator?.nick || playlist.creator || '',
});

export const normalizeQQSongs = (rawList = []) => rawList
  .filter(song => song && (song.mid || song.songmid || song.id))
  .map(song => {
    const songmid = String(song.mid || song.songmid || song.id || '');
    const artists = normalizeArtists(song.singer || song.artists || song.ar || []);
    const singer = artists.map(item => item.name).join('、') || '未知歌手';
    const album = song.album || song.al || {};
    const duration = Number(song.interval || song.duration || song.dt || 0);
    const cover = getAlbumCover(album) || song.pic || defaultCover;
    const qualities = buildQQQualities({ ...song, mid: songmid });

    const isVip = Boolean(song.pay?.pay_play === 1 || song.pay?.pay_down === 1);
    const isPaid = Boolean(song.pay?.pay_play === 1 && (song.pay?.price || song.pay?.pay_status === 1));

    return {
      ...song,
      source: 'qq-import',
      qqMid: songmid,
      songmid,
      _hash: `qq:${songmid}`,
      _title: song.title || song.name || song.songname || '未知歌曲',
      _singer: singer,
      _singer_id: artists[0]?.id || '',
      _singers: artists,
      artists,
      _album: album.name || album.title || '单曲',
      _duration: formatDuration(duration),
      _durationSec: duration,
      _album_id: String(album.mid || album.id || ''),
      _album_audio_id: '',
      _is_vip: isVip,
      _is_paid: isPaid,
      _cover: cover,
      _qualities: qualities,
      strMediaMid: song.file?.media_mid || song.strMediaMid || songmid,
    };
  });

const getQQPayloadId = (song = {}) => {
  return String(song.qqMid || song.songmid || song.mid || song.id || song._hash || song.hash || '')
    .replace(/^qq:/, '')
    .trim();
};

export const buildQQPlayPayload = (song, fallbackCover = defaultCover) => {
  const qqMid = getQQPayloadId(song);
  const hash = song._hash || song.hash || (qqMid ? `qq:${qqMid}` : '');
  const qualities = song._qualities || buildQQQualities({ ...song, mid: qqMid });

  return {
    source: 'qq-import',
    qqMid,
    id: qqMid,
    songId: qqMid,
    songmid: qqMid,
    hash,
    name: song._title || song.title || song.name || '未知歌曲',
    singer: song._singer || song.singer || '',
    singer_id: song._singer_id || song.singer_id || '',
    _singers: song._singers || song.artists || [],
    artists: song.artists || song._singers || [],
    album: song._album || song.album?.name || song.album?.title || '',
    cover: song._cover || song.cover || fallbackCover,
    album_id: song._album_id || song.album_id || '',
    album_audio_id: '',
    is_vip: song._is_vip ?? (song.pay?.pay_play === 1),
    is_paid: song._is_paid ?? false,
    duration: song._durationSec || song.duration || song.interval || 0,
    interval: song._durationSec || song.interval || song.duration || 0,
    qualities,
    sourceSongInfo: song,
    strMediaMid: song.strMediaMid || song.file?.media_mid || qqMid,
  };
};
