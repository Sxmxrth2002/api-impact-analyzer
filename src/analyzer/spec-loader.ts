import SwaggerParser from "@apidevtools/swagger-parser";

export async function loadOpenAPISpec(filePath: string): Promise<Record<string, unknown>> {
  try {
    const api = await SwaggerParser.validate(filePath);

    const resolved = await SwaggerParser.dereference(api, {
      dereference: {
        circular: "ignore",
      },
    });

    return resolved as Record<string, unknown>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Invalid OpenAPI specification (${filePath}): ${message}`
    );
  }
}
