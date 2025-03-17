#!/bin/bash
# Script to run the BigQuery MCP server with common configurations

# Default values
PROJECT_ID="tdb-open-release"
LOCATION="asia-northeast1"
KEY_FILE=""
MAX_RESULTS=1000
MAX_BYTES_BILLED=500000000000  # 500GB

# Display usage information
function show_usage {
  echo "Usage: $0 --project-id=<project-id> [options]"
  echo ""
  echo "Options:"
  echo "  --project-id=<id>        Google Cloud project ID (required)"
  echo "  --location=<location>    BigQuery location (default: asia-northeast1)"
  echo "  --key-file=<path>        Path to service account key file (optional)"
  echo "  --max-results=<num>      Maximum rows to return (default: 1000)"
  echo "  --max-bytes-billed=<num> Maximum bytes to process (default: 500GB)"
  echo "  --help                   Display this help message"
  echo ""
  echo "Example:"
  echo "  $0 --project-id=my-project --key-file=./key.json"
}

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --project-id=*)
      PROJECT_ID="${arg#*=}"
      ;;
    --location=*)
      LOCATION="${arg#*=}"
      ;;
    --key-file=*)
      KEY_FILE="${arg#*=}"
      ;;
    --max-results=*)
      MAX_RESULTS="${arg#*=}"
      ;;
    --max-bytes-billed=*)
      MAX_BYTES_BILLED="${arg#*=}"
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      show_usage
      exit 1
      ;;
  esac
done

# Check if project ID is provided
if [ -z "$PROJECT_ID" ]; then
  echo "Error: --project-id is required"
  show_usage
  exit 1
fi

# Build command
CMD="./dist/bigquery-mcp-server --project-id=$PROJECT_ID --location=$LOCATION --max-results=$MAX_RESULTS --max-bytes-billed=$MAX_BYTES_BILLED"

# Add key file if provided
if [ -n "$KEY_FILE" ]; then
  # Check if key file exists
  if [ ! -f "$KEY_FILE" ]; then
    echo "Error: Key file not found: $KEY_FILE"
    exit 1
  fi
  CMD="$CMD --key-file=$KEY_FILE"
fi

# Display configuration
echo "Starting BigQuery MCP Server with the following configuration:"
echo "  Project ID:       $PROJECT_ID"
echo "  Location:         $LOCATION"
echo "  Max Results:      $MAX_RESULTS"
echo "  Max Bytes Billed: $MAX_BYTES_BILLED ($(echo "$MAX_BYTES_BILLED/1024/1024/1024" | bc -l | xargs printf "%.2f") GB)"
if [ -n "$KEY_FILE" ]; then
  echo "  Key File:         $KEY_FILE"
else
  echo "  Authentication:   Using Application Default Credentials"
fi
echo ""

# Run the server
echo "Executing: $CMD"
echo "Press Ctrl+C to stop the server"
echo ""
exec $CMD
