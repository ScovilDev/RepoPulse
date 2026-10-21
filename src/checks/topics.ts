/** Repository topics — 5 points. */
import type { Check } from '../types.js';

export const topicsCheck: Check = {
  id: 'topics',
  title: 'Topics',
  weight: 5,
  run({ topics }) {
    const count = topics.length;

    if (count >= 3) {
      return {
        status: 'ok',
        message: `${count} topics set: ${topics.slice(0, 26).join(', ')}.`,
        recommendation: 'Keep topics relevant to how people search for the project.',
      };
    }

    if (count > 0) {
      return {
        status: 'warn',
        message: `Only ${count} topic set.`,
        recommendation: 'Add a few more topics — they make the repository discoverable on GitHub.',
      };
    }

    return {
      status: 'fail',
      message: 'No topics set.',
      recommendation: 'Add 3–5 topics on GitHub (e.g. cli, typescript, developer-tools).',
    };
  },
};
