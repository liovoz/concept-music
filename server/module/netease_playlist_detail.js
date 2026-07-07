const { fail, getPlaylistDetail, ok, parsePlaylistId } = require('../util/netease-api');

module.exports = async (params, useAxios) => {
  const id = parsePlaylistId(params?.id || params?.url);
  if (!id) return fail(400, '缺少有效的网易云歌单 ID');

  try {
    const detail = await getPlaylistDetail(useAxios, id);
    if (!detail?.playlist?.id) return fail(404, '未找到该网易云歌单，请检查 ID 是否正确');
    return ok(detail);
  } catch (e) {
    return fail(502, '网易云歌单详情获取失败');
  }
};
