import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc-api.js";

// Set NODE_TLS_REJECT_UNAUTHORIZED only in development if needed
// If you're in a corporate environment with special certificates, you may need this
// but it's better to configure the certificates properly in production
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_TLS === 'true') {
    console.warn('WARNING: TLS certificate verification is disabled. This is insecure and should not be used in production.');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Initialize the MCP server
const server = new McpServer({
    name: "MCP_SFMC",
    version: "1.0.0",
    capabilities: {
        tools: {},
    },
});

// Get SFMC credentials from environment variables (passed from Claude Desktop config)
const sfmcConfig = {
    clientId: process.env.SFMC_CLIENT_ID || "",
    clientSecret: process.env.SFMC_CLIENT_SECRET || "",
    authBaseUri: process.env.SFMC_AUTH_BASE_URI || "",
    restBaseUri: process.env.SFMC_REST_BASE_URI || "",
    accountId: process.env.SFMC_ACCOUNT_ID,
    // Add proxy settings if needed
    proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined,
    // Add SSL verification option - if needed in development
    rejectUnauthorized: process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_TLS === 'true' 
        ? false 
        : undefined
};

// Initialize SFMC client
const sfmcClient = new SFMCAPIService(sfmcConfig);

// Validate if required credentials are provided
if (!sfmcConfig.clientId || !sfmcConfig.clientSecret || !sfmcConfig.authBaseUri || !sfmcConfig.restBaseUri) {
    console.error("ERROR: Missing required SFMC credentials in environment variables.");
    console.error("Make sure to set SFMC_CLIENT_ID, SFMC_CLIENT_SECRET, SFMC_AUTH_BASE_URI, and SFMC_REST_BASE_URI in Claude Desktop config.");
    process.exit(1);
}

// Log proxy information if available
if (sfmcConfig.proxy) {
    console.error(`Using proxy: ${sfmcConfig.proxy}`);
}

// General REST API Request Tool - A generic proxy to the SFMC REST API
server.tool("sfmc_rest_request", "Make a request to any SFMC REST API endpoint", {
    // Request Parameters
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
    endpoint: z.string().describe("API endpoint path starting with /"),
    data: z.any().optional().describe("Request body for POST, PUT, PATCH requests (JSON)"),
    parameters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Query parameters"),
}, async ({ method, endpoint, data, parameters }) => {
    try {
        // Make the API request using the pre-configured SFMC client
        const result = await sfmcClient.makeRequest(method, endpoint, data, parameters);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error: any) {
        console.error(`ERROR executing ${method} ${endpoint}:`, error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

server.tool("sfmc_soap_request", "Make a request to the SFMC SOAP API", {
    action: z.string().describe("SOAP Action (e.g. Retrieve, Create, Update, Delete, Execute)"),
    body: z.string().describe("Full SOAP envelope XML as a string"),
}, async ({ action, body }) => {
    try {
        const result = await sfmcClient.makeSoapRequest(action, body);
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error: any) {
        console.error(`ERROR executing SOAP action ${action}:`, error);
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

// Start the server
async function main() {
    try {
        console.error("Starting SFMC MCP Server...");
        console.error(`Connected to SFMC as client ID: ${sfmcConfig.clientId}`);
        console.error(`Using auth base URI: ${sfmcConfig.authBaseUri}`);
        console.error(`Using rest base URI: ${sfmcConfig.restBaseUri}`);
        console.error(`Using soap base URI: ${sfmcConfig.restBaseUri.replace('.rest.', '.soap.')}`);
        
        const transport = new StdioServerTransport();
        await server.connect(transport);
        
        console.error("SFMC MCP Server running");
    }
    catch (error: any) {
        console.error("Failed to start SFMC MCP Server:", error);
        process.exit(1);
    }
}

main();