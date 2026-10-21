import type { RepoSnapshot } from '../src/types.js';

/** A healthy snapshot; override fields per test. */
export function makeSnapshot(overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return {
    fullName: 'owner/repo',
    htmlUrl: 'https://github.com/owner/repo',
    description: 'A small tool that does one thing well',
    topics: ['cli', 'typescript', 'developer-tools'],
    license: 'MIT',
    defaultBranch: 'main',
    files: ['README.md', 'LICENSE', '.gitignore', 'src/index.ts', '.github/workflows/ci.yml', 'test/score.test.ts'],
    stars: 42,
    openIssues: 1,
    openPullRequests: 0,
    releaseCount: 2,
    tagCount: 2,
    lastCommitAt: new Date().toISOString(),
    truncated: false,
    ...overrides,
  };
}

/** Build a snapshot of a repository with every problem RepoPulse can detect. */
export function makeBrokenSnapshot(overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return makeSnapshot({
    description: null,
    topics: [],
    license: null,
    files: ['index.js', 'package.json'],
    releaseCount: 0,
    tagCount: 0,
    lastCommitAt: '2015-01-01T00:00:00.000Z',
    ...overrides,
  });
}
