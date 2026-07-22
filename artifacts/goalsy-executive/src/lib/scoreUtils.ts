/**
 * Maps a raw Goalsy Score to the PRD-defined tier label.
 *
 * Tier ranges (per PRD §4.8 FR-GS-006):
 *   Building  0   – 299
 *   Steady    300 – 599
 *   Strong    600 – 849
 *   Ready     850 – 1000
 */
export function getScoreTier(score: number): string {
  if (score >= 850) return 'Ready';
  if (score >= 600) return 'Strong';
  if (score >= 300) return 'Steady';
  return 'Building';
}
