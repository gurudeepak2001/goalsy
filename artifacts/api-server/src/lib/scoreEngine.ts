/** Shared tier labels — kept in sync with the frontend scoreUtils.ts */
export function getScoreTier(score: number): string {
  if (score >= 850) return "Ready";
  if (score >= 600) return "Strong";
  if (score >= 300) return "Steady";
  return "Building";
}
