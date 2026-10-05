import { BrushMechanic } from './BrushMechanic.js';
import { ChunkBreakMechanic } from './ChunkBreakMechanic.js';
import { DragToTargetMechanic } from './DragToTargetMechanic.js';
import { SpotsMechanic } from './SpotsMechanic.js';

// Creates the mechanic for one stage from content data. A stage-level `region` restricts the
// stage to part of the object (e.g. the chair seat).
export function createMechanic(stage, { stack, tool, scene }) {
  const params = stage.region ? { ...stage.params, region: stage.region } : stage.params;
  switch (stage.mechanic) {
    case 'brush':
      return new BrushMechanic({ stack, params, tool });
    case 'chunkBreak':
      return new ChunkBreakMechanic({ stack, params, chunkMap: stack.getChunkMap(stage.params.layer) });
    case 'dragToTarget':
      return new DragToTargetMechanic({ stack, params, scene });
    case 'spots':
      return new SpotsMechanic({ stack, params, scene });
    default:
      throw new Error(`Unknown mechanic: ${stage.mechanic}`);
  }
}

// Gesture family of a stage (hint selection and "first time" tracking).
export function gestureFamily(stage, tool) {
  if (stage.mechanic === 'dragToTarget') return 'drag-item';
  if (stage.mechanic === 'spots') return 'spot';
  if (stage.mechanic === 'chunkBreak') return 'chisel';
  if (tool.kind === 'jet') return 'jet';
  return 'rub';
}
