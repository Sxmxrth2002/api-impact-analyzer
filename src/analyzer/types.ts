import { EndpointConsumerImpact } from "../consumer-analyzer/scanner.js";

export interface ConsumerImpact {
  file: string;
  line: number;
  field: string;
  variable: string;
}

export interface ImpactReportEntry {
  severity: "BREAKING" | "WARNING";
  method: string;
  endpoint: string;
  change: string;
  impactedConsumers: ConsumerImpact[];
  impactedEndpointCalls?: EndpointConsumerImpact[];
}

export interface ImpactReport {
  summary: {
    totalChanges: number;
    breakingChanges: number;
    warningChanges: number;
    impactedConsumerLocations: number;
  };
  entries: ImpactReportEntry[];
}
