const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const https = require('node:https');

const path = require('node:path');

const EVENT_NAMES = {
  request: 'request',
  inited: 'inited',
  updateAlert: 'updateAlert',
};

const withTimeout = (promise, ms, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), ms);
  promise.then(resolve, reject).finally(() => clearTimeout(timer));
});

const lxRequest = (url, options = {}, callback = null) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const task = new Promise((resolve, reject) => {
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
    const req = client.request(target, {
      method,
      headers: {
        'User-Agent': 'ConceptMusic/LXSource',
        ...(options.headers || {}),
      },
      timeout: Number(options.timeout || 8000),
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: res.statusCode || 0,
          status: res.statusCode || 0,
          headers: res.headers || {},
          body: text,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });

  if (typeof callback === 'function') {
    task.then(res => callback(null, res)).catch(err => callback(err));
    return;
  }

  return task;
};

const normalizeUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return normalizeUrl(value[0]);
  if (typeof value === 'object') {
    return normalizeUrl(value.url || value.location || value.data?.url || value.data?.location);
  }
  return '';
};

// 内存脚本编译缓存池，避免高频切歌时重复读取磁盘和重复编译
const scriptCache = new Map();

const getCachedScript = (filePath, fileName) => {
  const stat = fs.statSync(filePath);
  const cached = scriptCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.script;
  }

  const code = fs.readFileSync(filePath, 'utf8');
  const script = new vm.Script(code, {
    filename: fileName || path.basename(filePath),
    displayErrors: true,
    timeout: 3000,
  });

  scriptCache.set(filePath, { mtimeMs: stat.mtimeMs, script });
  return script;
};

const buildSourceContext = (source) => {
  const handlers = new Map();
  const messages = [];

  const safeConsole = {
    log: (...args) => console.log('[LX-Source]', ...args),
    warn: (...args) => console.warn('[LX-Source]', ...args),
    error: (...args) => console.error('[LX-Source]', ...args),
    info: (...args) => console.info('[LX-Source]', ...args),
  };

  const sandbox = {
    console: safeConsole,
    Promise,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (t) => clearTimeout(t),
    setInterval: (...args) => setInterval(...args),
    clearInterval: (t) => clearInterval(t),
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
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
    request: lxRequest,
    on: (eventName, handler) => {
      if (typeof handler === 'function') handlers.set(eventName, handler);
    },
    send: (eventName, data) => {
      messages.push({ eventName, data });
    },
  };

  const context = vm.createContext(sandbox, {
    name: `lx-source:${source.file || source.id || 'unknown'}`,
  });

  return { context, handlers, messages };
};

const runSource = async (source, payload, timeoutMs = 12000) => {
  const script = getCachedScript(source.path, source.file || source.id);
  const { context, handlers, messages } = buildSourceContext(source);

  script.runInContext(context, { timeout: 3000 });

  const handler = handlers.get(EVENT_NAMES.request);
  if (!handler) {
    throw new Error('音源未注册播放解析能力');
  }

  const result = await withTimeout(Promise.resolve(handler(payload)), timeoutMs, '音源解析超时');
  const url = normalizeUrl(result);

  if (!/^https?:\/\//i.test(url)) {
    throw new Error('音源未返回可播放链接');
  }

  return { url, messages };
};

module.exports = {
  runSource,
};
