import fs from "node:fs";
import path from "node:path";

export function findTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          ["node_modules", ".git", "dist", "build", "coverage"].includes(
            entry.name,
          )
        ) {
          continue;
        }

        walk(fullPath);
      } else if (
        entry.isFile() &&
        /\.(ts|tsx)$/.test(entry.name) &&
        !/\.d\.ts$/.test(entry.name)
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(directory);

  return files.sort();
}
