// Production build with a monotonically increasing build number.
// Usage: npm run build
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { build } from 'vite';

const counterFile = new URL('./build-number.json', import.meta.url);
const counter = existsSync(counterFile) ? JSON.parse(readFileSync(counterFile, 'utf8')) : { last: 0 };
const number = counter.last + 1;
const time = new Date().toISOString();

let commit = 'nogit';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  /* not a git checkout */
}

process.env.BUILD_NUMBER = String(number);
process.env.BUILD_TIME = time;

await build({ mode: 'production' });

writeFileSync(counterFile, JSON.stringify({ last: number }, null, 2) + '\n');
writeFileSync(
  new URL('../dist/build-info.json', import.meta.url),
  JSON.stringify({ build: number, time, commit, profile: 'dev-adapter' }, null, 2) + '\n',
);
console.log(`\nBuild #${number} at ${time} (base commit ${commit}, platform profile: dev adapter)`);
