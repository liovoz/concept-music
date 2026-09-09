const { fail, getPlaylistDetail, ok, parsePlaylistId, resolveNeteaseShortUrl } = require('../util/netease-api');

module.exports = async (params, useAxios) => {
  let id = parsePlaylistId(params?.id || params?.url);
  if (!id && (params?.url || params?.id)) {
    id = await resolveNeteaseShortUrl(useAxios, params?.url || params?.id);
  }
  if (!id) return fail(400, '缺少有效的网易云歌单链接或 ID');

  try {
    const detail = await getPlaylistDetail(useAxios, id);
    if (detail?.code !== 200 || !detail?.playlist?.id || !detail?.playlist?.name?.trim()) {
      return fail(404, '未找到该网易云歌单，请检查链接或 ID 是否存在');
    }
    return ok(detail);
  } catch (e) {
    return fail(502, '网易云歌单详情获取失败');
  }
};
