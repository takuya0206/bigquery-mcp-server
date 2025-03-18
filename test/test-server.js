#!/usr/bin/env node
/**
 * Test script for the BigQuery MCP server
 * 
 * This script tests the basic functionality of the server:
 * 1. Starts the server with a mock project ID
 * 2. Tests the dry_run_query tool with a simple query
 * 
 * Note: This is a basic test and doesn't actually connect to BigQuery.
 * It's meant to verify that the server starts and responds to requests.
 */

import { spawn } from 'child_process';
import { McpClient } from '@modelcontextprotocol/sdk/dist/client/mcp.js';
import { PipeClientTransport } from '@modelcontextprotocol/sdk/dist/client/pipe.js';

// Mock project ID for testing
const TEST_PROJECT_ID = 'test-project-id';
const TEST_QUERY = 'SELECT 1 as test';

// Start the server with the --dry-run flag
async function startTestServer() {
  console.log('Starting BigQuery MCP server in test mode...');
  
  // Use a mock project ID for testing
  const serverProcess = spawn(
    '../dist/bigquery-mcp-server',
    [`--project-id=${TEST_PROJECT_ID}`],
    {
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: __dirname,
      env: {
        ...process.env,
        // Set environment variables to mock authentication
        GOOGLE_APPLICATION_CREDENTIALS: 'mock',
        BIGQUERY_TEST_MODE: 'true',
      },
    }
  );
  
  // Handle server process events
  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
  
  // Create client transport connected to the server process
  const transport = new PipeClientTransport({
    stdin: serverProcess.stdin,
    stdout: serverProcess.stdout,
  });
  
  // Create MCP client
  const client = new McpClient();
  
  try {
    await client.connect(transport);
    return { client, serverProcess };
  } catch (error) {
    serverProcess.kill();
    throw error;
  }
}

// Test the dry_run_query tool
async function testDryRunQuery(client) {
  console.log(`Testing dry_run_query with query: ${TEST_QUERY}`);
  
  try {
    const result = await client.callTool('dry_run_query', {
      query: TEST_QUERY,
      dryRun: true,
    });
    
    console.log('Dry run result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error in dry run query:', error);
    throw error;
  }
}

// Main test function
async function runTests() {
  let serverProcess;
  let success = false;
  
  try {
    // Start server and get client
    const { client, serverProcess: sp } = await startTestServer();
    serverProcess = sp;
    
    // Test dry run query
    await testDryRunQuery(client);
    
    console.log('\n✅ All tests passed!');
    success = true;
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
  } finally {
    // Clean up
    if (serverProcess) {
      console.log('Terminating server process...');
      serverProcess.kill();
    }
    
    process.exit(success ? 0 : 1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in tests:', error);
  process.exit(1);
});
