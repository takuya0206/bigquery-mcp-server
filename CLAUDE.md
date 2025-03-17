# CLAUDE.md - Guidelines for Bun MCP Server

## Implementation Rules

- See [mcp.mdc](.cursor/rules/mcp.mdc) at first and learn how to implement a MCP Server.
- Generate a appropriate package name and overwrite package.json
- Some examples using `setRequestHandler()` to implement a tool or resource, but it's deprecated. Use `server.tool()` or `server.resource()` instead.
- You can add a thrid party package if needed to meet the requirements.
- You can use Bun runtime features. Bun provides many built-in functions. See [bun-file.mdc](.cursor/rules/bun-file.mdc), [bun-test.mdc](.cursor/rules/bun-test.mdc), [bun-glob.mdc](.cursor/rules/bun-glob.mdc), [bun-utils.mdc](.cursor/rules/bun-utils.mdc)

## Build Commands

- `bun run build` - Build the MCP server executable
- `bun run show-package-name` - Display the package name for installation
- Install with: `cp dist/$npm_package_name $HOME/bin/`

## Code Style Guidelines

### Imports & Organization

- Use named imports from MCP SDK: `import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"`
- Group imports by external packages first, then internal modules

### TypeScript & Types

- Use Zod for parameter validation in tools and resources
- Prefer TypeScript strict mode with explicit type annotations
- Use async/await for asynchronous operations

### Naming Conventions

- CamelCase for variables and functions
- PascalCase for classes and types
- Use descriptive names for resources, tools and prompts

### MCP Best Practices

- Resources should be pure and not have side effects (like GET endpoints)
- Tools should handle specific actions with well-defined parameters (like POST endpoints)
- Write a enough description for tool and each parameters.
- Use ResourceTemplate for parameterized resources
- Properly handle errors in tool implementations and return isError: true

### Error Handling

- Use try/catch blocks with specific error types
- Return proper error responses with descriptive messages
- Always close connections and free resources in finally blocks

## References

- [Basic Examples](.cursor/rules/basic.mdc)

## Another Examples

- [@modelcontextprotocol/server-memory](https://github.com/modelcontextprotocol/servers/blob/main/src/memory/index.ts)
- [@modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/index.ts)
- [redis](https://github.com/modelcontextprotocol/servers/blob/main/src/redis/src/index.ts)
