const { fail, getPlaylistDetail, getSongDetail, ok, parsePlaylistId } = require('../util/netease-api');

module.exports = async (params, useAxios) => {
  const id = parsePlaylistId(params?.id || params?.url);
  if (!id) return fail(400, '缺少有效的网易云歌单 ID');

  const limit = Math.max(1, Math.min(Number(params?.limit || params?.pagesize || 50), 200));
  const page = Math.max(1, Number(params?.page || 1));
  const offset = Number.isFinite(Number(params?.offset)) ? Math.max(0, Number(params.offset)) : (page - 1) * limit;

  try {
    const detail = await getPlaylistDetail(useAxios, id);
    const playlist = detail?.playlist || {};
    if (!playlist?.id) return fail(404, '未找到该网易云歌单，请检查 ID 是否正确');
    const trackIds = Array.isArray(playlist.trackIds) ? playlist.trackIds : [];
    const ids = trackIds.slice(offset, offset + limit).map(item => item.id).filter(Boolean);
    const rawSongs = ids.length ? await getSongDetail(useAxios, ids) : [];
    const allPrivileges = Array.isArray(detail?.privileges)
      ? detail.privileges
      : Array.isArray(playlist.privileges)
        ? playlist.privileges
        : [];
    const privilegeMap = new Map(
      allPrivileges
        .filter(item => item && item.id)
        .map(item => [String(item.id), item])
    );
    const songs = rawSongs.map(song => ({
      ...song,
      privilege: privilegeMap.get(String(song.id)) || null,
    }));

    return ok({
      code: 200,
      songs,
      privileges: songs.map(song => song.privilege).filter(Boolean),
      total: trackIds.length || playlist.trackCount || songs.length,
      hasMore: offset + ids.length < (trackIds.length || 0),
      playlist,
    });
  } catch (e) {
    return fail(502, '网易云歌单歌曲获取失败');
  }
};
