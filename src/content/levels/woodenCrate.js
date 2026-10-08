// Level 8 · Painted Wooden Crate (CONTENT-MATRIX Batch A, early, 7 stages). Restoration idea:
// strip the old flaking paint and repaint. Dust → scrape the paint flakes → sand → wipe the
// sawdust → paint the slats → paint the corner posts (detail brush) → varnish.

export const woodenCrate = {
  id: 'wooden-crate',
  title: 'Wooden Crate',
  backgrounds: { portrait: 'bg-workshop-portrait', landscape: 'bg-workshop-landscape' },
  thumbnail: 'wooden-crate-thumb',
  thumbnailClean: 'wooden-crate-thumb-clean',
  resultPicture: 'wooden-crate-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'wooden-crate-mask',
    outsideMask: 'wooden-crate-mask-outside',
    shadow: 'flat',
    regions: {
      slats: { mask: 'wooden-crate-slats-mask' },
      posts: { mask: 'wooden-crate-posts-mask' },
    },
    layers: [
      { id: 'clean', texture: 'wooden-crate-clean', initial: 'full', static: true }, // varnished
      { id: 'painted', texture: 'wooden-crate-painted', initial: 'full' },
      { id: 'sanded', texture: 'wooden-crate-sanded', initial: 'full' },
      { id: 'sawdust', texture: 'wooden-crate-sawdust', initial: 'full' },
      { id: 'rough', texture: 'wooden-crate-rough', initial: 'full' },
      { id: 'flaking', texture: 'wooden-crate-flaking', initial: 'chunks' },
      { id: 'dusty', texture: 'wooden-crate-dusty', initial: 'full' },
    ],
  },
  stages: [
    { id: 'dust', tool: 'duster', mechanic: 'brush', params: { mode: 'reveal', layers: ['dusty'], radius: 55, threshold: 0.95 }, targetSeconds: [6, 9] },
    { id: 'peel', family: 'scrape', tool: 'wide-scraper', mechanic: 'chunkBreak', fx: 'chips', params: { layer: 'flaking', chunkCount: 26, breakDistance: 150, tipRadius: 46, seed: 8801 }, targetSeconds: [10, 14] },
    { id: 'sand', family: 'sand', tool: 'sandpaper', mechanic: 'brush', fx: 'sawdust', params: { mode: 'reveal', layers: ['rough'], radius: 60, threshold: 0.95 }, targetSeconds: [7, 10] },
    { id: 'wipe', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['sawdust'], radius: 120, threshold: 0.95 }, targetSeconds: [4, 7] },
    { id: 'paint-slats', tool: 'paint-brush', mechanic: 'brush', region: 'slats', outline: true, params: { mode: 'reveal', layers: ['sanded'], radius: 32, aspect: 1.9, threshold: 0.95 }, targetSeconds: [8, 12] },
    { id: 'paint-posts', tool: 'detail-brush', mechanic: 'brush', region: 'posts', outline: true, params: { mode: 'reveal', layers: ['sanded'], radius: 34, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'varnish', tool: 'stain-sponge', mechanic: 'brush', params: { mode: 'reveal', layers: ['painted'], radius: 90, threshold: 0.95 }, targetSeconds: [5, 8] },
  ],
};
