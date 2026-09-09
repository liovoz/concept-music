const NETEASE_BASE_URL = 'https://music.163.com';

const NETEASE_HEADERS = {
  Referer: 'https://music.163.com/',
  Origin: 'https://music.163.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
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

const isNeteaseDomain = (hostname = '') => {
  return /^(?:[a-zA-Z0-9-]+\.)*(?:163\.com|163cn\.tv|163\.lu)$/i.test(hostname);
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

    if (isNeteaseDomain(hostname)) {
      let paramId = url.searchParams.get('id');
      if (!paramId && url.hash) {
        const hashQuery = url.hash.split('?')[1];
        if (hashQuery) {
          const hashParams = new URLSearchParams(hashQuery);
          paramId = hashParams.get('id');
        }
      }
      if (paramId && /^\d{7,14}$/.test(paramId)) return paramId;

      const pathMatch = (url.pathname + url.hash).match(/playlist\/(\d{7,14})/i);
      if (pathMatch && pathMatch[1]) return pathMatch[1];
    }
  } catch (e) {
    // 允许非标准 URL 匹配
  }

  // 3. 非标准或残缺 URL 容错匹配（必须包含 163.com 且包含合法的 7-14 位 ID）
  if (/163\.com/i.test(raw)) {
    const matched = raw.match(/(?:playlist\?id=|playlist\/|id=)(\d{7,14})/i);
    if (matched && matched[1]) return matched[1];
  }

  return '';
};

const resolveNeteaseShortUrl = async (useAxios, rawUrl = '') => {
  const urlMatch = String(rawUrl || '').match(/https?:\/\/[^\s\u4e00-\u9fa5"'<>]+/i);
  const targetUrl = urlMatch ? urlMatch[0] : String(rawUrl || '').trim();
  if (!targetUrl || !/(?:163cn\.tv|163\.lu|163\.com)/i.test(targetUrl)) return '';

  try {
    const res = await useAxios({
      url: targetUrl,
      method: 'GET',
      headers: NETEASE_HEADERS,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    const finalUrl = res.request?.res?.responseUrl || res.headers?.location || '';
    return parsePlaylistId(finalUrl);
  } catch (e) {
    return '';
  }
};

const neteaseGet = (useAxios, url, params = {}) => useAxios({
  baseURL: NETEASE_BASE_URL,
  url,
  method: 'GET',
  params,
  headers: NETEASE_HEADERS,
  clearDefaultParams: true,
  notSignature: true,
});

const getPlaylistDetail = async (useAxios, id) => {
  const res = await neteaseGet(useAxios, '/api/v6/playlist/detail', {
    id,
    n: 100000,
    s: 8,
    timestamp: Date.now(),
  });
  return res.body || res.data;
};

const getSongDetail = async (useAxios, ids = []) => {
  const list = ids.map(id => String(id || '').trim()).filter(Boolean);
  if (!list.length) return [];

  try {
    const res = await neteaseGet(useAxios, '/api/v3/song/detail', {
      c: JSON.stringify(list.map(id => ({ id }))),
      timestamp: Date.now(),
    });
    const body = res.body || res.data;
    const songs = Array.isArray(body?.songs) ? body.songs : [];
    if (songs.length > 0) {
      const v3Privileges = Array.isArray(body?.privileges) ? body.privileges : [];
      const v3PrivMap = new Map(v3Privileges.map(p => [String(p.id), p]));
      return songs.map(song => {
        const priv = v3PrivMap.get(String(song.id)) || {};
        return {
          ...song,
          privilege: { ...priv, ...(song.privilege || {}) },
          hr: song.hr || song.hrMusic || null,
          sq: song.sq || song.sqMusic || null,
          h: song.h || song.hMusic || null,
        };
      });
    }
  } catch (e) {
    // fallback to v1 endpoint
  }

  const res = await neteaseGet(useAxios, '/api/song/detail', {
    ids: `[${list.join(',')}]`,
    timestamp: Date.now(),
  });
  const body = res.body || res.data;
  const songs = Array.isArray(body?.songs) ? body.songs : [];
  return songs.map(song => ({
    ...song,
    hr: song.hr || song.hrMusic || null,
    sq: song.sq || song.sqMusic || null,
    h: song.h || song.hMusic || null,
  }));
};

const getSongLyric = async (useAxios, id) => {
  const songId = String(id || '').trim();
  if (!songId) return null;

  const res = await neteaseGet(useAxios, '/api/song/lyric', {
    id: songId,
    lv: -1,
    kv: -1,
    tv: -1,
    timestamp: Date.now(),
  });
  return res.body || res.data;
};

module.exports = {
  ok,
  fail,
  isNeteaseDomain,
  parsePlaylistId,
  resolveNeteaseShortUrl,
  getPlaylistDetail,
  getSongDetail,
  getSongLyric,
};
