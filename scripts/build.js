const { spawnSync } = require('node:child_process');
const path = require('node:path');

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ??= 'true';
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= 'true';

const preload = path.join(__dirname, 'suppress-baseline-warning.js').replace(/\\/g, '/');
const nodeOptions = [process.env.NODE_OPTIONS, `--require "${preload}"`].filter(Boolean).join(' ');
const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
  BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
  BROWSERSLIST_IGNORE_OLD_DATA: 'true',
};

const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [nextBin, 'build'], { stdio: 'inherit', env });

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
