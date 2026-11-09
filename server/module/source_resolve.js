const { resolveSources } = require('../util/lx-source-registry');
const { runSource } = require('../util/lx-source-runner');

const qualityMapWy = {
  viper_atmos: 'atmos',
  viper_clear: 'master',
  high: 'hires',
  sq: 'flac',
  hq: '320k',
  standard: '128k',
  best: 'hires',
};

const qualityMapTx = {
  viper_atmos: 'atmos',
  viper_clear: 'master',
  high: 'hires',
  sq: 'flac',
  hq: '320k',
  standard: '128k',
  best: 'flac',
};

const fallbackChainMap = {
  atmos: ['master', 'hires', 'flac24bit', '24bit', 'flac', '320k', '128k'],
  master: ['hires', 'flac24bit', '24bit', 'flac', '320k', '128k'],
  hires: ['flac24bit', '24bit', 'flac', '320k', '128k'],
  flac24bit: ['24bit', 'flac', '320k', '128k'],
  '24bit': ['flac', '320k', '128k'],
  flac: ['320k', '128k'],
  '320k': ['128k'],
  '128k': [],
};

const ok = (body) => ({ status: 200, body, cookie: [], headers: {} });
const fail = (status, msg, data = null) => ({ status, body: { code: status, msg, data }, cookie: [], headers: {} });

const isFatalSourceError = (err) => {
  if (!err) return false;
  const msg = String(err.message || '');
  const code = String(err.code || '');
  if (msg.includes('音源未注册播放解析能力') || msg.includes('音源未注册')) return true;
  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) return true;
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND')) return true;
  if (code === 'EHOSTUNREACH' || msg.includes('EHOSTUNREACH')) return true;
  if (msg.includes('Script execution timed out') || msg.includes('execution timed out')) return true;
  return false;
};

const getNeteaseId = (song = {}) => {
  return String(song.neteaseId || song.songId || song.id || song.hash || song._hash || '')
    .replace(/^netease:/, '')
    .trim();
};

const getQQId = (song = {}) => {
  return String(song.qqMid || song.songmid || song.mid || song.id || song.songId || song.hash || song._hash || '')
    .replace(/^qq:/, '')
    .trim();
};

const buildWyMusicInfo = (song = {}) => {
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

const buildTxMusicInfo = (song = {}) => {
  const qqId = getQQId(song);
  const artists = Array.isArray(song.artists) ? song.artists : Array.isArray(song._singers) ? song._singers : [];
  const singer = song.singer || artists.map(item => item.name).filter(Boolean).join('、') || '';

  return {
    id: qqId,
    songId: qqId,
    songmid: qqId,
    mid: qqId,
    strMediaMid: song.strMediaMid || song.file?.media_mid || qqId,
    hash: qqId,
    rid: qqId,
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
      source: 'tx',
      songid: qqId,
      id: qqId,
    },
  };
};

module.exports = async (params) => {
  const body = params?.body && typeof params.body === 'object' ? params.body : {};
  const song = body.song || params?.song || {};

  const isQQ = body.platform === 'tx'
    || body.subDir === 'QQ'
    || song.source === 'qq-import'
    || String(song.hash || song._hash || '').startsWith('qq:')
    || Boolean(song.qqMid);

  const subDir = isQQ ? 'QQ' : (body.subDir || 'Netease');
  const platform = isQQ ? 'tx' : 'wy';
  const songId = isQQ ? getQQId(song) : getNeteaseId(song);

  if (!songId) {
    return fail(400, isQQ ? '缺少企鹅歌曲 mid/ID' : '缺少网易云歌曲 ID');
  }

  const quality = body.quality || params?.quality || 'standard';
  const qualityMap = isQQ ? qualityMapTx : qualityMapWy;
  const targetQualityType = qualityMap[quality] || qualityMap.standard;

  const sources = resolveSources(body.sources || params?.sources, subDir);
  if (!sources.length) {
    return fail(404, `未在 music_source${subDir ? '\\' + subDir : ''} 中找到本地音源文件`);
  }

  const musicInfo = isQQ ? buildTxMusicInfo(song) : buildWyMusicInfo(song);
  const qualityCandidates = [targetQualityType, ...(fallbackChainMap[targetQualityType] || [])];
  const uniqueQualityCandidates = [...new Set(qualityCandidates.filter(Boolean))];

  const errors = [];
  for (const source of sources) {
    let sourceFailed = false;
    for (const qType of uniqueQualityCandidates) {
      if (sourceFailed) break;
      try {
        const payload = {
          action: 'musicUrl',
          source: platform,
          info: {
            type: qType,
            musicInfo,
          },
        };

        const result = await runSource(source, payload);
        if (result?.url) {
          return ok({
            code: 200,
            url: result.url,
            quality,
            resolvedQuality: qType,
            source: {
              id: source.id,
              name: source.name,
              subDir: source.subDir || '',
            },
          });
        }
      } catch (e) {
        const errMsg = e?.message || '解析失败';
        errors.push({
          source: source.name,
          quality: qType,
          message: errMsg,
        });

        // 若音源出现未注册方法、脚本崩溃、网络无法连通或解析超时，触发快速熔断，平滑切换到备选音源
        if (isFatalSourceError(e) || errMsg.includes('音源解析超时') || errMsg.includes('Request timeout')) {
          sourceFailed = true;
          break;
        }
      }
    }
  }

  return fail(502, `${isQQ ? '企鹅' : '网易云'}音源(${subDir || '根目录'})解析失败`, { errors });
};
