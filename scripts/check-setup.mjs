import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const ELECTRON_EXTRACT_TIMEOUT = Number(process.env.ELECTRON_EXTRACT_TIMEOUT || 120000);

function getPlatformPath(platform = os.platform()) {
  switch (platform) {
    case 'darwin':
      return path.join('Electron.app', 'Contents', 'MacOS', 'Electron');
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron';
    case 'win32':
      return 'electron.exe';
    default:
      throw new Error(`Electron does not provide builds for ${os.platform()}.`);
  }
}

function electronPaths() {
  const electronDir = path.join(rootDir, 'node_modules', 'electron');
  const pathFile = path.join(electronDir, 'path.txt');
  let platformPath = getPlatformPath();

  if (fs.existsSync(pathFile)) {
    const savedPath = fs.readFileSync(pathFile, 'utf8').trim();
    if (savedPath) platformPath = savedPath;
  }

  return {
    electronDir,
    installScript: path.join(electronDir, 'install.js'),
    cliScript: path.join(electronDir, 'cli.js'),
    binary: path.join(electronDir, 'dist', platformPath),
  };
}

function delayReject(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: options.env || process.env,
      stdio: options.stdio || 'inherit',
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${signal || code}.`));
    });
  });
}

async function extractArchive(zipPath, distPath) {
  const extract = require('extract-zip');

  try {
    await Promise.race([
      extract(zipPath, { dir: distPath }),
      delayReject(ELECTRON_EXTRACT_TIMEOUT, 'extract-zip timed out while unpacking Electron.'),
    ]);
    return;
  } catch (error) {
    console.warn(`[setup] extract-zip failed: ${error.message}`);
    console.warn('[setup] Falling back to system tar.');
    await runCommand('tar', ['-xf', zipPath, '-C', distPath], { stdio: 'inherit' });
  }
}

async function reinstallElectron() {
  const { electronDir } = electronPaths();
  const electronPackage = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8'));
  const platform = process.env.npm_config_platform || os.platform();
  const arch = process.env.npm_config_arch || process.arch;
  const { downloadArtifact } = require('@electron/get');

  process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
  process.env.npm_config_electron_mirror = process.env.npm_config_electron_mirror || process.env.ELECTRON_MIRROR;
  delete process.env.ELECTRON_SKIP_BINARY_DOWNLOAD;
  delete process.env.npm_config_electron_skip_binary_download;

  const zipPath = await downloadArtifact({
    version: electronPackage.version,
    artifactName: 'electron',
    force: process.env.force_no_cache === 'true',
    cacheRoot: process.env.electron_config_cache,
    checksums: process.env.electron_use_remote_checksums ?? process.env.npm_config_electron_use_remote_checksums
      ? undefined
      : JSON.parse(fs.readFileSync(path.join(electronDir, 'checksums.json'), 'utf8')),
    platform,
    arch,
  });
  console.log(`[setup] Electron archive ready: ${zipPath}`);

  const distPath = path.join(electronDir, 'dist');
  await extractArchive(zipPath, distPath);
  console.log(`[setup] Electron archive extracted to: ${distPath}`);

  const extractedTypes = path.join(distPath, 'electron.d.ts');
  if (fs.existsSync(extractedTypes)) {
    fs.renameSync(extractedTypes, path.join(electronDir, 'electron.d.ts'));
  }

  fs.writeFileSync(path.join(electronDir, 'path.txt'), getPlatformPath(platform));
}

function hasElectronBinary() {
  const { electronDir, cliScript, binary } = electronPaths();
  if (!fs.existsSync(cliScript) || !fs.existsSync(binary)) return false;

  try {
    const expectedVersion = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8')).version;
    const installedVersion = fs.readFileSync(path.join(electronDir, 'dist', 'version'), 'utf8').trim().replace(/^v/, '');
    return expectedVersion === installedVersion;
  } catch {
    return false;
  }
}

export async function ensureElectron({ repair = false } = {}) {
  if (hasElectronBinary()) return;

  const { installScript, binary } = electronPaths();
  if (!fs.existsSync(installScript)) {
    throw new Error('Electron dependency is missing. Please run `npm install` in the project root.');
  }

  if (!repair) {
    throw new Error(`Electron binary is missing: ${binary}. Run \`npm run check:setup -- --repair\` or reinstall dependencies.`);
  }

  console.log('[setup] Electron binary is missing or incomplete. Reinstalling Electron from the configured mirror...');
  fs.rmSync(path.join(electronPaths().electronDir, 'dist'), { recursive: true, force: true });
  fs.rmSync(path.join(electronPaths().electronDir, 'path.txt'), { force: true });

  await reinstallElectron();

  if (!hasElectronBinary()) {
    throw new Error('Electron reinstall finished, but the Electron binary is still missing. Check your network or npm mirror settings.');
  }
}

export function ensureServerDependencies() {
  const requiredPackages = ['express', 'axios', 'dotenv'];
  const missing = requiredPackages.filter((packageName) => {
    return !fs.existsSync(path.join(serverDir, 'node_modules', packageName, 'package.json'));
  });

  if (missing.length > 0) {
    throw new Error(`Server dependencies are missing (${missing.join(', ')}). Please run \`npm install\` in the project root.`);
  }
}

export async function verifySetup({ repair = false } = {}) {
  await ensureElectron({ repair });
  ensureServerDependencies();
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const repair = process.argv.includes('--repair');
  verifySetup({ repair })
    .then(() => {
      console.log('[setup] Project dependencies are ready.');
    })
    .catch((error) => {
      console.error(`[setup] ${error.message}`);
      process.exit(1);
    });
}
