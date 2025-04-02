import type { BigQuery } from "@google-cloud/bigquery";
import { z } from "zod";
import type { Args } from "../types.js";
import { formatErrorResponse, formatSuccessResponse, isValidQuery } from "../utils/query-utils.js";

// Schema for query tool parameters
export const QueryToolSchema = {
  query: z.string().min(1, "SQL query is required"),
  maxResults: z.number().optional(),
};

/**
 * Implements the query tool to execute a read-only BigQuery SQL query
 * @param bigquery BigQuery client instance
 * @param args Server arguments
 * @returns Tool handler function
 */
export function createQueryTool(bigquery: BigQuery, args: Args) {
  return async (params: { query: string; maxResults?: number }) => {
    const { query, maxResults = args["max-results"] } = params;
    try {
      // Ensure query is not empty and read-only
      try {
        if (!isValidQuery(query)) {
          return formatErrorResponse("Empty query is not allowed.");
        }
      } catch (error) {
        return formatErrorResponse((error as Error).message);
      }
      
      const options = {
        query,
        maximumBytesBilled: String(args["max-bytes-billed"]),
        maxResults,
      };

      const [job] = await bigquery.createQueryJob(options);
      const [rows] = await job.getQueryResults({
        maxResults,
      });

      return formatSuccessResponse(rows);
    } catch (error) {
      return formatErrorResponse(`Error executing query: ${(error as Error).message}`);
    }
  };
}
