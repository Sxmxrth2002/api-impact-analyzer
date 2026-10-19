
import {
  detectRemovedEndpoints,
  detectRemovedResponseFields,
  detectResponseTypeChanges,
  detectNewRequiredRequestFields,
  detectRemovedResponseStatusCodes,
} from "./diff.js";

export type ChangeType =
  | "ENDPOINT_REMOVED"
  | "RESPONSE_FIELD_REMOVED"
  | "RESPONSE_TYPE_CHANGED"
  | "REQUEST_FIELD_REQUIRED"
  | "RESPONSE_STATUS_REMOVED";

export type Severity = "BREAKING" | "WARNING";

export interface Finding {
  type: ChangeType;
  severity: Severity;
  endpoint: string;
  message: string;
  details: Record<string, string>;
}

type OpenAPISpec = Parameters<typeof detectRemovedEndpoints>[0];

export function analyzeContract(
  oldSpec: OpenAPISpec,
  newSpec: OpenAPISpec
): Finding[] {
  const findings: Finding[] = [];

  for (const endpoint of detectRemovedEndpoints(oldSpec, newSpec)) {
    findings.push({
      type: "ENDPOINT_REMOVED",
      severity: "BREAKING",
      endpoint,
      message: `Endpoint removed: ${endpoint}`,
      details: {},
    });
  }

  for (const change of detectRemovedResponseFields(oldSpec, newSpec)) {
    findings.push({
      type: "RESPONSE_FIELD_REMOVED",
      severity: "BREAKING",
      endpoint: change.endpoint,
      message: `Response field removed: ${change.field}`,
      details: {
        statusCode: change.statusCode,
        mediaType: change.mediaType,
        field: change.field,
      },
    });
  }

  for (const change of detectResponseTypeChanges(oldSpec, newSpec)) {
    findings.push({
      type: "RESPONSE_TYPE_CHANGED",
      severity: "BREAKING",
      endpoint: change.endpoint,
      message: `Response field type changed: ${change.field}`,
      details: {
        statusCode: change.statusCode,
        mediaType: change.mediaType,
        field: change.field,
        oldType: change.oldType,
        newType: change.newType,
      },
    });
  }

  for (const change of detectNewRequiredRequestFields(oldSpec, newSpec)) {
    findings.push({
      type: "REQUEST_FIELD_REQUIRED",
      severity: "BREAKING",
      endpoint: change.endpoint,
      message: `New required request field: ${change.field}`,
      details: {
        mediaType: change.mediaType,
        field: change.field,
      },
    });
  }

  for (const change of detectRemovedResponseStatusCodes(oldSpec, newSpec)) {
    findings.push({
      type: "RESPONSE_STATUS_REMOVED",
      severity: "WARNING",
      endpoint: change.endpoint,
      message: `Response status removed: ${change.statusCode}`,
      details: {
        statusCode: change.statusCode,
      },
    });
  }

  return findings;
}