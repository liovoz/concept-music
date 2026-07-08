import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');

function resolveNpmCommand() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && fs.existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      argsPrefix: [npmExecPath],
    };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    argsPrefix: [],
  };
}

export function installServerDependencies() {
  if (!fs.existsSync(path.join(serverDir, 'package.json'))) {
    throw new Error('Cannot find server/package.json.');
  }

  const useCi = process.env.CI === 'true' && fs.existsSync(path.join(serverDir, 'package-lock.json'));
  const npmArgs = [useCi ? 'ci' : 'install', '--prefix', serverDir];
  const npm = resolveNpmCommand();

  console.log(`[setup] Installing server dependencies with npm ${useCi ? 'ci' : 'install'}...`);

  return new Promise((resolve, reject) => {
    const child = spawn(npm.command, [...npm.argsPrefix, ...npmArgs], {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Server dependency installation failed with ${signal || code}.`));
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  installServerDependencies().catch((error) => {
    console.error(`[setup] ${error.message}`);
    process.exit(1);
  });
}
