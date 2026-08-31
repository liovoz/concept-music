import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'electron', 'assets', 'tray-icons');

const colors = {
  dp: '#3b82f6', // 蓝色 - 播放控制
  dw: '#f59e0b', // 橙色 - 窗口
  dl: '#8b5cf6', // 紫色 - 歌词
  dm: '#14b8a6', // 青色 - 播放模式
  da: '#64748b', // 灰色 - 关于
  du: '#6366f1', // 靛蓝 - 检查更新
  dq: '#ef4444'  // 红色 - 退出
};

const badge = (v, inner) =>
  `<rect x="0.5" y="0.5" width="15" height="15" rx="4.2" fill="${v}"/>` +
  `<g fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

const BUBBLE_D = 'M3.4 5.7 C3.4 4.9 4 4.3 4.8 4.3 H11.2 C12 4.3 12.6 4.9 12.6 5.7 V8.9 C12.6 9.7 12 10.3 11.2 10.3 H6.8 L4.9 12.2 V10.3 H4.8 C4 10.3 3.4 9.7 3.4 8.9 Z';

const icons = {
  play:     badge(colors.dp, '<path d="M6.6 5.4 L11 8 L6.6 10.6 Z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>'),
  pause:    badge(colors.dp, '<rect x="5.2" y="4.9" width="1.9" height="6.2" rx="0.95" fill="#fff" stroke="none"/><rect x="8.9" y="4.9" width="1.9" height="6.2" rx="0.95" fill="#fff" stroke="none"/>'),
  prev:     badge(colors.dp, '<path d="M10.7 5.4 L6.4 8 L10.7 10.6 Z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.5 5.6 V10.4" stroke-width="1.6"/>'),
  next:     badge(colors.dp, '<path d="M5.3 5.4 L9.6 8 L5.3 10.6 Z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M10.5 5.6 V10.4" stroke-width="1.6"/>'),
  win:      badge(colors.dw, '<rect x="3.6" y="4.3" width="8.8" height="7.4" rx="1.2"/><path d="M3.6 6.5 H12.4"/>'),
  lyrics:   badge(colors.dl, `<path d="${BUBBLE_D}"/><path d="M5.8 6.3 H10.2 M5.8 8.2 H9"/>`),
  lyricsOn: badge(colors.dl, `<path d="${BUBBLE_D}" fill="#fff" stroke="#fff" stroke-width="1" stroke-linejoin="round"/><path d="M5.8 6.3 H10.2 M5.8 8.2 H9" stroke="${colors.dl}" stroke-width="1.2"/>`),
  seq:      badge(colors.dm, '<path d="M5 6.4 V6.2 C5 5.4 5.7 4.7 6.5 4.7 H10.8 M10.8 4.7 L9.5 3.4 M10.8 4.7 L9.5 6"/><path d="M11 9.6 V9.8 C11 10.6 10.3 11.3 9.5 11.3 H5 M5 11.3 L6.3 10 M5 11.3 L6.3 12.6" stroke-width="1.3"/>'),
  loop:     badge(colors.dm, '<path d="M5 6.4 V6.2 C5 5.4 5.7 4.7 6.5 4.7 H10.8 M10.8 4.7 L9.5 3.4 M10.8 4.7 L9.5 6"/><path d="M11 9.6 V9.8 C11 10.6 10.3 11.3 9.5 11.3 H5 M5 11.3 L6.3 10 M5 11.3 L6.3 12.6" stroke-width="1.3"/><path d="M8.7 6.9 L7.7 7.6 M8.7 6.9 V9.1" stroke-width="1.2"/>'),
  rnd:      badge(colors.dm, '<path d="M3.3 5.4 H4.7 L10.5 10.6 H12.2 M11 9.4 L12.4 10.6 L11 11.8"/><path d="M3.3 10.6 H4.7 L6.8 8.7 M9.2 7 L10.5 5.4 H12.2 M11 4.2 L12.4 5.4 L11 6.6" stroke-width="1.3"/>'),
  about:    badge(colors.da, '<circle cx="8" cy="8" r="4.9"/><path d="M8 7.5 V10.4"/><path d="M8 5.3 V5.31"/>'),
  update:   badge(colors.du, '<path d="M3 8.2 A5 5 0 0 1 11.6 4.5 L12.9 5.6"/><path d="M13.1 2.7 V5.8 H10"/><path d="M13 7.8 A5 5 0 0 1 4.4 11.5 L3.1 10.4"/><path d="M2.9 13.3 V10.2 H6"/>'),
  quit:     badge(colors.dq, '<path d="M5.8 5.8 L10.2 10.2 M10.2 5.8 L5.8 10.2" stroke-width="1.6"/>')
};

app.whenReady().then(async () => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const win = new BrowserWindow({
    width: 64,
    height: 64,
    show: false,
    webPreferences: {
      offscreen: true,
      transparent: true
    }
  });

  console.log(`Generating 13 tray icons to ${outputDir}...`);

  for (const [name, content] of Object.entries(icons)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32">${content}</svg>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { background: transparent; overflow: hidden; width: 32px; height: 32px; display: flex; }</style></head><body>${svg}</body></html>`;
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: 32, height: 32 });
    const targetFile = path.join(outputDir, `${name}.png`);
    fs.writeFileSync(targetFile, img.toPNG());
    console.log(`Generated: ${name}.png`);
  }

  console.log('All tray icons generated successfully.');
  app.quit();
});
