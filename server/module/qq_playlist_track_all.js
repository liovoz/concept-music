const { fail, getPlaylistDetail, ok, parsePlaylistId, resolveQQShortUrl } = require('../util/qq-api');

module.exports = async (params, useAxios) => {
  let id = parsePlaylistId(params?.id || params?.url);
  if (!id && (params?.url || params?.id)) {
    id = await resolveQQShortUrl(useAxios, params?.url || params?.id);
  }
  if (!id) return fail(400, '缺少有效的企鹅歌单链接或 ID');

  const limit = Math.max(1, Math.min(Number(params?.limit || params?.pagesize || 50), 200));
  const page = Math.max(1, Number(params?.page || 1));
  const offset = Number.isFinite(Number(params?.offset)) ? Math.max(0, Number(params.offset)) : (page - 1) * limit;

  try {
    const data = await getPlaylistDetail(useAxios, id, offset, limit);
    const dirinfo = data?.dirinfo || {};
    if (data?.code !== 0 || !dirinfo.id || !dirinfo.title?.trim()) {
      return fail(404, '未找到该企鹅歌单，请检查链接或 ID 是否存在');
    }

    const songs = Array.isArray(data.songlist) ? data.songlist : [];
    const total = Number(data.total_song_num || dirinfo.songnum || 0);
    const hasMore = Boolean(data.hasmore === 1 || (total > 0 && offset + songs.length < total));

    const playlist = {
      id: String(dirinfo.id),
      name: dirinfo.title,
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
