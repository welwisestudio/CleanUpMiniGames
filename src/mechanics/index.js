import { BrushMechanic } from './BrushMechanic.js';
import { ChunkBreakMechanic } from './ChunkBreakMechanic.js';

// Creates the mechanic for one stage from content data.
export function createMechanic(stage, { stack, tool }) {
  switch (stage.mechanic) {
    case 'brush':
      return new BrushMechanic({ stack, params: stage.params, tool });
    case 'chunkBreak':
      return new ChunkBreakMechanic({ stack, params: stage.params, chunkMap: stack.getChunkMap(stage.params.layer) });
    default:
      throw new Error(`Unknown mechanic: ${stage.mechanic}`);
  }
}
