import type { CheckOutcome, PulseReport, RepoStatus } from '../types.js';

const useColor = process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

const paint = (code: string) => (text: string) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const bold = paint('1');
const dim = paint('2');
const red = paint('31');
const green = paint('32');
const yellow = paint('33');
const cyan = paint('36');
const gray = paint('90');

const STATUS_LABEL: Record<CheckOutcome['status'], string> = {
  ok: 'OK',
  warn: 'WARN',
  fail: 'FAIL',
};

const STATUS_PAINT = { ok: green, warn: yellow, fail: red } as const;

function statusPaint(status: RepoStatus) {
  if (status === 'Excellent') return green;
  if (status === 'Good') return green;
  if (status === 'Needs work') return yellow;
  return red;
}

/** Pad/truncate to a visible width (statuses and titles are ASCII). */
function pad(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
}

export function renderConsoleReport(
  report: PulseReport,
  options: { htmlPath?: string | undefined; url?: string | undefined } = {},
): string {
  const lines: string[] = [];
  const tone = statusPaint(report.status);

  lines.push('');
  lines.push(`  ${bold('RepoPulse')}  ${dim(options.url ?? report.repo)}`);
  lines.push('');
  lines.push(`  ${tone(bold(String(report.score)))}${dim('/100')}   ${tone(report.status)}`);
  lines.push('');

  const header = `  ${pad('', 5)}${pad('Check', 22)}${pad('W', 4)}${pad('Status', 8)}Details`;
  lines.push(dim(header));
  lines.push(dim(`  ${'─'.repeat(Math.max(header.length - 2, 40))}`));

  for (const check of report.checks) {
    const status = STATUS_LABEL[check.status];
    lines.push(
      `  ${pad('', 5)}${pad(check.title, 22)}${pad(String(check.weight), 4)}${STATUS_PAINT[check.status](pad(status, 8))}${check.message}`,
    );
  }

  lines.push('');
  if (report.recommendations.length > 0) {
    lines.push(`  ${bold(`Top ${report.recommendations.length} recommendations`)}`);
    report.recommendations.forEach((text, index) => {
      lines.push(`  ${cyan(`${index + 1}.`)} ${text}`);
    });
  } else {
    lines.push(`  ${green('Nothing to fix — this repository is in great shape.')}`);
  }

  if (options.htmlPath) {
    lines.push('');
    lines.push(`  ${dim('HTML report:')} ${options.htmlPath}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function renderError(message: string, hint?: string): string {
  const lines = ['', `  ${red(bold('Error:'))} ${message}`];
  if (hint) lines.push(`  ${gray(hint)}`);
  lines.push('');
  return lines.join('\n');
}
