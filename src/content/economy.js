// Starting economy. PROVISIONAL: real numbers are set at Step 7 and tuned at Step 10.
// Reference observation: +15 for the soccer ball. Replays currently pay the same base reward.

// Reference observations (REFERENCE-BREAKDOWN §0): ball +15, rug +15, trophy +20, chair +20, sneaker +20.
const COMPLETION_REWARDS = {
  'soccer-ball': 15,
  rug: 15,
  'golden-trophy': 20,
  chair: 20,
  sneaker: 20,
};

export const economy = {
  completionReward(levelId) {
    return COMPLETION_REWARDS[levelId] ?? 10;
  },
};
