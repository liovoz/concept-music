const { randomString, appid, cryptoMd5 } = require('../util');

module.exports = async (params, useAxios) => {
  const vip_token = params?.vip_token || params?.cookie?.vip_token || '';
  const token = params?.token || params?.cookie?.token || '';
  const clienttime_ms = Date.now();
  const userid = String(params?.userid || params?.cookie?.userid || '0');
  const incomingDfid = params?.dfid || params?.cookie?.dfid || params?.cookie?.kg_dfid || '';
  let dfid = (incomingDfid && incomingDfid !== '-' && incomingDfid.length >= 16) ? incomingDfid : '';

  if (!dfid) {
    try {
      const registerDev = require('./register_dev');
      const reg = await registerDev(params, useAxios);
      if (reg?.body?.data?.dfid && typeof reg.body.data.dfid === 'string' && reg.body.data.dfid.length >= 16) {
        dfid = reg.body.data.dfid.trim();
      }
    } catch (_) {}
  }
  if (!dfid) dfid = randomString(24);

  const vip_type = Number(params?.cookie?.vip_type || params?.vipType || 0);
  const mid = params?.cookie?.KUGOU_API_MID || params?.cookie?.mid || params?.cookie?.kg_mid || '0';
  const cleanHash = String(params?.hash || '').toLowerCase();
  const albumAudioId = String(params?.album_audio_id || '0');

  const dataMap = {
    area_code: '1',
    behavior: 'play',
    qualities: ['128', '320', 'flac', 'high', 'multitrack', 'viper_atmos', 'viper_tape', 'viper_clear', 'super'],
    resource: {
      album_audio_id: albumAudioId,
      collect_list_id: '3',
      collect_time: clienttime_ms,
      hash: cleanHash,
      id: 0,
      page_id: 1,
      type: 'audio',
    },
    token,
    tracker_param: {
      all_m: 1,
      auth: '',
      is_free_part: params?.free_part ? 1 : 0,
      key: cryptoMd5(`${cleanHash}185672dd44712f60bb1736df5a377e82${appid}${mid}${userid}`),
      module_id: 0,
      need_climax: 1,
      need_xcdn: 1,
      open_time: '',
      pid: '411',
      pidversion: '3001',
      priv_vip_type: '6',
      viptoken: vip_token,
    },
    userid,
    vip: vip_type,
  };

  const res = await useAxios({
    baseURL: 'http://tracker.kugou.com',
    url: '/v6/priv_url',
    method: 'POST',
    data: dataMap,
    headers: { 'Content-Type': 'application/json' },
    encryptType: 'android',
    cookie: Object.assign({}, { dfid, kg_dfid: dfid }, params?.cookie),
  });

  // 格式化输出：将各音质的播放直链提取并附加，确保上层直接读取
  if (res?.body?.data && Array.isArray(res.body.data)) {
    const urlMap = {};
    for (const item of res.body.data) {
      const trackerUrls = item.info?.tracker_url;
      const primaryUrl = (Array.isArray(trackerUrls) && trackerUrls.length > 0)
        ? trackerUrls[0]
        : (item.url || item.backupUrl || null);
      if (primaryUrl) {
        item.url = primaryUrl;
        if (item.quality) urlMap[item.quality] = primaryUrl;
      }
    }
    res.body.url = urlMap;
  }

  return res;
};
