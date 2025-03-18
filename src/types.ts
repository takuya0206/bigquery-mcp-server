import type { BigQueryOptions } from "@google-cloud/bigquery";
import { z } from "zod";

// Command line arguments schema
export const ArgsSchema = z.object({
  "project-id": z.string().min(1, "Project ID is required"),
  "location": z.string().default("asia-northeast1"),
  "key-file": z.string().optional(),
  "max-results": z.coerce.number().default(1000),
  "max-bytes-billed": z.coerce.number().default(500000000000), // 500GB
});

export type Args = z.infer<typeof ArgsSchema>;

// Common response type for tool handlers
export type ToolResponse = {
  content: { 
    type: "text"; 
    text: string;
  }[];
  isError?: boolean;
};
