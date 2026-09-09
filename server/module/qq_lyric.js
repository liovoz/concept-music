const { fail, getSongLyric, ok } = require('../util/qq-api');

module.exports = async (params, useAxios) => {
  const songmid = String(params?.songmid || params?.mid || params?.id || '').replace(/^qq:/, '').trim();
  if (!songmid) return fail(400, '缺少有效的歌曲 mid');

  try {
    const result = await getSongLyric(useAxios, songmid);
    if (!result || (!result.lyric && !result.trans)) {
      return fail(404, '未获取到该歌曲歌词');
    }

    return ok({
      code: 200,
      lyric: result.lyric,
      trans: result.trans,
      lrc: { lyric: result.lyric },
      tlyric: { lyric: result.trans },
    });
  } catch (e) {
    return fail(502, '企鹅歌曲歌词获取失败: ' + (e.message || ''));
  }
};
