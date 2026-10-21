/** Continuous integration — 15 points. */
import type { Check } from '../types.js';

const OTHER_CI_FILES = [
  '.travis.yml',
  '.gitlab-ci.yml',
  'azure-pipelines.yml',
  'jenkinsfile',
  '.drone.yml',
  '.circleci/config.yml',
  'bitbucket-pipelines.yml',
];

function isWorkflowFile(path: string): boolean {
  return /^\.github\/workflows\/.+\.ya?ml$/i.test(path);
}

export const ciCheck: Check = {
  id: 'ci',
  title: 'CI / GitHub Actions',
  weight: 15,
  run({ files }) {
    const workflows = files.filter(isWorkflowFile);

    if (workflows.length > 0) {
      return {
        status: 'ok',
        message: `Found ${workflows.length} GitHub Actions workflow${workflows.length === 1 ? '' : 's'}.`,
        recommendation: 'Keep CI fast: run tests and build on every pull request.',
      };
    }

    const otherCi = files.find((file) =>
      OTHER_CI_FILES.includes(file.toLowerCase()),
    );

    if (otherCi) {
      return {
        status: 'warn',
        message: `CI is configured outside GitHub Actions (${otherCi}).`,
        recommendation: 'Expose the CI result on GitHub, for example with a GitHub Actions workflow.',
      };
    }

    return {
      status: 'fail',
      message: 'No CI configuration found.',
      recommendation: 'Add a GitHub Actions workflow that runs tests and build on push and pull request.',
    };
  },
};
