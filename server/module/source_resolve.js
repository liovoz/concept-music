const { resolveSources } = require('../util/lx-source-registry');
const { runSource, getSourceCapabilities } = require('../util/lx-source-runner');
const { probeAudioUrl, isHostBlacklisted } = require('../util/audio-url-guard');

const TOTAL_BUDGET_MS = 7000;
const RUN_SOURCE_TIMEOUT_MS = 3500;
const PROBE_TIMEOUT_MS = 2200;
const HEDGE_DELAY_MS = 450;
const HEDGE_PRIMARY_GRACE_MS = 150;
const PLATFORM_COOLDOWN_MS = 3 * 60 * 1000;
const MAX_PROBE_FAILURES_PER_SOURCE = 2;
const RESOLVE_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_RESOLVE_CACHE_SIZE = 200;

const HIGH_LATENCY_QUALITIES = new Set(['atmos', 'master', 'hires', 'flac24bit']);

const sourceCooldownMap = new Map();
const resolveResultCache = new Map();

const qualityMapWy = {
  viper_atmos: 'atmos',
  viper_clear: 'master',
  high: 'hires',
  sq: 'flac',
  hq: '320k',
  standard: '128k',
  best: 'hires',
};

const qualityMapTx = {
  viper_atmos: 'atmos',
  viper_clear: 'master',
  high: 'hires',
  sq: 'flac',
  hq: '320k',
  standard: '128k',
  best: 'flac',
};

const qTypeToConceptQuality = {
  atmos: 'viper_atmos',
  master: 'viper_clear',
  hires: 'high',
  flac24bit: 'high',
  '24bit': 'high',
  flac: 'sq',
  '320k': 'hq',
  '128k': 'standard',
};

const fallbackChainMap = {
  atmos: ['master', 'hires', 'flac24bit', '24bit', 'flac', '320k', '128k'],
  master: ['hires', 'flac24bit', '24bit', 'flac', '320k', '128k'],
  hires: ['flac24bit', '24bit', 'flac', '320k', '128k'],
  flac24bit: ['24bit', 'flac', '320k', '128k'],
  '24bit': ['flac', '320k', '128k'],
  flac: ['320k', '128k'],
  '320k': ['128k'],
  '128k': [],
};

const ok = (body) => ({ status: 200, body, cookie: [], headers: {} });
const fail = (status, msg, data = null) => ({ status, body: { code: status, msg, data }, cookie: [], headers: {} });
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getCachedResolution = (cacheKey) => {
  const entry = resolveResultCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    resolveResultCache.delete(cacheKey);
    return null;
  }
  try {
    const hostname = new URL(entry.payload.url).hostname;
    if (isHostBlacklisted(hostname)) {
      resolveResultCache.delete(cacheKey);
      return null;
    }
  } catch (_) {
    resolveResultCache.delete(cacheKey);
    return null;
  }
  // LRU 刷新
  resolveResultCache.delete(cacheKey);
  resolveResultCache.set(cacheKey, entry);
  return entry.payload;
};

const setCachedResolution = (keys, payload) => {
  const expiresAt = Date.now() + RESOLVE_CACHE_TTL_MS;
  for (const key of keys) {
    if (!key) continue;
    resolveResultCache.delete(key);
    resolveResultCache.set(key, { expiresAt, payload });
  }
  while (resolveResultCache.size > MAX_RESOLVE_CACHE_SIZE) {
    const oldestKey = resolveResultCache.keys().next().value;
    if (oldestKey === undefined) break;
    resolveResultCache.delete(oldestKey);
  }
};

const isPlatformAuthOrShutdownError = (err) => {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    msg.includes('已授权的客户端') ||
    msg.includes('仅支持当前已授权') ||
    msg.includes('未授权') ||
    msg.includes('停止服务') ||
    msg.includes('升级到最新版本') ||
    msg.includes('后端聚合接口返回403') ||
    msg.includes('获取服务器令牌失败')
  );
};

const isFatalSourceError = (err) => {
  if (!err) return false;
  const msg = String(err.message || '');
  const code = String(err.code || '');
  if (isPlatformAuthOrShutdownError(err)) return true;
  if (msg.includes('音源未注册播放解析能力') || msg.includes('音源未注册')) return true;
  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) return true;
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND')) return true;
  if (code === 'EHOSTUNREACH' || msg.includes('EHOSTUNREACH')) return true;
  if (msg.includes('Script execution timed out') || msg.includes('execution timed out')) return true;
  return false;
};

const getNeteaseId = (song = {}) => {
  return String(song.neteaseId || song.songId || song.id || song.hash || song._hash || '')
    .replace(/^netease:/, '')
    .trim();
};

const getQQId = (song = {}) => {
  return String(song.qqMid || song.songmid || song.mid || song.id || song.songId || song.hash || song._hash || '')
    .replace(/^qq:/, '')
    .trim();
};

const buildWyMusicInfo = (song = {}) => {
  const neteaseId = getNeteaseId(song);
  const artists = Array.isArray(song.artists) ? song.artists : Array.isArray(song._singers) ? song._singers : [];
  const singer = song.singer || artists.map(item => item.name).filter(Boolean).join('、') || '';

  return {
    id: neteaseId,
    songId: neteaseId,
    songmid: neteaseId,
    hash: neteaseId,
    rid: neteaseId,
    mid: neteaseId,
    name: song.name || song._title || '',
    singer,
    singerId: song.singer_id || artists[0]?.id || '',
    album: song.album || song._album || '',
    albumName: song.album || song._album || '',
    albumId: song.album_id || '',
    interval: song.duration || song.interval || 0,
    duration: song.duration || song.interval || 0,
    pic: song.cover || song._cover || '',
    meta: {
      source: 'wy',
      songid: neteaseId,
      id: neteaseId,
    },
  };
};

const buildTxMusicInfo = (song = {}) => {
  const qqId = getQQId(song);
  const artists = Array.isArray(song.artists) ? song.artists : Array.isArray(song._singers) ? song._singers : [];
  const singer = song.singer || artists.map(item => item.name).filter(Boolean).join('、') || '';

  return {
    id: qqId,
    songId: qqId,
    songmid: qqId,
    mid: qqId,
    strMediaMid: song.strMediaMid || song.file?.media_mid || qqId,
    hash: qqId,
    rid: qqId,
    name: song.name || song._title || '',
    singer,
    singerId: song.singer_id || artists[0]?.id || '',
    album: song.album || song._album || '',
    albumName: song.album || song._album || '',
    albumId: song.album_id || '',
    interval: song.duration || song.interval || 0,
    duration: song.duration || song.interval || 0,
    pic: song.cover || song._cover || '',
    meta: {
      source: 'tx',
      songid: qqId,
      id: qqId,
    },
  };
};

const filterQualitiesByCapabilities = (candidates, source, platform) => {
  const caps = getSourceCapabilities(source)?.[platform]?.qualitys;
  if (!Array.isArray(caps) || caps.length === 0) return candidates;
  const supported = new Set(caps.map(item => String(item).toLowerCase()));
  const filtered = candidates.filter(q => supported.has(String(q).toLowerCase()));
  return filtered.length > 0 ? filtered : candidates;
};

const pickHedgeQuality = (prunedQualities) => {
  if (!Array.isArray(prunedQualities) || prunedQualities.length < 2) return null;
  if (!HIGH_LATENCY_QUALITIES.has(prunedQualities[0])) return null;
  const rest = prunedQualities.slice(1);
  if (rest.includes('flac')) return 'flac';
  if (rest.includes('320k')) return '320k';
  return null;
};

module.exports = async (params) => {
  const body = params?.body && typeof params.body === 'object' ? params.body : {};
  const song = body.song || params?.song || {};

  const isQQ = body.platform === 'tx'
    || body.subDir === 'QQ'
    || song.source === 'qq-import'
    || String(song.hash || song._hash || '').startsWith('qq:')
    || Boolean(song.qqMid);

  const subDir = isQQ ? 'QQ' : (body.subDir || 'Netease');
  const platform = isQQ ? 'tx' : 'wy';
  const songId = isQQ ? getQQId(song) : getNeteaseId(song);

  if (!songId) {
    return fail(400, isQQ ? '缺少企鹅歌曲 mid/ID' : '缺少网易云歌曲 ID');
  }

  const quality = body.quality || params?.quality || 'standard';
  const qualityMap = isQQ ? qualityMapTx : qualityMapWy;
  const targetQualityType = qualityMap[quality] || qualityMap.standard;

  const requestedSourceIds = body.sources || params?.sources;
  const allSources = resolveSources(requestedSourceIds, subDir);
  if (!allSources.length) {
    return fail(404, `未在 music_source${subDir ? '\\' + subDir : ''} 中找到本地音源文件`);
  }

  const excludeSources = new Set(
    (Array.isArray(body.excludeSources) ? body.excludeSources : []).map(item => String(item).trim()).filter(Boolean)
  );
  const failedUrls = new Set(
    (Array.isArray(body.excludeUrls) ? body.excludeUrls : []).map(item => String(item).trim()).filter(Boolean)
  );
  const bypassCache = Boolean(body.bypassCache || excludeSources.size > 0 || failedUrls.size > 0 || requestedSourceIds);

  const primaryCacheKey = `${platform}:${songId}:${targetQualityType}`;
  if (!bypassCache) {
    const cached = getCachedResolution(primaryCacheKey);
    if (cached) {
      return ok({ ...cached, requestedQuality: quality, cached: true });
    }
  }

  let candidateSources = excludeSources.size > 0
    ? allSources.filter(s => !excludeSources.has(s.id) && !excludeSources.has(s.file) && !excludeSources.has(s.name))
    : allSources;

  if (!candidateSources.length) {
    candidateSources = allSources;
  }

  const now = Date.now();
  const hasExplicitSourceOrder = Array.isArray(requestedSourceIds) && requestedSourceIds.length > 0;
  if (!hasExplicitSourceOrder && candidateSources.length > 1) {
    const healthy = [];
    const cooled = [];
    for (const src of candidateSources) {
      const cdKey = `${src.id}:${platform}`;
      const cd = sourceCooldownMap.get(cdKey);
      if (cd && cd.until > now) {
        cooled.push(src);
      } else {
        if (cd) sourceCooldownMap.delete(cdKey);
        healthy.push(src);
      }
    }
    candidateSources = healthy.length > 0 ? healthy : [...healthy, ...cooled];
  }

  const musicInfo = isQQ ? buildTxMusicInfo(song) : buildWyMusicInfo(song);
  const qualityCandidates = [targetQualityType, ...(fallbackChainMap[targetQualityType] || [])];
  const uniqueQualityCandidates = [...new Set(qualityCandidates.filter(Boolean))];

  const startedAt = Date.now();
  const errors = [];

  const attemptQuality = async (source, qType) => {
    const remainingMs = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remainingMs < 700) {
      const msg = '超过总解析时间预算';
      errors.push({ source: source.name, quality: qType, message: msg });
      return { ok: false, budgetExceeded: true, errorMessage: msg };
    }

    try {
      const payload = {
        action: 'musicUrl',
        source: platform,
        info: { type: qType, musicInfo },
      };
      const runTimeout = Math.min(RUN_SOURCE_TIMEOUT_MS, remainingMs);
      const result = await runSource(source, payload, runTimeout);
      if (!result?.url) {
        return { ok: false, errorMessage: '音源未返回有效链接' };
      }

      if (failedUrls.has(result.url)) {
        const msg = '跳过已知失效音频链接';
        errors.push({ source: source.name, quality: qType, message: msg });
        return { ok: false, duplicateDeadUrl: true, errorMessage: msg };
      }

      const probeBudget = TOTAL_BUDGET_MS - (Date.now() - startedAt);
      const probeTimeout = Math.min(PROBE_TIMEOUT_MS, Math.max(800, probeBudget));
      try {
        await probeAudioUrl(result.url, { timeoutMs: probeTimeout });
      } catch (probeErr) {
        failedUrls.add(result.url);
        const msg = `音频流探活失败: ${probeErr?.message || '不可用'}`;
        errors.push({ source: source.name, quality: qType, message: msg });
        return { ok: false, probeFailed: true, errorMessage: msg };
      }

      const resolvedQualityKey = qTypeToConceptQuality[qType] || 'standard';
      const bodyPayload = {
        code: 200,
        url: result.url,
        quality: resolvedQualityKey,
        requestedQuality: quality,
        resolvedQuality: qType,
        source: {
          id: source.id,
          name: source.name,
          subDir: source.subDir || '',
        },
      };
      return { ok: true, qType, bodyPayload };
    } catch (e) {
      const errMsg = e?.message || '解析失败';
      errors.push({ source: source.name, quality: qType, message: errMsg });
      return {
        ok: false,
        platformAuthError: isPlatformAuthOrShutdownError(e),
        fatal: isFatalSourceError(e) || errMsg.includes('音源解析超时') || errMsg.includes('Request timeout'),
        errorMessage: errMsg,
      };
    }
  };

  const commitSuccess = (source, resObj) => {
    sourceCooldownMap.delete(`${source.id}:${platform}`);
    if (!requestedSourceIds) {
      setCachedResolution(
        [primaryCacheKey, `${platform}:${songId}:${resObj.qType}`],
        resObj.bodyPayload
      );
    }
    return ok(resObj.bodyPayload);
  };

  for (const source of candidateSources) {
    let sourceFailed = false;
    let probeFailures = 0;
    const cooldownKey = `${source.id}:${platform}`;
    const prunedQualities = filterQualitiesByCapabilities(uniqueQualityCandidates, source, platform);
    const triedQualities = new Set();

    const handleFailure = (resObj) => {
      if (resObj.platformAuthError) {
        sourceCooldownMap.set(cooldownKey, {
          until: Date.now() + PLATFORM_COOLDOWN_MS,
          reason: resObj.errorMessage,
        });
      }
      if (resObj.probeFailed) {
        probeFailures += 1;
        if (probeFailures >= MAX_PROBE_FAILURES_PER_SOURCE) {
          sourceFailed = true;
        }
      }
      if (resObj.fatal) {
        sourceFailed = true;
      }
    };

    // 选项 A：当首选高音质在 450ms 内未返回时，并发发起 flac/320k 阶梯竞速，兼顾音质与极速起播
    const hedgeQ = pickHedgeQuality(prunedQualities);
    if (hedgeQ && TOTAL_BUDGET_MS - (Date.now() - startedAt) > 1500) {
      const primaryQ = prunedQualities[0];
      triedQualities.add(primaryQ);

      const primaryPromise = attemptQuality(source, primaryQ).then(r => ({ who: 'primary', res: r }));
      const earlyWinner = await Promise.race([
        primaryPromise,
        delay(HEDGE_DELAY_MS).then(() => null),
      ]);

      if (earlyWinner) {
        if (earlyWinner.res.ok) {
          return commitSuccess(source, earlyWinner.res);
        }
        handleFailure(earlyWinner.res);
      } else if (!sourceFailed && TOTAL_BUDGET_MS - (Date.now() - startedAt) > 900) {
        triedQualities.add(hedgeQ);
        const hedgePromise = attemptQuality(source, hedgeQ).then(r => ({ who: 'hedge', res: r }));
        const firstDone = await Promise.race([primaryPromise, hedgePromise]);

        if (firstDone.who === 'primary') {
          if (firstDone.res.ok) {
            return commitSuccess(source, firstDone.res);
          }
          handleFailure(firstDone.res);
          const secondDone = await hedgePromise;
          if (secondDone.res.ok) {
            return commitSuccess(source, secondDone.res);
          }
          handleFailure(secondDone.res);
        } else {
          // 兜底档位先到达：给主档位 150ms 宽限窗口；若主档位紧接着返回成功则优先采用高音质
          if (firstDone.res.ok) {
            const graceWinner = await Promise.race([
              primaryPromise,
              delay(HEDGE_PRIMARY_GRACE_MS).then(() => null),
            ]);
            if (graceWinner?.res?.ok) {
              return commitSuccess(source, graceWinner.res);
            }
            return commitSuccess(source, firstDone.res);
          }
          handleFailure(firstDone.res);
          const primaryFinal = await primaryPromise;
          if (primaryFinal.res.ok) {
            return commitSuccess(source, primaryFinal.res);
          }
          handleFailure(primaryFinal.res);
        }
      } else {
        const primaryFinal = await primaryPromise;
        if (primaryFinal.res.ok) {
          return commitSuccess(source, primaryFinal.res);
        }
        handleFailure(primaryFinal.res);
      }
    }

    for (const qType of prunedQualities) {
      if (sourceFailed) break;
      if (triedQualities.has(qType)) continue;
      if (TOTAL_BUDGET_MS - (Date.now() - startedAt) < 700) break;

      const attempt = await attemptQuality(source, qType);
      if (attempt.ok) {
        return commitSuccess(source, attempt);
      }
      handleFailure(attempt);
      if (attempt.budgetExceeded) break;
    }

    if (TOTAL_BUDGET_MS - (Date.now() - startedAt) < 700) {
      break;
    }
  }

  return fail(502, `${isQQ ? '企鹅' : '网易云'}音源(${subDir || '根目录'})解析失败`, { errors });
};
