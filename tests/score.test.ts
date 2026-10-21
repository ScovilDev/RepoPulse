import { describe, expect, it } from 'vitest';
import { allChecks, totalWeight } from '../src/checks/index.js';
import {
  CRITICAL_SCORE_CAP,
  evaluate,
  pickRecommendations,
  scoreOutcomes,
  statusForScore,
  toneForScore,
} from '../src/score.js';
import type { Check, CheckOutcome } from '../src/types.js';
import { makeBrokenSnapshot, makeSnapshot } from './helpers.js';

function outcome(
  weight: number,
  status: CheckOutcome['status'],
  id = 'x',
): CheckOutcome {
  return {
    id,
    title: id,
    status,
    weight,
    message: '',
    recommendation: `fix ${id}`,
  };
}

describe('weights', () => {
  it('sum to exactly 100', () => {
    expect(totalWeight).toBe(100);
  });

  it('match the documented formula', () => {
    const weights = Object.fromEntries(allChecks.map((check) => [check.id, check.weight]));
    expect(weights).toEqual({
      readme: 15,
      license: 10,
      description: 5,
      topics: 5,
      ci: 15,
      tests: 15,
      releases: 10,
      activity: 15,
      secrets: 5,
      gitignore: 5,
    });
  });
});

describe('scoreOutcomes', () => {
  it('gives full points for ok checks', () => {
    expect(scoreOutcomes([outcome(50, 'ok'), outcome(50, 'ok')], 100)).toBe(100);
  });

  it('gives nothing for failed checks', () => {
    expect(scoreOutcomes([outcome(50, 'ok'), outcome(50, 'fail')], 100)).toBe(50);
  });

  it('gives half points for warnings', () => {
    expect(scoreOutcomes([outcome(100, 'warn')], 100)).toBe(50);
    expect(scoreOutcomes([outcome(10, 'warn'), outcome(10, 'ok')], 20)).toBe(75);
  });

  it('scales by the total weight and rounds', () => {
    expect(scoreOutcomes([outcome(15, 'ok')], totalWeight)).toBe(15);
    expect(scoreOutcomes([], 0)).toBe(0);
  });
});

describe('statusForScore', () => {
  it.each([
    [100, 'Excellent'],
    [85, 'Excellent'],
    [84, 'Good'],
    [70, 'Good'],
    [69, 'Needs work'],
    [50, 'Needs work'],
    [49, 'Critical'],
    [0, 'Critical'],
  ])('maps %i to %s', (score, expected) => {
    expect(statusForScore(score)).toBe(expected);
  });
});

describe('toneForScore', () => {
  it('uses green / yellow / red buckets', () => {
    expect(toneForScore(100)).toBe('green');
    expect(toneForScore(70)).toBe('green');
    expect(toneForScore(69)).toBe('yellow');
    expect(toneForScore(50)).toBe('yellow');
    expect(toneForScore(49)).toBe('red');
    expect(toneForScore(0)).toBe('red');
  });
});

describe('pickRecommendations', () => {
  it('returns at most three, highest weight first', () => {
    const picked = pickRecommendations([
      outcome(5, 'fail', 'small'),
      outcome(15, 'fail', 'big'),
      outcome(10, 'warn', 'medium'),
      outcome(20, 'fail', 'biggest'),
    ]);
    expect(picked).toEqual(['fix biggest', 'fix big', 'fix medium']);
  });

  it('prefers failures over warnings of the same weight', () => {
    const picked = pickRecommendations([
      outcome(10, 'warn', 'warn'),
      outcome(10, 'fail', 'fail'),
    ]);
    expect(picked[0]).toBe('fix fail');
  });

  it('ignores passing checks and duplicate text', () => {
    const duplicate: CheckOutcome = { ...outcome(5, 'fail', 'a'), recommendation: 'same' };
    const picked = pickRecommendations([
      outcome(15, 'ok', 'passed'),
      duplicate,
      { ...outcome(5, 'fail', 'b'), recommendation: 'same' },
    ]);
    expect(picked).toEqual(['same']);
  });
});

describe('evaluate', () => {
  it('produces the stable public schema', () => {
    const report = evaluate(makeSnapshot());
    expect(Object.keys(report)).toEqual([
      'repo',
      'score',
      'status',
      'checks',
      'recommendations',
    ]);
    expect(report.repo).toBe('owner/repo');
    expect(report.score).toBe(100);
    expect(report.status).toBe('Excellent');
    expect(report.checks).toHaveLength(allChecks.length);
    expect(report.recommendations).toEqual([]);
    expect(Object.keys(report.checks[0] ?? {})).toEqual([
      'id',
      'title',
      'status',
      'weight',
      'message',
      'recommendation',
    ]);
  });

  it('scores a broken repository low', () => {
    const report = evaluate(makeBrokenSnapshot());
    expect(report.score).toBeLessThan(30);
    expect(report.status).toBe('Critical');
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('caps the score at 40 when a secret file is committed', () => {
    const withSecret = makeSnapshot({ files: [...makeSnapshot().files, '.env'] });
    const report = evaluate(withSecret);
    const secrets = report.checks.find((check) => check.id === 'secrets');

    expect(secrets?.status).toBe('fail');
    expect(report.score).toBe(CRITICAL_SCORE_CAP);
    expect(report.status).toBe('Critical');
  });

  it('does not cap healthy repositories', () => {
    expect(evaluate(makeSnapshot()).checks.find((c) => c.id === 'secrets')?.status).toBe('ok');
    expect(evaluate(makeSnapshot()).score).toBe(100);
  });

  it('runs an isolated custom check set', () => {
    const echo: Check = {
      id: 'echo',
      title: 'Echo',
      weight: 10,
      run: () => ({ status: 'warn', message: 'half', recommendation: 'do better' }),
    };
    const report = evaluate(makeSnapshot(), { checks: [echo] });

    expect(report.score).toBe(50);
    expect(report.checks).toEqual([
      {
        id: 'echo',
        title: 'Echo',
        status: 'warn',
        weight: 10,
        message: 'half',
        recommendation: 'do better',
      },
    ]);
  });
});
