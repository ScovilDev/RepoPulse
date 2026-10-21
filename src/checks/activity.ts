/** Recent activity — 15 points. */
import type { Check } from '../types.js';

const FRESH_DAYS = 90;
const STALE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(isoDate: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(isoDate).getTime()) / DAY_MS));
}

export function formatDaysAgo(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 60) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} ago`;
}

export const activityCheck: Check = {
  id: 'activity',
  title: 'Activity',
  weight: 15,
  run({ lastCommitAt, openIssues, openPullRequests, stars }) {
    const counters = `${stars} star${stars === 1 ? '' : 's'} · ${openIssues} open issue${openIssues === 1 ? '' : 's'} · ${openPullRequests} open PR${openPullRequests === 1 ? '' : 's'}`;

    if (!lastCommitAt) {
      return {
        status: 'fail',
        message: `No commits found. ${counters}.`,
        recommendation: 'Push an initial commit so the project has visible history.',
      };
    }

    const days = daysSince(lastCommitAt, Date.now());
    const lastCommit = `Last commit ${formatDaysAgo(days)}`;

    if (days <= FRESH_DAYS) {
      return {
        status: 'ok',
        message: `${lastCommit}. ${counters}.`,
        recommendation: 'Keep the commit cadence and answer issues and pull requests.',
      };
    }

    if (days <= STALE_DAYS) {
      return {
        status: 'warn',
        message: `${lastCommit}. ${counters}.`,
        recommendation: 'The project has been quiet for a while — land a small fix or reply to open issues.',
      };
    }

    return {
      status: 'fail',
      message: `${lastCommit}. ${counters}.`,
      recommendation: 'The repository looks abandoned — make a commit or archive it with a clear notice.',
    };
  },
};
