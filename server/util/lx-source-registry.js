const fs = require('node:fs');
const path = require('node:path');

const BUILTIN_SOURCE_NAMES = [
  '(推荐)全豆要-聚合音源 v4.1.js',
  '【推荐】长青SVIP音源v1.2.0（全平台支持无损）.js',
  '念心音源-V1.0.1.js',
];

const getSourceDirCandidates = () => {
  const candidates = [
    path.resolve(process.cwd(), '..', 'music_source'),
    path.resolve(process.cwd(), 'music_source'),
    path.resolve(__dirname, '..', '..', 'music_source'),
  ];

  if (process.resourcesPath) {
    candidates.unshift(path.join(process.resourcesPath, 'music_source'));
  }

  return [...new Set(candidates)];
};

const findSourceDir = () => getSourceDirCandidates().find(dir => fs.existsSync(dir) && fs.statSync(dir).isDirectory()) || null;

const listSources = () => {
  const dir = findSourceDir();
  if (!dir) return [];

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .map(file => ({
      id: file,
      name: file.replace(/\.js$/i, ''),
      file,
      path: path.join(dir, file),
      builtinOrder: BUILTIN_SOURCE_NAMES.indexOf(file),
    }));

  return files.sort((a, b) => {
    const ao = a.builtinOrder === -1 ? 999 : a.builtinOrder;
    const bo = b.builtinOrder === -1 ? 999 : b.builtinOrder;
    if (ao !== bo) return ao - bo;
    return a.file.localeCompare(b.file, 'zh-CN');
  });
};

const resolveSources = (ids = []) => {
  const all = listSources();
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
