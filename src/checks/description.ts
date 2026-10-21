/** Repository description — 5 points. */
import type { Check } from '../types.js';

const MIN_DESCRIPTION_LENGTH = 10;

export const descriptionCheck: Check = {
  id: 'description',
  title: 'Description',
  weight: 5,
  run({ description }) {
    const text = description?.trim() ?? '';

    if (text.length >= MIN_DESCRIPTION_LENGTH) {
      return {
        status: 'ok',
        message: `Description is set (${text.length} characters).`,
        recommendation: 'Keep the description short and specific.',
      };
    }

    if (text.length > 0) {
      return {
        status: 'warn',
        message: 'Description is set but very short.',
        recommendation: 'Make the repository description more specific — it is shown in search results.',
      };
    }

    return {
      status: 'fail',
      message: 'Repository description is empty.',
      recommendation: 'Add a one-line description on GitHub so people understand the project at a glance.',
    };
  },
};
