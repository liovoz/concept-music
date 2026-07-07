const { fail, getSongDetail, ok } = require('../util/netease-api');

module.exports = async (params, useAxios) => {
  const ids = String(params?.ids || params?.id || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (!ids.length) return fail(400, '缺少歌曲 ID');

  try {
    const songs = await getSongDetail(useAxios, ids);
    return ok({ code: 200, songs });
  } catch (e) {
    return fail(502, '网易云歌曲详情获取失败');
  }
};
