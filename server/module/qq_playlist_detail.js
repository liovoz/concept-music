const { fail, getPlaylistDetail, ok, parsePlaylistId, resolveQQShortUrl } = require('../util/qq-api');

module.exports = async (params, useAxios) => {
  let id = parsePlaylistId(params?.id || params?.url);
  if (!id && (params?.url || params?.id)) {
    id = await resolveQQShortUrl(useAxios, params?.url || params?.id);
  }
  if (!id) return fail(400, '缺少有效的企鹅歌单链接或 ID');

  try {
    const data = await getPlaylistDetail(useAxios, id, 0, 1);
    const dirinfo = data?.dirinfo || {};
    if (data?.code !== 0 || !dirinfo.id || !dirinfo.title?.trim()) {
      return fail(404, '未找到该企鹅歌单，请检查链接或 ID 是否存在');
    }

    const playlist = {
      id: String(dirinfo.id),
      name: dirinfo.title,
      cover: dirinfo.picurl || '',
      intro: dirinfo.desc || '',
      trackCount: Number(data.total_song_num || dirinfo.songnum || 0),
      creator: dirinfo.creator?.nick || dirinfo.host_nick || '',
      raw: dirinfo,
    };

    return ok({
      code: 200,
      playlist,
      total: playlist.trackCount,
    });
  } catch (e) {
    return fail(502, '企鹅歌单详情获取失败: ' + (e.message || ''));
  }
};
