import { describe, expect, it } from 'vitest';
import { parseRepoSlug, RepoPulseError, resolveToken } from '../src/github.js';
import { renderConsoleReport, renderError } from '../src/report/console.js';
import { escapeHtml, renderHtmlReport } from '../src/report/html.js';
import { badgeColor, renderSvgBadge } from '../src/report/svg.js';
import { evaluate } from '../src/score.js';
import { makeBrokenSnapshot, makeSnapshot } from './helpers.js';

describe('parseRepoSlug', () => {
  it('accepts owner/repo and URL forms', () => {
    expect(parseRepoSlug('sindresorhus/got')).toEqual({ owner: 'sindresorhus', repo: 'got' });
    expect(parseRepoSlug('  sindresorhus/got  ')).toEqual({ owner: 'sindresorhus', repo: 'got' });
    expect(parseRepoSlug('https://github.com/sindresorhus/got.git')).toEqual({
      owner: 'sindresorhus',
      repo: 'got',
    });
    expect(parseRepoSlug('github.com/sindresorhus/got/')).toEqual({
      owner: 'sindresorhus',
      repo: 'got',
    });
  });

  it('rejects malformed input with a helpful error', () => {
    expect(() => parseRepoSlug('got')).toThrow(RepoPulseError);
    try {
      parseRepoSlug('a/b/c');
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(RepoPulseError);
      expect((error as RepoPulseError).hint).toMatch(/owner\/repo/);
    }
    expect(() => parseRepoSlug('')).toThrow(RepoPulseError);
  });
});

describe('resolveToken', () => {
  it('prefers an explicit token, then env vars, then nothing', () => {
    const original = { ...process.env };
    try {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;

      expect(resolveToken('explicit')).toBe('explicit');
      process.env.GITHUB_TOKEN = 'env-token';
      expect(resolveToken()).toBe('env-token');
      delete process.env.GITHUB_TOKEN;
      process.env.GH_TOKEN = 'gh-token';
      expect(resolveToken()).toBe('gh-token');
      delete process.env.GH_TOKEN;
      expect(resolveToken()).toBeUndefined();
      expect(resolveToken('   ')).toBeUndefined();
    } finally {
      process.env = original;
    }
  });
});

describe('svg badge', () => {
  it('renders valid, self-contained SVG with the score', () => {
    const svg = renderSvgBadge(87);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('RepoPulse:');
    expect(svg).toContain('87/100');
    expect(svg).not.toContain('http://www.w3.org/1999/xlink');
    expect(svg).not.toMatch(/<script|<image|href="http/);
  });

  it('colors the badge by score bucket', () => {
    expect(badgeColor(100)).toBe('#2ea043');
    expect(badgeColor(70)).toBe('#2ea043');
    expect(badgeColor(69)).toBe('#d29922');
    expect(badgeColor(50)).toBe('#d29922');
    expect(badgeColor(49)).toBe('#cf222e');
    expect(renderSvgBadge(20)).toContain('#cf222e');
  });

  it('clamps out-of-range and invalid scores', () => {
    expect(renderSvgBadge(140)).toContain('100/100');
    expect(renderSvgBadge(-5)).toContain('0/100');
    expect(renderSvgBadge(Number.NaN)).toContain('0/100');
    expect(renderSvgBadge(86.6)).toContain('87/100');
  });
});

describe('html report', () => {
  it('is a single self-contained document', () => {
    const html = renderHtmlReport(evaluate(makeSnapshot()));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).not.toMatch(/<link |src="http|@import|cdn\./i);
    expect(html).toContain('100');
    expect(html).toContain('Excellent');
  });

  it('lists every check and recommendation', () => {
    const report = evaluate(makeBrokenSnapshot());
    const html = renderHtmlReport(report);
    for (const check of report.checks) expect(html).toContain(escapeHtml(check.title));
    for (const text of report.recommendations) expect(html).toContain(escapeHtml(text));
    expect(html).toContain('Critical');
  });

  it('escapes user-controlled content', () => {
    const hostile = '.env."><img src=x onerror=alert(1)>';
    const report = evaluate(makeSnapshot({ files: [hostile] }));
    const html = renderHtmlReport(report);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('escapes the five HTML metacharacters', () => {
    expect(escapeHtml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&#39;');
  });
});

describe('console report', () => {
  it('shows the score, status, every check and the top recommendations', () => {
    const report = evaluate(makeBrokenSnapshot());
    const output = renderConsoleReport(report);

    expect(output).toContain(`${report.score}/100`);
    expect(output).toContain('Critical');
    for (const check of report.checks) {
      expect(output).toContain(check.title);
      expect(output).toContain(check.message);
    }
    expect(output).toContain('Top 3 recommendations');
    expect(output).toContain('FAIL');
  });

  it('mentions the HTML path when provided', () => {
    expect(renderConsoleReport(evaluate(makeSnapshot()), { htmlPath: 'report.html' })).toContain(
      'HTML report:',
    );
  });

  it('renders errors with an optional hint', () => {
    const output = renderError('Boom', 'Try again');
    expect(output).toContain('Boom');
    expect(output).toContain('Try again');
  });
});
