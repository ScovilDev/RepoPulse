/** Suspicious secret files — 5 points, and a hard score cap when found. */
import type { Check } from '../types.js';

/** Templates that are safe to commit. */
const ALLOWED = new Set(['.env.example', '.env.sample', '.env.template', '.env.dist']);

const SECRET_PATTERNS: RegExp[] = [
  /^\.env(?:\..+)?$/i,
  /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/i,
  /^(?:credentials|credential)(?:\.(?:json|ya?ml|txt|ini))?$/i,
  /^(?:secrets?)(?:\.(?:json|ya?ml|txt|ini))?$/i,
  /^(?:tokens?|api[_-]?keys?)(?:\.(?:json|ya?ml|txt))?$/i,
  /\.(?:pem|p12|pfx)$/i,
];

function basename(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
}

export function isSuspiciousSecretFile(path: string): boolean {
  const name = basename(path);
  if (ALLOWED.has(name.toLowerCase())) return false;
  if (name.endsWith('.pub')) return false;
  return SECRET_PATTERNS.some((pattern) => pattern.test(name));
}

export const secretsCheck: Check = {
  id: 'secrets',
  title: 'No secret files',
  weight: 5,
  run({ files }) {
    const suspects = files.filter(isSuspiciousSecretFile);

    if (suspects.length === 0) {
      return {
        status: 'ok',
        message: 'No committed .env, private keys or credential files.',
        recommendation: 'Never commit secrets — rotate anything that ever leaked.',
      };
    }

    const listed = suspects.slice(0, 3).join(', ');
    const more = suspects.length > 3 ? ` and ${suspects.length - 3} more` : '';

    return {
      status: 'fail',
      message: `Critical: secret-like files committed: ${listed}${more}.`,
      recommendation: `Remove committed secrets (${listed}), rotate the credentials and add them to .gitignore.`,
      critical: true,
    };
  },
};
