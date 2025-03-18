#!/usr/bin/env bun
import { BigQueryMcpServer } from "./server.js";
import { parseArgs } from "./utils/args-parser.js";

/**
 * Main function
 */
async function main() {
  const args = parseArgs();
  const server = new BigQueryMcpServer(args);
  await server.start();
}

// Run main function if this is the main module
if (import.meta.main) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
