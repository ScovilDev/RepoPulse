/** README presence — 15 points. */
import type { Check } from '../types.js';

const README_FILE = /^readme(\.[a-z0-9]+)?$/i;

export const readmeCheck: Check = {
  id: 'readme',
  title: 'README',
  weight: 15,
  run({ files }) {
    const readme = files.find((file) => !file.includes('/') && README_FILE.test(file));

    if (readme) {
      return {
        status: 'ok',
        message: `Found ${readme} in the repository root.`,
        recommendation: 'Keep the README updated with install and usage instructions.',
      };
    }

    return {
      status: 'fail',
      message: 'No README file in the repository root.',
      recommendation:
        'Add a README.md that explains what the project does, how to install it and how to use it.',
    };
  },
};
