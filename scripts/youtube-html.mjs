// YouTube Playables certification rule "SDK loaded first" (2026-10-19): the SDK script must be the
// FIRST executable script of the page, present statically in index.html, before the game bundle,
// module scripts, inline scripts or anything else that runs JavaScript.
// Used by scripts/build.mjs (a youtube build fails if the rule is broken) and by
// scripts/package-youtube.mjs (checked again on the index.html read back from the packaged ZIP).
export const YT_SDK_URL = 'https://www.youtube.com/game_api/v1';

// Every <script …> in document order (inline or external) + things that also execute / fetch code
// early (module preloads are listed so the report shows the complete order).
export function scriptOrder(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>|<link\b([^>]*\brel=["']?modulepreload["']?[^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[3] != null) {
      const href = /\bhref=["']([^"']+)["']/i.exec(m[3])?.[1] ?? '';
      out.push({ kind: 'modulepreload', src: href });
      continue;
    }
    const attrs = m[1] ?? '';
    const src = /\bsrc=["']([^"']+)["']/i.exec(attrs)?.[1] ?? null;
    const type = /\btype=["']([^"']+)["']/i.exec(attrs)?.[1] ?? null;
    out.push({ kind: src ? 'script' : 'inline-script', src, type, async: /\basync\b/i.test(attrs), defer: /\bdefer\b/i.test(attrs), inline: src ? '' : (m[2] ?? '').trim().slice(0, 60) });
  }
  return out;
}

// → { ok, errors[], order[] }
export function checkSdkFirst(html) {
  const errors = [];
  const order = scriptOrder(html);
  const exec = order.filter((x) => x.kind !== 'modulepreload' && !(x.type && !/javascript|module/i.test(x.type))); // JSON / template scripts do not execute
  const first = exec[0];
  if (!first) errors.push('no script in index.html');
  else {
    if (first.src !== YT_SDK_URL) errors.push(`the first executable script is ${first.src ?? 'an inline script'}, not the YouTube SDK (${YT_SDK_URL})`);
    if (first.src === YT_SDK_URL && (first.type === 'module' || first.async || first.defer)) errors.push('the SDK script must be a plain synchronous classic script (no type=module / async / defer)');
  }
  const sdkCount = exec.filter((x) => x.src === YT_SDK_URL).length;
  if (sdkCount !== 1) errors.push(`the SDK script must appear exactly once (found ${sdkCount})`);
  const sdkPos = order.findIndex((x) => x.src === YT_SDK_URL);
  const firstOther = order.findIndex((x) => x.src !== YT_SDK_URL);
  if (sdkPos >= 0 && firstOther >= 0 && firstOther < sdkPos) errors.push('another script / module preload comes before the SDK');
  const game = exec.find((x) => x.src && /\/assets\/index-[^/]+\.js$/.test(x.src));
  if (!game) errors.push('the game bundle script (./assets/index-*.js) is missing');
  return { ok: errors.length === 0, errors, order };
}

export function describeOrder(order) {
  return order.map((x, i) => `${i + 1}. ${x.kind}${x.type ? ` type=${x.type}` : ''}${x.async ? ' async' : ''}${x.defer ? ' defer' : ''} ${x.src ?? `"${x.inline}"`}`).join('\n');
}
