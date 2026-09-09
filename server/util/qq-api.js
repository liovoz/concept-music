const QQ_HEADERS = {
  Referer: 'https://y.qq.com/',
  Origin: 'https://y.qq.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

const ok = (body) => ({
  status: 200,
  body,
  cookie: [],
  headers: {},
});

const fail = (status, msg, data = null) => ({
  status,
  body: { code: status, msg, data },
  cookie: [],
  headers: {},
});

const parsePlaylistId = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const direct = raw.match(/^\d+$/);
  if (direct) return direct[0];

  try {
    const url = new URL(raw);
    const fromParam = url.searchParams.get('id') || url.searchParams.get('disstid');
    if (fromParam && /^\d+$/.test(fromParam)) return fromParam;

    const fromPath = url.pathname.match(/(?:playlist|taoge|details)\/(\d+)/i)?.[1];
    if (fromPath && /^\d+$/.test(fromPath)) return fromPath;
  } catch (e) {
    // 允许非标准 URL 匹配
  }

  const matched = raw.match(/(?:playlist\/|disstid=|id=|taoge\/|details\/)(\d+)/i);
  return matched?.[1] || '';
};

const getPlaylistDetail = async (useAxios, id, offset = 0, limit = 50) => {
  const playlistId = Number(id);
  const data = {
    comm: {
      cv: 4747474,
      ct: 24,
      format: 'json',
      inCharset: 'utf-8',
      outCharset: 'utf-8',
      notice: 0,
      platform: 'yqq.json',
      needNewCode: 1,
    },
    req_0: {
      module: 'music.srfDissInfo.DissInfo',
      method: 'CgiGetDiss',
      param: {
        disstid: playlistId,
        dirid: 0,
        need_playlist: 1,
        onlysonglist: 0,
        song_begin: Math.max(0, Number(offset || 0)),
        song_num: Math.max(1, Math.min(Number(limit || 50), 200)),
      },
    },
  };

  const res = await useAxios({
    baseURL: 'https://u.y.qq.com',
    url: '/cgi-bin/musicu.fcg',
    method: 'POST',
    data,
    headers: {
      ...QQ_HEADERS,
      'Content-Type': 'application/json',
    },
    clearDefaultParams: true,
    notSignature: true,
  });

  const responseData = (res.body || res.data)?.req_0?.data || {};
  return responseData;
};

const getSongLyric = async (useAxios, songmid = '') => {
  const mid = String(songmid || '').trim();
  if (!mid) return null;

  const res = await useAxios({
    baseURL: 'https://c.y.qq.com',
    url: '/lyric/fcgi-bin/fcg_query_lyric_new.fcg',
    method: 'GET',
    params: {
      songmid: mid,
      format: 'json',
      nobase64: 1,
    },
    headers: QQ_HEADERS,
    clearDefaultParams: true,
    notSignature: true,
  });

  let data = res.body || res.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      data = {};
    }
  }

  return {
    lyric: data?.lyric || '',
    trans: data?.trans || '',
  };
};

module.exports = {
  ok,
  fail,
  parsePlaylistId,
  getPlaylistDetail,
  getSongLyric,
};
