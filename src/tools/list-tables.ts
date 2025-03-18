import type { BigQuery } from "@google-cloud/bigquery";
import { z } from "zod";
import { formatErrorResponse, formatSuccessResponse } from "../utils/query-utils.js";

// Schema for list tables with dataset tool parameters
export const ListTablesWithDatasetSchema = {
  datasetId: z.string().min(1, "Dataset ID is required"),
};

/**
 * Implements the list_all_tables_with_dataset tool to list all tables in a specific dataset with their schemas
 * @param bigquery BigQuery client instance
 * @returns Tool handler function
 */
export function createListTablesWithDatasetTool(bigquery: BigQuery) {
  return async (params: { datasetId: string }) => {
    const { datasetId } = params;
    
    try {
      const dataset = bigquery.dataset(datasetId);
      
      // Check if dataset exists
      try {
        await dataset.get();
      } catch (error) {
        return formatErrorResponse(`Dataset ${datasetId} not found: ${(error as Error).message}`);
      }
      
      // Get all tables in the dataset
      const [tables] = await dataset.getTables();
      
      // Get schema for each table
      const result = await Promise.all(
        tables.map(async (table) => {
          if (!table.id) return null;
          
          try {
            // Get table metadata to extract schema
            const [metadata] = await table.getMetadata();
            
            return {
              tableId: table.id,
              schema: metadata.schema,
              timePartitioning: metadata.timePartitioning || null,
              description: metadata.description || null,
            };
          } catch (error) {
            console.error(`Error getting schema for table ${table.id}: ${(error as Error).message}`);
            return {
              tableId: table.id,
              error: `Failed to get schema: ${(error as Error).message}`,
            };
          }
        })
      );
      
      // Filter out null values (tables without IDs)
      const filteredResult = result.filter(item => item !== null);
      
      return formatSuccessResponse(filteredResult);
    } catch (error) {
      return formatErrorResponse(`Error listing tables: ${(error as Error).message}`);
    }
  };
}
