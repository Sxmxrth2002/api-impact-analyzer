export interface PullRequestJob {
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  pullRequestNumber: number;
  baseSha: string;
  headSha: string;
}

export function extractPullRequestJob(payload: unknown): PullRequestJob | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const p = payload as Record<string, any>;

  const job = {
    installationId: p.installation?.id,
    repositoryId: p.repository?.id,
    repositoryFullName: p.repository?.full_name,
    pullRequestNumber: p.number,
    baseSha: p.pull_request?.base?.sha,
    headSha: p.pull_request?.head?.sha,
  };

  if (
    !Number.isSafeInteger(job.installationId) ||
    job.installationId <= 0 ||
    !Number.isSafeInteger(job.repositoryId) ||
    job.repositoryId <= 0 ||
    typeof job.repositoryFullName !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(job.repositoryFullName) ||
    !Number.isSafeInteger(job.pullRequestNumber) ||
    job.pullRequestNumber <= 0 ||
    typeof job.baseSha !== "string" ||
    !/^[a-fA-F0-9]{40}$/.test(job.baseSha) ||
    typeof job.headSha !== "string" ||
    !/^[a-fA-F0-9]{40}$/.test(job.headSha)
  ) {
    return null;
  }

  return job as PullRequestJob;
}
