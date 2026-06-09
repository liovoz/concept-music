const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'design', 'personal-fm-ui-concepts.html');
const pngPath = path.join(root, 'design', 'personal-fm-ui-concepts.png');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1520,
    height: 960,
    show: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false
    }
  });

  await win.loadFile(htmlPath);
  await new Promise(resolve => setTimeout(resolve, 500));
  const image = await win.webContents.capturePage();
  fs.writeFileSync(pngPath, image.toPNG());
  win.destroy();
  app.quit();
});
