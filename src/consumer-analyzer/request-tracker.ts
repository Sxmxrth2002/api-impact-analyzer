import {
  Project,
  Node,
  SyntaxKind,
  type ObjectLiteralExpression,
} from "ts-morph";

export interface RequestPayloadUsage {
  method: string;
  url: string;
  file: string;
  line: number;
  fields: string[];
  isComplete: boolean;
}

function extractObjectFields(object: ObjectLiteralExpression): {
  fields: string[];
  isComplete: boolean;
} {
  const fields: string[] = [];
  let isComplete = true;

  for (const property of object.getProperties()) {
    if (
      Node.isPropertyAssignment(property) ||
      Node.isShorthandPropertyAssignment(property) ||
      Node.isMethodDeclaration(property)
    ) {
      const nameNode = property.getNameNode();

      if (Node.isComputedPropertyName(nameNode)) {
        isComplete = false;
      } else {
        fields.push(property.getName());
      }
    } else {
      // Spread assignments and other unsupported properties.
      isComplete = false;
    }
  }

  return { fields, isComplete };
}

function resolvePayloadFields(node: Node): {
  fields: string[];
  isComplete: boolean;
} | null {
  if (Node.isObjectLiteralExpression(node)) {
    return extractObjectFields(node);
  }

  if (Node.isIdentifier(node)) {
    const symbol = node.getSymbol();
    const declaration = symbol
      ?.getDeclarations()
      .find(Node.isVariableDeclaration);

    if (!declaration) return null;

    const initializer = declaration.getInitializer();

    if (!initializer || !Node.isObjectLiteralExpression(initializer)) {
      return null;
    }

    return extractObjectFields(initializer);
  }

  return null;
}

export function trackRequestPayloads(filePath: string): RequestPayloadUsage[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const results: RequestPayloadUsage[] = [];

  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    const callee = call.getExpression();

    // Handle fetch(url, { method, body: JSON.stringify({...}) })
    if (callee.getText() === "fetch") {
      const args = call.getArguments();
      const urlArg = args[0];
      const optionsArg = args[1];

      if (!urlArg || !Node.isStringLiteral(urlArg)) continue;
      if (!optionsArg || !Node.isObjectLiteralExpression(optionsArg)) continue;

      const methodProperty = optionsArg.getProperty("method");
      let method = "GET";

      if (methodProperty && Node.isPropertyAssignment(methodProperty)) {
        const value = methodProperty.getInitializer();

        if (value && Node.isStringLiteral(value)) {
          method = value.getLiteralValue().toUpperCase();
        }
      }

      const bodyProperty = optionsArg.getProperty("body");

      if (!bodyProperty || !Node.isPropertyAssignment(bodyProperty)) continue;

      const body = bodyProperty.getInitializer();

      if (!body || !Node.isCallExpression(body)) continue;

      const stringifyCall = body.getExpression();

      if (stringifyCall.getText() !== "JSON.stringify") continue;

      const payload = body.getArguments()[0];

      if (!payload) continue;

      const payloadInfo = resolvePayloadFields(payload);

      if (!payloadInfo) continue;

      results.push({
        method,
        url: urlArg.getLiteralValue(),
        file: sourceFile.getFilePath(),
        line: call.getStartLineNumber(),
        ...payloadInfo,
      });

      continue;
    }

    if (!Node.isPropertyAccessExpression(callee)) continue;
    if (callee.getExpression().getText() !== "axios") continue;

    const method = callee.getName().toUpperCase();

    if (!["POST", "PUT", "PATCH"].includes(method)) continue;

    const args = call.getArguments();
    const urlArg = args[0];
    const payloadArg = args[1];

    if (!urlArg || !Node.isStringLiteral(urlArg)) continue;
    if (!payloadArg) continue;
    const payloadInfo = resolvePayloadFields(payloadArg);
    if (!payloadInfo) continue;

    results.push({
      method,
      url: urlArg.getLiteralValue(),
      file: sourceFile.getFilePath(),
      line: call.getStartLineNumber(),
      ...payloadInfo,
    });
  }

  return results;
}
