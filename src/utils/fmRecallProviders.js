import request from './request.js';
import { normalizeSongs } from './songHelper.js';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';
const CHANNEL_TIMEOUT_MS = 4500;
const CHANNEL_BREAK_DURATION_MS = 10 * 60 * 1000;
const MAX_FAIL_STREAK = 2;

const NEW_SONG_RANK_IDS = [31308, 31310, 31311, 31312, 8888, 6666];
const TOP_SONG_TYPES = [21608];

let cachedFmClassIds = [];
let cachedSceneEntries = [];

export const extractSongsFromPayload = (res) => {
  const songMap = new Map();
  const seenObjs = new WeakSet();
  const getHash = (item) =>
    item.FileHash ||
    item.hash ||
    item.filehash ||
    item.SQFileHash ||
    item.HQFileHash ||
    item.sqhash ||
    item['320hash'] ||
    (item.audio_info && (item.audio_info.hash_128 || item.audio_info.hash_320 || item.audio_info.hash)) ||
    '';
  const getSongId = (item) => item.MixSongID || item.mixsongid || item.album_audio_id || item.audio_id || '';
  const getName = (item) => item.SongName || item.songname || item.name || item.FileName || item.filename || item.title || item.Title;
  const isRealSong = (item) => !!(item && typeof item === 'object' && (getHash(item) || getSongId(item)) && getName(item));

  const traverse = (data, depth) => {
    if (depth > 8 || !data || typeof data !== 'object') return;
    if (seenObjs.has(data)) return;
    seenObjs.add(data);

    if (Array.isArray(data)) {
      data.forEach((item) => {
        if (isRealSong(item)) {
          const h = String(getSongId(item) || getHash(item));
          if (!songMap.has(h)) songMap.set(h, item);
        } else {
          traverse(item, depth + 1);
        }
      });
      return;
    }
    Object.values(data).forEach((val) => traverse(val, depth + 1));
  };

  traverse(res, 0);
  return Array.from(songMap.values());
};

const safeGet = (url, params = {}) => {
  return request.get(url, {
    params: { ...params, timestamp: Date.now() },
    timeout: CHANNEL_TIMEOUT_MS,
    silent: true
  });
};

const extractFmClassIds = (res) => {
  const ids = [];
  const seen = new WeakSet();
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
      return;
    }
    const fmid = node.fmid || node.fm_id || node.id;
    const fmtype = node.fmtype ?? node.fm_type ?? 2;
    if (fmid && (node.fmname || node.name || node.title)) {
      ids.push({
        fmid: String(fmid),
        fmtype: Number(fmtype) || 2,
        name: String(node.fmname || node.name || node.title)
      });
    }
    Object.values(node).forEach((val) => walk(val, depth + 1));
  };
  walk(res);
  return ids;
};

const extractSceneEntries = (res) => {
  const list = [];
  const seen = new WeakSet();
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
      return;
    }
    const id = node.scene_id || node.id;
    if (id && (node.scene_name || node.name || node.title)) {
      list.push({
        id: String(id),
        module_id: node.module_id || '',
        tag: node.tag || '',
        name: String(node.scene_name || node.name || node.title)
      });
    }
    Object.values(node).forEach((val) => walk(val, depth + 1));
  };
  walk(res);
  return list;
};

const isChannelBroken = (healthMap = {}, channelId) => {
  const h = healthMap?.[channelId];
  if (!h || !h.brokenUntil) return false;
  return Date.now() < h.brokenUntil;
};

const normalizeWithMeta = (rawSongs, meta) => {
  const normalized = normalizeSongs(rawSongs, DEFAULT_COVER).filter((song) => song && song._hash);
  return normalized.map((song) => ({
    ...song,
    _fmMeta: {
      ...meta,
      fetchedAt: Date.now()
    }
  }));
};

const pickSeedLabel = (seed) => {
  if (!seed) return '';
  if (seed.title && seed.artist) return `《${seed.title}》`;
  return seed.title || seed.artist || '';
};

const CHANNEL_ADAPTERS = {
  fm_personal_normal: async ({ anchorSong, remainCount }) => {
    const params = {
      mode: 'normal',
      action: 'play',
      song_pool_id: 0
    };
    if (anchorSong?._hash) params.hash = anchorSong._hash;
    if (anchorSong?.album_audio_id) params.songid = anchorSong.album_audio_id;
    if (Number.isFinite(remainCount)) params.remain_songcnt = remainCount;
    const res = await safeGet('/personal/fm', params);
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'fm_personal_normal',
      channelLabel: '口味主池',
      noveltyTier: 'comfort',
      reasonText: '贴近你的常听风格与个人听歌画像，已避开近 14 天重复。'
    });
  },

  fm_personal_fresh: async ({ seed, remainCount }) => {
    const params = {
      mode: 'small',
      action: 'play',
      song_pool_id: 1
    };
    if (seed?.hash) params.hash = seed.hash;
    if (seed?.album_audio_id) params.songid = seed.album_audio_id;
    if (Number.isFinite(remainCount)) params.remain_songcnt = remainCount;
    const res = await safeGet('/personal/fm', params);
    const seedTitle = pickSeedLabel(seed);
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'fm_personal_fresh',
      channelLabel: '轻探索电台',
      seedRef: seedTitle,
      noveltyTier: 'new',
      reasonText: seedTitle
        ? `顺着你喜欢过的 ${seedTitle} 延伸出的相近氛围未听新曲。`
        : '保留你熟悉的曲风调性，优先挑选近期未听过的新鲜单曲。'
    });
  },

  // 深度探索刻意脱敏：不传老歌 hash/songid，避免协同过滤锚定回熟歌圈
  fm_personal_explore: async ({ remainCount }) => {
    const params = {
      mode: 'small',
      action: 'play',
      song_pool_id: 2
    };
    if (Number.isFinite(remainCount)) params.remain_songcnt = remainCount;
    const res = await safeGet('/personal/fm', params);
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'fm_personal_explore',
      channelLabel: '远缘探索池',
      noveltyTier: 'explore',
      reasonText: '已脱敏常规老歌锚点，扩大推荐半径发掘跨界与长尾好歌。'
    });
  },

  top_card_personal: async () => {
    const res = await safeGet('/top/card', { card_id: 1 });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'top_card_personal',
      channelLabel: '私人专属好歌',
      noveltyTier: 'comfort',
      reasonText: '精选好歌随心听 · 匹配你日常高频偏好的顺耳佳作。'
    });
  },

  top_card_nostalgia: async () => {
    const res = await safeGet('/top/card', { card_id: 2 });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'top_card_nostalgia',
      channelLabel: '经典怀旧',
      noveltyTier: 'comfort',
      reasonText: '久违的经典旋律回味（已确保近 14 天未重复出现）。'
    });
  },

  top_card_niche: async () => {
    const res = await safeGet('/top/card', { card_id: 4 });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'top_card_niche',
      channelLabel: '小众宝藏佳作',
      noveltyTier: 'explore',
      reasonText: '来自小众宝藏推荐池 · 帮你跳出千篇一律的热门歌单。'
    });
  },

  ai_recommend: async ({ seeds = [] }) => {
    const ids = seeds.map((s) => s.album_audio_id).filter(Boolean).slice(0, 3);
    if (ids.length === 0) return [];
    const res = await safeGet('/ai/recommend', { album_audio_id: ids.join(',') });
    const seedTitle = pickSeedLabel(seeds[0]);
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'ai_recommend',
      channelLabel: 'AI 相似延伸',
      seedRef: seedTitle,
      noveltyTier: 'adjacent',
      reasonText: seedTitle
        ? `基于 ${seedTitle} 等近期喜爱曲目的 AI 声学与编曲相似扩展。`
        : '基于你偏好曲目的 AI 相似延伸推荐。'
    });
  },

  everyday_recommend: async () => {
    const res = await safeGet('/everyday/recommend', {});
    const raw = Array.isArray(res?.data?.song_list) ? res.data.song_list : extractSongsFromPayload(res);
    return normalizeWithMeta(raw, {
      sourceChannel: 'everyday_recommend',
      channelLabel: '每日推荐池',
      noveltyTier: 'comfort',
      reasonText: '同步今日个性化日推精选，保持高匹配听感。'
    });
  },

  everyday_style: async () => {
    const res = await safeGet('/everyday/style/recommend', {});
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'everyday_style',
      channelLabel: '同风格日推',
      noveltyTier: 'new',
      reasonText: '匹配你的常听流派标签，甄选尚未收录的新鲜好歌。'
    });
  },

  audio_related_new: async ({ seed, cursor = 1 }) => {
    const mixId = seed?.album_audio_id;
    if (!mixId) return [];
    const page = Math.max(1, ((Number(cursor) - 1) % 6) + 1);
    const res = await safeGet('/audio/related', {
      album_audio_id: mixId,
      sort: 'new',
      page,
      pagesize: 25
    });
    const seedTitle = pickSeedLabel(seed);
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'audio_related_new',
      channelLabel: '相似新作扩散',
      seedRef: seedTitle,
      noveltyTier: 'new',
      reasonText: seedTitle
        ? `与你收藏过的 ${seedTitle} 调性相近，按最新上线优先挖掘。`
        : '由你喜爱的曲目扩散出的相近风格新作。'
    });
  },

  audio_related_all: async ({ seed, cursor = 1, tier = 'adjacent' }) => {
    const mixId = seed?.album_audio_id;
    if (!mixId) return [];
    const page = Math.max(1, ((Number(cursor) - 1) % 8) + 1);
    const res = await safeGet('/audio/related', {
      album_audio_id: mixId,
      sort: 'all',
      page,
      pagesize: 25
    });
    const seedTitle = pickSeedLabel(seed);
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'audio_related_all',
      channelLabel: tier === 'explore' ? '二跳陌生扩散' : '近邻精选扩散',
      seedRef: seedTitle,
      noveltyTier: tier,
      reasonText: seedTitle
        ? (tier === 'explore'
            ? `以刚发现的新歌 ${seedTitle} 作为二跳锚点，持续向外漫游。`
            : `根据你常听的 ${seedTitle} 推荐的顺耳近邻曲目。`)
        : '高匹配相似单曲扩展推荐。'
    });
  },

  follow_newsongs: async ({ cursor = 1 }) => {
    const res = await safeGet('/artist/follow/newsongs', {
      pagesize: 25,
      opt_sort: cursor % 2 === 0 ? 2 : 1
    });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'follow_newsongs',
      channelLabel: '关注歌手新作',
      noveltyTier: 'new',
      reasonText: '来自你关注歌手的近期新作，第一时间尝鲜。'
    });
  },

  top_song_new: async ({ cursor = 1 }) => {
    const type = TOP_SONG_TYPES[(cursor - 1) % TOP_SONG_TYPES.length];
    const page = Math.max(1, ((Number(cursor) - 1) % 5) + 1);
    const res = await safeGet('/top/song', { type, page, pagesize: 30 });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'top_song_new',
      channelLabel: '新歌速递',
      noveltyTier: 'new',
      reasonText: '精选近期新歌速递，避免反复听同一批老面孔。'
    });
  },

  rank_fallback_new: async ({ cursor = 1 }) => {
    const rankid = NEW_SONG_RANK_IDS[(cursor - 1) % NEW_SONG_RANK_IDS.length];
    const page = Math.max(1, (Math.floor((Number(cursor) - 1) / NEW_SONG_RANK_IDS.length) % 4) + 1);
    const res = await safeGet('/rank/audio', { rankid, page, pagesize: 30 });
    const raw = Array.isArray(res?.data?.songlist) ? res.data.songlist : extractSongsFromPayload(res);
    return normalizeWithMeta(raw, {
      sourceChannel: 'rank_fallback_new',
      channelLabel: '多语种新歌榜',
      noveltyTier: 'new',
      reasonText: '扩展自新歌热榜池，为你补充更多新鲜未听旋律。'
    });
  },

  fm_class_radio: async ({ cursor = 1 }) => {
    if (cachedFmClassIds.length === 0) {
      const classRes = await safeGet('/fm/class', {});
      cachedFmClassIds = extractFmClassIds(classRes);
    }
    if (cachedFmClassIds.length === 0) return [];
    const picked = cachedFmClassIds[(cursor - 1) % cachedFmClassIds.length];
    const res = await safeGet('/fm/songs', {
      fmid: picked.fmid,
      fmtype: picked.fmtype,
      offset: (cursor - 1) * 15,
      size: 20
    });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'fm_class_radio',
      channelLabel: `风格电台 · ${picked.name}`,
      noveltyTier: 'explore',
      reasonText: `轮换至「${picked.name}」电台波段，带你体验不同曲风质感。`
    });
  },

  scene_radio: async ({ cursor = 1 }) => {
    if (cachedSceneEntries.length === 0) {
      const listRes = await safeGet('/scene/lists', {});
      cachedSceneEntries = extractSceneEntries(listRes);
    }
    if (cachedSceneEntries.length === 0) return [];
    const picked = cachedSceneEntries[(cursor - 1) % cachedSceneEntries.length];
    const page = Math.max(1, (Math.floor((cursor - 1) / cachedSceneEntries.length) % 4) + 1);
    const res = await safeGet('/scene/audio/list', {
      id: picked.id,
      module_id: picked.module_id,
      tag: picked.tag,
      page,
      pagesize: 20
    });
    return normalizeWithMeta(extractSongsFromPayload(res), {
      sourceChannel: 'scene_radio',
      channelLabel: `场景漫游 · ${picked.name}`,
      noveltyTier: 'explore',
      reasonText: `来自「${picked.name}」场景漫游频道，打破常规歌手束缚。`
    });
  }
};

export const MODE_CHANNEL_PLANS = {
  familiar: {
    primary: ['fm_personal_normal', 'top_card_personal', 'ai_recommend', 'everyday_recommend'],
    secondary: ['top_card_nostalgia', 'audio_related_all', 'everyday_style'],
    fallback: ['rank_fallback_new']
  },
  fresh: {
    primary: ['audio_related_new', 'follow_newsongs', 'fm_personal_fresh', 'everyday_style'],
    secondary: ['top_song_new', 'ai_recommend', 'rank_fallback_new'],
    fallback: ['top_card_niche', 'scene_radio']
  },
  explore: {
    primary: ['top_card_niche', 'fm_class_radio', 'scene_radio', 'fm_personal_explore'],
    secondary: ['audio_related_all', 'rank_fallback_new', 'top_song_new'],
    fallback: ['everyday_style']
  }
};

/**
 * 并发调度多路召回通道
 */
export const fetchModeRecallBatch = async ({
  modeId = 'familiar',
  degradationLevel = 0,
  seeds = [],
  exploreJumpSeed = null,
  anchorSong = null,
  remainCount = 0,
  channelCursors = {},
  channelHealth = {}
}) => {
  const plan = MODE_CHANNEL_PLANS[modeId] || MODE_CHANNEL_PLANS.familiar;
  let targetChannels = [...plan.primary];

  if (degradationLevel === 1) {
    targetChannels = [...plan.secondary, plan.primary[0]];
  } else if (degradationLevel === 2) {
    targetChannels = [...plan.primary, ...plan.secondary];
  } else if (degradationLevel >= 3) {
    targetChannels = [...plan.secondary, ...plan.fallback];
  }

  // 过滤熔断通道；若全熔断则兜底放开主通道
  let activeChannels = targetChannels.filter((id) => !isChannelBroken(channelHealth, id));
  if (activeChannels.length === 0) {
    activeChannels = [...plan.primary];
  }

  const nextCursors = { ...channelCursors };
  const nextHealth = { ...channelHealth };
  const primarySeed = seeds[0] || null;
  const secondarySeed = seeds[1] || seeds[0] || null;

  const tasks = activeChannels.map(async (channelId, idx) => {
    const adapter = CHANNEL_ADAPTERS[channelId];
    if (!adapter) return { channelId, songs: [], ok: false };

    const curPage = Math.max(1, Number(nextCursors[channelId] || 1));
    nextCursors[channelId] = curPage + 1;

    const pickedSeed = channelId === 'audio_related_all' && modeId === 'explore'
      ? (exploreJumpSeed || secondarySeed)
      : (idx % 2 === 0 ? primarySeed : secondarySeed);

    try {
      const songs = await adapter({
        seed: pickedSeed,
        seeds,
        anchorSong,
        remainCount,
        cursor: curPage,
        tier: modeId === 'explore' ? 'explore' : 'adjacent'
      });
      const prevHealth = nextHealth[channelId] || {};
      nextHealth[channelId] = {
        ...prevHealth,
        failStreak: 0,
        brokenUntil: 0,
        lastOkAt: Date.now()
      };
      return { channelId, songs, ok: true };
    } catch (err) {
      const prevHealth = nextHealth[channelId] || {};
      const failStreak = Number(prevHealth.failStreak || 0) + 1;
      nextHealth[channelId] = {
        ...prevHealth,
        failStreak,
        brokenUntil: failStreak >= MAX_FAIL_STREAK ? Date.now() + CHANNEL_BREAK_DURATION_MS : 0
      };
      return { channelId, songs: [], ok: false };
    }
  });

  const settled = await Promise.all(tasks);
  const allSongs = [];
  let successChannels = 0;
  settled.forEach((res) => {
    if (res.ok) successChannels++;
    if (Array.isArray(res.songs) && res.songs.length > 0) {
      allSongs.push(...res.songs);
    }
  });

  return {
    songs: allSongs,
    nextCursors,
    nextHealth,
    successChannels,
    totalChannels: activeChannels.length
  };
};
