import { describe, expect, it } from 'vitest';
import { activityCheck, daysSince, formatDaysAgo } from '../src/checks/activity.js';
import { ciCheck } from '../src/checks/ci.js';
import { descriptionCheck } from '../src/checks/description.js';
import { gitignoreCheck } from '../src/checks/gitignore.js';
import { licenseCheck } from '../src/checks/license.js';
import { readmeCheck } from '../src/checks/readme.js';
import { releasesCheck } from '../src/checks/releases.js';
import { isSuspiciousSecretFile, secretsCheck } from '../src/checks/secrets.js';
import { isTestFile, testsCheck } from '../src/checks/tests.js';
import { topicsCheck } from '../src/checks/topics.js';
import { makeBrokenSnapshot, makeSnapshot } from './helpers.js';

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('readme', () => {
  it('passes when README.md exists', () => {
    expect(readmeCheck.run(makeSnapshot()).status).toBe('ok');
  });

  it('accepts other spellings and extensions', () => {
    for (const file of ['README', 'readme.rst', 'Readme.markdown']) {
      expect(readmeCheck.run(makeSnapshot({ files: [file] })).status).toBe('ok');
    }
  });

  it('fails when missing', () => {
    const result = readmeCheck.run(makeBrokenSnapshot());
    expect(result.status).toBe('fail');
    expect(result.recommendation).toMatch(/README/i);
  });

  it('does not count nested docs/README.md', () => {
    expect(readmeCheck.run(makeSnapshot({ files: ['docs/README.md'] })).status).toBe('fail');
  });
});

describe('license', () => {
  it('passes with a LICENSE file', () => {
    expect(licenseCheck.run(makeSnapshot({ license: null })).status).toBe('ok');
  });

  it('passes when GitHub detects a license without a root file', () => {
    expect(licenseCheck.run(makeSnapshot({ files: ['src/a.ts'], license: 'MIT' })).status).toBe('ok');
  });

  it('fails with neither file nor detected license', () => {
    expect(
      licenseCheck.run(makeSnapshot({ files: ['README.md'], license: null })).status,
    ).toBe('fail');
  });
});

describe('description', () => {
  it('passes for a normal description', () => {
    expect(descriptionCheck.run(makeSnapshot()).status).toBe('ok');
  });

  it('warns for a very short description', () => {
    expect(descriptionCheck.run(makeSnapshot({ description: 'tool' })).status).toBe('warn');
  });

  it('fails when empty or null', () => {
    expect(descriptionCheck.run(makeSnapshot({ description: '   ' })).status).toBe('fail');
    expect(descriptionCheck.run(makeSnapshot({ description: null })).status).toBe('fail');
  });
});

describe('topics', () => {
  it('passes with three or more topics', () => {
    expect(topicsCheck.run(makeSnapshot()).status).toBe('ok');
  });

  it('warns with one or two topics', () => {
    expect(topicsCheck.run(makeSnapshot({ topics: ['cli'] })).status).toBe('warn');
  });

  it('fails with no topics', () => {
    expect(topicsCheck.run(makeSnapshot({ topics: [] })).status).toBe('fail');
  });
});

describe('ci', () => {
  it('passes with a GitHub Actions workflow', () => {
    const result = ciCheck.run(makeSnapshot({ files: ['.github/workflows/test.yml'] }));
    expect(result.status).toBe('ok');
  });

  it('warns when only another CI provider is configured', () => {
    expect(ciCheck.run(makeSnapshot({ files: ['.travis.yml'] })).status).toBe('warn');
  });

  it('fails without any CI', () => {
    expect(ciCheck.run(makeSnapshot({ files: ['index.js'] })).status).toBe('fail');
  });
});

describe('tests', () => {
  it('detects common test file layouts', () => {
    const paths = [
      'test/index.ts',
      'tests/helpers.ts',
      'src/score.test.ts',
      'src/__tests__/app.jsx',
      'app/test_main.py',
      'pkg/server_test.go',
      'spec/models/user_spec.rb',
    ];
    for (const path of paths) expect(isTestFile(path)).toBe(true);
  });

  it('does not treat source files as tests', () => {
    for (const path of ['src/index.ts', 'src/latest.ts', 'docs/testing.md']) {
      expect(isTestFile(path)).toBe(false);
    }
  });

  it('passes when tests exist and fails otherwise', () => {
    expect(testsCheck.run(makeSnapshot({ files: ['src/a.test.ts'] })).status).toBe('ok');
    expect(testsCheck.run(makeSnapshot({ files: ['src/a.ts'] })).status).toBe('fail');
  });
});

describe('releases', () => {
  it('passes with published releases', () => {
    expect(releasesCheck.run(makeSnapshot()).status).toBe('ok');
  });

  it('warns when there are tags but no releases', () => {
    expect(releasesCheck.run(makeSnapshot({ releaseCount: 0, tagCount: 4 })).status).toBe('warn');
  });

  it('fails with neither', () => {
    expect(
      releasesCheck.run(makeSnapshot({ releaseCount: 0, tagCount: 0 })).status,
    ).toBe('fail');
  });
});

describe('activity', () => {
  it('passes for a recent commit', () => {
    expect(activityCheck.run(makeSnapshot({ lastCommitAt: daysAgo(3) })).status).toBe('ok');
  });

  it('warns for a commit within the last year', () => {
    expect(activityCheck.run(makeSnapshot({ lastCommitAt: daysAgo(200) })).status).toBe('warn');
  });

  it('fails for a stale repository', () => {
    expect(activityCheck.run(makeSnapshot({ lastCommitAt: daysAgo(800) })).status).toBe('fail');
  });

  it('fails when there are no commits', () => {
    expect(activityCheck.run(makeSnapshot({ lastCommitAt: null })).status).toBe('fail');
  });

  it('formats day counts for humans', () => {
    expect(daysSince(daysAgo(5), Date.now())).toBe(5);
    expect(formatDaysAgo(0)).toBe('today');
    expect(formatDaysAgo(1)).toBe('1 day ago');
    expect(formatDaysAgo(10)).toBe('10 days ago');
    expect(formatDaysAgo(90)).toBe('3 months ago');
    expect(formatDaysAgo(400)).toBe('1 year ago');
    expect(formatDaysAgo(900)).toBe('2 years ago');
  });
});

describe('secrets', () => {
  it('flags secret-like files anywhere in the tree', () => {
    for (const path of ['id_rsa', '.env', '.env.local', 'config/credentials.json', 'deploy/id_ed25519', 'certs/server.pem', 'token.txt']) {
      expect(isSuspiciousSecretFile(path)).toBe(true);
    }
  });

  it('allows templates and public keys', () => {
    for (const path of ['.env.example', '.env.sample', 'id_rsa.pub', 'src/tokens.ts', 'README.md']) {
      expect(isSuspiciousSecretFile(path)).toBe(false);
    }
  });

  it('fails and marks the result critical when a secret is found', () => {
    const result = secretsCheck.run(makeSnapshot({ files: ['README.md', '.env'] }));
    expect(result.status).toBe('fail');
    expect(result.critical).toBe(true);
    expect(result.message).toContain('.env');
  });

  it('passes on a clean tree', () => {
    expect(secretsCheck.run(makeSnapshot()).status).toBe('ok');
  });
});

describe('gitignore', () => {
  it('passes when .gitignore exists', () => {
    expect(gitignoreCheck.run(makeSnapshot()).status).toBe('ok');
  });

  it('fails when missing', () => {
    expect(gitignoreCheck.run(makeSnapshot({ files: ['README.md'] })).status).toBe('fail');
  });
});
