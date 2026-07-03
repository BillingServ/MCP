# BillingServ MCP Server

Connect AI assistants like Claude, ChatGPT (Codex), Cursor, and Gemini to your BillingServ account.

This is an [MCP](https://modelcontextprotocol.io) server for the BillingServ API. Once it's set up, your AI assistant can look up customers, invoices, orders, packages, and reports straight from your BillingServ installation. Ask things like:

- "Which customers have unpaid invoices this month?"
- "Show me the revenue trend for this year."
- "What packages does customer 123 have, and what could they upgrade to?"

And your assistant answers from live billing data instead of guessing.

You can also ask it to do things: raise a support ticket, create an order, draft an invoice, or add a note to a customer.

**Safe by design.** The server only calls a fixed allowlist of BillingServ endpoints, checked on every request. Reads and writes are separate tools, so you can let your AI look things up freely while requiring approval for anything that creates or changes records. Deleting records and capturing payments are deliberately not available.

## Requirements

- [Node.js](https://nodejs.org) 20 or newer (`npx` comes with it)
- A BillingServ API key

## Configuration

Every client setup below uses the same three environment variables:

| Variable | Required | Description |
| --- | --- | --- |
| `BILLINGSERV_API_BASE_URL` | Yes | Your BillingServ API v2 base URL, e.g. `https://billing.example.com/api/v2` |
| `BILLINGSERV_API_KEY` | Yes | Your BillingServ API key |
| `BILLINGSERV_TIMEOUT_MS` | No | Request timeout in milliseconds (default `15000`) |

## Setup

Find your client below, drop in your URL and API key, and you're done.

### Claude Code

One command:

```bash
claude mcp add billingserv \
  --env BILLINGSERV_API_BASE_URL="https://billing.example.com/api/v2" \
  --env BILLINGSERV_API_KEY="your_api_key" \
  -- npx -y @billingserv/mcp-server
```

Restart Claude Code and try asking it to list your BillingServ endpoints.

### Claude Desktop

Open **Settings → Developer → Edit Config** and add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "billingserv": {
      "command": "npx",
      "args": ["-y", "@billingserv/mcp-server"],
      "env": {
        "BILLINGSERV_API_BASE_URL": "https://billing.example.com/api/v2",
        "BILLINGSERV_API_KEY": "your_api_key"
      }
    }
  }
}
```

Restart Claude Desktop and look for the `billingserv` tools under the tools icon.

### OpenAI Codex CLI

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.billingserv]
command = "npx"
args = ["-y", "@billingserv/mcp-server"]

[mcp_servers.billingserv.env]
BILLINGSERV_API_BASE_URL = "https://billing.example.com/api/v2"
BILLINGSERV_API_KEY = "your_api_key"
```

### Cursor

Add this to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "billingserv": {
      "command": "npx",
      "args": ["-y", "@billingserv/mcp-server"],
      "env": {
        "BILLINGSERV_API_BASE_URL": "https://billing.example.com/api/v2",
        "BILLINGSERV_API_KEY": "your_api_key"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add this to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "billingserv": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@billingserv/mcp-server"],
      "env": {
        "BILLINGSERV_API_BASE_URL": "https://billing.example.com/api/v2",
        "BILLINGSERV_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Gemini CLI

Add this to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "billingserv": {
      "command": "npx",
      "args": ["-y", "@billingserv/mcp-server"],
      "env": {
        "BILLINGSERV_API_BASE_URL": "https://billing.example.com/api/v2",
        "BILLINGSERV_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Other MCP clients

Any MCP client that supports stdio servers will work. Point it at:

- **Command:** `npx`
- **Arguments:** `-y @billingserv/mcp-server`
- **Environment:** the variables from [Configuration](#configuration)

## Tools

The server gives your assistant three tools:

### `billingserv_list_endpoints`

Lists every BillingServ endpoint the server can call, along with descriptions, required parameters, and valid values. Assistants usually call this first to see what data is available.

### `billingserv_get`

Calls one allowlisted BillingServ API v2 `GET` endpoint.

```json
{
  "endpoint": "customer/get",
  "query": { "id": 123 }
}
```

Endpoints with placeholders in the path take a `path` object instead:

```json
{
  "endpoint": "meter/{customer_id}/get/{order_id}",
  "path": { "customer_id": 123, "order_id": 456 }
}
```

### `billingserv_create`

Creates or updates records through an allowlisted set of `POST` endpoints. This is the tool to gate behind approval in your MCP client if you want a confirmation step before anything changes.

```json
{
  "endpoint": "ticket/create",
  "body": {
    "subject": "Question about my last invoice",
    "user_id": 123,
    "message": "Customer called about a duplicate charge.",
    "support_department": "billing"
  }
}
```

## Available endpoints

| Area | Endpoints |
| --- | --- |
| Customers | `customer/lists`, `customer/get`, `customer/get-credit` |
| Invoices | `invoice/lists`, `invoice/get-payment-method`, `invoice/get-transactions` |
| Orders | `order/get-orders`, `order/get-orders-by-status`, `order/available-package-changes`, `order/preview-package-change`, `order/check-fraud` |
| Packages | `package/lists`, `package/get`, `package/show`, `package/get-by-customer`, `package/group/lists`, `package/group/get`, `package/option/lists`, `package/option/get` |
| Reports | `report/annual-sales`, `report/revenue-trend`, `report/sales-by-staff`, `report/sales-by-customer`, `report/package-leaderboard`, `report/customer-receipt`, `report/customer-credit`, `report/customer-invoice`, `report/customer-debt`, `report/login-history` |
| Support tickets | `ticket/lists`, `ticket/get` |
| Marketing | `marketing/lists`, `marketing/get-discount` |
| Usage metering | `meter/{customer_id}/get/{order_id}` |
| Settings | `setting/invoice`, `setting/lists-staff`, `setting/get-staff`, `setting/lists-tax-zone`, `setting/get-tax-zone`, `setting/lists-tax-class`, `setting/get-tax-class` |
| VPN | `vpn/branding/get`, `vpn/servers/list` |
| Geography | `country/lists`, `country/get`, `county/lists-by-country` |
| Modules | `module/get-module-configuration` |

And these write endpoints, available through `billingserv_create`:

| Area | Endpoints |
| --- | --- |
| Support tickets | `ticket/create`, `ticket/reply`, `ticket/update` |
| Orders | `order/add-order` |
| Customers | `customer/create`, `customer/add-note` |
| Invoices | `invoice/create-invoice`, `invoice/create-quote`, `invoice/send-invoice`, `invoice/send-invoice-reminder` |
| Packages | `package/create`, `package/update`, `package/group/create`, `package/group/update`, `package/option/create`, `package/option/update` |
| Marketing | `marketing/create-discount` |

## Security

- The endpoint allowlist is compiled into the server and checked on every request. Only allowlisted endpoints can be called.
- Sensitive routes like password reset are deliberately left out.
- Your API key is read from the environment and only ever sent to the base URL you configure. It's never logged or included in tool output.

## Development

```bash
git clone https://github.com/billingserv/billingserv-mcp-server.git
cd billingserv-mcp-server
npm install
npm run build

BILLINGSERV_API_BASE_URL="https://billing.example.com/api/v2" \
BILLINGSERV_API_KEY="your_api_key" \
npm start
```

Or put the variables in a local `.env` file (gitignored) and run `npm run start:dev`.

## License

MIT
