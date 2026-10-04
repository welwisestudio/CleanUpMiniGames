import { Emitter } from '../core/Emitter.js';

// Grants rewards exactly once per operation and records them in the SaveService.
// Animations listen to 'granted' and only display the already-accepted change.

export class RewardService extends Emitter {
  constructor({ save, economy }) {
    super();
    this.save = save;
    this.economy = economy;
    this._processed = new Map(); // operationId -> result
  }

  // Completion of one play run of a level. `runId` is unique per level start,
  // so a repeated call for the same run never pays twice.
  grantLevelCompletion(levelId, runId) {
    const operationId = `complete:${levelId}:${runId}`;
    if (this._processed.has(operationId)) return this._processed.get(operationId);

    const amount = this.economy.completionReward(levelId);
    let coinsBefore = 0;
    let coinsAfter = 0;
    const savePromise = this.save.update((s) => {
      coinsBefore = s.coins;
      s.coins += amount;
      coinsAfter = s.coins;
      const entry = (s.levels[levelId] ??= { completed: false, completions: 0 });
      entry.completed = true;
      entry.completions += 1;
    });
    const result = { operationId, levelId, amount, currency: 'coins', coinsBefore, coinsAfter, savePromise };
    this._processed.set(operationId, result);
    this.emit('granted', result);
    return result;
  }
}
