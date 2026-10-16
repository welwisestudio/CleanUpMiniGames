import { PenaltyGame } from './games/PenaltyGame.js';
import { CleaverThrowGame } from './games/CleaverThrowGame.js';
import { CannonGame } from './games/CannonGame.js';
import { PianoGame } from './games/PianoGame.js';
import { PancakeFlipGame } from './games/PancakeFlipGame.js';
import { ToolMemoryGame } from './games/ToolMemoryGame.js';
import { KeyRushGame } from './games/KeyRushGame.js';
import { GrillMasterGame } from './games/GrillMasterGame.js';
import { BubblePopGame } from './games/BubblePopGame.js';
import { SimonButtonsGame } from './games/SimonButtonsGame.js';
import { StopTheClockGame } from './games/StopTheClockGame.js';
import { CrystalChimesGame } from './games/CrystalChimesGame.js';
import { BrassRingGrabGame } from './games/BrassRingGrabGame.js';
import { FruitCatchGame } from './games/FruitCatchGame.js';
import { BloomGardenGame } from './games/BloomGardenGame.js';
import { FlowerTossGame } from './games/FlowerTossGame.js';
import { PoolShotGame } from './games/PoolShotGame.js';
import { ToastCatchGame } from './games/ToastCatchGame.js';
import { TuneInGame } from './games/TuneInGame.js';
import { FeedFishGame } from './games/FeedFishGame.js';
import { WishingCoinsGame } from './games/WishingCoinsGame.js';
import { PuddleRunGame } from './games/PuddleRunGame.js';
import { BalloonBreezeGame } from './games/BalloonBreezeGame.js';
import { ShieldBlockGame } from './games/ShieldBlockGame.js';
import { MowDashGame, HighwayRideGame, SundayDriveGame } from './games/DriveGame.js';

// Post-cleaning minigames, keyed by level id (prototype batch 2026-10-15, polished the same day).
// `total` = number of progress pips; `theme.dimAlpha` = how much the level backdrop is dimmed.
// A level without an entry goes straight to the normal completion flow.
export const MINIGAMES = {
  'soccer-ball': { title: 'Penalty Kick!', hint: 'Pull back from the ball and let go - 2 goals win', total: 3, winText: 'CHAMPION!', Game: PenaltyGame, theme: { dimAlpha: 0.05 } },
  'rusty-cleaver': { title: 'Cleaver Throw!', hint: 'Tap to throw - don’t hit a stuck cleaver', total: 4, winText: 'PERFECT!', Game: CleaverThrowGame, theme: { dimAlpha: 0.3 } },
  cannon: { title: 'Cannon Blast!', hint: 'Tap when the crosshair is on a barrel', total: 3, winText: 'BULLSEYE!', Game: CannonGame, theme: { dimAlpha: 0.04 } },
  'upright-piano': { title: 'Piano Notes!', hint: 'Tap a key when its note reaches the ring', total: 6, winText: 'BRAVO!', Game: PianoGame, theme: { dimAlpha: 0.42, dim: 0x1a0f3a } },
  // ---- expansion 2026-10-16 (shared systems, src/minigames/systems/kit.js) ----
  // `sprites` = the minigame art this game loads; `assets` = reused game art (boot set)
  'frying-pan': { title: 'Pancake Flip!', hint: 'Tap when the marker is in the green', total: 5, winText: 'CHEF!', Game: PancakeFlipGame, sprites: ['mg-pancake'], theme: { dimAlpha: 0.12 } },
  toolbox: { title: 'Tool Memory!', hint: 'Find the matching tool pairs', total: 3, winText: 'SHARP MIND!', Game: ToolMemoryGame, assets: ['tool-hammer', 'tool-screwdriver', 'tool-paint-brush'], theme: { dimAlpha: 0.25 } },
  keyboard: { title: 'Key Rush!', hint: 'Tap the keys as they pop up', total: 8, winText: 'SPEEDY!', Game: KeyRushGame, theme: { dimAlpha: 0.2 } },
  'garden-grill': { title: 'Grill Master!', hint: 'Tap each sausage when its bar is green', total: 6, winText: 'GRILL MASTER!', Game: GrillMasterGame, sprites: ['mg-sausage'], theme: { dimAlpha: 0.1 } },
  bathtub: { title: 'Bubble Pop!', hint: 'Pop the bubbles - ducks are worth 3', total: 5, winText: 'SQUEAKY CLEAN!', Game: BubblePopGame, sprites: ['mg-bubble', 'mg-duck'], theme: { dimAlpha: 0.22 } },
  'game-controller': { title: 'Simon Buttons!', hint: 'Watch the lights, then repeat them', total: 3, winText: 'GENIUS!', Game: SimonButtonsGame, theme: { dimAlpha: 0.35, dim: 0x1a0f3a } },
  'pocket-watch': { title: 'Stop the Clock!', hint: 'Tap to stop the hand on the green', total: 4, winText: 'RIGHT ON TIME!', Game: StopTheClockGame, theme: { dimAlpha: 0.3 } },
  chandelier: { title: 'Crystal Chimes!', hint: 'Tap a ring when its crystal arrives', total: 7, winText: 'SPARKLING!', Game: CrystalChimesGame, sprites: ['mg-crystal'], theme: { dimAlpha: 0.4, dim: 0x1a0f3a } },
  'carousel-horse': { title: 'Brass Ring Grab!', hint: 'Tap when a ring is in the glowing circle', total: 6, winText: 'WHEEE!', Game: BrassRingGrabGame, assets: ['icon-coin'], theme: { dimAlpha: 0.15 } },
  // Batch B
  'wooden-crate': { title: 'Fruit Catch!', hint: 'Slide the crate to catch the apples', total: 7, winText: 'FRESH PICKED!', Game: FruitCatchGame, sprites: ['mg-apple'], theme: { dimAlpha: 0.1 } },
  'watering-can': { title: 'Bloom the Garden!', hint: 'Hold to pour - water every pot', total: 4, winText: 'GREEN THUMB!', Game: BloomGardenGame, sprites: ['mg-pot'], assets: ['fx-drop-1'], theme: { dimAlpha: 0.1 } },
  'porcelain-vase': { title: 'Flower Toss!', hint: 'Swipe up to toss a rose into the vase', total: 5, winText: 'LOVELY!', Game: FlowerTossGame, sprites: ['mg-rose'], theme: { dimAlpha: 0.2 } },
  'swimming-pool': { title: 'Pool Shot!', hint: 'Pull back from the ball and let go', total: 3, winText: 'SPLASH HIT!', Game: PoolShotGame, sprites: ['mg-swimring', 'mg-beachball'], theme: { dimAlpha: 0.05 } },
  toaster: { title: 'Toast Catch!', hint: 'Slide the plate under the toast', total: 5, winText: 'BREAKFAST!', Game: ToastCatchGame, sprites: ['mg-toast', 'mg-plate'], theme: { dimAlpha: 0.15 } },
  'retro-radio': { title: 'Tune In!', hint: 'Tap when the needle is on the station', total: 4, winText: 'ON AIR!', Game: TuneInGame, theme: { dimAlpha: 0.25 } },
  aquarium: { title: 'Feed the Fish!', hint: 'Tap the water to drop food', total: 3, winText: 'HAPPY FISH!', Game: FeedFishGame, sprites: ['mg-fish'], theme: { dimAlpha: 0.2 } },
  'stone-fountain': { title: 'Wishing Coins!', hint: 'Flick a coin into the glowing spot', total: 5, winText: 'LUCKY YOU!', Game: WishingCoinsGame, assets: ['icon-coin'], theme: { dimAlpha: 0.1 } },
  // Batch C
  sneaker: { title: 'Puddle Run!', hint: 'Tap to jump over the puddles', total: 5, winText: 'SPOTLESS!', Game: PuddleRunGame, sprites: ['mg-road', 'mg-puddle'], theme: { dimAlpha: 0.15 } },
  'desk-fan': { title: 'Balloon Breeze!', hint: 'Hold to blow the balloon up to the coins', total: 6, winText: 'BREEZY!', Game: BalloonBreezeGame, sprites: ['mg-balloon'], assets: ['icon-coin'], theme: { dimAlpha: 0.15 } },
  'lawn-mower': { title: 'Mow Dash!', hint: 'Tap above or below to switch lanes - mow the grass', total: 8, winText: 'FRESH CUT!', Game: MowDashGame, sprites: ['mg-lawn', 'mg-grass', 'mg-gnome'], theme: { dimAlpha: 0.12 } },
  'vintage-motorcycle': { title: 'Highway Ride!', hint: 'Tap above or below to dodge the cones', total: 5, winText: 'EASY RIDER!', Game: HighwayRideGame, sprites: ['mg-road', 'mg-cone', 'mg-barrier'], assets: ['icon-coin'], theme: { dimAlpha: 0.12 } },
  'knight-armor': { title: 'Shield Block!', hint: 'Tap the side the arrow comes from', total: 6, winText: 'VALIANT!', Game: ShieldBlockGame, sprites: ['mg-arrow'], theme: { dimAlpha: 0.3 } },
  'vintage-car': { title: 'Sunday Drive!', hint: 'Tap above or below to collect the coins', total: 6, winText: 'LOVELY DRIVE!', Game: SundayDriveGame, sprites: ['mg-road', 'mg-hay'], assets: ['icon-coin'], theme: { dimAlpha: 0.12 } },
};

export function minigameFor(levelId) {
  return MINIGAMES[levelId] ?? null;
}
