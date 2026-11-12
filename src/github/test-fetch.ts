import "dotenv/config";
import { fetchGitHubFile } from "./fetch-file.js";

const installationId = Number(process.env.GITHUB_INSTALLATION_ID);

const repository = "Sxmxrth2002/api-impact-analyzer";
const filePath = "package.json";
const ref = "main";

const content = await fetchGitHubFile(
  installationId,
  repository,
  filePath,
  ref,
);

console.log(content);
