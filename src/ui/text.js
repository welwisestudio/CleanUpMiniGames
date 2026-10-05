import { FONT_UI, TEXT } from './theme.js';

// All UI text is dynamic (never baked into images) so it stays sharp, editable and localizable.
// Sizes are in the caller's local units; refreshTextResolution() re-rasterises text at its
// final on-screen scale after every layout change.
export function makeText(scene, x, y, str, opts = {}) {
  const { size = 36, color = TEXT.navy, weight = '800', family = FONT_UI, stroke, strokeThickness = 0, align = 'center', originX = 0.5, originY = 0.5, shadow = null } = opts;
  const t = scene.add.text(x, y, str, {
    fontFamily: family,
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
    align,
    stroke: stroke ?? '#000000',
    strokeThickness,
    padding: { x: Math.ceil(strokeThickness / 2) + 2, y: Math.ceil(strokeThickness / 2) + 2 },
  });
  if (shadow) t.setShadow(shadow.x ?? 0, shadow.y ?? 3, shadow.color ?? 'rgba(0,0,0,0.35)', shadow.blur ?? 0, true, true);
  t.setOrigin(originX, originY);
  if (originY === 0.5) centerGlyphsVertically(t);
  return t;
}

// Phaser centres the text's line box (ascent + descent), which sits the visible glyphs low or high
// depending on the font. For centred labels we shift the origin so the glyphs' actual ink box is
// centred on the anchor point. Re-applied on every setText (numbers change).
export function centerGlyphsVertically(t) {
  const apply = () => {
    const str = t.text || ' ';
    const ctx = t.context;
    ctx.save();
    ctx.font = t.style._font;
    const m = ctx.measureText(str);
    ctx.restore();
    const metrics = t.style.metrics ?? t.style.getTextMetrics();
    const lines = Math.max(1, str.split(String.fromCharCode(10)).length);
    if (lines > 1 || !(m.actualBoundingBoxAscent >= 0)) return;
    // baseline position inside the text canvas (unscaled units). Phaser draws each line at
    // padding.top + strokeThickness / 2 + ascent (Text.updateText), so stroked labels are offset too.
    const padTop = t.padding.top;
    const baseline = padTop + (t.style.strokeThickness || 0) / 2 + metrics.ascent;
    const inkCentre = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    const h = t.height || 1;
    t.setOrigin(t.originX, Math.min(1, Math.max(0, inkCentre / h)));
  };
  const setText = t.setText.bind(t);
  t.setText = (v) => {
    setText(v);
    apply();
    return t;
  };
  apply();
}

// Shrinks a text (never enlarges) so it fits `maxW` in its parent's units; keeps its origin.
export function fitText(t, maxW, baseScale = 1) {
  t.setScale(baseScale);
  if (t.displayWidth > maxW) t.setScale((baseScale * maxW) / t.displayWidth);
  return t;
}

// Lays out display objects (texts / icons) left-to-right as ONE group centred on (cx, cy):
// each item's own centre lands on the row's centre line, so icons and numbers share a baseline.
export function centerRow(items, cx, cy, gap) {
  const widths = items.map((o) => o.displayWidth);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = cx - total / 2;
  items.forEach((o, i) => {
    o.setPosition(x + widths[i] * o.originX, cy);
    x += widths[i] + gap;
  });
  return total;
}
