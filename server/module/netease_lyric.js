const { fail, getSongLyric, ok } = require('../util/netease-api');

module.exports = async (params, useAxios) => {
  const id = String(params?.id || params?.songId || params?.neteaseId || '')
    .replace(/^netease:/, '')
    .trim();

  if (!id) return fail(400, '缺少网易云歌曲 ID');

  try {
    const lyric = await getSongLyric(useAxios, id);
    return ok({ code: 200, ...lyric });
  } catch (e) {
    return fail(502, '网易云歌词获取失败');
  }
};
