const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');

const DEFAULT_BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sharedHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 32,
  maxFreeSockets: 16,
});

const sharedHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 32,
  maxFreeSockets: 16,
});

const HOST_BLACKLIST_TTL_MS = 5 * 60 * 1000;
const hostBlacklistMap = new Map();

const isHostBlacklisted = (hostname) => {
  const key = String(hostname || '').toLowerCase();
  if (!key) return null;
  const entry = hostBlacklistMap.get(key);
  if (!entry) return null;
  if (entry.until <= Date.now()) {
    hostBlacklistMap.delete(key);
    return null;
  }
  return entry.reason || 'Host temporarily blacklisted';
};

const markHostBlacklisted = (hostname, reason = 'Unreachable host') => {
  const key = String(hostname || '').toLowerCase();
  if (!key) return;
  hostBlacklistMap.set(key, {
    until: Date.now() + HOST_BLACKLIST_TTL_MS,
    reason: String(reason || 'Unreachable host'),
  });
};

const clearHostBlacklist = (hostname) => {
  const key = String(hostname || '').toLowerCase();
  if (!key) return;
  hostBlacklistMap.delete(key);
};

const isBlacklistingNetworkError = (err) => {
  if (!err) return false;
  const msg = String(err.message || '');
  const code = String(err.code || '');
  return (
    msg.includes('Audio probe timeout') ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENOTFOUND' ||
    /socket hang up/i.test(msg)
  );
};

const isPrivateAddress = (address) => {
  if (!address) return true;
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 0
    );
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }
  return true;
};

const getUpstreamReferer = (hostname) => {
  const host = (hostname || '').toLowerCase();
  if (host.endsWith('qq.com') || host.endsWith('qpic.cn') || host.includes('qqmusic')) {
    return 'https://y.qq.com/';
  }
  if (host.endsWith('kuwo.cn')) {
    return 'https://www.kuwo.cn/';
  }
  if (host.endsWith('126.net') || host.endsWith('163.com')) {
    return 'https://music.163.com/';
  }
  if (host.endsWith('kugou.com')) {
    return 'https://www.kugou.com/';
  }
  if (host.endsWith('migu.cn')) {
    return 'https://music.migu.cn/';
  }
  return undefined;
};

const validateProxyAudioUrl = async (rawUrl) => {
  let target;
  try {
    target = new URL(rawUrl);
  } catch (e) {
    throw Object.assign(new Error('Invalid audio url'), { statusCode: 400 });
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    throw Object.assign(new Error('Unsupported audio url protocol'), { statusCode: 400 });
  }

  const hostname = target.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw Object.assign(new Error('Local audio proxy targets are not allowed'), { statusCode: 403 });
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw Object.assign(new Error('Private audio proxy targets are not allowed'), { statusCode: 403 });
    }
    return target;
  }

  try {
    const resolved = await dns.lookup(hostname, { all: true });
    if (!resolved.length || resolved.some(item => isPrivateAddress(item.address))) {
      throw Object.assign(new Error('Private audio proxy targets are not allowed'), { statusCode: 403 });
    }
  } catch (err) {
    if (err.statusCode) throw err;
    // Transient DNS lookup error - let the upstream request attempt proceed
  }

  return target;
};

const isDisallowedMediaResponse = (statusCode, headers = {}) => {
  if (Number(statusCode) >= 400) return true;

  const rawLength = headers['content-length'];
  if (rawLength !== undefined && Number(rawLength) === 0) {
    return true;
  }

  const contentType = String(headers['content-type'] || '').toLowerCase();
  const isTextOrErrorDoc = (
    contentType.includes('text/html') ||
    contentType.includes('text/plain') ||
    contentType.includes('application/json') ||
    contentType.includes('application/xml')
  );

  if (isTextOrErrorDoc) {
    const validStatus = statusCode === 200 || statusCode === 206;
    const hasValidMediaHints = Boolean(headers['content-range']) || Number(rawLength) > 102400;
    return !(validStatus && hasValidMediaHints);
  }

  return false;
};

/**
 * 轻量探测音频流 URL 是否真实可连通且返回有效媒体响应头，同时复用 Keep-Alive 连接池与主机级死链黑名单。
 */
const probeAudioUrl = async (rawUrl, options = {}) => {
  const timeoutMs = Number(options.timeoutMs || 2200);
  const maxRedirects = Number(options.maxRedirects ?? 3);

  const attemptProbe = async (currentUrl, redirectsLeft) => {
    const target = await validateProxyAudioUrl(currentUrl);
    const blacklistedReason = isHostBlacklisted(target.hostname);
    if (blacklistedReason) {
      throw new Error(`主机短期熔断跳过(${target.hostname}): ${blacklistedReason}`);
    }

    const client = target.protocol === 'https:' ? https : http;
    const agent = target.protocol === 'https:' ? sharedHttpsAgent : sharedHttpAgent;
    const headers = {
      'User-Agent': DEFAULT_BROWSER_UA,
      'Accept': '*/*',
      'Range': 'bytes=0-0',
    };
    const referer = getUpstreamReferer(target.hostname);
    if (referer) {
      headers.Referer = referer;
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let req = null;
      let timer = null;

      const finish = (err, value) => {
        if (settled) return;
        settled = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (err) reject(err);
        else resolve(value);
      };

      timer = setTimeout(() => {
        const timeoutErr = new Error(`Audio probe timeout (${timeoutMs}ms)`);
        markHostBlacklisted(target.hostname, timeoutErr.message);
        if (req && !req.destroyed) {
          req.destroy(timeoutErr);
        }
        finish(timeoutErr);
      }, timeoutMs);

      try {
        req = client.request(target, {
          method: 'GET',
          headers,
          agent,
        }, (res) => {
          const statusCode = res.statusCode || 0;
          const location = res.headers?.location;

          if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
            res.resume();
            if (redirectsLeft <= 0) {
              finish(new Error('Audio probe too many redirects'));
              return;
            }
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            settled = true;
            const nextUrl = new URL(location, target).toString();
            attemptProbe(nextUrl, redirectsLeft - 1).then(resolve, reject);
            return;
          }

          if (statusCode !== 200 && statusCode !== 206) {
            res.destroy();
            req.destroy();
            finish(new Error(`上游返回状态码 ${statusCode}`));
            return;
          }

          if (isDisallowedMediaResponse(statusCode, res.headers)) {
            res.destroy();
            req.destroy();
            finish(new Error('上游响应非有效音频流'));
            return;
          }

          clearHostBlacklist(target.hostname);
          const contentType = String(res.headers['content-type'] || '');
          finish(null, {
            ok: true,
            statusCode,
            finalUrl: target.toString(),
            contentType,
          });

          if (statusCode === 206) {
            // 仅请求 1 字节的 206 响应可安全消费并归还 Keep-Alive 套接字，供 AudioProxy 直接复用热连接
            res.resume();
          } else {
            // 上游忽略 Range 返回全量 200 时立即截断，防止后台拉流耗费带宽
            res.destroy();
            req.destroy();
          }
        });
      } catch (err) {
        if (isBlacklistingNetworkError(err)) {
          markHostBlacklisted(target.hostname, err.message);
        }
        finish(err);
        return;
      }

      req.on('error', (err) => {
        if (!settled && isBlacklistingNetworkError(err)) {
          markHostBlacklisted(target.hostname, err.message);
        }
        finish(err);
      });

      req.end();
    });
  };

  return attemptProbe(rawUrl, maxRedirects);
};

module.exports = {
  sharedHttpAgent,
  sharedHttpsAgent,
  isHostBlacklisted,
  markHostBlacklisted,
  clearHostBlacklist,
  isPrivateAddress,
  getUpstreamReferer,
  validateProxyAudioUrl,
  isDisallowedMediaResponse,
  probeAudioUrl,
};
