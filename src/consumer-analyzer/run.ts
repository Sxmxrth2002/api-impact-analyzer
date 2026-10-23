import { trackResponseFields } from "./response-tracker.js";

const results = trackResponseFields("examples/consumer-service/userClient.ts");

console.log(JSON.stringify(results, null, 2));
