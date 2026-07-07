const { resolveSources } = require('../util/lx-source-registry');
const { runSource } = require('../util/lx-source-runner');

const qualityMap = {
  viper_atmos: '24bit',
  viper_clear: '24bit',
  high: 'flac',
  sq: 'flac',
  hq: '320k',
  standard: '128k',
  best: 'flac',
};

const ok = (body) => ({ status: 200, body, cookie: [], headers: {} });
const fail = (status, msg, data = null) => ({ status, body: { code: status, msg, data }, cookie: [], headers: {} });

const getNeteaseId = (song = {}) => {
  return String(song.neteaseId || song.songId || song.id || song.hash || song._hash || '')
    .replace(/^netease:/, '')
    .trim();
};

const buildMusicInfo = (song = {}) => {
  const neteaseId = getNeteaseId(song);
  const artists = Array.isArray(song.artists) ? song.artists : Array.isArray(song._singers) ? song._singers : [];
  const singer = song.singer || artists.map(item => item.name).filter(Boolean).join('、') || '';

  return {
    id: neteaseId,
    songId: neteaseId,
    songmid: neteaseId,
    hash: neteaseId,
    rid: neteaseId,
    mid: neteaseId,
    name: song.name || song._title || '',
    singer,
    singerId: song.singer_id || artists[0]?.id || '',
    album: song.album || song._album || '',
    albumName: song.album || song._album || '',
    albumId: song.album_id || '',
    interval: song.duration || song.interval || 0,
    duration: song.duration || song.interval || 0,
    pic: song.cover || song._cover || '',
    meta: {
      source: 'wy',
      songid: neteaseId,
      id: neteaseId,
    },
  };
};

module.exports = async (params) => {
  const body = params?.body && typeof params.body === 'object' ? params.body : {};
  const song = body.song || params?.song || {};
  const neteaseId = getNeteaseId(song);

  if (!neteaseId) return fail(400, '缺少网易云歌曲 ID');

  const quality = body.quality || params?.quality || 'standard';
  const sources = resolveSources(body.sources || params?.sources);
  if (!sources.length) return fail(404, '未找到本地音源文件');

  const payload = {
    action: 'musicUrl',
    source: 'wy',
    info: {
      type: qualityMap[quality] || qualityMap.standard,
      musicInfo: buildMusicInfo({ ...song, neteaseId }),
    },
  };

  const errors = [];
  for (const source of sources) {
    try {
      const result = await runSource(source, payload);
      return ok({
        code: 200,
        url: result.url,
        quality,
        source: {
          id: source.id,
          name: source.name,
        },
      });
    } catch (e) {
      errors.push({
        source: source.name,
        message: e?.message || '解析失败',
      });
    }
  }

  return fail(502, '所有本地音源均解析失败', { errors });
};
