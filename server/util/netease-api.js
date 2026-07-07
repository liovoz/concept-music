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

const parsePlaylistId = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const direct = raw.match(/^\d+$/);
  if (direct) return direct[0];

  try {
    const url = new URL(raw);
    const id = url.searchParams.get('id') || url.pathname.match(/playlist\/(\d+)/)?.[1];
    return id && /^\d+$/.test(id) ? id : '';
  } catch (e) {
    const matched = raw.match(/(?:playlist\?id=|playlist\/|id=)(\d+)/);
    return matched?.[1] || '';
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
  return res.body;
};

const getSongDetail = async (useAxios, ids = []) => {
  const list = ids.map(id => String(id || '').trim()).filter(Boolean);
  if (!list.length) return [];

  const res = await neteaseGet(useAxios, '/api/song/detail', {
    ids: `[${list.join(',')}]`,
    timestamp: Date.now(),
  });
  return Array.isArray(res.body?.songs) ? res.body.songs : [];
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
  return res.body;
};

module.exports = {
  ok,
  fail,
  parsePlaylistId,
  getPlaylistDetail,
  getSongDetail,
  getSongLyric,
};
