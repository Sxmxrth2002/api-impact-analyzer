import { getInstallationClient } from "./auth.js";

export async function fetchGitHubFile(
  installationId: number,
  repositoryFullName: string,
  filePath: string,
  ref: string,
): Promise<string> {
  const [owner, repo] = repositoryFullName.split("/");

  const octokit = await getInstallationClient(installationId);

  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref,
  });

  if (Array.isArray(response.data) || response.data.type !== "file") {
    throw new Error(`Not a file: ${filePath}`);
  }

  if (
    response.data.encoding !== "base64" ||
    typeof response.data.content !== "string"
  ) {
    throw new Error(`Unsupported file content: ${filePath}`);
  }

  return Buffer.from(response.data.content, "base64").toString("utf8");
}
