// Production build with a monotonically increasing build number.
// Usage: npm run build              → dist/             (dev adapter profile)
//        npm run build:youtube      → dist-youtube/     (YouTube Playables release profile)
//        npm run build:youtube-qa   → dist-youtube-qa/  (same + read-only QA snapshot; mock tests only)
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

const youtube = process.argv.includes('--youtube');
const qa = youtube && process.argv.includes('--qa');
if (youtube) process.env.PLATFORM_PROFILE = 'youtube';
if (qa) process.env.PLATFORM_QA = '1';
const outDir = youtube ? (qa ? 'dist-youtube-qa' : 'dist-youtube') : 'dist';
const profile = youtube ? (qa ? 'youtube-playables-qa' : 'youtube-playables') : 'dev-adapter';

process.env.BUILD_NUMBER = String(number);
process.env.BUILD_TIME = time;

await build({ mode: 'production' });

writeFileSync(counterFile, JSON.stringify({ last: number }, null, 2) + '\n');
writeFileSync(new URL(`../${outDir}/build-info.json`, import.meta.url), JSON.stringify({ build: number, time, commit, profile }, null, 2) + '\n');
console.log(`\nBuild #${number} at ${time} (base commit ${commit}, platform profile: ${profile}, ${outDir}/)`);
