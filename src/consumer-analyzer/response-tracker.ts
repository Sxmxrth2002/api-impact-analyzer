import {
  Project,
  Node,
  SyntaxKind,
  type Identifier,
  type VariableDeclaration,
  type BindingElement,
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
): VariableDeclaration | BindingElement | undefined {
  const symbol = identifier.getSymbol();

  return symbol
    ?.getDeclarations()
    .find(
      (declaration): declaration is VariableDeclaration | BindingElement =>
        Node.isVariableDeclaration(declaration) ||
        Node.isBindingElement(declaration),
    );
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
  const requestVariables = new Map<
    VariableDeclaration | BindingElement,
    ApiRequest
  >();

  const responseVariables = new Map<
    VariableDeclaration | BindingElement,
    ApiRequest
  >();

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

  // Track parsed fetch responses and Axios response.data
  for (const declaration of declarations) {
    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const expression = unwrapAwait(initializer);

    // Fetch: const user = await response.json()
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

  // Step 2: Identify parsed API response variables.
  for (const declaration of declarations) {
    const nameNode = declaration.getNameNode();

    if (!Node.isObjectBindingPattern(nameNode)) continue;

    const request = getAxiosRequest(declaration);

    if (!request) continue;

    for (const element of nameNode.getElements()) {
      if (element.getDotDotDotToken()) continue;

      const propertyName = element.getPropertyNameNode();
      const fieldName = propertyName?.getText() ?? element.getName();

      if (fieldName !== "data") continue;

      const bindingName = element.getNameNode();

      if (!Node.isIdentifier(bindingName)) continue;

      responseVariables.set(element, request);
    }
  }

  const destructuredFields: ResponseFieldUsage[] = [];

  for (const declaration of declarations) {
    const nameNode = declaration.getNameNode();
    const initializer = declaration.getInitializer();

    if (!Node.isObjectBindingPattern(nameNode)) continue;
    if (!initializer || !Node.isIdentifier(initializer)) continue;

    // Resolve the source variable's declaration
    const sourceDeclaration = resolveDeclaration(initializer);

    if (!sourceDeclaration) continue;

    // Check whether this variable contains an API response
    const request = responseVariables.get(sourceDeclaration);

    if (!request) continue;

    for (const element of nameNode.getElements()) {
      // Skip rest elements and computed property names for now
      if (element.getDotDotDotToken()) continue;

      const propertyName = element.getPropertyNameNode();

      if (propertyName && !Node.isIdentifier(propertyName)) {
        continue;
      }

      destructuredFields.push({
        method: request.method,
        url: request.url,
        variable: initializer.getText(),
        field: propertyName?.getText() ?? element.getName(),
        file: sourceFile.getFilePath(),
        line: element.getStartLineNumber(),
      });
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

  return [...results, ...destructuredFields];
}
