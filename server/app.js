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

start();
