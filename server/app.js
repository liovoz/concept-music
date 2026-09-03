#!/usr/bin/env node

async function start() {
  const fs = require('node:fs');
  const path = require('node:path');
  const dotenv = require('dotenv');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, quiet: true });
  }

  require('./util/runtime').applyCliOverrides();
  require('./server').startService();
}

// 当由 Electron 主进程 fork 启动时，监听 IPC 断开事件自动退出，防止孤儿僵尸进程占用端口
if (process.send) {
  process.on('disconnect', () => {
    process.exit(0);
  });
}

start();
