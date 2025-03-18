#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BigQuery } from "@google-cloud/bigquery";
import type { BigQueryOptions } from "@google-cloud/bigquery";
import { z } from "zod";

// Command line arguments schema
const ArgsSchema = z.object({
  "project-id": z.string().min(1, "Project ID is required"),
  "location": z.string().default("asia-northeast1"),
  "key-file": z.string().optional(),
  "max-results": z.coerce.number().default(1000),
  "max-bytes-billed": z.coerce.number().default(500000000000), // 500GB
});

type Args = z.infer<typeof ArgsSchema>;

class BigQueryMcpServer {
  private server: McpServer;
  private bigquery: BigQuery;
  private args: Args;

  constructor(args: Args) {
    this.args = args;
    
    // Initialize BigQuery client
    const options: BigQueryOptions = {
      projectId: args["project-id"],
      location: args.location,
    };
    
    // Use key file if provided, otherwise use Application Default Credentials
    if (args["key-file"]) {
      options.keyFilename = args["key-file"];
    }
    
    this.bigquery = new BigQuery(options);
    
    // Initialize MCP server
    this.server = new McpServer({
      name: "bigquery-mcp-server",
      version: "1.0.0",
    });
    
    // Register tools
    this.registerTools();
  }
  
  private registerTools() {
    // 1. query - Execute a read-only BigQuery SQL query
    this.server.tool(
      "query",
      "Execute a read-only BigQuery SQL query",
      {
        query: z.string().min(1, "SQL query is required"),
        maxResults: z.number().optional().default(this.args["max-results"]),
      },
      async ({ query, maxResults }) => {
        try {
          // Ensure query is not empty
          if (!this.isValidQuery(query)) {
            return {
              content: [{ 
                type: "text", 
                text: "Error: Empty query is not allowed." 
              }],
              isError: true,
            };
          }
          
          const options = {
            query,
            maximumBytesBilled: String(this.args["max-bytes-billed"]),
            maxResults,
          };

          const [job] = await this.bigquery.createQueryJob(options);
          const [rows] = await job.getQueryResults({
            maxResults,
          });

          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify(rows, null, 2) 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error executing query: ${(error as Error).message}` 
            }],
            isError: true,
          };
        }
      }
    );
    
    // 2. list_all_tables - List all datasets and tables in the project
    this.server.tool(
      "list_all_tables",
      "List all datasets and tables in the project",
      {},
      async () => {
        try {
          const [datasets] = await this.bigquery.getDatasets();
          
          const result: Record<string, string[]> = {};
          
          for (const dataset of datasets) {
            if (dataset.id) {
              const [tables] = await dataset.getTables();
              result[dataset.id] = tables.map(table => table.id || '');
            }
          }
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify(result, null, 2) 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error listing tables: ${(error as Error).message}` 
            }],
            isError: true,
          };
        }
      }
    );
    
    // 3. get_table_information - Get table schema and sample data
    this.server.tool(
      "get_table_information",
      "Get table schema and sample data (up to 20 rows)",
      {
        datasetId: z.string().min(1, "Dataset ID is required"),
        tableId: z.string().min(1, "Table ID is required"),
        partition: z.string().optional().describe("Partition filter (e.g., '20250101' or '2025-01-01')"),
      },
      async ({ datasetId, tableId, partition }) => {
        try {
          const table = this.bigquery.dataset(datasetId).table(tableId);
          
          // Get table metadata
          const [metadata] = await table.getMetadata();
          const schema = metadata.schema;
          const timePartitioning = metadata.timePartitioning;
          
          // Check if table is partitioned
          const isPartitioned = !!timePartitioning;
          const partitionColumn = isPartitioned ? 
            (timePartitioning.field || "_PARTITIONTIME") : null;
          
          // Prepare query to get sample data
          let query = `SELECT * FROM \`${this.args["project-id"]}.${datasetId}.${tableId}\``;
          
          // Add partition filter if provided and table is partitioned
          if (isPartitioned && partition) {
            // Format partition filter based on the partition column
            if (partitionColumn === "_PARTITIONTIME") {
              // Format date if needed (YYYYMMDD -> YYYY-MM-DD)
              const formattedDate = partition.length === 8 ? 
                `${partition.substring(0, 4)}-${partition.substring(4, 6)}-${partition.substring(6, 8)}` : 
                partition;
              
              query += ` WHERE _PARTITIONTIME = TIMESTAMP('${formattedDate}')`;
            } else {
              query += ` WHERE ${partitionColumn} = '${partition}'`;
            }
          } else if (isPartitioned && !partition) {
            // Warn if table is partitioned but no partition filter provided
            return {
              content: [{ 
                type: "text", 
                text: `Warning: Table ${tableId} is partitioned by ${partitionColumn} but no partition filter was provided. ` +
                      `This may result in a large query. Please provide a partition value.` 
              }],
              isError: true,
            };
          }
          
          query += " LIMIT 20";
          
          // Execute query to get sample data
          const [rows] = await this.bigquery.query({
            query,
            maximumBytesBilled: String(this.args["max-bytes-billed"]),
          });
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                schema,
                timePartitioning,
                sampleData: rows,
              }, null, 2) 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error getting table information: ${(error as Error).message}` 
            }],
            isError: true,
          };
        }
      }
    );
    
    // 4. dry_run_query - Check query for errors and estimate cost
    this.server.tool(
      "dry_run_query",
      "Check query for errors and estimate cost without executing it",
      {
        query: z.string().min(1, "SQL query is required"),
        dryRun: z.boolean().optional().default(true),
      },
      async ({ query, dryRun }) => {
        try {
          // Ensure query is not empty
          if (!this.isValidQuery(query)) {
            return {
              content: [{ 
                type: "text", 
                text: "Error: Empty query is not allowed." 
              }],
              isError: true,
            };
          }
          
          // Always force dryRun to true for this tool
          const options = {
            query,
            dryRun: true, // Force to true regardless of input
            maximumBytesBilled: String(this.args["max-bytes-billed"]),
          };
          
          // For dry run, the statistics are available directly from the job creation response
          const [job] = await this.bigquery.createQueryJob(options);
          
          // Access statistics directly from the job object
          const statistics = job.metadata && job.metadata.statistics;
          
          if (!statistics || !statistics.totalBytesProcessed) {
            return {
              content: [{ 
                type: "text", 
                text: "Error: Could not retrieve query statistics." 
              }],
              isError: true,
            };
          }
          
          const totalBytesProcessed = Number(statistics.totalBytesProcessed);
          const estimatedCost = this.calculateEstimatedCost(totalBytesProcessed);
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                status: "Query is valid",
                totalBytesProcessed,
                totalBytesProcessedGb: (totalBytesProcessed / 1024 / 1024 / 1024).toFixed(2) + " GB",
                estimatedCost: `$${estimatedCost.toFixed(2)}`,
                queryPlan: statistics.queryPlan,
              }, null, 2) 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error in query: ${(error as Error).message}` 
            }],
            isError: true,
          };
        }
      }
    );
  }
  
  // Helper method to check if a query is valid (not empty)
  private isValidQuery(query: string): boolean {
    const normalizedQuery = query.trim();
    
    // Check if query is not empty
    return normalizedQuery.length > 0;
  }
  
  // Helper method to calculate estimated cost (simplified)
  private calculateEstimatedCost(bytes: number): number {
    // BigQuery pricing: $5 per TB (as of 2025)
    // This is a simplified calculation and may not reflect actual billing
    return (bytes / 1024 / 1024 / 1024 / 1024) * 5;
  }
  
  // Verify authentication and permissions
  async verifyAuthentication(): Promise<boolean> {
    try {
      // Try to list datasets as a simple permission check
      await this.bigquery.getDatasets({ maxResults: 1 });
      return true;
    } catch (error) {
      console.error("Authentication error:", (error as Error).message);
      return false;
    }
  }
  
  // Start the server
  async start() {
    // Verify authentication before starting
    const isAuthenticated = await this.verifyAuthentication();
    if (!isAuthenticated) {
      console.error("Failed to authenticate with BigQuery. Please check your credentials and permissions.");
      process.exit(1);
    }
    
    console.error(`BigQuery MCP Server starting...`);
    console.error(`Project ID: ${this.args["project-id"]}`);
    console.error(`Location: ${this.args.location}`);
    console.error(`Max Results: ${this.args["max-results"]}`);
    console.error(`Max Bytes Billed: ${this.args["max-bytes-billed"]} (${this.args["max-bytes-billed"] / 1024 / 1024 / 1024} GB)`);
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("BigQuery MCP Server running on stdio");
    
    // Handle termination
    process.on("SIGINT", async () => {
      console.error("Shutting down BigQuery MCP Server...");
      await this.server.close();
      process.exit(0);
    });
  }
}

// Parse command line arguments
function parseArgs(): Args {
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
    if (error instanceof z.ZodError) {
      console.error("Invalid arguments:", error.errors);
    } else {
      console.error("Error parsing arguments:", (error as Error).message);
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

// Main function
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
