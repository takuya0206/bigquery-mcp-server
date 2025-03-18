import type { BigQuery } from "@google-cloud/bigquery";
import { z } from "zod";
import type { Args } from "../types.js";
import { formatErrorResponse, formatSuccessResponse } from "../utils/query-utils.js";

// Schema for table information tool parameters
export const TableInfoToolSchema = {
  datasetId: z.string().min(1, "Dataset ID is required"),
  tableId: z.string().min(1, "Table ID is required"),
  partition: z.string().optional().describe("Partition filter (e.g., '20250101' or '2025-01-01')"),
};

/**
 * Implements the get_table_information tool to get table schema and sample data
 * @param bigquery BigQuery client instance
 * @param args Server arguments
 * @returns Tool handler function
 */
export function createTableInfoTool(bigquery: BigQuery, args: Args) {
  return async (params: { datasetId: string; tableId: string; partition?: string }) => {
    const { datasetId, tableId, partition } = params;
    
    try {
      const table = bigquery.dataset(datasetId).table(tableId);
      
      // Get table metadata
      const [metadata] = await table.getMetadata();
      const schema = metadata.schema;
      const timePartitioning = metadata.timePartitioning;
      
      // Check if table is partitioned
      const isPartitioned = !!timePartitioning;
      const partitionColumn = isPartitioned ? 
        (timePartitioning.field || "_PARTITIONTIME") : null;
      
      // Prepare query to get sample data
      let query = `SELECT * FROM \`${args["project-id"]}.${datasetId}.${tableId}\``;
      
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
        return formatErrorResponse(
          `Table ${tableId} is partitioned by ${partitionColumn} but no partition filter was provided. ` +
          `This may result in a large query. Please provide a partition value.`
        );
      }
      
      query += " LIMIT 20";
      
      // Execute query to get sample data
      const [rows] = await bigquery.query({
        query,
        maximumBytesBilled: String(args["max-bytes-billed"]),
      });
      
      return formatSuccessResponse({
        schema,
        timePartitioning,
        sampleData: rows,
      });
    } catch (error) {
      return formatErrorResponse(`Error getting table information: ${(error as Error).message}`);
    }
  };
}
