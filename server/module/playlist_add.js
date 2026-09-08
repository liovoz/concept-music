// 收藏歌单
module.exports = (params, useAxios) => {
  const userid = params?.userid || params?.cookie?.userid || 0;
  const token = params?.token || params.cookie?.token || '';
  const clienttime = Math.floor(Date.now() / 1000);

  const playlistType = params.type !== undefined ? Number(params.type) : 0;
  const playlistSource = params.source !== undefined ? Number(params.source) : (playlistType === 0 ? 0 : 1);
  const dataMap = {
    userid,
    token,
    total_ver: 0,
    name: params.name,
    type: playlistType,
    source: playlistSource,
    is_pri: 0,
    list_create_userid: params.list_create_userid || userid || 0,
    list_create_listid: params.list_create_listid || 0,
    list_create_gid: params.list_create_gid || '',
    from_shupinmv: 0,
  };

  if (playlistType === 0) {
    dataMap['is_pri'] = params.is_pri !== undefined ? Number(params.is_pri) : 0;
  }

  return useAxios({
    url: '/cloudlist.service/v5/add_list',
    data: dataMap,
    params: playlistType === 0 ? { last_time: clienttime, last_area: 'gztx', userid, token } : {},
    method: 'post',
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
