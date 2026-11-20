import {
  FM_MEMORY_LIMITS,
  getFmMemorySnapshot,
  persistArtistSuppression,
  persistBrokenTracks,
  persistDislikedTracks,
  persistFmMeta,
  persistRecentTracks
} from './fmMemoryStore.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SOFT_SKIP_REASONS = new Set(['只是换一首', 'skip']);

export const MIN_FM_BATCH_SIZE = 8;
export const TARGET_FM_BATCH_SIZE = 10;
export const MAX_FM_FETCH_RETRIES = 2;

export const FM_TASTE_PROFILES = {
  familiar: {
    id: 'familiar',
    label: '口味推荐',
    subtitle: '懂你常听',
    apiMode: 'normal',
    poolId: 0,
    artistCooldown: 4,
    albumCooldown: 6,
    cooldownSize: 4,
    recentBlockDays: 14,
    recentDecayDays: 30,
    excludeKnownAssets: false,
    description: '贴近你的日常偏好，允许回味久未听过的私藏，严禁 14 天内循环'
  },
  fresh: {
    id: 'fresh',
    label: '新鲜发现',
    subtitle: '同味掘新',
    apiMode: 'small',
    poolId: 1,
    artistCooldown: 8,
    albumCooldown: 12,
    cooldownSize: 8,
    recentBlockDays: 30,
    recentDecayDays: 30,
    excludeKnownAssets: true,
    description: '保留相近曲风调性，严格过滤已收藏与近期听过，挖掘同味新歌'
  },
  explore: {
    id: 'explore',
    label: '深度探索',
    subtitle: '破圈漫游',
    apiMode: 'small',
    poolId: 2,
    artistCooldown: 15,
    albumCooldown: 20,
    cooldownSize: 15,
    recentBlockDays: 30,
    recentDecayDays: 30,
    excludeKnownAssets: true,
    suppressFrequentArtists: true,
    description: '脱敏老歌种子，接入小众宝藏与场景电台，强打散歌手与风格边界'
  }
};

// 常见繁简字符归一化映射（覆盖歌名高频字，零第三方原生依赖）
const TRAD_TO_SIMP_MAP = {
  '愛': '爱', '風': '风', '雲': '云', '夢': '梦', '淚': '泪', '戀': '恋', '聲': '声',
  '聽': '听', '說': '说', '誰': '谁', '這': '这', '那': '那', '裏': '里', '裡': '里',
  '為': '为', '無': '无', '與': '与', '來': '来', '去': '去', '歸': '归', '離': '离',
  '別': '别', '情': '情', '懷': '怀', '念': '念', '心': '心', '傷': '伤', '痛': '痛',
  '過': '过', '錯': '错', '對': '对', '問': '问', '答': '答', '寫': '写', '畫': '画',
  '詩': '诗', '歌': '歌', '曲': '曲', '唱': '唱', '樂': '乐', '舞': '舞', '飛': '飞',
  '鳥': '鸟', '魚': '鱼', '龍': '龙', '馬': '马', '華': '华', '國': '国', '時': '时',
  '光': '光', '影': '影', '歲': '岁', '年': '年', '月': '月', '日': '日', '夜': '夜',
  '星': '星', '辰': '辰', '海': '海', '浪': '浪', '花': '花', '葉': '叶', '草': '草',
  '樹': '树', '山': '山', '川': '川', '河': '河', '江': '江', '天': '天', '地': '地',
  '紅': '红', '藍': '蓝', '綠': '绿', '黃': '黄', '黑': '黑', '白': '白', '灰': '灰',
  '開': '开', '關': '关', '門': '门', '窗': '窗', '燈': '灯', '火': '火', '煙': '烟',
  '塵': '尘', '埃': '埃', '長': '长', '短': '短', '高': '高', '低': '低', '遠': '远',
  '近': '近', '新': '新', '舊': '旧', '真': '真', '假': '假', '美': '美', '麗': '丽',
  '難': '难', '易': '易', '輕': '轻', '重': '重', '冷': '冷', '暖': '暖', '熱': '热',
  '涼': '凉', '笑': '笑', '哭': '哭', '喜': '喜', '歡': '欢', '悲': '悲', '哀': '哀',
  '愁': '愁', '孤': '孤', '獨': '独', '寂': '寂', '寞': '寞', '甜': '甜', '苦': '苦',
  '酸': '酸', '辣': '辣', '鹹': '咸', '醉': '醉', '醒': '醒', '睡': '睡', '眠': '眠',
  '記': '记', '憶': '忆', '忘': '忘', '卻': '却', '終': '终', '點': '点', '線': '线',
  '面': '面', '邊': '边', '緣': '缘', '份': '份', '結': '结', '局': '局', '續': '续',
  '會': '会', '見': '见', '遇': '遇', '逢': '逢', '等': '等', '待': '待', '守': '守',
  '望': '望', '看': '看', '視': '视', '覺': '觉', '感': '感', '動': '动', '靜': '静',
  '變': '变', '換': '换', '轉': '转', '回': '回', '頭': '头', '眼': '眼', '手': '手',
  '腳': '脚', '身': '身', '體': '体', '靈': '灵', '魂': '魂', '神': '神', '仙': '仙',
  '魔': '魔', '鬼': '鬼', '妖': '妖', '精': '精', '城': '城', '市': '市', '鎮': '镇',
  '村': '村', '鄉': '乡', '路': '路', '街': '街', '道': '道', '橋': '桥', '車': '车',
  '船': '船', '機': '机', '電': '电', '話': '话', '語': '语', '言': '言', '字': '字',
  '書': '书', '信': '信', '紙': '纸', '筆': '笔', '墨': '墨', '純': '纯', '現': '现',
  '場': '场', '演': '演', '奏': '奏', '版': '版', '實': '实', '錄': '录', '音': '音',
  '東': '东', '西': '西', '南': '南', '北': '北', '萬': '万', '千': '千', '億': '亿',
  '雙': '双', '對': '对', '兩': '两', '個': '个', '們': '们', '妳': '你', '他': '他',
  '她': '她', '牠': '它', '麼': '么', '嗎': '吗', '呢': '呢', '吧': '吧', '啊': '啊',
  '當': '当', '從': '从', '向': '向', '給': '给', '讓': '让', '把': '把', '被': '被',
  '將': '将', '還': '还', '已': '已', '經': '经', '曾': '曾', '再': '再', '又': '又',
  '總': '总', '永': '永', '永遠': '永远', '還': '还', '錯': '错', '亂': '乱', '發': '发',
  '現': '现', '實': '实', '界': '界', '世': '世', '間': '间', '空': '空', '滿': '满'
};

const toSimpleHalfWidth = (str = '') => {
  return String(str)
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .split('')
    .map((ch) => TRAD_TO_SIMP_MAP[ch] || ch)
    .join('');
};

const VERSION_SUFFIX_PATTERN = /(?:\s*[-—_~|/·:]+\s*(?:(?:19|20)\d{2}\s*)?[^-—_~|/]*?(?:live|现场(?:版|录音)?|演唱会|音乐会|巡演|tour|remix|dj版?|伴奏|instrumental|karaoke|ktv|remaster(?:ed)?|翻唱|cover|纯音乐|demo|ver\.?|version|edit|acoustic|unplugged|合唱版|钢琴版|吉他版|加速版|变速|降调|升调|片段|试听|铃声).*|\s+(?:live|现场(?:版|录音)?|演唱会|音乐会|巡演|tour|remix|dj版?|伴奏|instrumental|karaoke|ktv|remaster(?:ed)?|翻唱|cover|纯音乐|demo|ver\.?|version|edit|acoustic|unplugged|合唱版|钢琴版|吉他版|加速版|变速|降调|升调|片段|试听|铃声).*)$/i;
const VERSION_NOISE_PATTERN = /(?:[\(\[【（]\s*(?:伴奏|消音|karaoke|ktv|instrumental|dj|remix|变速|加速|电音版|铃声|片段|纯伴奏)\s*[\)\]】）]|(?:\s*[-—_~|/·]+\s*|\s+)(?:伴奏|消音|karaoke|ktv|instrumental|dj版?|纯伴奏|铃声)\b)/i;

const normalizeText = (value) =>
  toSimpleHalfWidth(String(value || '').trim().toLowerCase())
    .replace(/[（(\[【《].*?[）)\]】》]/g, '')
    .replace(/\s+/g, '');

const normalizeCanonicalTitle = (value) => {
  const half = toSimpleHalfWidth(String(value || '').trim().toLowerCase());
  const noBrackets = half.replace(/[（(\[【].*?[）)\]】]/g, '');
  const noVersionSuffix = noBrackets.replace(VERSION_SUFFIX_PATTERN, '');
  return noVersionSuffix
    .replace(/[\s\-—_~|/·:,.，。!！?？'"“”‘’、]+/g, '')
    .trim() || normalizeText(value);
};

export const isVersionNoiseTrack = (song = {}) => {
  const rawTitle = String(song._title || song.name || song.SongName || song.songname || song.FileName || song.filename || song.title || '');
  return VERSION_NOISE_PATTERN.test(rawTitle);
};

const getFirstArtist = (song = {}) => {
  const artists = song._singers || song.artists || song.singer_list || song.singerinfo || song.Singers || [];
  if (Array.isArray(artists) && artists.length > 0) {
    const first = artists[0] || {};
    return first.name || first.singer_name || first.singername || first.author_name || '';
  }
  return song._singer || song.singer || song.SingerName || song.singername || song.author_name || song.author || '';
};

const getFirstArtistId = (song = {}) => {
  const artists = song._singers || song.artists || song.singer_list || song.singerinfo || song.Singers || [];
  if (Array.isArray(artists) && artists.length > 0) {
    const first = artists[0] || {};
    return String(first.id || first.singer_id || first.singerid || first.author_id || first.ID || '').trim();
  }
  return String(song._singer_id || song.singer_id || song.SingerId || song.singerid || song.author_id || '').trim();
};

const collectAllHashes = (song = {}) => {
  const rawCandidates = [
    song._hash,
    song.hash,
    song.FileHash,
    song.filehash,
    song.HQFileHash,
    song.SQFileHash,
    song.sqhash,
    song['320hash'],
    song._qualities?.standard,
    song._qualities?.hq,
    song._qualities?.sq,
    song._qualities?.high,
    song._qualities?.viper_clear,
    song._qualities?.viper_atmos,
    song.qualities?.standard,
    song.qualities?.hq,
    song.qualities?.sq,
    song.audio_info?.hash_128,
    song.audio_info?.hash_320,
    song.audio_info?.hash_flac
  ];
  const set = new Set();
  rawCandidates.forEach((h) => {
    const clean = String(h || '').trim().toUpperCase();
    if (clean && clean !== '0' && !clean.startsWith('MIX:')) {
      set.add(clean);
    }
  });
  return Array.from(set);
};

/**
 * 四级歌曲身份指纹提取 (L1 mixId -> L2 多音质 hash 集 -> L3 canonicalWorkKey -> looseKey)
 */
export const getSongIdentity = (song = {}) => {
  const mixRaw = String(song._album_audio_id || song.album_audio_id || song.MixSongID || song.mixsongid || song.audio_id || '').trim();
  const mixId = mixRaw && mixRaw !== '0' ? mixRaw : '';
  const hashes = collectAllHashes(song);
  const hash = hashes[0] || '';
  const title = song._title || song.name || song.SongName || song.songname || song.FileName || song.filename || song.title || song.Title || '';
  const artist = getFirstArtist(song);
  const titleKey = normalizeText(title);
  const artistKey = normalizeText(artist);
  const canonicalTitle = normalizeCanonicalTitle(title);
  const albumId = String(song._album_id || song.album_id || song.AlbumID || song.albumid || '').trim();
  const singerId = getFirstArtistId(song);
  const looseKey = titleKey && artistKey ? `song:${titleKey}:${artistKey}` : '';
  const canonicalWorkKey = canonicalTitle && artistKey ? `work:${canonicalTitle}:${artistKey}` : looseKey;
  const key = mixId ? `mix:${mixId}` : (hash ? `hash:${hash}` : (canonicalWorkKey || looseKey));

  return {
    key,
    mixId,
    hash,
    hashes,
    titleKey,
    artistKey,
    looseKey,
    canonicalWorkKey,
    albumId,
    singerId
  };
};

export const getArtistKey = (song) => {
  const id = getSongIdentity(song);
  if (id.singerId && id.singerId !== '0') return `id:${id.singerId}`;
  return id.artistKey ? `name:${id.artistKey}` : '';
};

export const getAlbumKey = (song) => {
  const id = getSongIdentity(song);
  return id.albumId && id.albumId !== '0' ? `album:${id.albumId}` : '';
};

const identityMatchesEntry = (id, entry, { matchCanonicalWork = true } = {}) => {
  if (!id || !entry) return false;
  if (id.key && entry.key && id.key === entry.key) return true;
  if (id.mixId && entry.mixId && id.mixId === entry.mixId) return true;
  if (id.hashes?.length > 0) {
    const entryHashes = Array.isArray(entry.hashes) && entry.hashes.length > 0
      ? entry.hashes
      : (entry.hash ? [String(entry.hash).toUpperCase()] : []);
    if (entryHashes.some((eh) => id.hashes.includes(String(eh).toUpperCase()))) return true;
  } else if (id.hash && entry.hash && id.hash === String(entry.hash).toUpperCase()) {
    return true;
  }
  if (id.looseKey && entry.looseKey && id.looseKey === entry.looseKey) return true;
  if (matchCanonicalWork && id.canonicalWorkKey && entry.canonicalWorkKey && id.canonicalWorkKey === entry.canonicalWorkKey) {
    return true;
  }
  return false;
};

const createFastLookupIndex = (entries = []) => {
  const keySet = new Set();
  const mixSet = new Set();
  const hashSet = new Set();
  const looseSet = new Set();
  const workMap = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (!entry) return;
    if (entry.key) keySet.add(entry.key);
    if (entry.mixId) mixSet.add(entry.mixId);
    if (entry.hash) hashSet.add(String(entry.hash).toUpperCase());
    if (Array.isArray(entry.hashes)) {
      entry.hashes.forEach((h) => h && hashSet.add(String(h).toUpperCase()));
    }
    if (entry.looseKey) looseSet.add(entry.looseKey);
    if (entry.canonicalWorkKey) {
      const existing = workMap.get(entry.canonicalWorkKey);
      if (!existing || Number(entry.updatedAt || 0) > Number(existing.updatedAt || 0)) {
        workMap.set(entry.canonicalWorkKey, entry);
      }
    }
  });

  return {
    addEntry(entry) {
      if (!entry) return;
      if (entry.key) keySet.add(entry.key);
      if (entry.mixId) mixSet.add(entry.mixId);
      if (entry.hash) hashSet.add(String(entry.hash).toUpperCase());
      if (Array.isArray(entry.hashes)) {
        entry.hashes.forEach((h) => h && hashSet.add(String(h).toUpperCase()));
      }
      if (entry.looseKey) looseSet.add(entry.looseKey);
      if (entry.canonicalWorkKey) workMap.set(entry.canonicalWorkKey, entry);
    },
    has(id, { maxAgeMs = null, matchCanonicalWork = true } = {}) {
      if (!id) return false;
      const now = Date.now();
      const hitExact = Boolean(
        (id.key && keySet.has(id.key)) ||
        (id.mixId && mixSet.has(id.mixId)) ||
        (id.hashes?.some((h) => hashSet.has(h))) ||
        (id.looseKey && looseSet.has(id.looseKey))
      );
      const workHit = matchCanonicalWork && id.canonicalWorkKey ? workMap.get(id.canonicalWorkKey) : null;
      if (!hitExact && !workHit) return false;
      if (maxAgeMs == null) return true;

      if (workHit && now - Number(workHit.updatedAt || 0) <= maxAgeMs) return true;
      // 兜底精确查找时间
      return entries.some(
        (e) =>
          now - Number(e.updatedAt || 0) <= maxAgeMs &&
          identityMatchesEntry(id, e, { matchCanonicalWork })
      );
    },
    isVariantDuplicate(id) {
      if (!id || !id.canonicalWorkKey) return false;
      const hitExact = Boolean(
        (id.key && keySet.has(id.key)) ||
        (id.mixId && mixSet.has(id.mixId)) ||
        (id.hashes?.some((h) => hashSet.has(h))) ||
        (id.looseKey && looseSet.has(id.looseKey))
      );
      if (hitExact) return false;
      return workMap.has(id.canonicalWorkKey);
    }
  };
};

export const makeMemoryEntry = (song, reason = '', extra = {}) => {
  const id = getSongIdentity(song);
  return {
    ...id,
    title: song?._title || song?.name || song?.SongName || '',
    artist: getFirstArtist(song),
    reason,
    updatedAt: Date.now(),
    ...extra
  };
};

const upsertEntry = (entries, nextEntry, limit) => {
  const withoutDuplicate = (Array.isArray(entries) ? entries : []).filter(
    (entry) => !identityMatchesEntry(nextEntry, entry, { matchCanonicalWork: false })
  );
  return [nextEntry, ...withoutDuplicate].slice(0, limit);
};

// 兼容旧版导出接口
export const loadFmMemory = () => {
  const snap = getFmMemorySnapshot();
  return {
    recent: snap.recent,
    dislike: snap.dislike,
    artists: snap.artists,
    broken: snap.broken,
    meta: snap.meta
  };
};

export const saveFmMemory = (memory) => {
  if (memory?.recent) persistRecentTracks(memory.recent);
  if (memory?.dislike) persistDislikedTracks(memory.dislike);
  if (memory?.artists) persistArtistSuppression(memory.artists);
  if (memory?.broken) persistBrokenTracks(memory.broken);
};

export const recordFmServed = (song, reason = 'served') => {
  const entry = makeMemoryEntry(song, reason);
  if (!entry.key) return loadFmMemory();
  const snap = getFmMemorySnapshot();
  persistRecentTracks(upsertEntry(snap.recent, entry, FM_MEMORY_LIMITS.RECENT_LIMIT));
  return loadFmMemory();
};

export const recordFmBrokenTrack = (song, reason = 'play_error') => {
  const entry = makeMemoryEntry(song, reason);
  if (!entry.key) return loadFmMemory();
  const snap = getFmMemorySnapshot();
  persistBrokenTracks(upsertEntry(snap.broken, entry, FM_MEMORY_LIMITS.BROKEN_LIMIT));
  return loadFmMemory();
};

export const recordFmArtistSuppression = (song, { blocked = false, reason = 'decay', penaltyDelta = 15 } = {}) => {
  const artistKey = getArtistKey(song);
  if (!artistKey) return loadFmMemory();
  const artistName = getFirstArtist(song);
  const snap = getFmMemorySnapshot();
  const existing = snap.artists.find((a) => a.artistKey === artistKey);
  const nextEntry = {
    artistKey,
    artistName: artistName || existing?.artistName || '未知歌手',
    blocked: Boolean(blocked || existing?.blocked),
    penaltyScore: blocked ? 100 : Math.min(80, (existing?.penaltyScore || 0) + penaltyDelta),
    reason: blocked ? reason : (existing?.reason || reason),
    updatedAt: Date.now()
  };
  const nextList = [nextEntry, ...snap.artists.filter((a) => a.artistKey !== artistKey)];
  persistArtistSuppression(nextList);
  return loadFmMemory();
};

export const recordFmDislike = (song, reason = '不喜欢') => {
  const entry = makeMemoryEntry(song, reason);
  if (!entry.key) return loadFmMemory();
  const snap = getFmMemorySnapshot();
  persistRecentTracks(upsertEntry(snap.recent, entry, FM_MEMORY_LIMITS.RECENT_LIMIT));
  if (!SOFT_SKIP_REASONS.has(reason)) {
    persistDislikedTracks(upsertEntry(snap.dislike, entry, FM_MEMORY_LIMITS.DISLIKE_LIMIT));
  }
  if (reason === '不想听这个歌手') {
    recordFmArtistSuppression(song, { blocked: true, reason });
  } else if (reason === '风格不对' || reason === '太吵' || reason === '太慢') {
    recordFmArtistSuppression(song, { blocked: false, reason, penaltyDelta: 20 });
  }
  return loadFmMemory();
};

export const recordPositiveAssetSeed = (song) => {
  const id = getSongIdentity(song);
  if (!id.key) return;
  persistFmMeta((meta) => {
    const hashUpper = (id.hash || '').toUpperCase();
    const knownKeys = Array.from(new Set([id.key, id.canonicalWorkKey, hashUpper, ...(meta.knownPlaylistKeys || [])].filter(Boolean))).slice(0, 3000);
    const seedEntry = {
      key: id.key,
      album_audio_id: id.mixId || '',
      hash: hashUpper,
      title: song?._title || song?.name || '',
      artist: getFirstArtist(song),
      singerId: id.singerId || '',
      updatedAt: Date.now()
    };
    const nextSeeds = [
      seedEntry,
      ...(meta.positiveSeeds || []).filter((s) => s.key !== id.key)
    ].slice(0, 200);
    return {
      ...meta,
      knownPlaylistKeys: knownKeys,
      positiveSeeds: nextSeeds
    };
  });
};

const buildCooldownSets = (songs = [], artistWindow = 0, albumWindow = 0) => {
  const artistTail = artistWindow > 0 ? songs.slice(Math.max(0, songs.length - artistWindow)) : [];
  const albumTail = albumWindow > 0 ? songs.slice(Math.max(0, songs.length - albumWindow)) : [];
  return {
    artists: new Set(artistTail.map(getArtistKey).filter(Boolean)),
    albums: new Set(albumTail.map(getAlbumKey).filter(Boolean))
  };
};

const buildKnownAssetsChecker = (knownAssets = {}) => {
  const hashSet = new Set();
  const keySet = new Set();
  const workSet = new Set();

  (knownAssets.likedHashes || []).forEach((h) => h && hashSet.add(String(h).toUpperCase()));
  (knownAssets.knownPlaylistKeys || []).forEach((k) => {
    if (!k) return;
    if (k.startsWith('work:')) workSet.add(k);
    else if (k.includes(':')) keySet.add(k);
    else hashSet.add(String(k).toUpperCase());
  });
  (knownAssets.localHistory || []).forEach((item) => {
    const id = getSongIdentity(item);
    id.hashes.forEach((h) => hashSet.add(h));
    if (id.key) keySet.add(id.key);
    if (id.canonicalWorkKey) workSet.add(id.canonicalWorkKey);
  });

  return {
    has(id) {
      if (!id) return false;
      if (id.key && keySet.has(id.key)) return true;
      if (id.hashes?.some((h) => hashSet.has(h))) return true;
      if (id.canonicalWorkKey && workSet.has(id.canonicalWorkKey)) return true;
      return false;
    }
  };
};

const getEffectiveCooldown = (profile, degradationLevel = 0) => {
  if (degradationLevel >= 3) {
    return { artist: 2, album: 2 };
  }
  if (degradationLevel === 2) {
    return {
      artist: Math.max(2, Math.floor(profile.artistCooldown / 2)),
      album: Math.max(2, Math.floor(profile.albumCooldown / 2))
    };
  }
  return {
    artist: profile.artistCooldown,
    album: profile.albumCooldown
  };
};

/**
 * 多因子精排评分
 */
const scoreSong = (song, tasteMode, context = {}) => {
  const profile = FM_TASTE_PROFILES[tasteMode] || FM_TASTE_PROFILES.familiar;
  const {
    currentQueue = [],
    isVipUser = false,
    recentIndex = null,
    artistSuppressionMap = new Map(),
    channelHealth = {},
    frequentArtists = new Set(),
    knownChecker = null
  } = context;

  const id = getSongIdentity(song);
  const artistKey = getArtistKey(song);
  const albumKey = getAlbumKey(song);
  const cooldown = buildCooldownSets(currentQueue, profile.artistCooldown, profile.albumCooldown);

  let score = 100 + Math.random() * (profile.id === 'explore' ? 16 : 8);

  // 来源通道基础加权
  const channel = song._fmMeta?.sourceChannel || '';
  if (profile.id === 'fresh') {
    if (channel === 'audio_related_new' || channel === 'follow_newsongs' || channel === 'top_song_new') score += 6;
    if (song._fmMeta?.noveltyTier === 'new') score += 5;
  } else if (profile.id === 'explore') {
    if (channel === 'top_card_niche' || channel === 'fm_class_radio' || channel === 'scene_radio') score += 8;
    if (channel === 'audio_related_all') score += 4;
  } else {
    if (channel === 'fm_personal_normal' || channel === 'top_card_personal') score += 5;
  }

  // 动态 VIP 权重（VIP 用户无罚分；非 VIP 用户重度降权减少试听阻断）
  if ((song._is_paid || song._is_vip) && !isVipUser) {
    score -= 18;
  }

  // 歌手隐式/高频压制
  const suppressedArtist = artistSuppressionMap.get(artistKey);
  if (suppressedArtist && !suppressedArtist.blocked) {
    score -= suppressedArtist.penaltyScore || 15;
  }
  if (profile.suppressFrequentArtists && frequentArtists.has(artistKey)) {
    score -= 22;
  }

  // 口味模式对 15~30 天内听过的歌施加明显降权
  if (profile.id === 'familiar' && recentIndex?.has(id, { maxAgeMs: 30 * DAY_MS })) {
    score -= 24;
  }
  // 口味模式对于已知老歌适度让位于近邻新发现
  if (profile.id === 'familiar' && knownChecker?.has(id)) {
    score -= 4;
  }

  // 通道健康分反馈
  const health = channelHealth[channel];
  if (health && Number.isFinite(health.scoreOffset)) {
    score += Math.max(-20, Math.min(12, health.scoreOffset));
  }

  // 冷却碰撞软降权
  if (cooldown.artists.has(artistKey)) score -= profile.id === 'familiar' ? 18 : 36;
  if (cooldown.albums.has(albumKey)) score -= profile.id === 'familiar' ? 12 : 24;

  return score;
};

export const rankFmSongs = (songs, tasteMode = 'familiar', context = {}) => {
  return songs
    .map((song) => ({ song, score: scoreSong(song, tasteMode, context) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.song);
};

/**
 * 分槽节奏编排 (Slot-Based Pacing)
 * 确保产出顺序符合各模式的听觉节奏与冷却约束
 */
const arrangeSlottedBatch = (scoredSongs, profile, currentQueue, degradationLevel) => {
  const { artist: artistWin, album: albumWin } = getEffectiveCooldown(profile, degradationLevel);
  const workingQueue = [...currentQueue];
  const remaining = [...scoredSongs];
  const arranged = [];

  const getSlotPreferredPredicate = (slotIdx) => {
    const pos = slotIdx % 5;
    if (profile.id === 'familiar') {
      // 3 首舒适主味 + 2 首近邻扩展
      if (pos < 3) {
        return (s) => ['fm_personal_normal', 'top_card_personal', 'top_card_nostalgia', 'everyday_recommend'].includes(s._fmMeta?.sourceChannel);
      }
      return (s) => ['ai_recommend', 'audio_related_all', 'everyday_style'].includes(s._fmMeta?.sourceChannel);
    }
    if (profile.id === 'fresh') {
      // 1 首近邻锚定 + 3 首全新同味 + 1 首近期新作
      if (pos === 0) return (s) => s._fmMeta?.noveltyTier === 'adjacent';
      if (pos === 4) return (s) => ['follow_newsongs', 'top_song_new', 'rank_fallback_new'].includes(s._fmMeta?.sourceChannel);
      return (s) => s._fmMeta?.noveltyTier === 'new' || s._fmMeta?.sourceChannel === 'fm_personal_fresh';
    }
    // explore: 强离散，尽量错开上一首的通道
    const prevChannel = arranged[arranged.length - 1]?._fmMeta?.sourceChannel;
    if (prevChannel) {
      return (s) => s._fmMeta?.sourceChannel !== prevChannel;
    }
    return () => true;
  };

  while (remaining.length > 0 && arranged.length < TARGET_FM_BATCH_SIZE) {
    const cooldown = buildCooldownSets(workingQueue, artistWin, albumWin);
    const preferredFn = getSlotPreferredPredicate(arranged.length);

    let pickIdx = remaining.findIndex((s) => {
      const a = getArtistKey(s);
      const al = getAlbumKey(s);
      return preferredFn(s) && !cooldown.artists.has(a) && !cooldown.albums.has(al);
    });

    if (pickIdx === -1) {
      pickIdx = remaining.findIndex((s) => {
        const a = getArtistKey(s);
        const al = getAlbumKey(s);
        return !cooldown.artists.has(a) && !cooldown.albums.has(al);
      });
    }

    // Level 2/3 允许轻微放宽专辑限制，优先保歌手不连续
    if (pickIdx === -1 && degradationLevel >= 2) {
      pickIdx = remaining.findIndex((s) => !cooldown.artists.has(getArtistKey(s)));
    }

    if (pickIdx === -1) {
      break;
    }

    const [chosen] = remaining.splice(pickIdx, 1);
    arranged.push(chosen);
    workingQueue.push(chosen);
  }

  return arranged;
};

/**
 * 候选集严格过滤、统计并分槽输出
 */
export const filterFreshSongs = (songs, options = {}) => {
  const {
    currentQueue = [],
    memory = loadFmMemory(),
    tasteMode = 'familiar',
    knownAssets = {},
    isVipUser = false,
    degradationLevel = 0,
    ignoreRecent = false // 仅向后兼容保留参数，常规严禁传入 true
  } = options;

  const profile = FM_TASTE_PROFILES[tasteMode] || FM_TASTE_PROFILES.familiar;
  const filterNoise = memory?.meta?.preferences?.filterVersionNoise !== false;
  const queueIndex = createFastLookupIndex(currentQueue.map((s) => makeMemoryEntry(s)));
  const acceptedEntries = [];
  const acceptedIndex = createFastLookupIndex([]);
  const recentIndex = createFastLookupIndex(memory.recent || []);
  const dislikeIndex = createFastLookupIndex(memory.dislike || []);
  const brokenIndex = createFastLookupIndex(memory.broken || []);
  const knownChecker = buildKnownAssetsChecker({
    ...knownAssets,
    knownPlaylistKeys: [
      ...(knownAssets.knownPlaylistKeys || []),
      ...(memory?.meta?.knownPlaylistKeys || [])
    ]
  });

  const artistSuppressionMap = new Map();
  (memory.artists || []).forEach((item) => {
    if (item?.artistKey) artistSuppressionMap.set(item.artistKey, item);
  });

  // 统计近期高频出现歌手（用于探索模式压制熟面孔）
  const artistFreq = new Map();
  (memory.recent || []).slice(0, 120).forEach((entry) => {
    const ak = entry.singerId && entry.singerId !== '0' ? `id:${entry.singerId}` : (entry.artistKey ? `name:${entry.artistKey}` : '');
    if (ak) artistFreq.set(ak, (artistFreq.get(ak) || 0) + 1);
  });
  const frequentArtists = new Set();
  artistFreq.forEach((cnt, ak) => {
    if (cnt >= 3) frequentArtists.add(ak);
  });

  const stats = {
    rawCount: songs.length,
    variantBlocked: 0,
    knownBlocked: 0,
    recentBlocked: 0,
    dislikedBlocked: 0
  };

  const recentBlockMs = profile.recentBlockDays * DAY_MS;
  const candidates = [];

  songs.forEach((song) => {
    const id = getSongIdentity(song);
    if (!id.key) return;
    if (queueIndex.has(id) || acceptedIndex.has(id)) return;
    if (brokenIndex.has(id)) return;

    // 黑名单全版本一票否决
    if (dislikeIndex.has(id)) {
      stats.dislikedBlocked++;
      return;
    }

    // 显式屏蔽歌手
    const artistKey = getArtistKey(song);
    if (artistSuppressionMap.get(artistKey)?.blocked) {
      stats.dislikedBlocked++;
      return;
    }

    // 版本噪音拦截（伴奏/KTV/DJ/铃声）
    if (filterNoise && isVersionNoiseTrack(song)) {
      stats.variantBlocked++;
      return;
    }

    // 发现/探索严格排除红心库、全站近期历史与已知歌单资产
    if (profile.excludeKnownAssets && knownChecker.has(id)) {
      stats.knownBlocked++;
      return;
    }

    // 近期已听强拦截（含变种穿透拦截）
    if (!ignoreRecent) {
      const effectiveBlockMs = profile.id === 'familiar' && degradationLevel >= 3
        ? 14 * DAY_MS
        : recentBlockMs;
      if (recentIndex.has(id, { maxAgeMs: effectiveBlockMs })) {
        if (recentIndex.isVariantDuplicate(id)) {
          stats.variantBlocked++;
        } else {
          stats.recentBlocked++;
        }
        return;
      }
    }

    candidates.push(song);
    const memEntry = makeMemoryEntry(song);
    acceptedEntries.push(memEntry);
    acceptedIndex.addEntry(memEntry);
  });

  const ranked = rankFmSongs(candidates, tasteMode, {
    currentQueue,
    isVipUser,
    recentIndex,
    artistSuppressionMap,
    channelHealth: memory?.meta?.channelHealth || {},
    frequentArtists,
    knownChecker
  });

  const arranged = arrangeSlottedBatch(ranked, profile, currentQueue, degradationLevel);
  arranged._filterStats = stats;
  return arranged;
};

export const getFreshnessHint = (tasteMode = 'familiar') => {
  if (tasteMode === 'explore') return '已排除收藏与近期记录 · 15 首歌手离散';
  if (tasteMode === 'fresh') return '已排除红心与 30 天已听 · 同味掘新';
  return '已避开近 14 天重复 · 顺耳舒适区';
};

export const getRecommendationReason = (tasteMode = 'familiar', song = null) => {
  const customReason = song?._fmMeta?.reasonText;
  if (customReason) return `推荐理由：${customReason}`;
  if (tasteMode === 'explore') return '推荐理由：跳出常听歌手圈层，从小众宝藏与场景电台为你发现全新旋律。';
  if (tasteMode === 'fresh') return '推荐理由：贴近你的偏好调性，已过滤红心与近期听过，优先呈献未听新曲。';
  return '推荐理由：贴合你的日常听歌口味，适度回味私藏并避开近 14 天重复。';
};
