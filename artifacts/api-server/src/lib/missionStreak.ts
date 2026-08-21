const SEVEN_DAY_STREAK = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface MissionHistoryEntry {
  missionDate: string;
  completedAt: Date | null;
  status: string;
}

function dayNumber(missionDate: string): number {
  const [year, month, day] = missionDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_IN_MS;
}

export function calculateMissionStreak(
  missionHistory: MissionHistoryEntry[],
  todayDate: string,
) {
  const sortedMissions = missionHistory
    .filter((mission) => mission.status === "completed")
    .sort(
    (left, right) => left.missionDate.localeCompare(right.missionDate),
  );
  const streakByDay = new Map<number, number>();
  let previousDay: number | undefined;
  let streak = 0;
  let longestStreak = 0;
  let firstSevenDayStreakAt: string | null = null;

  for (const mission of sortedMissions) {
    const missionDay = dayNumber(mission.missionDate);
    if (missionDay === previousDay) continue;

    streak = previousDay !== undefined && missionDay === previousDay + 1 ? streak + 1 : 1;
    streakByDay.set(missionDay, streak);
    longestStreak = Math.max(longestStreak, streak);

    if (streak === SEVEN_DAY_STREAK && firstSevenDayStreakAt === null) {
      firstSevenDayStreakAt = mission.completedAt?.toISOString()
        ?? `${mission.missionDate}T00:00:00.000Z`;
    }
    previousDay = missionDay;
  }

  const today = dayNumber(todayDate);
  const skippedToday = missionHistory.some(
    (mission) => mission.missionDate === todayDate && mission.status === "skipped",
  );
  const currentStreak = skippedToday
    ? 0
    : streakByDay.get(today) ?? streakByDay.get(today - 1) ?? 0;

  return { currentStreak, longestStreak, firstSevenDayStreakAt };
}