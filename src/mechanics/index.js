import { BrushMechanic } from './BrushMechanic.js';
import { ChunkBreakMechanic } from './ChunkBreakMechanic.js';
import { DragToTargetMechanic } from './DragToTargetMechanic.js';
import { SpotsMechanic } from './SpotsMechanic.js';
import { PointTargetsMechanic } from './PointTargetsMechanic.js';

// Creates the mechanic for one stage from content data. A stage-level `region` restricts the
// stage to part of the object (e.g. the chair seat).
// `radiusMul` = the equipped alternative tool's footprint modifier (Step 7, content data).
export function createMechanic(stage, { stack, tool, scene, radiusMul = 1 }) {
  let params = stage.region ? { ...stage.params, region: stage.region } : stage.params;
  if (radiusMul !== 1 && params.radius) params = { ...params, radius: params.radius * radiusMul };
  switch (stage.mechanic) {
    case 'brush':
      return new BrushMechanic({ stack, params, tool });
    case 'chunkBreak':
      return new ChunkBreakMechanic({ stack, params, chunkMap: stack.getChunkMap(stage.params.layer) });
    case 'dragToTarget':
      return new DragToTargetMechanic({ stack, params, scene });
    case 'spots':
      return new SpotsMechanic({ stack, params, scene });
    case 'points':
      return new PointTargetsMechanic({ stack, params, scene });
    default:
      throw new Error(`Unknown mechanic: ${stage.mechanic}`);
  }
}

// Gesture family of a stage (hint selection and "first time" tracking).
export function gestureFamily(stage, tool) {
  if (stage.mechanic === 'dragToTarget') return 'drag-item';
  if (stage.mechanic === 'spots') return 'spot';
  if (stage.mechanic === 'chunkBreak') return 'chisel';
  if (stage.mechanic === 'points') return `point-${stage.params.mode}`;
  if (stage.params?.source) return 'rub-load';
  if (tool.kind === 'jet') return 'jet';
  return 'rub';
}
