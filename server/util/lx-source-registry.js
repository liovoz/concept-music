const fs = require('node:fs');
const path = require('node:path');

const BUILTIN_SOURCE_NAMES = [
  '星海音乐源 v2.3.18.js',
  '墨澜音乐源v2.3.6.js',
  'stellarwave-v0.0.14.js',
];

const normalizeSourceName = (name = '') => name.replace(/\s+/g, '').toLowerCase();

const getSourceDirCandidates = (subDir = '') => {
  const baseCandidates = [
    path.resolve(process.cwd(), '..', 'music_source'),
    path.resolve(process.cwd(), 'music_source'),
    path.resolve(__dirname, '..', '..', 'music_source'),
  ];

  if (process.resourcesPath) {
    baseCandidates.unshift(path.join(process.resourcesPath, 'music_source'));
  }

  const candidates = subDir
    ? baseCandidates.map(base => path.join(base, subDir))
    : baseCandidates;

  return [...new Set(candidates)];
};

const findSourceDir = (subDir = '') => getSourceDirCandidates(subDir).find(dir => fs.existsSync(dir) && fs.statSync(dir).isDirectory()) || null;

const listSources = (subDir = '') => {
  let dir = findSourceDir(subDir);
  let resolvedSubDir = subDir;

  if (subDir && (!dir || fs.readdirSync(dir).filter(file => file.endsWith('.js')).length === 0)) {
    const fallbackDir = findSourceDir('');
    if (fallbackDir && fs.readdirSync(fallbackDir).filter(file => file.endsWith('.js')).length > 0) {
      dir = fallbackDir;
      resolvedSubDir = '';
    }
  }

  if (!dir) return [];

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .filter(file => {
      const norm = normalizeSourceName(file);
      return BUILTIN_SOURCE_NAMES.some(b => normalizeSourceName(b) === norm);
    })
    .map(file => {
      const norm = normalizeSourceName(file);
      const builtinIdx = BUILTIN_SOURCE_NAMES.findIndex(b => normalizeSourceName(b) === norm);
      return {
        id: file,
        name: file.replace(/\.js$/i, ''),
        file,
        path: path.join(dir, file),
        builtinOrder: builtinIdx === -1 ? 999 : builtinIdx,
        subDir: resolvedSubDir || '',
      };
    });

  return files.sort((a, b) => {
    const ao = a.builtinOrder === -1 ? 999 : a.builtinOrder;
    const bo = b.builtinOrder === -1 ? 999 : b.builtinOrder;
    if (ao !== bo) return ao - bo;
    return a.file.localeCompare(b.file, 'zh-CN');
  });
};

const resolveSources = (ids = [], subDir = '') => {
  const all = listSources(subDir);
  if (!Array.isArray(ids) || ids.length === 0) return all;

  const enabled = new Set(ids.map(id => String(id)));
  const ordered = ids
    .map(id => all.find(source => source.id === id || source.file === id || source.name === id))
    .filter(Boolean);
  const rest = all.filter(source => !enabled.has(source.id) && !enabled.has(source.file) && !enabled.has(source.name));

  return [...ordered, ...rest];
};

module.exports = {
  listSources,
  resolveSources,
};
