import { getInstallationClient } from "./auth.js";

export async function listTypeScriptFiles(
  installationId: number,
  repositoryFullName: string,
  ref: string,
): Promise<string[]> {
  const [owner, repo] = repositoryFullName.split("/");
  const octokit = await getInstallationClient(installationId);

  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: ref,
    recursive: "true",
  });

  if (data.truncated) {
    throw new Error("GitHub returned an incomplete file tree");
  }

  return data.tree
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path?.endsWith(".ts") &&
        !item.path.endsWith(".d.ts"),
    )
    .map((item) => item.path!);
}
