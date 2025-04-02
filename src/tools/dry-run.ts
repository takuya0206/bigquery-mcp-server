import type { BigQuery } from "@google-cloud/bigquery";
import { z } from "zod";
import type { Args } from "../types.js";
import { calculateEstimatedCost, formatErrorResponse, formatSuccessResponse, isValidQuery } from "../utils/query-utils.js";

// Schema for dry run query tool parameters
export const DryRunToolSchema = {
  query: z.string().min(1, "SQL query is required"),
  dryRun: z.boolean().optional().default(true),
};

/**
 * Implements the dry_run_query tool to check query for errors and estimate cost
 * @param bigquery BigQuery client instance
 * @param args Server arguments
 * @returns Tool handler function
 */
export function createDryRunTool(bigquery: BigQuery, args: Args) {
  return async (params: { query: string; dryRun?: boolean }) => {
    const { query } = params;
    
    try {
      // Ensure query is not empty and read-only
      try {
        if (!isValidQuery(query)) {
          return formatErrorResponse("Empty query is not allowed.");
        }
      } catch (error) {
        return formatErrorResponse((error as Error).message);
      }
      
      // Always force dryRun to true for this tool
      const options = {
        query,
        dryRun: true, // Force to true regardless of input
        maximumBytesBilled: String(args["max-bytes-billed"]),
      };
      
      // For dry run, the statistics are available directly from the job creation response
      const [job] = await bigquery.createQueryJob(options);
      
      // Access statistics directly from the job object
      const statistics = job.metadata && job.metadata.statistics;
      
      if (!statistics || !statistics.totalBytesProcessed) {
        return formatErrorResponse("Could not retrieve query statistics.");
      }
      
      const totalBytesProcessed = Number(statistics.totalBytesProcessed);
      const estimatedCost = calculateEstimatedCost(totalBytesProcessed);
      
      return formatSuccessResponse({
        status: "Query is valid",
        totalBytesProcessed,
        totalBytesProcessedGb: (totalBytesProcessed / 1024 / 1024 / 1024).toFixed(2) + " GB",
        estimatedCost: `$${estimatedCost.toFixed(2)}`,
        queryPlan: statistics.queryPlan,
      });
    } catch (error) {
      return formatErrorResponse(`Error in query: ${(error as Error).message}`);
    }
  };
}
