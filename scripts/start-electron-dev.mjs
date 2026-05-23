import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const viteUrl = 'http://127.0.0.1:5173/';

let viteProcess = null;
let electronProcess = null;
let shuttingDown = false;

function requestReady(url, timeout = 500) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ready) => {
      if (settled) return;
      settled = true;
      resolve(ready);
    };

    const req = http.get(url, (res) => {
      res.resume();
      done(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => done(false));
    req.setTimeout(timeout, () => {
      req.destroy();
      done(false);
    });
  });
}

async function waitForVite(processRef) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await requestReady(viteUrl)) return;
    if (processRef && processRef.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready (code ${processRef.exitCode}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for Vite on http://127.0.0.1:5173/.');
}

function spawnNodeScript(scriptPath, args = []) {
  return spawn(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false
  });
}

function spawnElectron() {
  const electronCli = path.join(rootDir, 'node_modules', 'electron', 'cli.js');
  return spawnNodeScript(electronCli, ['.']);
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  child.kill();
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopChild(electronProcess);
  stopChild(viteProcess);
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

try {
  const viteAlreadyRunning = await requestReady(viteUrl);
  if (!viteAlreadyRunning) {
    const viteCli = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
    viteProcess = spawnNodeScript(viteCli, ['--host', '127.0.0.1', '--port', '5173', '--strictPort']);
  }

  await waitForVite(viteProcess);

  electronProcess = spawnElectron();
  electronProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopChild(viteProcess);
    if (signal) {
      process.exit(signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
    }
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error(`[start] ${error.message}`);
  shutdown(1);
}
