import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3 } from "openapi-types";

export async function loadOpenAPISpec(
  filePath: string,
): Promise<OpenAPIV3.Document> {
  try {
    const api = await SwaggerParser.validate(filePath);

    if (!("openapi" in api) || !api.openapi.startsWith("3.0.")) {
      throw new Error("Only OpenAPI 3.0 specifications are supported");
    }

    const resolved = await SwaggerParser.dereference(api, {
      dereference: {
        circular: "ignore",
      },
    });

    return resolved as OpenAPIV3.Document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Invalid OpenAPI specification (${filePath}): ${message}`);
  }
}
