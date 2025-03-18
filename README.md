# BigQuery MCP Server

A Model Context Protocol (MCP) server for accessing Google BigQuery. This server enables Large Language Models (LLMs) to understand BigQuery dataset structures and execute SQL queries.

## Features

### Authentication and Connection Management
- Supports Application Default Credentials (ADC) or service account key files
- Configurable project ID and location settings
- Authentication verification on startup

### Tools

1. **query**
   - Execute read-only (SELECT) BigQuery SQL queries
   - Configurable maximum results and bytes billed
   - Security checks to prevent non-SELECT queries

2. **list_all_tables**
   - List all datasets and tables in the project
   - Returns a structured JSON object with dataset and table names

3. **get_table_information**
   - Get table schema and sample data (up to 20 rows)
   - Support for partitioned tables with partition filters
   - Warnings for queries on partitioned tables without filters

4. **dry_run_query**
   - Check query validity and estimate cost without execution
   - Returns processing size and estimated cost

## Security Features
- Only SELECT queries are allowed (read-only access)
- Default limit of 500GB for query processing to prevent excessive costs
- Partition filter recommendations for partitioned tables
- Secure handling of authentication credentials

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bigquery-mcp-server.git
cd bigquery-mcp-server

# Install dependencies
bun install

# Build the server
bun run build

# Install command to your own path.
cp dist/bigquery-mcp-server /path/to/your_place
```

### Docker Installation

You can also run the server in a Docker container:

```bash
# Build the Docker image
docker build -t bigquery-mcp-server .

# Run the container
docker run -it --rm \
  bigquery-mcp-server \
  --project-id=your-project-id
```

Or using Docker Compose:

```bash
# Edit docker-compose.yml to set your project ID and other options
# Then run:
docker-compose up
```

## MCP Configuration

To use this server with an MCP-enabled LLM, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "BigQuery": {
      "command": "/path/to/dist/bigquery-mcp-server",
      "args": [
        "--project-id",
        "your-project-id",
        "--location",
        "asia-northeast1",
        "--max-results",
        "1000",
        "--max-bytes-billed",
        "500000000000"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account-key.json"
      }
    }
  }
}
```

You can also use Application Default Credentials instead of a service account key file:

```json
{
  "mcpServers": {
    "BigQuery": {
      "command": "/path/to/dist/bigquery-mcp-server",
      "args": [
        "--project-id",
        "your-project-id",
        "--location",
        "asia-northeast1",
        "--max-results",
        "1000",
        "--max-bytes-billed",
        "500000000000"
      ]
    }
  }
}
```

### Setting up Application Default Credentials

To authenticate using Application Default Credentials:

1. Install the Google Cloud SDK if you haven't already:
   ```bash
   # For macOS
   brew install --cask google-cloud-sdk
   
   # For other platforms, see: https://cloud.google.com/sdk/docs/install
   ```

2. Run the authentication command:
   ```bash
   gcloud auth application-default login
   ```

3. Follow the prompts to log in with your Google account that has access to the BigQuery project.

4. The credentials will be saved to your local machine and automatically used by the BigQuery MCP server.

## Testing

You can use [inspector](https://github.com/modelcontextprotocol/inspector) for testing and debugging.

```
npx @modelcontextprotocol/inspector dist/bigquery-mcp-server --project-id={{your_own_project}}
```

## Usage

### Using the Helper Script

The included `run-server.sh` script makes it easy to start the server with common configurations:

```bash
# Make the script executable
chmod +x run-server.sh

# Run with Application Default Credentials
./run-server.sh --project-id=your-project-id

# Run with a service account key file
./run-server.sh \
  --project-id=your-project-id \
  --location=asia-northeast1 \
  --key-file=/path/to/service-account-key.json \
  --max-results=1000 \
  --max-bytes-billed=500000000000
```

### Manual Execution

You can also run the compiled binary directly:

```bash
# Run with Application Default Credentials
./dist/bigquery-mcp-server --project-id=your-project-id

# Run with a service account key file
./dist/bigquery-mcp-server \
  --project-id=your-project-id \
  --location=asia-northeast1 \
  --key-file=/path/to/service-account-key.json \
  --max-results=1000 \
  --max-bytes-billed=500000000000
```

### Example Client

An example Node.js client is included in the `examples` directory:

```bash
# Make the example executable
chmod +x examples/sample-query.js

# Edit the example to set your project ID
# Then run it
cd examples
./sample-query.js
```

### Command Line Options

- `--project-id`: Google Cloud project ID (required)
- `--location`: BigQuery location (default: asia-northeast1)
- `--key-file`: Path to service account key file (optional)
- `--max-results`: Maximum rows to return (default: 1000)
- `--max-bytes-billed`: Maximum bytes to process (default: 500000000000, 500GB)

## Required Permissions

The service account or user credentials should have one of the following:

- `roles/bigquery.user` (recommended)

Or both of these:
- `roles/bigquery.dataViewer` (for reading table data)
- `roles/bigquery.jobUser` (for executing queries)

## Example Usage

### Query Tool

```json
{
  "query": "SELECT * FROM `project.dataset.table` LIMIT 10",
  "maxResults": 100
}
```

### Get Table Information Tool

```json
{
  "datasetId": "your_dataset",
  "tableId": "your_table",
  "partition": "20250101"
}
```

### Dry Run Query Tool

```json
{
  "query": "SELECT * FROM `project.dataset.table` WHERE date = '2025-01-01'"
}
```

## Error Handling

The server provides detailed error messages for:
- Authentication failures
- Permission issues
- Invalid queries
- Missing partition filters
- Excessive data processing requests

## Code Structure

The server is organized into the following structure:

```
src/
├── index.ts              # Entry point
├── server.ts             # BigQueryMcpServer class
├── types.ts              # Type definitions
├── tools/                # Tool implementations
│   ├── query.ts          # query tool
│   ├── list-tables.ts    # list_all_tables tool
│   ├── table-info.ts     # get_table_information tool
│   └── dry-run.ts        # dry_run_query tool
└── utils/                # Utility functions
    ├── args-parser.ts    # Command line argument parser
    └── query-utils.ts    # Query validation and response formatting
```

## License

MIT
