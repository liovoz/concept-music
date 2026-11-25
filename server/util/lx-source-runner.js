const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const path = require('node:path');
const { sharedHttpAgent, sharedHttpsAgent } = require('./audio-url-guard');

const EVENT_NAMES = {
  request: 'request',
  inited: 'inited',
  updateAlert: 'updateAlert',
};

const withTimeout = (promise, ms, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), ms);
  promise.then(resolve, reject).finally(() => clearTimeout(timer));
});

const normalizeUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return normalizeUrl(value[0]);
  if (typeof value === 'object') {
    return normalizeUrl(value.url || value.location || value.data?.url || value.data?.location);
  }
  return '';
};

// 内存脚本编译缓存池与常驻 VM 实例池，避免高频切歌时重复编译和重复触发脚本初始化联网
const scriptCache = new Map();
const instancePool = new Map();
const MAX_CONSECUTIVE_INSTANCE_ERRORS = 3;

const buildLxUtils = () => ({
  buffer: {
    from: (data, encoding) => Buffer.from(data, encoding),
    bufToString: (buf, encoding) => Buffer.from(buf).toString(encoding),
  },
  crypto: {
    md5: (str) => crypto.createHash('md5').update(String(str)).digest('hex'),
    sha1: (str) => crypto.createHash('sha1').update(String(str)).digest('hex'),
    sha256: (str) => crypto.createHash('sha256').update(String(str)).digest('hex'),
    aesEncrypt: (data, mode, key, iv) => {
      let cipherMode = String(mode || '').toLowerCase();
      if (!cipherMode.startsWith('aes-')) {
        cipherMode = `aes-128-${cipherMode}`;
      }
      const cipher = crypto.createCipheriv(cipherMode, Buffer.from(key), iv ? Buffer.from(iv) : Buffer.alloc(0));
      return Buffer.concat([cipher.update(Buffer.isBuffer(data) ? data : Buffer.from(String(data))), cipher.final()]);
    },
  },
});

const getCachedScript = (filePath, fileName) => {
  const stat = fs.statSync(filePath);
  const cached = scriptCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return { ...cached, mtimeMs: stat.mtimeMs };
  }

  const code = fs.readFileSync(filePath, 'utf8');
  const script = new vm.Script(code, {
    filename: fileName || path.basename(filePath),
    displayErrors: true,
    timeout: 3000,
  });

  const cacheItem = { mtimeMs: stat.mtimeMs, script, code };
  scriptCache.set(filePath, cacheItem);
  return cacheItem;
};

const createPersistentInstance = (source) => {
  const { script, code, mtimeMs } = getCachedScript(source.path, source.file || source.id);
  const handlers = new Map();
  const messages = [];
  const activeRequests = new Set();
  const timers = new Set();
  const intervals = new Set();
  let initedSources = null;
  let disposed = false;

  const safeConsole = {
    log: (...args) => console.log('[LX-Source]', ...args),
    warn: (...args) => console.warn('[LX-Source]', ...args),
    error: (...args) => console.error('[LX-Source]', ...args),
    info: (...args) => console.info('[LX-Source]', ...args),
  };

  const originalJsonParse = JSON.parse;
  const safeJSON = {
    parse: (str, ...args) => {
      if (typeof str === 'object' && str !== null) return str;
      return originalJsonParse(str, ...args);
    },
    stringify: JSON.stringify,
  };

  const customSetTimeout = (fn, delay, ...args) => {
    if (disposed) return null;
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed && typeof fn === 'function') fn(...args);
    }, delay);
    if (typeof id.unref === 'function') id.unref();
    timers.add(id);
    return id;
  };
  const customClearTimeout = (t) => {
    timers.delete(t);
    clearTimeout(t);
  };
  const customSetInterval = (fn, delay, ...args) => {
    if (disposed) return null;
    const id = setInterval(() => {
      if (!disposed && typeof fn === 'function') fn(...args);
    }, delay, ...args);
    if (typeof id.unref === 'function') id.unref();
    intervals.add(id);
    return id;
  };
  const customClearInterval = (t) => {
    intervals.delete(t);
    clearInterval(t);
  };

  const contextLxRequest = (url, options = {}, callback = null) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const task = new Promise((resolve, reject) => {
      if (disposed) {
        reject(new Error('Source instance disposed'));
        return;
      }

      let target;
      try {
        target = new URL(url);
      } catch (e) {
        reject(new Error('Invalid request url'));
        return;
      }

      if (!['http:', 'https:'].includes(target.protocol)) {
        reject(new Error('Unsupported request protocol'));
        return;
      }

      const body = options.body || options.data || null;
      const method = (options.method || (body ? 'POST' : 'GET')).toUpperCase();
      const client = target.protocol === 'https:' ? https : http;
      const agent = target.protocol === 'https:' ? sharedHttpsAgent : sharedHttpAgent;
      const timeoutMs = Number(options.timeout || 6000);

      let req;
      try {
        req = client.request(target, {
          method,
          agent,
          headers: {
            'User-Agent': 'ConceptMusic/LXSource',
            ...(options.headers || {}),
          },
          timeout: timeoutMs,
        }, (res) => {
          res.on('error', (err) => {
            activeRequests.delete(req);
            reject(err);
          });
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            activeRequests.delete(req);
            const text = Buffer.concat(chunks).toString('utf8');
            let parsedBody = text;
            try {
              parsedBody = JSON.parse(text);
            } catch (e) {}
            resolve({
              statusCode: res.statusCode || 0,
              status: res.statusCode || 0,
              headers: res.headers || {},
              body: parsedBody,
            });
          });
        });
      } catch (e) {
        reject(e);
        return;
      }

      activeRequests.add(req);

      req.on('timeout', () => {
        activeRequests.delete(req);
        req.destroy(new Error('Request timeout'));
      });
      req.on('error', (err) => {
        activeRequests.delete(req);
        reject(err);
      });
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });

    if (typeof callback === 'function') {
      task.then(res => callback(null, res)).catch(err => callback(err));
      return;
    }

    return task;
  };

  const cleanup = () => {
    disposed = true;
    timers.forEach(t => clearTimeout(t));
    timers.clear();
    intervals.forEach(t => clearInterval(t));
    intervals.clear();
    for (const req of activeRequests) {
      try {
        req.destroy(new Error('Source instance disposed'));
      } catch (_) {}
    }
    activeRequests.clear();
    handlers.clear();
    messages.length = 0;
  };

  const sandbox = {
    console: safeConsole,
    Promise,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    setTimeout: customSetTimeout,
    clearTimeout: customClearTimeout,
    setInterval: customSetInterval,
    clearInterval: customClearInterval,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    JSON: safeJSON,
    Buffer,
    btoa: (str) => Buffer.from(String(str), 'binary').toString('base64'),
    atob: (str) => Buffer.from(String(str), 'base64').toString('binary'),
  };

  // 严格屏蔽宿主敏感变量与模块系统
  Object.defineProperty(sandbox, 'process', { value: undefined, writable: false, configurable: false });
  Object.defineProperty(sandbox, 'require', { value: undefined, writable: false, configurable: false });
  Object.defineProperty(sandbox, 'module', { value: undefined, writable: false, configurable: false });
  Object.defineProperty(sandbox, 'exports', { value: undefined, writable: false, configurable: false });
  Object.defineProperty(sandbox, 'global', { value: undefined, writable: false, configurable: false });

  sandbox.globalThis = sandbox;
  sandbox.lx = {
    version: '2.10.0',
    env: 'desktop',
    EVENT_NAMES,
    request: contextLxRequest,
    utils: buildLxUtils(),
    currentScriptInfo: {
      name: source.name || path.basename(source.file || source.path || '', '.js'),
      rawScript: code || '',
    },
    on: (eventName, handler) => {
      if (typeof handler === 'function') handlers.set(eventName, handler);
    },
    send: (eventName, data) => {
      if (eventName === EVENT_NAMES.inited && data?.sources) {
        initedSources = data.sources;
      }
      if (messages.length > 32) messages.shift();
      messages.push({ eventName, data });
    },
  };

  const context = vm.createContext(sandbox, {
    name: `lx-source:${source.file || source.id || 'unknown'}`,
  });

  try {
    script.runInContext(context, { timeout: 3000 });
    if (!handlers.has(EVENT_NAMES.request)) {
      throw new Error('音源未注册播放解析能力');
    }
  } catch (err) {
    cleanup();
    throw err;
  }

  return {
    filePath: source.path,
    mtimeMs,
    handlers,
    get initedSources() {
      return initedSources;
    },
    cleanup,
    consecutiveErrors: 0,
    createdAt: Date.now(),
  };
};

const getOrCreateInstance = (source) => {
  const filePath = source?.path;
  if (!filePath) throw new Error('无效音源路径');
  const stat = fs.statSync(filePath);
  const existing = instancePool.get(filePath);
  if (
    existing &&
    existing.mtimeMs === stat.mtimeMs &&
    existing.consecutiveErrors < MAX_CONSECUTIVE_INSTANCE_ERRORS
  ) {
    return existing;
  }

  if (existing) {
    try { existing.cleanup(); } catch (_) {}
    instancePool.delete(filePath);
  }

  const created = createPersistentInstance(source);
  instancePool.set(filePath, created);
  return created;
};

const isSandboxCrashOrTimeout = (err) => {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    msg.includes('音源解析超时') ||
    msg.includes('execution timed out') ||
    msg.includes('Source instance disposed') ||
    err.name === 'ReferenceError' ||
    err.name === 'TypeError' ||
    err.name === 'SyntaxError'
  );
};

const runSource = async (source, payload, timeoutMs = 3500) => {
  const instance = getOrCreateInstance(source);
  const handler = instance.handlers.get(EVENT_NAMES.request);
  if (!handler) {
    throw new Error('音源未注册播放解析能力');
  }

  try {
    const result = await withTimeout(Promise.resolve(handler(payload)), timeoutMs, '音源解析超时');
    const url = normalizeUrl(result);

    if (!/^https?:\/\//i.test(url)) {
      throw new Error('音源未返回可播放链接');
    }

    instance.consecutiveErrors = 0;
    return { url, initedSources: instance.initedSources };
  } catch (err) {
    if (isSandboxCrashOrTimeout(err)) {
      instance.consecutiveErrors += 1;
      if (instance.consecutiveErrors >= MAX_CONSECUTIVE_INSTANCE_ERRORS) {
        try { instance.cleanup(); } catch (_) {}
        instancePool.delete(instance.filePath);
      }
    }
    throw err;
  }
};

const getSourceCapabilities = (source) => {
  if (!source?.path) return null;
  const existing = instancePool.get(source.path);
  return existing?.initedSources || null;
};

const warmupSource = (source) => {
  try {
    return getOrCreateInstance(source);
  } catch (_) {
    return null;
  }
};

const disposeAllInstances = () => {
  for (const instance of instancePool.values()) {
    try { instance.cleanup(); } catch (_) {}
  }
  instancePool.clear();
};

module.exports = {
  runSource,
  getSourceCapabilities,
  warmupSource,
  disposeAllInstances,
};
