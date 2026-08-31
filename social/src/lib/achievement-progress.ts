export function computeLevel(achievements: readonly { unlocked: boolean; xp: number }[]) {
  const totalXp = achievements.filter((item) => item.unlocked && Number.isFinite(item.xp) && item.xp > 0)
    .reduce((sum, item) => sum + item.xp, 0);
  const level = Math.floor(Math.sqrt(totalXp / 50)) + 1;
  const currentLevelXp = (level - 1) ** 2 * 50;
  const nextLevelXp = level ** 2 * 50;
  const progress = Math.max(0, Math.min(100, (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp) * 100));
  return { level, totalXp, currentLevelXp, nextLevelXp, progress };
}
