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

function isPayloadMutated(
  declaration: import("ts-morph").VariableDeclaration,
  callPosition: number,
): boolean {
  const name = declaration.getNameNode();

  if (!Node.isIdentifier(name)) return true;

  const references = name.findReferencesAsNodes();

  for (const reference of references) {
    if (reference.getStart() <= declaration.getStart()) continue;
    if (reference.getStart() >= callPosition) continue;

    const parent = reference.getParent();

    if (parent && Node.isPropertyAccessExpression(parent)) {
      const grandparent = parent.getParent();

      if (grandparent && Node.isDeleteExpression(grandparent)) {
        return true;
      }
    }

    if (parent && Node.isCallExpression(parent)) {
      const expression = parent.getExpression();

      if (
        expression.getText() !== "Object.assign" &&
        parent.getArguments().includes(reference)
      ) {
        return true;
      }
    }

    if (parent && Node.isVariableDeclaration(parent)) {
      if (parent.getInitializer() === reference) {
        return true;
      }
    }

    if (parent && Node.isCallExpression(parent)) {
      const expression = parent.getExpression();

      if (
        expression.getText() === "Object.assign" &&
        parent.getArguments()[0] === reference
      ) {
        return true;
      }
    }

    // Detect payload.email = ...
    // or payload = ...
    const target =
      parent &&
      (Node.isPropertyAccessExpression(parent) ||
        Node.isElementAccessExpression(parent))
        ? parent
        : reference;

    const assignment = target.getParent();

    if (
      assignment &&
      Node.isBinaryExpression(assignment) &&
      assignment.getLeft() === target &&
      assignment.getOperatorToken().getText().endsWith("=")
    ) {
      return true;
    }
  }

  return false;
}

function resolvePayloadFields(
  node: Node,
  callPosition: number,
): { fields: string[]; isComplete: boolean } | null {
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

    const result = extractObjectFields(initializer);

    return {
      fields: result.fields,
      isComplete:
        result.isComplete && !isPayloadMutated(declaration, callPosition),
    };
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

      const payloadInfo = resolvePayloadFields(payload, call.getStart());

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
    const payloadInfo = resolvePayloadFields(payloadArg, call.getStart());
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
