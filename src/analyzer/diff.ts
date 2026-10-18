const HTTP_METHODS = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
    "trace",
] as const;

type PathItem = Record<string, unknown>;

interface OpenApiSpec {
    paths?: Record<string, PathItem>;
}

interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
}

interface MediaType {
  schema?: Schema;
}

interface Response {
  content?: Record<string, MediaType>;
}

interface Operation {
  responses?: Record<string, Response>;
}

export interface ResponseFieldChange {
  endpoint: string;
  statusCode: string;
  mediaType: string;
  field: string;
}

export function detectRemovedEndpoints(oldSpec: OpenApiSpec, newSpec: OpenApiSpec): string[] {
    const removedEndpoints: string[] = [];
    const oldPaths = oldSpec.paths ?? {};
    const newPaths = newSpec.paths ?? {};

    for (const [path, oldMethods] of Object.entries(oldPaths)) {
        const newMethods = newPaths[path] ?? {};

        for (const method of HTTP_METHODS) {
            if (Object.hasOwn(oldMethods, method) && !Object.hasOwn(newMethods, method)) {
                removedEndpoints.push(`${method.toUpperCase()} ${path}`);
            }
        }
    }

    return removedEndpoints;
}

export function detectRemovedResponseFields(
  oldSpec: OpenApiSpec,
  newSpec: OpenApiSpec
): ResponseFieldChange[] {
  const changes: ResponseFieldChange[] = [];

  const oldPaths = oldSpec.paths ?? {};
  const newPaths = newSpec.paths ?? {};

  for (const [path, oldPathItem] of Object.entries(oldPaths)) {
    const newPathItem = newPaths[path];

    if (!newPathItem) continue;

    for (const method of HTTP_METHODS) {
      const oldOperation = oldPathItem[method] as Operation | undefined;
      const newOperation = newPathItem[method] as Operation | undefined;

      if (!oldOperation || !newOperation) continue;

      const oldResponses = oldOperation.responses ?? {};
      const newResponses = newOperation.responses ?? {};

      for (const [statusCode, oldResponse] of Object.entries(oldResponses)) {
        const newResponse = newResponses[statusCode];

        if (!newResponse) continue;

        const oldContent = oldResponse.content ?? {};
        const newContent = newResponse.content ?? {};

        for (const [mediaType, oldMedia] of Object.entries(oldContent)) {
          const newMedia = newContent[mediaType];

          if (!newMedia) continue;

          const oldProperties = oldMedia.schema?.properties ?? {};
          const newProperties = newMedia.schema?.properties ?? {};

          for (const field of Object.keys(oldProperties)) {
            if (!Object.hasOwn(newProperties, field)) {
              changes.push({
                endpoint: `${method.toUpperCase()} ${path}`,
                statusCode,
                mediaType,
                field,
              });
            }
          }
        }
      }
    }
  }

  return changes;
}