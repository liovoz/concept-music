// ====================
// 文件：src/utils/request.js
// ====================
import axios from 'axios';

// ✨ 终极适配器：强行接管 Axios，将所有请求转换为内部 IPC 通信
const ipcAdapter = async (config) => {
  // 清洗掉 Axios 内部复杂的对象，只保留纯数据，确保能通过 IPC 序列化
  const cleanConfig = JSON.parse(JSON.stringify({
    url: config.url,
    method: config.method,
    data: config.data,
    params: config.params,
    headers: config.headers
  }));

  try {
    // 呼叫底层 main.js 替我们发送请求
    const response = await window.apiBridge.request(cleanConfig);
    
    // 伪装成 Axios 标准返回格式交还给业务层
    const axiosResponse = {
      data: response.data,
      status: response.status,
      statusText: response.status === 200 ? 'OK' : 'Error',
      headers: {},
      config: config,
      request: {}
    };

    if (response.status >= 200 && response.status < 300) {
      return axiosResponse;
    } else {
      const error = new Error(`Request failed with status code ${response.status}`);
      error.config = config;
      error.response = axiosResponse;
      error.status = response.status;
      throw error;
    }
  } catch (err) {
    throw err;
  }
};

const request = axios.create({
  baseURL: '', // 不再需要 BaseURL，直接传相对路径
  timeout: 15000,
  adapter: ipcAdapter // ✨ 强制绑定 IPC 引擎！
});

request.interceptors.request.use(
  (config) => {
    if (config.method.toLowerCase() === 'get') {
      config.params = { ...config.params, timestamp: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => {
    if (response.data && response.data.errcode === 20028) {
       localStorage.removeItem('kg_desktop_has_dfid');
       if (!response.config?.silent) {
           window.dispatchEvent(new CustomEvent('API_GATEWAY_DOWN', {
               detail: { message: '🎵 播放受限：该歌曲需要验证，请检查是否为 VIP 专享' }
           }));
       }
       return Promise.reject(new Error('请求验证受限'));
    }
    return response.data; 
  },
  async (error) => {
    const config = error.config;
    if (!config || !config.retryCount) {
       if(config) config.retryCount = 0;
    }

    const isNetworkError = error.message === 'Network Error' || error.code === 'ECONNREFUSED';
    const status = error.response?.status || null;
    const errcode = error.response?.data?.errcode || null;

    if (config && isNetworkError && config.retryCount < 2) {
       config.retryCount += 1;
       console.warn(`本地连接波动，正在进行第 ${config.retryCount} 次自动重试: ${config.url}`);
       await new Promise(resolve => setTimeout(resolve, 500));
       return request(config);
    }

    console.error(`API 请求失败 [${config?.url}]:`, error.message);
    
    if (errcode === 20028 || status === 500) {
       localStorage.removeItem('kg_desktop_has_dfid');
    }

    if (!config?.silent) {
        if (errcode === 20028 || status === 500) {
           window.dispatchEvent(new CustomEvent('API_GATEWAY_DOWN', {
               detail: { message: '🎵 播放受限：此歌曲可能是 VIP 专享或因版权受限' }
           }));
        } else if (isNetworkError || [502, 503, 504].includes(status)) {
           window.dispatchEvent(new CustomEvent('API_GATEWAY_DOWN', {
               detail: { message: '⚠️ 后端 API 连接异常，请检查网络环境' }
           }));
        }
    }

    return Promise.reject(error);
  }
);

const originalGet = request.get;
let devPromise = null;

request.get = async function(...args) {
  const url = args[0];
  if (url === '/register/dev' || url === '/api/register/dev') {
    if (localStorage.getItem('kg_desktop_has_dfid') === 'true') {
        return Promise.resolve({ status: 1, error_code: 0, msg: 'dfid cached' });
    }
    if (!devPromise) {
      devPromise = originalGet.apply(this, args).then(res => {
        localStorage.setItem('kg_desktop_has_dfid', 'true');
        return res;
      }).finally(() => {
        setTimeout(() => { devPromise = null; }, 5000);
      });
    }
    return devPromise;
  }
  return originalGet.apply(this, args);
};

export default request;