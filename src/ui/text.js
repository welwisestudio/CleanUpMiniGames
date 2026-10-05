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
    // baseline position inside the text canvas (unscaled units)
    const padTop = t.padding.top;
    const baseline = padTop + metrics.ascent;
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
