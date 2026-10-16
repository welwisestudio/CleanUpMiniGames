// Custom Phaser 3.90 entry (size pass 2026-10-16): the official `phaser-core` set plus exactly the
// extra game objects this game uses — Container, Particles, RenderTexture, Zone, NineSlice, the
// Arc / Ellipse / Rectangle shapes — and the full Math and Curves namespaces. Physics, tilemaps,
// video, meshes, bitmap text, blitters, lights, DOM elements, spine / camera3d / fbinstant plugins
// and the other unused modules are left out. `import Phaser from 'phaser'` resolves here
// (vite.config.js alias); the build flags Phaser's webpack build would set are applied by the
// `phaser-flags` transform in vite.config.js.
import Phaser from 'phaser/src/phaser-core.js';
import Container from 'phaser/src/gameobjects/container/Container.js';
import 'phaser/src/gameobjects/container/ContainerFactory.js';
import 'phaser/src/gameobjects/container/ContainerCreator.js';
import Particles from 'phaser/src/gameobjects/particles/index.js';
import 'phaser/src/gameobjects/particles/ParticleEmitterFactory.js';
import 'phaser/src/gameobjects/particles/ParticleEmitterCreator.js';
import RenderTexture from 'phaser/src/gameobjects/rendertexture/RenderTexture.js';
import 'phaser/src/gameobjects/rendertexture/RenderTextureFactory.js';
import 'phaser/src/gameobjects/rendertexture/RenderTextureCreator.js';
import Zone from 'phaser/src/gameobjects/zone/Zone.js';
import 'phaser/src/gameobjects/zone/ZoneFactory.js';
import 'phaser/src/gameobjects/zone/ZoneCreator.js';
import NineSlice from 'phaser/src/gameobjects/nineslice/NineSlice.js';
import 'phaser/src/gameobjects/nineslice/NineSliceFactory.js';
import 'phaser/src/gameobjects/nineslice/NineSliceCreator.js';
import Arc from 'phaser/src/gameobjects/shape/arc/Arc.js';
import 'phaser/src/gameobjects/shape/arc/ArcFactory.js';
import Ellipse from 'phaser/src/gameobjects/shape/ellipse/Ellipse.js';
import 'phaser/src/gameobjects/shape/ellipse/EllipseFactory.js';
import Rectangle from 'phaser/src/gameobjects/shape/rectangle/Rectangle.js';
import 'phaser/src/gameobjects/shape/rectangle/RectangleFactory.js';
import MathNS from 'phaser/src/math/index.js';
import Curves from 'phaser/src/curves/index.js';

Object.assign(Phaser.GameObjects, { Container, Particles, RenderTexture, Zone, NineSlice, Arc, Ellipse, Rectangle });
Phaser.Math = MathNS;
Phaser.Curves = Curves;

export default Phaser;
