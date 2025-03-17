# Contributing to BigQuery MCP Server

Thank you for your interest in contributing to the BigQuery MCP Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Any relevant logs or error messages
- Your environment (OS, Node.js version, etc.)

### Suggesting Features

Feature suggestions are welcome! Please create an issue with:

- A clear, descriptive title
- A detailed description of the proposed feature
- Any relevant examples or use cases
- If possible, an implementation approach

### Pull Requests

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Submit a pull request

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bigquery-mcp-server.git
   cd bigquery-mcp-server
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build the server:
   ```bash
   bun run build
   ```

4. Run tests:
   ```bash
   bun test
   ```

## Project Structure

- `index.ts` - Main server implementation
- `examples/` - Example client implementations
- `test/` - Test scripts
- `dist/` - Compiled output (generated)

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Write clear, descriptive comments
- Include tests for new functionality

## Testing

- All new features should include tests
- Run existing tests before submitting a pull request
- Tests should be clear and maintainable

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
