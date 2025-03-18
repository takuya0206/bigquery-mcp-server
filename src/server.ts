import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BigQuery } from "@google-cloud/bigquery";
import type { BigQueryOptions } from "@google-cloud/bigquery";
import type { Args } from "./types.js";
import { createQueryTool, QueryToolSchema } from "./tools/query.js";
import { createListTablesWithDatasetTool, ListTablesWithDatasetSchema } from "./tools/list-tables.js";
import { createListAllDatasetsTool } from "./tools/list-datasets.js";
import { createTableInfoTool, TableInfoToolSchema } from "./tools/table-info.js";
import { createDryRunTool, DryRunToolSchema } from "./tools/dry-run.js";

/**
 * BigQuery MCP Server class
 * Handles server initialization, tool registration, and authentication
 */
export class BigQueryMcpServer {
  private server: McpServer;
  private bigquery: BigQuery;
  private args: Args;

  /**
   * Create a new BigQuery MCP Server
   * @param args Command line arguments
   */
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
  
  /**
   * Register all tools with the MCP server
   */
  private registerTools() {
    // 1. query - Execute a read-only BigQuery SQL query
    this.server.tool(
      "query",
      "Execute a read-only BigQuery SQL query",
      QueryToolSchema,
      createQueryTool(this.bigquery, this.args)
    );
    
    // 2. list_all_datasets - List all datasets in the project
    this.server.tool(
      "list_all_datasets",
      "List all datasets in the project",
      {},
      createListAllDatasetsTool(this.bigquery)
    );
    
    // 3. list_all_tables_with_dataset - List all tables in a specific dataset with their schemas
    this.server.tool(
      "list_all_tables_with_dataset",
      "List all tables in a specific dataset with their schemas",
      ListTablesWithDatasetSchema,
      createListTablesWithDatasetTool(this.bigquery)
    );
    
    // 4. get_table_information - Get table schema and sample data
    this.server.tool(
      "get_table_information",
      "Get table schema and sample data (up to 20 rows)",
      TableInfoToolSchema,
      createTableInfoTool(this.bigquery, this.args)
    );
    
    // 5. dry_run_query - Check query for errors and estimate cost
    this.server.tool(
      "dry_run_query",
      "Check query for errors and estimate cost without executing it",
      DryRunToolSchema,
      createDryRunTool(this.bigquery, this.args)
    );
  }
  
  /**
   * Verify authentication and permissions
   * @returns Promise<boolean> indicating if authentication was successful
   */
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
  
  /**
   * Start the server
   */
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
