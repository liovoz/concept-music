const { fail, getPlaylistDetail, ok, parsePlaylistId } = require('../util/qq-api');

module.exports = async (params, useAxios) => {
  const id = parsePlaylistId(params?.id || params?.url);
  if (!id) return fail(400, '缺少有效的企鹅歌单 ID');

  try {
    const data = await getPlaylistDetail(useAxios, id, 0, 1);
    const dirinfo = data?.dirinfo || {};
    if (!dirinfo.id) return fail(404, '未找到该企鹅歌单，请检查 ID 是否正确');

    const playlist = {
      id: String(dirinfo.id),
      name: dirinfo.title || '企鹅歌单',
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
