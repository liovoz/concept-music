const defaultCover = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const formatDuration = (duration = 0) => {
  let seconds = Number(duration || 0);
  if (seconds > 36000) seconds = Math.floor(seconds / 1000);
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return seconds > 0 ? `${mins}:${secs}` : '--:--';
};

const normalizeArtists = (artists = []) => {
  if (!Array.isArray(artists)) return [];
  return artists
    .map(item => ({
      id: String(item?.id || ''),
      name: String(item?.name || '').trim(),
    }))
    .filter(item => item.name);
};

const hasQualityInfo = (quality) => {
  if (!quality || typeof quality !== 'object') return false;
  if (quality.br && Number(quality.br) > 0) return true;
  if (quality.size && Number(quality.size) > 0) return true;
  return Boolean(quality.level || quality.type || quality.name);
};

const getMaxNeteaseBitrate = (song = {}) => {
  const privilege = song.privilege || {};
  return Math.max(
    0,
    Number(song.m?.br || 0),
    Number(song.h?.br || 0),
    Number(song.sq?.br || 0),
    Number(song.hr?.br || 0),
    Number(privilege.maxbr || 0),
    Number(privilege.playMaxbr || 0),
    Number(privilege.pl || 0),
    Number(privilege.fl || 0),
    Number(privilege.dl || 0)
  );
};

export const buildNeteaseQualities = (song = {}) => {
  const id = String(song.id || song.neteaseId || '').trim();
  if (!id) return {};

  const qualities = { standard: id };
  const maxBitrate = getMaxNeteaseBitrate(song);

  if (
    hasQualityInfo(song.h) ||
    hasQualityInfo(song.sq) ||
    hasQualityInfo(song.hr) ||
    maxBitrate >= 320000
  ) {
    qualities.hq = id;
  }
  if (hasQualityInfo(song.sq) || hasQualityInfo(song.hr) || maxBitrate >= 999000) {
    qualities.sq = id;
  }
  if (hasQualityInfo(song.hr) || maxBitrate >= 1999000) {
    qualities.high = id;
  }

  return qualities;
};

export const extractNeteasePlaylistId = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d+$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    return url.searchParams.get('id') || '';
  } catch (e) {
    return raw.match(/(?:playlist\?id=|playlist\/|id=)(\d+)/)?.[1] || '';
  }
};

export const normalizeNeteasePlaylistInfo = (playlist = {}) => ({
  id: String(playlist.id || ''),
  name: playlist.name || '网易云歌单',
  intro: playlist.description || '该歌单来自网易云音乐导入',
  cover: playlist.coverImgUrl || playlist.picUrl || defaultCover,
  trackCount: Number(playlist.trackCount || playlist.trackIds?.length || 0),
  creator: playlist.creator?.nickname || '',
});

export const normalizeNeteaseSongs = (rawList = []) => rawList
  .filter(song => song && song.id && (song.name || song.al?.name))
  .map(song => {
    const artists = normalizeArtists(song.ar || song.artists || []);
    const singer = artists.map(item => item.name).join('、') || '未知歌手';
    const album = song.al || song.album || {};
    const neteaseId = String(song.id);
    const duration = Number(song.dt || song.duration || 0);
    const cover = album.picUrl || song.picUrl || defaultCover;
    const qualities = buildNeteaseQualities({ ...song, neteaseId });

    return {
      ...song,
      source: 'netease-import',
      neteaseId,
      _hash: `netease:${neteaseId}`,
      _title: song.name || '未知歌曲',
      _singer: singer,
      _singer_id: artists[0]?.id || '',
      _singers: artists,
      artists,
      _album: album.name || '单曲',
      _duration: formatDuration(duration),
      _durationSec: duration > 36000 ? Math.floor(duration / 1000) : duration,
      _album_id: String(album.id || ''),
      _album_audio_id: '',
      _is_vip: song.fee === 1,
      _is_paid: song.fee === 4,
      _cover: cover,
      _qualities: qualities,
    };
  });

const getNeteasePayloadId = (song = {}) => {
  return String(song.neteaseId || song.id || song.songId || song._hash || song.hash || '')
    .replace(/^netease:/, '')
    .trim();
};

export const buildNeteasePlayPayload = (song, fallbackCover = defaultCover) => {
  const neteaseId = getNeteasePayloadId(song);
  const hash = song._hash || song.hash || (neteaseId ? `netease:${neteaseId}` : '');
  const qualities = song._qualities || buildNeteaseQualities({ ...song, id: neteaseId });

  return {
    source: 'netease-import',
    neteaseId,
    id: neteaseId,
    songId: neteaseId,
    hash,
    name: song._title || song.name || '未知歌曲',
    singer: song._singer || song.singer || '',
    singer_id: song._singer_id || song.singer_id || '',
    _singers: song._singers || song.artists || [],
    artists: song.artists || song._singers || [],
    album: song._album || song.album?.name || song.al?.name || '',
    cover: song._cover || song.cover || song.al?.picUrl || fallbackCover,
    album_id: song._album_id || song.album_id || song.al?.id || '',
    album_audio_id: '',
    is_vip: song._is_vip ?? song.fee === 1,
    is_paid: song._is_paid ?? song.fee === 4,
    duration: song._durationSec || song.duration || 0,
    interval: song._durationSec || song.interval || song.duration || 0,
    qualities,
    sourceSongInfo: song,
  };
};
