// The ONLY way to make the YouTube upload package (2026-10-19):
//   npm run package:youtube
// 1. builds the YouTube release profile (scripts/build.mjs --youtube → dist-youtube/; that build
//    already fails if the SDK is not the first script);
// 2. refuses anything that is not a youtube-playables build;
// 3. zips the contents of dist-youtube/ (index.html at the root, runtime files only) into
//    ../CleanUpMiniGames_release/CleanUpMiniGames_youtube_build<N>.zip;
// 4. reads the ZIP back, inflates the PACKAGED index.html and checks it again (SDK first, game
//    bundle after it) and that every file index.html references is inside the archive.
// The plain `npm run build` (dist/, dev adapter) has no YouTube SDK and must never be uploaded.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep, resolve } from 'node:path';
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { checkSdkFirst, describeOrder } from './youtube-html.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist-youtube');
const releaseDir = resolve(root, '..', 'CleanUpMiniGames_release');
const fail = (msg) => {
  console.error(`\npackage:youtube FAILED — ${msg}`);
  process.exit(1);
};

if (!process.argv.includes('--no-build')) execFileSync(process.execPath, [join(root, 'scripts', 'build.mjs'), '--youtube'], { stdio: 'inherit', cwd: root });

const info = JSON.parse(readFileSync(join(dist, 'build-info.json'), 'utf8'));
if (info.profile !== 'youtube-playables') fail(`dist-youtube/ is a "${info.profile}" build, not youtube-playables`);
const built = checkSdkFirst(readFileSync(join(dist, 'index.html'), 'utf8'));
if (!built.ok) fail(`dist-youtube/index.html: ${built.errors.join('; ')}`);

// ---- zip (STORE-free: every entry deflated; standard PKZIP 2.0 structures) ----
const files = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(dist);
const rel = (p) => relative(dist, p).split(sep).join('/');
const banned = /(\.map$|\.md$|^src\/|^tests\/|node_modules|screenshots|reference\/)/;
const entries = files.map((p) => ({ p, name: rel(p) })).filter((e) => !banned.test(e.name));
entries.sort((a, b) => (a.name === 'index.html' ? -1 : b.name === 'index.html' ? 1 : a.name.localeCompare(b.name)));
const chunks = [];
const central = [];
let offset = 0;
const dos = (() => {
  const d = new Date();
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
})();
for (const e of entries) {
  const data = readFileSync(e.p);
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const name = Buffer.from(e.name, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(dos.time, 10);
  local.writeUInt16LE(dos.date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  chunks.push(local, name, comp);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0);
  c.writeUInt16LE(20, 4);
  c.writeUInt16LE(20, 6);
  c.writeUInt16LE(0x0800, 8);
  c.writeUInt16LE(8, 10);
  c.writeUInt16LE(dos.time, 12);
  c.writeUInt16LE(dos.date, 14);
  c.writeUInt32LE(crc, 16);
  c.writeUInt32LE(comp.length, 20);
  c.writeUInt32LE(data.length, 24);
  c.writeUInt16LE(name.length, 28);
  c.writeUInt32LE(offset, 42);
  central.push(c, name);
  offset += 30 + name.length + comp.length;
}
const cdSize = central.reduce((a, b) => a + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(cdSize, 12);
end.writeUInt32LE(offset, 16);
mkdirSync(releaseDir, { recursive: true });
const zipPath = join(releaseDir, `CleanUpMiniGames_youtube_build${info.build}.zip`);
writeFileSync(zipPath, Buffer.concat([...chunks, ...central, end]));

// ---- read the archive back and check the PACKAGED index.html ----
const zip = readFileSync(zipPath);
const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
const count = zip.readUInt16LE(eocd + 10);
let p = zip.readUInt32LE(eocd + 16);
const names = new Map();
for (let i = 0; i < count; i++) {
  const nl = zip.readUInt16LE(p + 28);
  const xl = zip.readUInt16LE(p + 30);
  const cl = zip.readUInt16LE(p + 32);
  const lo = zip.readUInt32LE(p + 42);
  names.set(zip.toString('utf8', p + 46, p + 46 + nl), { lo, csize: zip.readUInt32LE(p + 20), size: zip.readUInt32LE(p + 24), crc: zip.readUInt32LE(p + 16) });
  p += 46 + nl + xl + cl;
}
const read = (name) => {
  const e = names.get(name);
  const n = zip.readUInt16LE(e.lo + 26);
  const x = zip.readUInt16LE(e.lo + 28);
  const data = inflateRawSync(zip.subarray(e.lo + 30 + n + x, e.lo + 30 + n + x + e.csize));
  if (data.length !== e.size || crc32(data) !== e.crc) fail(`${name}: corrupt entry in the ZIP`);
  return data;
};
if (!names.has('index.html')) fail('index.html is not at the ZIP root');
const packaged = read('index.html').toString('utf8');
const check = checkSdkFirst(packaged);
if (!check.ok) fail(`packaged index.html: ${check.errors.join('; ')}`);
const refs = [...packaged.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => m[1]);
const missing = refs.filter((r) => !names.has(r));
if (missing.length) fail(`packaged index.html references files missing from the ZIP: ${missing.join(', ')}`);
const pkgInfo = JSON.parse(read('build-info.json').toString('utf8'));
if (pkgInfo.profile !== 'youtube-playables') fail(`the ZIP holds a "${pkgInfo.profile}" build`);
const unpacked = [...names.values()].reduce((a, e) => a + e.size, 0);
console.log(`\npackage:youtube OK — build #${info.build} (${info.time}, profile ${pkgInfo.profile})`);
console.log(`ZIP: ${zipPath}`);
console.log(`     ${zip.length} bytes, ${count} files, ${unpacked} bytes unpacked; index.html at the root`);
console.log('Script order in the PACKAGED index.html:');
console.log(describeOrder(check.order));
