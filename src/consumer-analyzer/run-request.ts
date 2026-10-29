import path from "node:path";
import { trackRequestPayloads } from "./request-tracker.js";

const filePath = path.resolve("examples/consumer-service/userClient.ts");

console.log(JSON.stringify(trackRequestPayloads(filePath), null, 2));
