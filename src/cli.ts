#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { fetchSnapshot, RepoPulseError } from './github.js';
import { renderConsoleReport, renderError } from './report/console.js';
import { renderHtmlReport } from './report/html.js';
import { renderSvgBadge } from './report/svg.js';
import { evaluate } from './score.js';
import type { PulseReport } from './types.js';

const SLOGAN = "Check your repo's pulse. Fix it before it dies.";

interface CheckOptions {
  json?: boolean;
  html?: string;
  token?: string;
}

interface BadgeOptions {
  output?: string;
  token?: string;
}

async function readVersion(): Promise<string> {
  const packagePath = fileURLToPath(new URL('../package.json', import.meta.url));
  const raw = await readFile(packagePath, 'utf8');
  return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
}

async function writeOutput(path: string, contents: string): Promise<string> {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, contents, 'utf8');
  return absolute;
}

async function buildReport(repo: string, token: string | undefined): Promise<PulseReport> {
  const snapshot = await fetchSnapshot(repo, { ...(token ? { token } : {}) });
  return evaluate(snapshot);
}

async function runCheck(repo: string, options: CheckOptions): Promise<void> {
  const report = await buildReport(repo, options.token);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }

  let htmlPath: string | undefined;
  if (options.html) {
    htmlPath = await writeOutput(
      options.html,
      renderHtmlReport(report, { repoUrl: `https://github.com/${report.repo}` }),
    );
  }

  if (!options.json) {
    process.stdout.write(
      renderConsoleReport(report, {
        htmlPath,
        url: `https://github.com/${report.repo}`,
      }),
    );
  } else if (htmlPath) {
    process.stderr.write(`HTML report written to ${htmlPath}\n`);
  }
}

async function runBadge(repo: string, options: BadgeOptions): Promise<void> {
  const report = await buildReport(repo, options.token);
  const svg = renderSvgBadge(report.score);

  if (!options.output) {
    process.stdout.write(svg);
    return;
  }

  const path = await writeOutput(options.output, svg);
  process.stdout.write(
    renderConsoleReport(report, { url: `https://github.com/${report.repo}` }) +
      `  Badge: ${path} (${report.score}/100)\n\n`,
  );
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('repopulse')
    .description(SLOGAN)
    .version(await readVersion(), '-v, --version', 'print the RepoPulse version')
    .showHelpAfterError('(run with --help for usage)');

  program
    .command('check')
    .description('score a GitHub repository and print a health report')
    .argument('<repo>', 'repository as owner/repo (a github.com URL also works)')
    .option('--json', 'print the report as stable JSON')
    .option('--html <path>', 'write a self-contained HTML report to <path>')
    .option('--token <token>', 'GitHub token (defaults to GITHUB_TOKEN or GH_TOKEN)')
    .action(async (repo: string, options: CheckOptions) => {
      await runCheck(repo, options);
    });

  program
    .command('badge')
    .description('generate an SVG score badge for a README')
    .argument('<repo>', 'repository as owner/repo (a github.com URL also works)')
    .option('-o, --output <path>', 'write the SVG to <path> instead of stdout')
    .option('--token <token>', 'GitHub token (defaults to GITHUB_TOKEN or GH_TOKEN)')
    .action(async (repo: string, options: BadgeOptions) => {
      await runBadge(repo, options);
    });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof RepoPulseError) {
      process.stderr.write(renderError(error.message, error.hint));
    } else {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(renderError(message));
    }
    process.exitCode = 1;
  }
}

void main();
