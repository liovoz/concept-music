const { clientver, appid, signParamsKey, cryptoRSAEncrypt } = require('../util');

module.exports = (params, useAxios) => {
  const userid = Number(params?.userid || params?.cookie?.userid || 0);
  const token = params?.token || params?.cookie?.token || '';
  const mid = params?.cookie?.KUGOU_API_MID || params?.cookie?.kg_mid || '0';
  const clienttime = Math.floor(Date.now() / 1000);
  const p = cryptoRSAEncrypt({ token, clienttime, clienttime_ms: clienttime }).toUpperCase();

  const datamap = {
    p,
    appid,
    mid,
    clientver,
    clienttime,
    type: params?.type || '1',
    uuid: params?.uuid || '',
    userid,
    key: signParamsKey(clienttime.toString()),
  };

  if (params?.d_sec !== undefined) datamap.d_sec = params.d_sec;
  if (params?.diff_sec !== undefined) datamap.diff_sec = params.diff_sec;

  return useAxios({
    baseURL: 'http://userinfo.user.kugou.com',
    url: '/v2/get_grade_info',
    encryptType: 'android',
    method: 'POST',
    data: datamap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'userinfo.user.kugou.com' }
  });
};
