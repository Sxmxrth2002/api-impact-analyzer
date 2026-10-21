import { scanConsumer } from "./scanner.js";

const results = scanConsumer(
  "examples/consumer-service/userClient.ts"
);

console.log(JSON.stringify(results, null, 2));