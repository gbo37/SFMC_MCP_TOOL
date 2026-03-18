import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SFMCAPIService } from "./sfmc-api.js";

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
    proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined,
    rejectUnauthorized: process.env.SFMC_REJECT_UNAUTHORIZED !== 'false'
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

// Add a specific tool for Data Extensions to simplify common operations
server.tool("sfmc_get_data_extension", "Get rows from a SFMC Data Extension by key", {
    key: z.string().describe("External key of the Data Extension"),
    filter: z.string().optional().describe("Optional filter expression"),
    fields: z.array(z.string()).optional().describe("Fields to return (leave empty for all fields)"),
    orderBy: z.string().optional().describe("Field to order by"),
    page: z.number().optional().describe("Page number for pagination"),
    pageSize: z.number().optional().describe("Page size for pagination (default: 50)"),
}, async ({ key, filter, fields, orderBy, page, pageSize }) => {
    try {
        // Construct the endpoint
        const endpoint = `/data/v1/customobjectdata/key/${key}/rowset`;

        // Construct parameters
        const parameters: Record<string, string | number | boolean> = {};
        if (filter) parameters.$filter = filter;
        if (fields && fields.length > 0) parameters.$fields = fields.join(',');
        if (orderBy) parameters.$orderBy = orderBy;
        if (page) parameters.$page = page;
        if (pageSize) parameters.$pageSize = pageSize;

        // Make the request
        const result = await sfmcClient.getData(endpoint, parameters);

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
        console.error(`ERROR getting data from Data Extension ${key}:`, error);
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