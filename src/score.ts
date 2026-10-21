import { allChecks } from './checks/index.js';
import type { Check, CheckOutcome, PulseReport, RepoSnapshot, RepoStatus } from './types.js';

/** A committed secret or similar critical finding never scores above this. */
export const CRITICAL_SCORE_CAP = 40;

/** Points contributed by a check status: full, half, nothing. */
const STATUS_FACTOR = { ok: 1, warn: 0.5, fail: 0 } as const;

export type ScoreTone = 'green' | 'yellow' | 'red';

export function statusForScore(score: number): RepoStatus {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'Critical';
}

/** Badge / report colour bucket: green ≥ 70, yellow 50–69, red < 50. */
export function toneForScore(score: number): ScoreTone {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function scoreOutcomes(outcomes: CheckOutcome[], totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  const earned = outcomes.reduce(
    (sum, outcome) => sum + outcome.weight * STATUS_FACTOR[outcome.status],
    0,
  );
  return Math.round((earned / totalWeight) * 100);
}

/** Up to `limit` recommendations, most valuable (highest weight, failures first) on top. */
export function pickRecommendations(outcomes: CheckOutcome[], limit = 3): string[] {
  const unique = new Set<string>();

  return outcomes
    .filter((outcome) => outcome.status !== 'ok')
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        Number(b.status === 'fail') - Number(a.status === 'fail'),
    )
    .map((outcome) => outcome.recommendation)
    .filter((text) => (unique.has(text) ? false : unique.add(text)))
    .slice(0, limit);
}

export interface EvaluateOptions {
  checks?: Check[];
  totalWeight?: number;
}

/** Run every check against a snapshot and produce the public report. */
export function evaluate(
  snapshot: RepoSnapshot,
  { checks = allChecks, totalWeight }: EvaluateOptions = {},
): PulseReport {
  const weight = totalWeight ?? checks.reduce((sum, check) => sum + check.weight, 0);

  const results = checks.map((check) => ({ check, result: check.run(snapshot) }));

  const outcomes: CheckOutcome[] = results.map(({ check, result }) => ({
    id: check.id,
    title: check.title,
    status: result.status,
    weight: check.weight,
    message: result.message,
    recommendation: result.recommendation,
  }));

  const hasCritical = results.some(
    ({ result }) => result.critical === true && result.status !== 'ok',
  );

  let score = scoreOutcomes(outcomes, weight);
  if (hasCritical) score = Math.min(score, CRITICAL_SCORE_CAP);

  return {
    repo: snapshot.fullName,
    score,
    status: statusForScore(score),
    checks: outcomes,
    recommendations: pickRecommendations(outcomes),
  };
}
