import type { BigQuery } from "@google-cloud/bigquery";
import { formatErrorResponse, formatSuccessResponse } from "../utils/query-utils.js";

/**
 * Implements the list_all_datasets tool to list all datasets in the project
 * @param bigquery BigQuery client instance
 * @returns Tool handler function
 */
export function createListAllDatasetsTool(bigquery: BigQuery) {
  return async () => {
    try {
      const [datasets] = await bigquery.getDatasets();
      
      // Extract dataset IDs
      const datasetIds = datasets.map(dataset => dataset.id || '').filter(id => id !== '');
      
      return formatSuccessResponse(datasetIds);
    } catch (error) {
      return formatErrorResponse(`Error listing datasets: ${(error as Error).message}`);
    }
  };
}
