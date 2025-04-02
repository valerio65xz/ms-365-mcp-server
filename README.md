# ms-365-mcp-server (v0.1.0)

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 services through the Graph API.

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
npm install -g ms-365-mcp-server
```

Or use directly with npx:

```bash
npx ms-365-mcp-server
```

## Usage

### Command Line Options

```bash
npx ms-365-mcp-server [options]
```

Options:

- `--login`: Force login using device code flow
- `--logout`: Log out and clear saved credentials
- `--file <path>`: Excel file path to use (default: "/Livet.xlsx")
- `--silent`: Run without informational messages to stderr

### Authentication

The first time you run the server, it will automatically initiate the device code flow authentication. You'll see instructions in the terminal about how to complete the authentication in your browser.

Authentication tokens are cached securely in your system's credential store with fallback to file storage if needed.

### MCP Tools

This server provides several MCP tools for interacting with Excel files:

- `login`: Force a new login with Microsoft
- `logout`: Log out of Microsoft and clear credentials
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

