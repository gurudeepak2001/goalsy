export type ScoreDriverSnapshot = {
  label: string;
  value: number;
  maxValue: number;
  trend: string;
};

export type ScoreChange = {
  status: "insufficient_history" | "unchanged" | "changed";
  delta: number;
  previousScore: number | null;
  reasons: Array<{
    label: string;
    delta: number;
    previousValue: number;
    currentValue: number;
    explanation: string;
  }>;
};

export function parseScoreDrivers(value: string | null): ScoreDriverSnapshot[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((driver) =>
      typeof driver?.label === "string"
      && typeof driver?.value === "number"
      && typeof driver?.maxValue === "number"
      && typeof driver?.trend === "string",
    )) {
      return null;
    }
    return parsed as ScoreDriverSnapshot[];
  } catch {
    return null;
  }
}

export function buildScoreChange(
  score: number,
  currentDrivers: ScoreDriverSnapshot[],
  previous: { score: number; driversJson: string | null } | undefined,
): ScoreChange {
  if (!previous) {
    return { status: "insufficient_history", delta: 0, previousScore: null, reasons: [] };
  }

  const delta = score - previous.score;
  const previousDrivers = parseScoreDrivers(previous.driversJson);
  if (delta === 0) {
    return { status: "unchanged", delta, previousScore: previous.score, reasons: [] };
  }
  if (!previousDrivers) {
    return { status: "changed", delta, previousScore: previous.score, reasons: [] };
  }

  const previousByLabel = new Map(previousDrivers.map((driver) => [driver.label, driver]));
  const reasons = currentDrivers
    .map((driver) => {
      const prior = previousByLabel.get(driver.label);
      if (!prior || prior.value === driver.value) return null;
      const driverDelta = driver.value - prior.value;
      return {
        label: driver.label,
        delta: driverDelta,
        previousValue: prior.value,
        currentValue: driver.value,
        explanation: `${driver.label} ${driverDelta > 0 ? "increased" : "decreased"} from ${prior.value} to ${driver.value} points.`,
      };
    })
    .filter((reason): reason is NonNullable<typeof reason> => reason !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { status: "changed", delta, previousScore: previous.score, reasons };
}