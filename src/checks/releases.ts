/** Releases and tags — 10 points. */
import type { Check } from '../types.js';

export const releasesCheck: Check = {
  id: 'releases',
  title: 'Releases / tags',
  weight: 10,
  run({ releaseCount, tagCount }) {
    if (releaseCount > 0) {
      return {
        status: 'ok',
        message: `${releaseCount}${releaseCount >= 100 ? '+' : ''} release${releaseCount === 1 ? '' : 's'} published.`,
        recommendation: 'Write short release notes so users know what changed.',
      };
    }

    if (tagCount > 0) {
      return {
        status: 'warn',
        message: `${tagCount} tag${tagCount === 1 ? '' : 's'} found, but no published releases.`,
        recommendation: 'Publish GitHub Releases from your tags and include changelog highlights.',
      };
    }

    return {
      status: 'fail',
      message: 'No releases or tags found.',
      recommendation: 'Tag a version and publish a GitHub Release with notes.',
    };
  },
};
