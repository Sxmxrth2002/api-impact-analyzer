import {
  Project,
  Node,
  SyntaxKind,
  type Identifier,
  type VariableDeclaration,
} from "ts-morph";

export interface ResponseFieldUsage {
  method: string;
  url: string;
  variable: string;
  field: string;
  file: string;
  line: number;
}

interface ApiRequest {
  method: string;
  url: string;
}

function unwrapAwait(node: Node): Node {
  return Node.isAwaitExpression(node) ? node.getExpression() : node;
}

// Resolve an identifier to its actual variable declaration.
function resolveDeclaration(
  identifier: Identifier,
): VariableDeclaration | undefined {
  const symbol = identifier.getSymbol();

  return symbol?.getDeclarations().find(Node.isVariableDeclaration);
}

function getFetchRequest(
  declaration: VariableDeclaration,
): ApiRequest | undefined {
  const initializer = declaration.getInitializer();
  if (!initializer) return undefined;

  const expression = unwrapAwait(initializer);

  if (!Node.isCallExpression(expression)) return undefined;
  if (expression.getExpression().getText() !== "fetch") {
    return undefined;
  }

  const args = expression.getArguments();
  const urlArg = args[0];

  if (!urlArg || !Node.isStringLiteral(urlArg)) {
    return undefined;
  }

  let method = "GET";
  const options = args[1];

  if (options && Node.isObjectLiteralExpression(options)) {
    const property = options.getProperty("method");

    if (property && Node.isPropertyAssignment(property)) {
      const value = property.getInitializer();

      if (value && Node.isStringLiteral(value)) {
        method = value.getLiteralValue().toUpperCase();
      }
    }
  }

  return {
    method,
    url: urlArg.getLiteralValue(),
  };
}

function getAxiosRequest(
  declaration: VariableDeclaration,
): ApiRequest | undefined {
  const initializer = declaration.getInitializer();
  if (!initializer) return undefined;

  const expression = unwrapAwait(initializer);
  if (!Node.isCallExpression(expression)) return undefined;

  const callee = expression.getExpression();

  if (!Node.isPropertyAccessExpression(callee)) {
    return undefined;
  }

  if (callee.getExpression().getText() !== "axios") {
    return undefined;
  }

  const method = callee.getName().toUpperCase();

  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return undefined;
  }

  const urlArg = expression.getArguments()[0];

  if (!urlArg || !Node.isStringLiteral(urlArg)) {
    return undefined;
  }

  return {
    method,
    url: urlArg.getLiteralValue(),
  };
}

export function trackResponseFields(filePath: string): ResponseFieldUsage[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  // Key maps by declaration node, not variable name.
  const requestVariables = new Map<VariableDeclaration, ApiRequest>();

  const responseVariables = new Map<VariableDeclaration, ApiRequest>();

  const declarations = sourceFile.getDescendantsOfKind(
    SyntaxKind.VariableDeclaration,
  );

  // Step 1: Identify fetch and Axios request variables.
  for (const declaration of declarations) {
    const request =
      getFetchRequest(declaration) ?? getAxiosRequest(declaration);

    if (request) {
      requestVariables.set(declaration, request);
    }
  }

  // Step 2: Identify parsed API response variables.
  for (const declaration of declarations) {
    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const expression = unwrapAwait(initializer);

    // fetch: const user = await response.json()
    if (Node.isCallExpression(expression)) {
      const callee = expression.getExpression();

      if (
        Node.isPropertyAccessExpression(callee) &&
        callee.getName() === "json"
      ) {
        const receiver = callee.getExpression();

        if (Node.isIdentifier(receiver)) {
          const sourceDeclaration = resolveDeclaration(receiver);

          const request = sourceDeclaration
            ? requestVariables.get(sourceDeclaration)
            : undefined;

          if (request) {
            responseVariables.set(declaration, request);
          }
        }
      }
    }

    // Axios: const user = response.data
    if (
      Node.isPropertyAccessExpression(expression) &&
      expression.getName() === "data"
    ) {
      const receiver = expression.getExpression();

      if (!Node.isIdentifier(receiver)) continue;

      const sourceDeclaration = resolveDeclaration(receiver);

      const request = sourceDeclaration
        ? requestVariables.get(sourceDeclaration)
        : undefined;

      if (request) {
        responseVariables.set(declaration, request);
      }
    }
  }

  // Step 3: Identify fields accessed on response variables.
  const results: ResponseFieldUsage[] = [];

  const accesses = sourceFile.getDescendantsOfKind(
    SyntaxKind.PropertyAccessExpression,
  );

  for (const access of accesses) {
    const receiver = access.getExpression();

    if (!Node.isIdentifier(receiver)) continue;

    const declaration = resolveDeclaration(receiver);
    if (!declaration) continue;

    const request = responseVariables.get(declaration);
    if (!request) continue;

    results.push({
      method: request.method,
      url: request.url,
      variable: receiver.getText(),
      field: access.getName(),
      file: sourceFile.getFilePath(),
      line: access.getStartLineNumber(),
    });
  }

  return results;
}
