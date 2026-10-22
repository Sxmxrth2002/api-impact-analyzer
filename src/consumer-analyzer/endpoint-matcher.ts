import type { OpenAPIV3 } from "openapi-types";

export interface MatchedEndpoint {
  method: string;
  path: string;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;

export function matchEndpoint( requestPath: string, openApiPath: string ): boolean {
  const requestSegments = requestPath.split("/").filter(Boolean);
  const apiSegments = openApiPath.split("/").filter(Boolean);

  if (requestSegments.length !== apiSegments.length) {
    return false;
  }

  for (let i = 0; i < requestSegments.length; i++) {
    const apiSegment = apiSegments[i];
    const requestSegment = requestSegments[i];

    // OpenAPI path parameter: {id}, {userId}, etc.
    if (apiSegment.startsWith("{") && apiSegment.endsWith("}")) {
      continue;
    }

    if (apiSegment !== requestSegment) {
      return false;
    }
  }

  return true;
}

function getRequestPath( requestUrl: string,serverUrl: string ): string | undefined {
  try {
    const request = new URL(requestUrl);
    const server = new URL(serverUrl);

    if (request.origin !== server.origin) {
      return undefined;
    }

    const basePath = server.pathname.replace(/\/+$/, "");

    if (basePath && request.pathname !== basePath && !request.pathname.startsWith(basePath + "/")
    ) {
      return undefined;
    }

    const relativePath = request.pathname.slice(basePath.length);

    return relativePath || "/";
  } catch {
    return undefined;
  }
}

function getPathSpecificity(path: string): number {
  return path
    .split("/")
    .filter(Boolean)
    .filter(
      (segment) =>
        !(segment.startsWith("{") && segment.endsWith("}"))
    )
    .length;
}

export function findMatchingEndpoint( method: string, url: string, spec: OpenAPIV3.Document ): MatchedEndpoint | undefined {
  const normalizedMethod = method.toLowerCase();

  if (!HTTP_METHODS.some((m) => m === normalizedMethod)) {
    return undefined;
  }

  // OpenAPI 3 defaults to "/" when servers is omitted.
  const servers = spec.servers?.length
    ? spec.servers
    : [{ url: "/" }];

  for (const server of servers) {
    const requestPath =
      server.url === "/"
        ? (() => {
            try {
              return new URL(url).pathname;
            } catch {
              return undefined;
            }
          })()
        : getRequestPath(url, server.url);

    if (requestPath === undefined) continue;

    for (const [openApiPath, pathItem] of Object.entries(spec.paths)) {
      const matchingPaths = Object.entries(spec.paths)
        .filter(([openApiPath, pathItem]) => {
            if (!pathItem) return false;

            if (!matchEndpoint(requestPath, openApiPath)) {
            return false;
            }

            const operation =
            pathItem[normalizedMethod as keyof typeof pathItem];

            return Boolean(operation);
        })
        .sort(
            ([pathA], [pathB]) =>
            getPathSpecificity(pathB) - getPathSpecificity(pathA)
        );

        if (matchingPaths.length > 0) {
            return {
                method: normalizedMethod.toUpperCase(),
                path: matchingPaths[0][0],
            };
        }
    }
  }

  return undefined;
}