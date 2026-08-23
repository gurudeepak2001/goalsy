import { describe, expect, it } from 'vitest';
import { buildChartData } from './ScoreScreen';

describe('buildChartData', () => {
  it('keeps only the latest score for each month and preserves year boundaries', () => {
    const chartData = buildChartData([
      { score: 842, computedAt: '2026-08-22T18:00:00.000Z' },
      { score: 835, computedAt: '2026-08-06T09:00:00.000Z' },
      { score: 810, computedAt: '2026-07-30T09:00:00.000Z' },
      { score: 790, computedAt: '2025-08-31T09:00:00.000Z' },
    ]);

    expect(chartData.map(({ period, score }) => ({ period, score }))).toEqual([
      { period: '2025-08', score: 790 },
      { period: '2026-07', score: 810 },
      { period: '2026-08', score: 842 },
    ]);
  });
});