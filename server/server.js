const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const express = require('express');
const decode = require('safe-decode-uri-component');
const { cookieToJson, randomString, getGuid, calculateMid } = require('./util/util');
const { cryptoMd5 } = require('./util/crypto');
const { createRequest } = require('./util/request');
const dotenv = require('dotenv');
const cache = require('./util/apicache').middleware;

/**
 * @typedef {{
 * identifier?: string,
 * route: string,
 * module: any,
 * }}ModuleDefinition
 */

/**
 * @typedef {{
 *  server?: import('http').Server,
 * }} ExpressExtension
 */

const guid = cryptoMd5(getGuid());
const serverDev = randomString(10).toUpperCase();

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

  const resolved = await dns.lookup(hostname, { all: true });
  if (!resolved.length || resolved.some(item => isPrivateAddress(item.address))) {
    throw Object.assign(new Error('Private audio proxy targets are not allowed'), { statusCode: 403 });
  }

  return target;
};

const proxyAudioRequest = async (rawUrl, req, res, redirects = 0) => {
  if (redirects > 4) {
    res.status(508).send({ code: 508, msg: 'Too many redirects' });
    return;
  }

  let target;
  try {
    target = await validateProxyAudioUrl(rawUrl);
  } catch (e) {
    res.status(e.statusCode || 502).send({ code: e.statusCode || 502, msg: e.message || 'Audio proxy failed' });
    return;
  }

  const client = target.protocol === 'https:' ? https : http;
  const upstreamReq = client.request(target, {
    method: 'GET',
    headers: {
      'User-Agent': req.headers['user-agent'] || 'ConceptMusic/AudioProxy',
      ...(req.headers.range ? { Range: req.headers.range } : {}),
    },
  }, (upstreamRes) => {
    const statusCode = upstreamRes.statusCode || 502;
    const location = upstreamRes.headers.location;

    if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
      upstreamRes.resume();
      const nextUrl = new URL(location, target).toString();
      proxyAudioRequest(nextUrl, req, res, redirects + 1);
      return;
    }

    const contentType = upstreamRes.headers['content-type'] || 'application/octet-stream';
    const isAudioLike = /^(audio|video)\//i.test(contentType) || /octet-stream/i.test(contentType);
    if (!isAudioLike) {
      upstreamRes.resume();
      res.status(415).send({ code: 415, msg: 'Unsupported proxied media type' });
      return;
    }

    res.status(statusCode);
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Range,Content-Type',
      'Accept-Ranges': upstreamRes.headers['accept-ranges'] || 'bytes',
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
    });

    ['content-length', 'content-range', 'etag', 'last-modified'].forEach((header) => {
      if (upstreamRes.headers[header]) res.set(header, upstreamRes.headers[header]);
    });

    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', () => {
    if (!res.headersSent) res.status(502).send({ code: 502, msg: 'Audio proxy upstream failed' });
    else res.end();
  });
  upstreamReq.end();
};

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

/**
 *  描述：动态获取模块定义
 * @param {string}  modulesPath  模块路径(TS)
 * @param {Record<string, string>} specificRoute  特定模块定义
 * @param {boolean} doRequire  如果为 true，则使用 require 加载模块, 否则打印模块路径， 默认为true
 * @return { Promise<ModuleDefinition[]> }
 * @example getModuleDefinitions("./module", {"album_new.js": "/album/create"})
 */
async function getModulesDefinitions(modulesPath, specificRoute, doRequire = true) {
  const files = await fs.promises.readdir(modulesPath);
  const parseRoute = (fileName) =>
    specificRoute && fileName in specificRoute ? specificRoute[fileName] : `/${fileName.replace(/\.(js)$/i, '').replace(/_/g, '/')}`;

  return files
    .reverse()
    .filter((fileName) => fileName.endsWith('.js') && !fileName.startsWith('_'))
    .map((fileName) => {
      const identifier = fileName.split('.').shift();
      const route = parseRoute(fileName);
      const modulePath = path.resolve(modulesPath, fileName);
      const module = doRequire ? require(modulePath) : modulePath;
      return { identifier, route, module };
    });
}

/**
 * 创建服务
 * @param {ModuleDefinition[]} moduleDefs
 * @return {Promise<import('express').Express>}
 */
async function consturctServer(moduleDefs) {
  const app = express();
  const { CORS_ALLOW_ORIGIN } = process.env;
  app.set('trust proxy', true);

  /**
   * CORS & Preflight request
   */
  app.use((req, res, next) => {
    if (req.path !== '/' && !req.path.includes('.')) {
      res.set({
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': CORS_ALLOW_ORIGIN || req.headers.origin || '*',
        'Access-Control-Allow-Headers': 'Authorization,X-Requested-With,Content-Type,Cache-Control',
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
    req.method === 'OPTIONS' ? res.status(204).end() : next();
  });

  // Cookie Parser
  app.use((req, _, next) => {
    req.cookies = {};
    (req.headers.cookie || '').split(/;\s+|(?<!\s)\s+$/g).forEach((pair) => {
      const crack = pair.indexOf('=');
      if (crack < 1 || crack === pair.length - 1) {
        return;
      }
      req.cookies[decode(pair.slice(0, crack)).trim()] = decode(pair.slice(crack + 1)).trim();
    });
    next();
  });

  // 将当前平台写入Cookie 以方便查看
  app.use((req, res, next) => {
    const cookies = req.cookies || {};
    const isHttps = req.protocol === 'https';
    const cookieSuffix = isHttps ? '; PATH=/; SameSite=None; Secure' : '; PATH=/';

    const ensureCookie = (key, value) => {
      if (Object.prototype.hasOwnProperty.call(cookies, key)) return;
      cookies[key] = String(value);
      res.append('Set-Cookie', `${key}=${cookies[key]}${cookieSuffix}`);
    };

    const mid = calculateMid(process.env.KUGOU_API_GUID ?? guid);
    ensureCookie('KUGOU_API_PLATFORM', process.env.platform);
    ensureCookie('KUGOU_API_MID', mid);
    ensureCookie('KUGOU_API_GUID', process.env.KUGOU_API_GUID ?? guid);
    ensureCookie('KUGOU_API_DEV', (process.env.KUGOU_API_DEV ?? serverDev).toUpperCase());
    ensureCookie('KUGOU_API_MAC', (process.env.KUGOU_API_MAC ?? '02:00:00:00:00:00').toUpperCase());

    req.cookies = cookies;

    next();
  });

  // Body Parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  /**
   * Serving static files
   */
  app.use(express.static(path.join(__dirname, 'public')));

  /**
   * docs
   */

  app.use('/docs', express.static(path.join(__dirname, 'docs')));

  app.options('/audio/proxy', (_, res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Range,Content-Type',
    }).status(204).end();
  });

  app.get('/audio/proxy', (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    proxyAudioRequest(rawUrl, req, res);
  });

  // Cache
  app.use(cache('2 minutes', (_, res) => res.statusCode === 200));

  const moduleDefinitions = moduleDefs || (await getModulesDefinitions(path.join(__dirname, 'module'), {}));

  for (const moduleDef of moduleDefinitions) {
    app.use(moduleDef.route, async (req, res) => {
      [req.query, req.body].forEach((item) => {
        if (typeof item.cookie === 'string') {
          item.cookie = cookieToJson(decode(item.cookie));
        }
      });

      const { cookie, ...params } = req.query;

      const query = Object.assign({}, { cookie: Object.assign({}, req.cookies, cookie) }, params, { body: req.body });

      const authHeader = req.headers['authorization'];
      if (authHeader) {
        query.cookie = {
          ...query.cookie,
          ...cookieToJson(authHeader),
        };
      }
      try {
        const moduleResponse = await moduleDef.module(query, (config) => {
          let ip = req.ip;
          if (ip.substring(0, 7) === '::ffff:') {
            ip = ip.substring(7);
          }
          config.ip = ip;
          return createRequest(config);
        });

        console.log('[OK]', decode(req.originalUrl));

        const cookies = moduleResponse.cookie;
        if (!query.noCookie) {
          if (Array.isArray(cookies) && cookies.length > 0) {
            if (req.protocol === 'https') {
              // Try to fix CORS SameSite Problem
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return `${cookie}; PATH=/; SameSite=None; Secure`;
                })
              );
            } else {
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return `${cookie}; PATH=/`;
                })
              );
            }
          }
        }

        res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
      } catch (e) {
        const moduleResponse = e;
        console.log('[ERR]', decode(req.originalUrl), {
          status: moduleResponse.status,
          body: moduleResponse.body,
        });

        if (!moduleResponse.body) {
          res.status(404).send({
            code: 404,
            data: null,
            msg: 'Not Found',
          });
          return;
        }

        res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
      }
    });
  }

  return app;
}

/**
 * Serve the KG API
 * @returns {Promise<import('express').Express & ExpressExtension>}
 */
async function startService() {
  const port = Number(process.env.PORT || '3000');
  const host = process.env.HOST || '';

  const app = await consturctServer();

  /** @type {import('express').Express & ExpressExtension} */
  const appExt = app;

  appExt.service = app.listen(port, host, () => {
    console.log(`server running @ http://${host || 'localhost'}:${port}`);
  });

  return appExt;
}

module.exports = { startService, getModulesDefinitions };
