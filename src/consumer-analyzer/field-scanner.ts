import { Project, SyntaxKind } from "ts-morph";

export interface FieldAccess {
  variable: string;
  field: string;
  file: string;
  line: number;
}

export function scanFieldAccesses(filePath: string): FieldAccess[] {
  const project = new Project();

  const sourceFile = project.addSourceFileAtPath(filePath);

  const accesses = sourceFile.getDescendantsOfKind(
    SyntaxKind.PropertyAccessExpression,
  );

  const results: FieldAccess[] = [];

  for (const access of accesses) {
    const expression = access.getExpression();

    // Only support direct variable.field access for now
    if (expression.getKind() !== SyntaxKind.Identifier) {
      continue;
    }

    results.push({
      variable: expression.getText(),
      field: access.getName(),
      file: sourceFile.getFilePath(),
      line: access.getStartLineNumber(),
    });
  }

  return results;
}
