const { fail, getPlaylistDetail, ok, parsePlaylistId } = require('../util/qq-api');

module.exports = async (params, useAxios) => {
  const id = parsePlaylistId(params?.id || params?.url);
  if (!id) return fail(400, '缺少有效的企鹅歌单 ID');

  const limit = Math.max(1, Math.min(Number(params?.limit || params?.pagesize || 50), 200));
  const page = Math.max(1, Number(params?.page || 1));
  const offset = Number.isFinite(Number(params?.offset)) ? Math.max(0, Number(params.offset)) : (page - 1) * limit;

  try {
    const data = await getPlaylistDetail(useAxios, id, offset, limit);
    const dirinfo = data?.dirinfo || {};
    if (!dirinfo.id) return fail(404, '未找到该企鹅歌单，请检查 ID 是否正确');

    const songs = Array.isArray(data.songlist) ? data.songlist : [];
    const total = Number(data.total_song_num || dirinfo.songnum || 0);
    const hasMore = Boolean(data.hasmore === 1 || (total > 0 && offset + songs.length < total));

    const playlist = {
      id: String(dirinfo.id),
      name: dirinfo.title || '企鹅歌单',
      cover: dirinfo.picurl || '',
      intro: dirinfo.desc || '',
      trackCount: total,
      creator: dirinfo.creator?.nick || dirinfo.host_nick || '',
    };

    return ok({
      code: 200,
      songs,
      total,
      hasMore,
      playlist,
    });
  } catch (e) {
    return fail(502, '企鹅歌单歌曲获取失败: ' + (e.message || ''));
  }
};
