/**
 * Utility functions for query validation and processing
 */

/**
 * Check if a query is valid (not empty)
 * @param query SQL query string
 * @returns boolean indicating if the query is valid
 */
export function isValidQuery(query: string): boolean {
  const normalizedQuery = query.trim();
  
  // Check if query is not empty
  return normalizedQuery.length > 0;
}

/**
 * Calculate estimated cost based on bytes processed
 * @param bytes Number of bytes processed
 * @returns Estimated cost in USD
 */
export function calculateEstimatedCost(bytes: number): number {
  // BigQuery pricing: $5 per TB (as of 2025)
  // This is a simplified calculation and may not reflect actual billing
  return (bytes / 1024 / 1024 / 1024 / 1024) * 5;
}

/**
 * Format error response for tools
 * @param message Error message
 * @returns Formatted error response
 */
export function formatErrorResponse(message: string) {
  return {
    content: [{ 
      type: "text" as const, 
      text: `Error: ${message}` 
    }],
    isError: true,
  };
}

/**
 * Format success response for tools
 * @param data Data to include in the response
 * @returns Formatted success response
 */
export function formatSuccessResponse(data: any) {
  return {
    content: [{ 
      type: "text" as const, 
      text: JSON.stringify(data, null, 2) 
    }],
  };
}
