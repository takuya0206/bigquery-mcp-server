#!/usr/bin/env node
/**
 * Example script to demonstrate using the BigQuery MCP server
 * 
 * This script shows how to:
 * 1. Start the BigQuery MCP server
 * 2. Connect to it using the MCP client
 * 3. Execute a sample query
 * 
 * Prerequisites:
 * - Node.js installed
 * - Google Cloud credentials configured (ADC or service account key)
 * - @modelcontextprotocol/sdk installed
 */

import { spawn } from 'child_process';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { PipeClientTransport } from '@modelcontextprotocol/sdk/client/pipe.js';

// Configuration
const PROJECT_ID = 'your-project-id'; // Replace with your Google Cloud project ID
const SAMPLE_QUERY = 'SELECT 1 as test_value';

// Start the BigQuery MCP server as a child process
async function startServer() {
  console.log('Starting BigQuery MCP server...');
  
  const serverProcess = spawn(
    '../dist/bigquery-mcp-server',
    [`--project-id=${PROJECT_ID}`],
    {
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: __dirname,
    }
  );
  
  // Handle server process events
  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });
  
  // Create client transport connected to the server process
  const transport = new PipeClientTransport({
    stdin: serverProcess.stdin,
    stdout: serverProcess.stdout,
  });
  
  // Create MCP client
  const client = new McpClient();
  await client.connect(transport);
  
  return { client, serverProcess };
}

// Execute a sample query
async function executeQuery(client) {
  console.log(`Executing query: ${SAMPLE_QUERY}`);
  
  try {
    const result = await client.callTool('query', {
      query: SAMPLE_QUERY,
      maxResults: 10,
    });
    
    console.log('Query result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

// List all tables in the project
async function listAllTables(client) {
  console.log('Listing all tables in the project...');
  
  try {
    const result = await client.callTool('list_all_tables', {});
    
    console.log('Tables:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error listing tables:', error);
    throw error;
  }
}

// Main function
async function main() {
  let serverProcess;
  
  try {
    // Start server and get client
    const { client, serverProcess: sp } = await startServer();
    serverProcess = sp;
    
    // Execute sample query
    await executeQuery(client);
    
    // List all tables
    await listAllTables(client);
    
    console.log('Example completed successfully');
  } catch (error) {
    console.error('Example failed:', error);
  } finally {
    // Clean up
    if (serverProcess) {
      console.log('Terminating server process...');
      serverProcess.kill();
    }
  }
}

// Run the example
main().catch(console.error);
