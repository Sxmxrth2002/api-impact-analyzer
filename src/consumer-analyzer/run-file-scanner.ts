import path from "node:path";
import { findTypeScriptFiles } from "./file-scanner.js";

const directory = path.resolve("examples/consumer-service");

console.log(findTypeScriptFiles(directory));
