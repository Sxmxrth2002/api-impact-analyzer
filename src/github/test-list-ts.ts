import { listTypeScriptFiles } from "./list-ts-files.js";

async function main() {
  const files = await listTypeScriptFiles(
    180833049,
    "Sxmxrth2002/api-impact-analyzer",
    "ad7c019ad101838b344b4d51cddb87e5cb31d67d",
  );

  console.log(files.filter((file) => file.startsWith("examples/")));
}

main().catch(console.error);
