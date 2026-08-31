import { nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.join(__dirname, 'assets', 'tray-icons');

const iconNames = [
  'play',
  'pause',
  'prev',
  'next',
  'win',
  'lyrics',
  'lyricsOn',
  'seq',
  'loop',
  'rnd',
  'about',
  'update',
  'quit'
];

class TrayIcons {
  constructor() {
    this.cache = new Map();
    this._loadIcons();
  }

  _loadIcons() {
    for (const name of iconNames) {
      const iconPath = path.join(iconsDir, `${name}.png`);
      try {
        const image = nativeImage.createFromPath(iconPath);
        if (!image.isEmpty()) {
          this.cache.set(name, image.resize({ width: 16, height: 16 }));
        } else {
          console.warn(`[TrayIcons] Warning: Icon image is empty: ${name} at ${iconPath}`);
        }
      } catch (err) {
        console.error(`[TrayIcons] Failed to load icon: ${name}`, err);
      }
    }
  }

  get(name) {
    return this.cache.get(name) || null;
  }
}

export const trayIcons = new TrayIcons();
