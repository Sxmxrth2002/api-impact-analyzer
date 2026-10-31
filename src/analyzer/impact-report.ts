import type { Finding } from "./findings.js";
import type { ResponseFieldUsage } from "../consumer-analyzer/response-tracker.js";
import { matchEndpoint } from "../consumer-analyzer/endpoint-matcher.js";
import type { ImpactReportEntry, ConsumerImpact } from "./types.js";
import type { ImpactReport } from "./types.js";
import type { EndpointConsumerImpact } from "../consumer-analyzer/scanner.js";
import type { ApiCall } from "../consumer-analyzer/scanner.js";
import type { RequestPayloadUsage } from "../consumer-analyzer/request-tracker.js";
import type { RequestPayloadImpact } from "./types.js";

export function matchConsumerImpacts(
  finding: Finding,
  usages: ResponseFieldUsage[],
): ImpactReportEntry {
  const [method, endpointPath] = finding.endpoint.split(" ", 2);

  const impactedConsumers: ConsumerImpact[] = [];

  for (const usage of usages) {
    // Match HTTP method
    if (usage.method.toUpperCase() !== method) continue;

    // Extract pathname from consumer URL
    let consumerPath: string;

    try {
      consumerPath = new URL(usage.url).pathname;
    } catch {
      consumerPath = usage.url.split("?")[0];
    }

    // Match concrete URL against OpenAPI endpoint template
    if (!matchEndpoint(consumerPath, endpointPath)) continue;

    // Field-level matching for response changes
    if (
      finding.type === "RESPONSE_FIELD_REMOVED" ||
      finding.type === "RESPONSE_TYPE_CHANGED"
    ) {
      if (usage.field !== finding.details.field) continue;
    }

    impactedConsumers.push({
      file: usage.file,
      line: usage.line,
      field: usage.field,
      variable: usage.variable,
    });
  }

  return {
    severity: finding.severity,
    method,
    endpoint: endpointPath,
    change: finding.message,
    impactedConsumers,
  };
}

export function matchRemovedEndpointCalls(
  finding: Finding,
  apiCalls: ApiCall[],
): EndpointConsumerImpact[] {
  if (finding.type !== "ENDPOINT_REMOVED") {
    return [];
  }

  const [method, endpointPath] = finding.endpoint.split(" ", 2);

  const impactedCalls: EndpointConsumerImpact[] = [];

  for (const call of apiCalls) {
    if (call.method.toUpperCase() !== method) continue;

    let consumerPath: string;

    try {
      consumerPath = new URL(call.url).pathname;
    } catch {
      consumerPath = call.url.split("?")[0];
    }

    if (!matchEndpoint(consumerPath, endpointPath)) continue;

    impactedCalls.push({
      file: call.file,
      line: call.line,
      method: call.method,
      url: call.url,
    });
  }

  return impactedCalls;
}

export function matchRequiredRequestFields(
  finding: Finding,
  payloads: RequestPayloadUsage[],
): RequestPayloadImpact[] {
  if (finding.type !== "REQUEST_FIELD_REQUIRED") return [];

  const [method, endpointPath] = finding.endpoint.split(" ", 2);
  const requiredField = finding.details.field;

  if (!requiredField) return [];

  const impacts: RequestPayloadImpact[] = [];

  for (const payload of payloads) {
    if (payload.method.toUpperCase() !== method) continue;

    let consumerPath: string;

    try {
      consumerPath = new URL(payload.url).pathname;
    } catch {
      consumerPath = payload.url.split("?")[0];
    }

    if (!matchEndpoint(consumerPath, endpointPath)) continue;
    if (!payload.isComplete) continue;
    if (payload.fields.includes(requiredField)) continue;

    impacts.push({
      file: payload.file,
      line: payload.line,
      method: payload.method,
      url: payload.url,
      missingField: requiredField,
    });
  }

  return impacts;
}

export function generateImpactReport(
  findings: Finding[],
  usages: ResponseFieldUsage[],
  apiCalls: ApiCall[],
  payloads: RequestPayloadUsage[],
): ImpactReport {
  const entries = findings.map((finding) => {
    if (
      finding.type === "RESPONSE_FIELD_REMOVED" ||
      finding.type === "RESPONSE_TYPE_CHANGED"
    ) {
      return matchConsumerImpacts(finding, usages);
    }

    // Other change types are included without consumer matches for now.
    return {
      severity: finding.severity,
      method: finding.endpoint.split(" ")[0],
      endpoint: finding.endpoint.split(" ")[1],
      change: finding.message,
      impactedConsumers: [],
      impactedEndpointCalls:
        finding.type === "ENDPOINT_REMOVED"
          ? matchRemovedEndpointCalls(finding, apiCalls)
          : [],
      impactedRequestPayloads:
        finding.type === "REQUEST_FIELD_REQUIRED"
          ? matchRequiredRequestFields(finding, payloads)
          : [],
    };
  });

  return {
    summary: {
      totalChanges: findings.length,
      breakingChanges: findings.filter(
        (finding) => finding.severity === "BREAKING",
      ).length,
      warningChanges: findings.filter(
        (finding) => finding.severity === "WARNING",
      ).length,
      impactedConsumerLocations: entries.reduce(
        (total, entry) =>
          total +
          entry.impactedConsumers.length +
          (entry.impactedEndpointCalls?.length ?? 0) +
          (entry.impactedRequestPayloads?.length ?? 0),
        0,
      ),
    },
    entries,
  };
}
