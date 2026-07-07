const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const https = require('node:https');

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

const buildSourceContext = (source) => {
  const handlers = new Map();
  const messages = [];

  const sandbox = {
    console,
    Promise,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    btoa: (str) => Buffer.from(String(str), 'binary').toString('base64'),
    atob: (str) => Buffer.from(String(str), 'base64').toString('binary'),
  };

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
  const code = fs.readFileSync(source.path, 'utf8');
  const { context, handlers, messages } = buildSourceContext(source);

  const script = new vm.Script(code, {
    filename: source.file || source.path,
    displayErrors: true,
    timeout: 3000,
  });

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
