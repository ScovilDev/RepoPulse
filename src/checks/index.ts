import type { Check } from '../types.js';
import { activityCheck } from './activity.js';
import { ciCheck } from './ci.js';
import { descriptionCheck } from './description.js';
import { gitignoreCheck } from './gitignore.js';
import { licenseCheck } from './license.js';
import { readmeCheck } from './readme.js';
import { releasesCheck } from './releases.js';
import { secretsCheck } from './secrets.js';
import { testsCheck } from './tests.js';
import { topicsCheck } from './topics.js';

/** All checks, in report order. Weights add up to 100. */
export const allChecks: Check[] = [
  readmeCheck,
  licenseCheck,
  descriptionCheck,
  topicsCheck,
  ciCheck,
  testsCheck,
  releasesCheck,
  activityCheck,
  secretsCheck,
  gitignoreCheck,
];

export const totalWeight = allChecks.reduce((sum, check) => sum + check.weight, 0);
