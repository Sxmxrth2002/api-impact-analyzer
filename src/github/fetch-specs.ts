import { fetchGitHubFile } from "./fetch-file.js";

export interface SpecVersions {
  oldSpec: string;
  newSpec: string;
}

export async function fetchSpecVersions(
  installationId: number,
  repositoryFullName: string,
  specPath: string,
  baseSha: string,
  headSha: string,
): Promise<SpecVersions> {
  const [oldSpec, newSpec] = await Promise.all([
    fetchGitHubFile(installationId, repositoryFullName, specPath, baseSha),
    fetchGitHubFile(installationId, repositoryFullName, specPath, headSha),
  ]);

  return { oldSpec, newSpec };
}
