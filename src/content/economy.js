// Starting economy. PROVISIONAL: real numbers are set at Step 7 and tuned at Step 10.
// Reference observation: +15 for the soccer ball. Replays currently pay the same base reward.

const COMPLETION_REWARDS = {
  'soccer-ball': 15,
};

export const economy = {
  completionReward(levelId) {
    return COMPLETION_REWARDS[levelId] ?? 10;
  },
};
