# Реальные промпты из ASMR

Примеры из сохранённых manifests, а не новые генерации. Используйте структуру описания, заменяя художественную задачу и референсы. Английский текст сохранён дословно. Job ID нужен для происхождения, не для запуска в другом аккаунте. Исходные account/project IDs и CDN URLs здесь не копируются.

## cat

Фиксированные ориентиры лица для общих масок

Источник: `reference/assets-manifest.json`. Модель результата: `nano_banana_flash`. Job: `1bcc250c-6b2f-4920-94b2-3dc34a28e5f1`.

```text
Production 2D mobile Skincare ASMR beauty game character sprite. Match classic casual mobile makeup salon illustration: polished hand painted digital doll face, softly airbrushed peach skin, precise dark lashes, glossy highlights, playful plush animal headband, subtle painted volume, not 3D, not photographic, not anime. STRICT composition square 1:1: a SINGLE isolated floating front facing upright symmetrical adult woman's HEAD with closed relaxed eyes, gently arched dark brows, small nose, small softly pink closed smiling lips. The oval facial skin region extends from normalized x .25 to .75 and y .27 to .86; forehead at .27, eyebrows .43, eyes .49, nose .61, mouth .73, chin .86. Headband wraps around perimeter. Whole head occupies x .10 to .90, y .06 to .92. No neck, no shoulders, no hands, no objects, no typography or UI. SOLID perfectly uniform muted sage gray background RGB 105 120 113, HEX #697871, no shadows on background, no texture, no gradient. Crisp clean silhouette. Clean natural bare healthy skin without makeup, marks or blemishes, as game code will add those layers. Character: light warm peach skin, brunette hair fully tucked away into a plush white-and-charcoal zebra striped CAT EARS headband with pink inner ears. Closely resembles a glamorous casual skincare salon game doll.
```

## controls

Переход к рисованному UI

Источник: `reference/ui-generation.json`. Модель результата: `nano_banana_flash`. Job: `86164e43-eec8-464d-a529-cfb1a178a03b`.

```text
Hand-painted 2D mobile casual beauty game UI artwork, matching a classic Skincare ASMR mobile game: cheerful lilac purple, candy pink, fresh lime green and warm cream paper, hand-inked slightly irregular violet contours, thin bright white outer keyline, brushed highlights and small painted bevels, gently imperfect illustrated shapes. It must look like a real painted game sprite, not flat vector UI, not website UI, not glassmorphism, not 3D render. Crisp detailed raster art, front view. No photorealism. Use a perfectly uniform solid pure CYAN background #00FFFF, including empty gaps. Every separate sprite is entirely within its assigned cell with a clear 12 percent empty margin. No shadows on the cyan background, no layout grid lines, no labels, no watermarks. All sprite interiors are fully opaque. A production sprite atlas, exactly 3 columns and 2 rows, equal square cells. SIX round purple interface buttons. Each has lavender painted face, thick white uneven ink outline, dark purple lower rim, modest soft hand-painted highlight. Row 1 from left: pause icon made of two bold white bars; back icon made of one bold white arrow pointing left; settings icon a bold white cog. Row 2: white question mark hint button with tiny yellow sparkle; white speaker icon with two sound waves; white speaker icon with a small white x. Buttons should match inexpensive but charming illustrated mobile beauty minigame reference art, not smooth enterprise design. No text except the question mark. Each circle fills about 72 percent of its square cell.
```

## cat-open

Анимируемое состояние без изменения остальных пиксельных ориентиров

Источник: `reference/feel-generation.json`. Модель результата: `nano_banana_flash`. Job: `f22114cd-2356-4e1c-b1ec-40d0a1ef12aa`.

```text
Edit the supplied exact game character image. The ONLY change: her two eyes are now naturally OPEN, with beautiful warm hazel brown irises, soft friendly relaxed gaze toward the viewer, glossy tiny highlights and graceful eyelashes matching the existing illustration. Preserve the exact face, closed smiling mouth, nose, brows, headband, head shape, color palette, flat export background and image dimensions. ALL landmarks and artwork outside the two eyelids must stay in the EXACT SAME pixel positions. Do not zoom, crop, rotate, shift, repaint or restyle any other detail. The open eyes must fit the existing eyelid sockets and look like the idle expression of this exact character in a premium skincare game. No text, no new elements, same composition. High resolution polished hand-painted game artwork.
```

## rubbish-sack

Изолированный предмет с понятным назначением вместо случайного спрайта

Источник: `reference/cleaning-audit/generation.json`. Модель результата: `не дублируется в этой выдержке`. Job: `см. исходный manifest`.

```text
Hand-painted polished 2D mobile cleaning game asset, gentle pastel shading, crisp dark plum contour outlines, cozy modern design. Clean and pristine, no dirt, no stains, no text, no sparkles, no floor shadow. Isolated on perfectly uniform pure cyan #00FFFF; absolutely no room or landscape background. No cyan or turquoise color on the objects themselves. Keep the entire object inside image with clear margins. One large OPEN charcoal-purple plastic rubbish sack for collecting litter. A round wide rolled-open mouth, visible dark interior, soft crinkled sides and a squat rounded bottom. Three-quarter front view. Looks clearly like a garbage bag, NOT a boutique shopping bag: no handles, no ribbon, no logo, no strings across the opening. One crumpled paper peeking from the side of its mouth. Large single sprite centered on a square canvas.
```

## jet-scene

Реальный исходный промпт сцены; позже подход к фонам уточнили при cleaning audit

Источник: `reference/premium-redesign/generation.json`. Модель результата: `gpt_image_2_5`. Job: `b8785679-dec0-47b8-b04c-9efc466895c8`.

```text
Illustration for a cozy ASMR cleaning mobile game, polished hand-painted 2D casual game art, dark plum outlines, soft peach and lavender lighting, detailed tactile materials. Portrait 4:5 composition. No UI, no text, no characters, no gold ornament borders. This is the CLEAN final scene; dirt, foam and loose objects will be drawn by game code. Front three-quarter view with broad reachable surfaces, consistent perspective, focus fills the picture, not a tiny floating object. Private jet cabin. Two LARGE cream leather passenger seats on left and right in the lower two thirds, curved oval jet windows along upper side walls, visible lilac carpeted center aisle in the lower center, narrow walnut tables near the seats. Luxurious but restrained. Seats are unoccupied, tables empty. Camera looking down center aisle, not panoramic.
```
