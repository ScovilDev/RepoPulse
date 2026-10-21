/** Everything RepoPulse knows about a repository after talking to GitHub. */
export interface RepoSnapshot {
  /** `owner/repo` */
  fullName: string;
  htmlUrl: string;
  description: string | null;
  topics: string[];
  /** SPDX id or license name reported by GitHub, if any. */
  license: string | null;
  defaultBranch: string;
  /** Every file path in the repository tree (no directories). */
  files: string[];
  stars: number;
  openIssues: number;
  openPullRequests: number;
  releaseCount: number;
  tagCount: number;
  /** ISO date of the newest commit on the default branch. */
  lastCommitAt: string | null;
  /** True when GitHub truncated the tree (very large repositories). */
  truncated: boolean;
}

export type CheckStatus = 'ok' | 'warn' | 'fail';

export type RepoStatus = 'Excellent' | 'Good' | 'Needs work' | 'Critical';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  recommendation: string;
  /** A critical problem caps the total score (e.g. a committed .env file). */
  critical?: boolean;
}

export interface Check {
  id: string;
  title: string;
  weight: number;
  run(snapshot: RepoSnapshot): CheckResult;
}

/** A check outcome in the public JSON schema. */
export interface CheckOutcome {
  id: string;
  title: string;
  status: CheckStatus;
  weight: number;
  message: string;
  recommendation: string;
}

/** Stable JSON schema — keep in sync with README. */
export interface PulseReport {
  repo: string;
  score: number;
  status: RepoStatus;
  checks: CheckOutcome[];
  recommendations: string[];
}
