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
  return t;
}
