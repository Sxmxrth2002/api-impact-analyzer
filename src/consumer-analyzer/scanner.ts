import {
  Project,
  SyntaxKind,
  Node,
  type CallExpression,
  type ObjectLiteralExpression,
} from "ts-morph";

export interface ApiCall {
  method: string;
  url: string;
  file: string;
  line: number;
}

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function getStringProperty(
  object: ObjectLiteralExpression,
  name: string,
): string | undefined {
  const property = object.getProperty(name);

  if (!property || !Node.isPropertyAssignment(property)) {
    return undefined;
  }

  const value = property.getInitializer();

  return value && Node.isStringLiteral(value)
    ? value.getLiteralValue()
    : undefined;
}

function extractAxiosCall(
  call: CallExpression,
): { method: string; url: string } | undefined {
  const expression = call.getExpression();
  const args = call.getArguments();

  // axios.get(url), axios.post(url), etc.
  if (Node.isPropertyAccessExpression(expression)) {
    if (expression.getExpression().getText() !== "axios") {
      return undefined;
    }

    const method = expression.getName().toUpperCase();

    if (!HTTP_METHODS.has(method)) {
      return undefined;
    }

    const urlArg = args[0];

    if (!urlArg || !Node.isStringLiteral(urlArg)) {
      return undefined;
    }

    return {
      method,
      url: urlArg.getLiteralValue(),
    };
  }

  // axios({ method: "DELETE", url: "..." })
  if (expression.getText() === "axios") {
    const config = args[0];

    if (!config || !Node.isObjectLiteralExpression(config)) {
      return undefined;
    }

    const method = (getStringProperty(config, "method") ?? "GET").toUpperCase();

    const url = getStringProperty(config, "url");

    if (!url || !HTTP_METHODS.has(method)) {
      return undefined;
    }

    return { method, url };
  }

  return undefined;
}

export function scanConsumer(filePath: string): ApiCall[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const apiCalls: ApiCall[] = [];

  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    const expression = call.getExpression();
    const args = call.getArguments();

    let result: { method: string; url: string } | undefined;

    if (expression.getText() === "fetch") {
      const urlArg = args[0];

      if (!urlArg || !Node.isStringLiteral(urlArg)) {
        continue;
      }

      let method = "GET";
      const options = args[1];

      if (options && Node.isObjectLiteralExpression(options)) {
        method = (getStringProperty(options, "method") ?? "GET").toUpperCase();
      }

      result = { method, url: urlArg.getLiteralValue() };
    } else {
      result = extractAxiosCall(call);
    }

    if (!result) continue;

    apiCalls.push({
      ...result,
      file: sourceFile.getFilePath(),
      line: call.getStartLineNumber(),
    });
  }

  return apiCalls;
}
