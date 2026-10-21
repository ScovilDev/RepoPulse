import { Octokit } from '@octokit/rest';
import type { RepoSnapshot } from './types.js';

/** User-facing error with an optional actionable hint. */
export class RepoPulseError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'RepoPulseError';
    this.hint = hint;
  }
}

export interface RepoRef {
  owner: string;
  repo: string;
}

/**
 * Accepts `owner/repo`, `https://github.com/owner/repo` or `owner/repo.git`.
 */
export function parseRepoSlug(input: string): RepoRef {
  const cleaned = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  const parts = cleaned.split('/');
  const owner = parts[0] ?? '';
  const repo = parts[1] ?? '';

  if (parts.length !== 2 || !owner || !repo) {
    throw new RepoPulseError(
      `Invalid repository "${input}".`,
      'Use the form owner/repo, for example: repopulse check sindresorhus/got',
    );
  }

  return { owner, repo };
}

export function resolveToken(explicit?: string): string | undefined {
  const token = explicit ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return token && token.trim() ? token.trim() : undefined;
}

/** Octokit logs failed requests to the console by default — stay quiet. */
const silentLog = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function createClient(token?: string): Octokit {
  return new Octokit({
    userAgent: 'repopulse',
    log: silentLog,
    ...(token ? { auth: token } : {}),
  });
}

interface GitHubErrorLike {
  status?: number;
  message?: string;
  response?: {
    headers?: Record<string, string | number | undefined>;
    data?: { message?: string };
  };
}

function isStatus(error: unknown, status: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as GitHubErrorLike).status === status
  );
}

function toRepoPulseError(error: unknown, owner: string, repo: string): RepoPulseError {
  if (error instanceof RepoPulseError) return error;

  const failure = error as GitHubErrorLike;
  const slug = `${owner}/${repo}`;
  const details = failure.response?.data?.message;

  if (failure.status === 404) {
    return new RepoPulseError(
      `Repository ${slug} was not found.`,
      'Check the spelling, or set GITHUB_TOKEN to read private repositories.',
    );
  }

  if (failure.status === 401) {
    return new RepoPulseError(
      'GitHub rejected the access token (401).',
      'Check that GITHUB_TOKEN is valid and has not expired.',
    );
  }

  if (failure.status === 403 || failure.status === 429) {
    const remaining = failure.response?.headers?.['x-ratelimit-remaining'];
    if (remaining === 0 || remaining === '0') {
      const reset = Number(failure.response?.headers?.['x-ratelimit-reset'] ?? 0);
      const resetAt = reset ? ` Limit resets at ${new Date(reset * 1000).toLocaleTimeString()}.` : '';
      return new RepoPulseError(
        'GitHub API rate limit exceeded.',
        `Unauthenticated requests are capped at 60/hour. Set GITHUB_TOKEN for 5000/hour.${resetAt}`,
      );
    }

    return new RepoPulseError(
      `GitHub refused the request (403): ${details ?? 'forbidden'}.`,
      'Set GITHUB_TOKEN if the repository is private or you hit a secondary rate limit.',
    );
  }

  if (typeof failure.status === 'number') {
    return new RepoPulseError(
      `GitHub API error ${failure.status}: ${details ?? failure.message ?? 'unknown error'}.`,
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return new RepoPulseError(
    `Could not reach the GitHub API: ${message}.`,
    'Check your network connection and try again.',
  );
}

/** Optional data: a failing side request must not break the whole report. */
async function attempt<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

async function countSearch(
  octokit: Octokit,
  query: string,
): Promise<number | null> {
  try {
    const response = await octokit.request('GET /search/issues', {
      q: query,
      per_page: 1,
    });
    return typeof response.data.total_count === 'number'
      ? response.data.total_count
      : null;
  } catch {
    return null;
  }
}

/** Fetch everything the checks need, with as few API calls as possible. */
export async function fetchSnapshot(
  slug: string,
  options: { token?: string } = {},
): Promise<RepoSnapshot> {
  const { owner, repo } = parseRepoSlug(slug);
  const octokit = createClient(resolveToken(options.token));

  let repository;
  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    repository = response.data;
  } catch (error) {
    throw toRepoPulseError(error, owner, repo);
  }

  const branch = repository.default_branch;

  let tree: { files: string[]; truncated: boolean };
  try {
    const response = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 'true',
    });
    tree = {
      files: response.data.tree
        .filter((entry) => entry.type === 'blob' && typeof entry.path === 'string')
        .map((entry) => entry.path as string),
      truncated: response.data.truncated === true,
    };
  } catch (error) {
    // An empty repository has no tree yet — a zero-file snapshot is correct.
    if (isStatus(error, 404) || isStatus(error, 409)) {
      tree = { files: [], truncated: false };
    } else {
      throw toRepoPulseError(error, owner, repo);
    }
  }

  const [releaseCount, tagCount, lastCommitAt, issuesCount, pullsCount] =
    await Promise.all([
      attempt(async () => {
        const response = await octokit.rest.repos.listReleases({
          owner,
          repo,
          per_page: 100,
        });
        return response.data.length;
      }, 0),
      attempt(async () => {
        const response = await octokit.rest.repos.listTags({
          owner,
          repo,
          per_page: 100,
        });
        return response.data.length;
      }, 0),
      attempt(async () => {
        const response = await octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: branch,
          per_page: 1,
        });
        const commit = response.data[0];
        return commit?.commit.committer?.date ?? commit?.commit.author?.date ?? null;
      }, null),
      countSearch(octokit, `repo:${owner}/${repo} is:issue is:open`),
      countSearch(octokit, `repo:${owner}/${repo} is:pr is:open`),
    ]);

  const fallbackIssues = repository.open_issues_count ?? 0;

  return {
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    description: repository.description ?? null,
    topics: repository.topics ?? [],
    license: repository.license?.spdx_id ?? repository.license?.name ?? null,
    defaultBranch: branch,
    files: tree.files,
    stars: repository.stargazers_count ?? 0,
    openIssues: issuesCount ?? fallbackIssues,
    openPullRequests: pullsCount ?? 0,
    releaseCount,
    tagCount,
    lastCommitAt,
    truncated: tree.truncated,
  };
}
