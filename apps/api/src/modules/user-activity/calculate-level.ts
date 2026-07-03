export interface LevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

const INITIAL_THRESHOLDS = [0, 100, 250, 450, 700] as const;

export function xpForNextLevel(level: number): number {
  return 100 + ((Math.max(1, Math.floor(level)) - 1) * 50);
}

export function xpThresholdForLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(level));
  if (normalized <= INITIAL_THRESHOLDS.length) return INITIAL_THRESHOLDS[normalized - 1];
  return (25 * normalized * normalized) + (25 * normalized) - 50;
}

export function calculateLevel(totalXpInput: number): LevelProgress {
  const totalXp = Number.isFinite(totalXpInput) ? Math.max(0, Math.floor(totalXpInput)) : 0;
  let level: number;
  if (totalXp < 100) level = 1;
  else if (totalXp < 250) level = 2;
  else if (totalXp < 450) level = 3;
  else if (totalXp < 700) level = 4;
  else {
    level = Math.max(5, Math.floor((-1 + Math.sqrt(1 + (4 * (totalXp + 50) / 25))) / 2));
    while (xpThresholdForLevel(level + 1) <= totalXp) level += 1;
    while (level > 5 && xpThresholdForLevel(level) > totalXp) level -= 1;
  }
  const threshold = xpThresholdForLevel(level);
  const nextThreshold = xpThresholdForLevel(level + 1);
  const currentLevelXp = totalXp - threshold;
  const nextLevelXp = nextThreshold - threshold;
  return {
    level,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    progressPercent: nextLevelXp === 0 ? 100 : Math.min(100, Math.max(0, (currentLevelXp / nextLevelXp) * 100)),
  };
}
