# SFMC MCP Tool

A Model Context Protocol (MCP) tool for connecting Claude or any MCP compatible app to Salesforce Marketing Cloud (SFMC) REST API. This tool enables Claude desktop or any equivalent app to interact with SFMC directly through the `sfmc_rest_request` tool function.

## Note from the author

**Prompt responsibly.**

This MCP (Model Context Protocol) tool for Salesforce Marketing Cloud is powerful — and **potentially dangerous**.
Misunderstood prompts or improper usage can result in serious damage to your SFMC Business Unit.
To avoid unintended consequences, always test in a sandbox Business Unit before attempting anything in production.
**Treat this tool like a loaded weapon**: very effective in the right hands, but unforgiving in the wrong context.

Disclaimer: The author cannot be held responsible for any damage, data loss, or unintended consequences resulting from the use or misuse of this tool. You are fully responsible for how you apply it.

Use with care.

**You've been warned.**


## Features

- Generic REST API access to Salesforce Marketing Cloud
- Automatic OAuth token management
- Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- TLS certificate verification

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/gbo37/SFMC_MCP_TOOL.git
   cd SFMC_MCP_TOOL
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

You'll need to configure the tool with your SFMC credentials. The tool expects the following environment variables:

- `SFMC_CLIENT_ID`: Your SFMC API client ID
- `SFMC_CLIENT_SECRET`: Your SFMC API client secret
- `SFMC_AUTH_BASE_URI`: The authentication base URI (e.g., `https://auth.example.salesforce.com`)
- `SFMC_REST_BASE_URI`: The REST API base URI (e.g., `https://rest.example.salesforce.com`)
- `SFMC_ACCOUNT_ID`: (Optional) Your SFMC account ID


## Corporate Network Certificate Configuration

If you're working in a corporate environment with SSL inspection, ensure that your company's root certificate is added to Node.js's trusted certificates store. In most enterprise environments, this is handled through your IT department's system configuration.

If you need to add the certificate manually:

Set the `NODE_EXTRA_CA_CERTS` environment variable to the path of your certificate file:

   ```bash
   # Linux/Mac
   export NODE_EXTRA_CA_CERTS=/path/to/certificates.pem
   
   # Windows (PowerShell)
   $env:NODE_EXTRA_CA_CERTS="C:\path\to\certificates.pem"
   ```


## Claude Desktop Configuration

To use this tool with Claude Desktop, you need to add it to your Claude Desktop configuration.

1. Create a new MCP configuration in Claude Desktop
2. Use the following configuration template (adjust paths as needed):

```json
{
  "name": "SFMC",
  "command": "node /path/to/sfmc-mcp-tool/build/index.js",
  "env": {
    "SFMC_CLIENT_ID": "your_client_id",
    "SFMC_CLIENT_SECRET": "your_client_secret",
    "SFMC_AUTH_BASE_URI": "https://auth.example.salesforce.com",
    "SFMC_REST_BASE_URI": "https://rest.example.salesforce.com",
    "SFMC_ACCOUNT_ID": "your_account_id_if_needed"
  }
}
```

## Usage Examples

Once configured, you can use the SFMC tool in Claude Desktop to interact with your SFMC instance. 
Obviously, the scope of work of this MCP tool will be limited to the SFMC installed package access level you will set for this MCP.
Here are some prompt examples:

### Query a Data Extension

```
Could you retrieve the first 5 records from the Data Extension named "Customer_Preferences"?
```

Claude will use the tool to make a request like:

```javascript
{
  "method": "GET",
  "endpoint": "/data/v1/customobjectdata/key/Customer_Preferences/rowset",
  "parameters": {
    "$top": 5
  }
}
```

### Create a new Email

```
Please create a new email in Content Builder with the subject "March Newsletter" and the name "March_2025_Newsletter"
```

Claude will use the tool to make a request like:

```javascript
{
  "method": "POST",
  "endpoint": "/asset/v1/content/assets",
  "data": {
    "name": "March_2025_Newsletter",
    "assetType": {
      "name": "htmlemail",
      "id": 208
    },
    "content": "<html><body><h1>March Newsletter</h1><p>Content goes here</p></body></html>",
    "views": {
      "html": {
        "content": "<html><body><h1>March Newsletter</h1><p>Content goes here</p></body></html>",
        "slots": {
          "banner": {
            "content": "<h1>March Newsletter</h1>"
          }
        }
      },
      "text": {
        "content": "March Newsletter\n\nContent goes here"
      },
      "subjectline": {
        "content": "March Newsletter"
      }
    }
  }
}
```

## Troubleshooting

### Certificate Issues

If you're experiencing SSL certificate errors, try the following:

1. Verify that your corporate root certificate is correctly installed in the system certificate store
2. Check the console output for specific SSL error messages
3. Ensure your network allows connections to the SFMC endpoints

### Authentication Issues

If you're having trouble authenticating:

1. Verify your SFMC credentials are correct
2. Ensure you have API access enabled for your SFMC user
3. Check if your IP is whitelisted in SFMC if IP restrictions are enabled
4. Verify the authentication URLs are correct


## License

MIT
