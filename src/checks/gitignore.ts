/** .gitignore presence — 5 points. */
import type { Check } from '../types.js';

export const gitignoreCheck: Check = {
  id: 'gitignore',
  title: '.gitignore',
  weight: 5,
  run({ files }) {
    if (files.includes('.gitignore')) {
      return {
        status: 'ok',
        message: 'Found .gitignore in the repository root.',
        recommendation: 'Keep build output, dependencies and local secrets out of Git.',
      };
    }

    return {
      status: 'fail',
      message: 'No .gitignore file.',
      recommendation: 'Add a .gitignore with node_modules, build output, logs and local .env files.',
    };
  },
};
