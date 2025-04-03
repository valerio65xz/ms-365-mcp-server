# ms-365-mcp-server

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 services through the Graph API.

[![Build Status](https://github.com/softeria-eu/ms-365-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/softeria-eu/ms-365-mcp-server/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@softeria/ms-365-mcp-server.svg)](https://www.npmjs.com/package/@softeria/ms-365-mcp-server)

## Features

- Authentication using Microsoft Authentication Library (MSAL)
- Excel file operations:
    - Update cell values
    - Create and manage charts
    - Format cells
    - Sort data
    - Create tables
    - Read cell values
    - List worksheets
- Built on the Model Context Protocol

## Installation

```bash
npx @softeria/ms-365-mcp-server
```

## Integration with Claude

### Claude Code CLI

To add this MCP server to Claude Code CLI:

```bash
claude mcp add ms -- npx @softeria/ms-365-mcp-server
```

### Claude Desktop

To add this MCP server to Claude Desktop:

1. Launch Claude Desktop
2. Go to Settings > MCPs
3. Click "Add MCP"
4. Set the following configuration:
    - Name: `ms` (or any name you prefer)
    - Command: `npx @softeria/ms-365-mcp-server`
    - Click "Add"

### Direct Configuration

You can also use this configuration JSON in compatible Claude interfaces:

```json
{
  "name": "ms",
  "command": "npx @softeria/ms-365-mcp-server"
}
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/softeria-eu/ms-365-mcp-server.git
cd ms-365-mcp-server

# Install dependencies
npm install

# Run tests
npm test
```

### GitHub Actions

This repository uses GitHub Actions for continuous integration and deployment:

- **Build Workflow**: Runs on all pushes to main and pull requests. Verifies the project builds successfully and passes
  all tests.
- **Publish Workflow**: Automatically publishes to npm when a new GitHub release is created.

### Release Process

To create a new release:

```bash
npm run release
```

This script will:

1. Run tests to verify everything works
2. Bump the version number
3. Commit the version changes
4. Push to GitHub
5. Create a GitHub release
6. Trigger the publish workflow to publish to npm

## Usage

### Command Line Options

```bash
npx @softeria/ms-365-mcp-server [options]
```

Options:

- `--login`: Force login using device code flow and verify Graph API access
- `--logout`: Log out and clear saved credentials
- `--test-login`: Test current authentication and verify Graph API access without starting the server
- `-v`: Enable verbose logging

### Authentication

**Important:** You must authenticate before using the MCP server. There are two ways to authenticate:

1. Running the server with the `--login` flag:
   ```bash
   npx @softeria/ms-365-mcp-server --login
   ```
   This will display the login URL and code in the terminal.

2. When using Claude Code or other MCP clients, use the login tools:
    - First use the `login` tool, which will return the login URL and code
    - Visit the URL and enter the code in your browser
    - Then use the `verify-login` tool to check if the login was successful

Both methods trigger the device code flow authentication, but they handle the UI interaction differently:

- CLI version displays the instructions directly in the terminal
- MCP tool version returns the instructions as data that can be shown in the client UI

You can verify your authentication status with the `--test-login` flag, which will check if your token can successfully
fetch user data from Microsoft Graph API:

```bash
npx @softeria/ms-365-mcp-server --test-login
```

Both `--login` and `--test-login` will return a JSON response that includes your basic user information from Microsoft
Graph API if authentication is successful:

```json
{
  "success": true,
  "message": "Login successful",
  "userData": {
    "displayName": "Your Name",
    "userPrincipalName": "your.email@example.com"
  }
}
```

Authentication tokens are cached securely in your system's credential store with fallback to file storage if needed.

### MCP Tools

This server provides several MCP tools for interacting with Excel files:

- `login`: Start a new login process with Microsoft (returns login URL and code)
- `verify-login`: Check if login was completed successfully and verify Graph API access
- `logout`: Log out of Microsoft and clear credentials
- `test-login`: Test current authentication status and verify Graph API access
- `update-excel`: Update cell values in an Excel worksheet
- `create-chart`: Create a chart in an Excel worksheet
- `format-range`: Apply formatting to a range of cells
- `sort-range`: Sort a range of cells
- `create-table`: Create a table from a range of cells
- `get-range`: Get values from a range of cells
- `list-worksheets`: List all worksheets in the workbook
- `close-session`: Close the current Excel session
- `delete-chart`: Delete a chart from a worksheet
- `get-charts`: Get all charts in a worksheet
