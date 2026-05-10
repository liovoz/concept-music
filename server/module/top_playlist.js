// 歌单
// categoryid 0：推荐，11292：HI-RES

const { appid, clientver, signParamsKey } = require('../util');

module.exports = (params, useAxios) => {
  const dateTime = (Date.now() / 1000).toFixed(0);
  const hasTag = !!params?.tag_id;
  const specialRecommend = {
    withtag: params?.withtag || 1,
    withsong: params?.withsong || 1,
    sort: params?.sort || 1,
    ugc: 1,
    is_selected: hasTag ? 1 : 0,
    withrecommend: hasTag ? 0 : 1,
    area_code: 1,
    categoryid: params?.category_id || 0,
    tagids: params?.tag_id ?? '',
  };

  const dataMap = {
    appid,
    mid: params?.cookie?.KUGOU_API_MID,
    clientver,
    platform: 'android',
    clienttime: dateTime,
    userid: params?.userid || params?.cookie?.userid || 0,
    module_id: params?.module_id || 1,
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
    key: signParamsKey(dateTime.toString()),
    special_recommend: specialRecommend,
    req_multi: 1,
    return_min: 5,
    return_special_flag: 1,
  };

  return useAxios({
    url: '/v2/special_recommend',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'specialrec.service.kugou.com' },
  });
};
