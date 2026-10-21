/** Automated tests — 15 points. */
import type { Check } from '../types.js';

const TEST_FILE_PATTERNS: RegExp[] = [
  /(^|\/)(__tests__|tests?|spec|specs)\/.+\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|cs|php)$/i,
  /\.(?:test|spec)\.[cm]?[jt]sx?$/i,
  /_test\.go$/i,
  /(^|\/)test_.*\.py$/i,
  /_test\.(?:py|rb|exs)$/i,
];

export function isTestFile(path: string): boolean {
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(path));
}

export const testsCheck: Check = {
  id: 'tests',
  title: 'Tests',
  weight: 15,
  run({ files }) {
    const testFiles = files.filter(isTestFile);

    if (testFiles.length > 0) {
      const sample = testFiles[0] ?? '';
      return {
        status: 'ok',
        message: `Found ${testFiles.length} test file${testFiles.length === 1 ? '' : 's'} (e.g. ${sample}).`,
        recommendation: 'Keep tests running in CI so regressions are caught early.',
      };
    }

    return {
      status: 'fail',
      message: 'No test files found.',
      recommendation: 'Add tests for the core behaviour — even a small suite beats none, and wire it into CI.',
    };
  },
};
