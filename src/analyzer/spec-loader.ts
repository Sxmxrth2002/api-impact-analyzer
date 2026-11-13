import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3 } from "openapi-types";
import YAML from "yaml";

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

export async function loadOpenAPISpecFromString(
  content: string,
): Promise<OpenAPIV3.Document> {
  try {
    const parsed: unknown = YAML.parse(content);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("openapi" in parsed) ||
      typeof parsed.openapi !== "string" ||
      !parsed.openapi.startsWith("3.0.")
    ) {
      throw new Error("Only OpenAPI 3.0 specifications are supported");
    }

    const api = await SwaggerParser.validate(parsed as OpenAPIV3.Document);

    const resolved = await SwaggerParser.dereference(api, {
      dereference: {
        circular: "ignore",
      },
    });

    return resolved as OpenAPIV3.Document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Invalid OpenAPI specification: ${message}`);
  }
}
