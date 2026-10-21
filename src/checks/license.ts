/** LICENSE presence — 10 points. */
import type { Check } from '../types.js';

const LICENSE_FILE = /^(licen[cs]e|copying|unlicense)(\.[a-z0-9]+)?$/i;

export const licenseCheck: Check = {
  id: 'license',
  title: 'LICENSE',
  weight: 10,
  run({ files, license }) {
    const licenseFile = files.find((file) => !file.includes('/') && LICENSE_FILE.test(file));

    if (licenseFile || license) {
      const detected = license ? ` (${license})` : '';
      const found = licenseFile ? `Found ${licenseFile}` : 'GitHub detected a license';
      return {
        status: 'ok',
        message: `${found}${detected}.`,
        recommendation: 'Keep the license text and package metadata in sync.',
      };
    }

    return {
      status: 'fail',
      message: 'No LICENSE file found.',
      recommendation: 'Add a LICENSE file (MIT is a good default) so others can legally use the code.',
    };
  },
};
