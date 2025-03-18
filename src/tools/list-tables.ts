import type { BigQuery } from "@google-cloud/bigquery";
import { formatErrorResponse, formatSuccessResponse } from "../utils/query-utils.js";

/**
 * Implements the list_all_tables tool to list all datasets and tables in the project
 * @param bigquery BigQuery client instance
 * @returns Tool handler function
 */
export function createListAllTablesTool(bigquery: BigQuery) {
  return async () => {
    try {
      const [datasets] = await bigquery.getDatasets();
      
      const result: Record<string, string[]> = {};
      
      for (const dataset of datasets) {
        if (dataset.id) {
          const [tables] = await dataset.getTables();
          result[dataset.id] = tables.map(table => table.id || '');
        }
      }
      
      return formatSuccessResponse(result);
    } catch (error) {
      return formatErrorResponse(`Error listing tables: ${(error as Error).message}`);
    }
  };
}
