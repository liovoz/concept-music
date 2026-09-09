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

const isQQMusicDomain = (hostname = '') => {
  return /^(?:[a-zA-Z0-9-]+\.)*(?:qq\.com)$/i.test(hostname);
};

const parsePlaylistId = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // 1. 纯数字 ID（7-14 位数字，防止 123 等非合法短数字误判）
  if (/^\d{7,14}$/.test(raw)) {
    return raw;
  }

  // 2. 从文本中提取 URL
  const urlMatch = raw.match(/https?:\/\/[^\s\u4e00-\u9fa5"'<>]+/i);
  const candidate = urlMatch ? urlMatch[0] : raw;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();

    if (isQQMusicDomain(hostname)) {
      const pathMatch = url.pathname.match(/(?:playlist|playsquare|taoge|details)\/(\d{7,14})/i);
      if (pathMatch && pathMatch[1]) return pathMatch[1];

      const paramId = url.searchParams.get('id') || url.searchParams.get('disstid');
      if (paramId && /^\d{7,14}$/.test(paramId)) return paramId;
    }
  } catch (e) {
    // 允许非标准 URL 匹配
  }

  // 3. 非标准或残缺 URL 容错匹配（必须包含 qq.com 且包含合法的 7-14 位 ID）
  if (/qq\.com/i.test(raw)) {
    const matched = raw.match(/(?:playlist\/|playsquare\/|disstid=|id=|taoge\/|details\/)(\d{7,14})/i);
    if (matched && matched[1]) return matched[1];
  }

  return '';
};

const resolveQQShortUrl = async (useAxios, rawUrl = '') => {
  const urlMatch = String(rawUrl || '').match(/https?:\/\/[^\s\u4e00-\u9fa5"'<>]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : String(rawUrl || '').trim();
  if (!targetUrl || !/qq\.com/i.test(targetUrl)) return '';

  try {
    const res = await useAxios({
      url: targetUrl,
      method: 'GET',
      headers: QQ_HEADERS,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    const finalUrl = res.request?.res?.responseUrl || res.headers?.location || '';
    return parsePlaylistId(finalUrl);
  } catch (e) {
    return '';
  }
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
  isQQMusicDomain,
  parsePlaylistId,
  resolveQQShortUrl,
  getPlaylistDetail,
  getSongLyric,
};
