FROM oven/bun:latest as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create a smaller runtime image
FROM oven/bun:latest

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist/bigquery-mcp-server /app/bigquery-mcp-server
COPY --from=builder /app/package.json /app/package.json

# Make the binary executable
RUN chmod +x /app/bigquery-mcp-server

# Set the entrypoint
ENTRYPOINT ["/app/bigquery-mcp-server"]

# Default command (will be appended to ENTRYPOINT)
CMD ["--help"]
