// Level 1 · Soccer Ball. Stage order and behaviour from the reference video 00:06–01:04
// (project/REFERENCE-BREAKDOWN.md §3 L-A, project/REFERENCE-ANALYSIS.md §6).
//
// The object is a stack of layers on one canvas, bottom → top. A stage adds, removes or
// transforms layers. All lengths are object-local units (canvas 1024, ball radius 440).

export const soccerBall = {
  id: 'soccer-ball',
  title: 'Soccer Ball',
  backgrounds: { portrait: 'bg-pitch-portrait', landscape: 'bg-pitch-landscape' },
  thumbnail: 'thumb-soccer-ball',
  resultPicture: 'result-picture-soccer-ball',
  object: {
    shape: 'circle',
    canvasSize: 1024,
    radius: 440,
    layers: [
      { id: 'clean', texture: 'ball-clean', initial: 'full', static: true },
      { id: 'wet', texture: 'ball-wet', initial: 'full' },
      { id: 'stained', texture: 'ball-stained', initial: 'full' },
      // Scrubbed state of the SAME foam (derived from tex-foam, see scripts/prepare_assets.py).
      { id: 'scrubbed', texture: 'tex-foam-scrubbed-full', initial: 'empty' },
      { id: 'foam', texture: 'tex-foam-full', initial: 'empty' },
      { id: 'dusty', texture: 'ball-dusty', initial: 'full' },
      { id: 'mud', texture: 'ball-mudcrust', initial: 'chunks' },
    ],
  },
  // targetSeconds: design target for a first-time player (REFERENCE-ANALYSIS §6); tuned at Step 10.
  stages: [
    {
      id: 'chisel',
      tool: 'chisel',
      mechanic: 'chunkBreak',
      params: { layer: 'mud', chunkCount: 24, breakDistance: 176, tipRadius: 38, seed: 1201 },
      targetSeconds: [12, 16],
    },
    {
      id: 'dry-brush',
      tool: 'dry-brush',
      mechanic: 'brush',
      params: { mode: 'reveal', layers: ['dusty'], radius: 110, threshold: 0.96 },
      targetSeconds: [5, 8],
    },
    {
      id: 'foam-spray',
      tool: 'foam-sprayer',
      mechanic: 'brush',
      params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 140, threshold: 0.96 },
      targetSeconds: [6, 9],
    },
    {
      id: 'scrub',
      tool: 'scrub-brush',
      mechanic: 'brush',
      params: {
        mode: 'scrub',
        from: 'foam',
        under: 'scrubbed',
        clear: ['stained'],
        radius: 106,
        threshold: 0.96,
      },
      targetSeconds: [6, 9],
    },
    {
      id: 'rinse',
      tool: 'washer-lance',
      mechanic: 'brush',
      params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'stained'], radius: 103, threshold: 0.96 },
      targetSeconds: [6, 9],
    },
    {
      id: 'dry',
      tool: 'cloth',
      mechanic: 'brush',
      params: { mode: 'reveal', layers: ['wet'], radius: 125, threshold: 0.96 },
      targetSeconds: [4, 6],
    },
  ],
};
