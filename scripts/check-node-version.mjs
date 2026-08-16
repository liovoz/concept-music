import process from 'node:process';

const MIN_NODE_MAJOR = 20;
const MIN_NPM_MAJOR = 10;

const nodeVersion = process.versions.node;
const nodeMajor = Number(nodeVersion.split('.')[0]);

if (!Number.isInteger(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
  console.error(`[setup] Node.js >= ${MIN_NODE_MAJOR} is required, but the current version is v${nodeVersion}.`);
  console.error('[setup] Please switch to Node.js 22 LTS (see .nvmrc in the project root) and re-run npm install.');
  process.exit(1);
}

// npm exposes the package manager and version via npm_config_user_agent, e.g. "npm/10.9.8 node/v22.23.2 ..."
const userAgent = process.env.npm_config_user_agent || '';
if (userAgent.startsWith('npm/')) {
  const npmVersion = userAgent.slice('npm/'.length).split(' ')[0];
  const npmMajor = Number(npmVersion.split('.')[0]);
  if (Number.isInteger(npmMajor) && npmMajor < MIN_NPM_MAJOR) {
    console.error(`[setup] npm >= ${MIN_NPM_MAJOR} is required, but the current version is ${npmVersion}.`);
    console.error('[setup] Please upgrade npm first (for example: npm install -g npm@latest) and re-run npm install.');
    process.exit(1);
  }
}
