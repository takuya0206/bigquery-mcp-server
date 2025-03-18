import type { Args } from "../types.js";
import { ArgsSchema } from "../types.js";

/**
 * Parse command line arguments
 * @returns Parsed arguments
 */
export function parseArgs(): Args {
  const args: Record<string, string> = {};
  
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      // Handle --key=value format
      if (arg.includes("=")) {
        const [key, value] = arg.substring(2).split("=", 2);
        args[key] = value;
      } 
      // Handle --key value format
      else {
        const key = arg.substring(2);
        const value = process.argv[i + 1];
        if (value && !value.startsWith("--")) {
          args[key] = value;
          i++; // Skip the value in the next iteration
        } else {
          args[key] = "true"; // Flag without value
        }
      }
    }
  }
  
  try {
    return ArgsSchema.parse(args);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error parsing arguments:", error.message);
    }
    
    console.error("\nUsage:");
    console.error("  bun run index.ts --project-id=<project-id> [options]");
    console.error("\nOptions:");
    console.error("  --project-id         Google Cloud project ID (required)");
    console.error("  --location           BigQuery location (default: asia-northeast1)");
    console.error("  --key-file           Path to service account key file (optional)");
    console.error("  --max-results        Maximum rows to return (default: 1000)");
    console.error("  --max-bytes-billed   Maximum bytes to process (default: 500000000000, 500GB)");
    
    process.exit(1);
  }
}
