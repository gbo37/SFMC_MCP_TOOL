import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface SFMCConfig {
  clientId: string;
  clientSecret: string;
  authBaseUri: string;
  restBaseUri: string;
  accountId?: string;
  proxy: string | null;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface ProxyConfig {
  host: string;
  port: number;
  protocol: string;
}

export class SFMCAPIService {
  private config: SFMCConfig;
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(config: SFMCConfig) {
    this.config = config;
    
    // Create axios instance without custom certificate handling
    // Node.js will automatically use certificates from NODE_EXTRA_CA_CERTS
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: this.createProxyConfig(this.config.proxy),
    });
    
    // Log if proxy is being used
    if (config.proxy) {
      console.error(`Using proxy for SFMC API requests: ${config.proxy}`);
    }
  }

  /**
   * Convert proxy string to Axios proxy config
   */
  private createProxyConfig(proxyUrl: string | null): ProxyConfig | undefined {
    if (!proxyUrl) return undefined;
    
    try {
      const url = new URL(proxyUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '80'),
        protocol: url.protocol.replace(':', '')
      };
    } catch (error) {
      console.error('Invalid proxy URL format:', error);
      return undefined;
    }
  }

  /**
   * Get an access token for SFMC API
   */
  async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid
    if (this.accessToken && this.tokenExpiration && this.tokenExpiration > new Date()) {
      return this.accessToken;
    }

    try {
      // Ensure JSON structure matches exactly what SFMC expects
      const requestBody: Record<string, string> = {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      };

      // Add account_id only if it's provided in config
      if (this.config.accountId) {
        requestBody.account_id = this.config.accountId;
      }

      const response: AxiosResponse<TokenResponse> = await axios.post(
        `${this.config.authBaseUri}/v2/token`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          proxy: this.createProxyConfig(this.config.proxy),
        }
      );

      this.accessToken = response.data.access_token;
      
      // Set expiration time (usually 20 minutes, subtracting 60 seconds for safety)
      const expiresInSeconds = response.data.expires_in || 1140; // Default to 19 minutes
      this.tokenExpiration = new Date(Date.now() + (expiresInSeconds - 60) * 1000);

      if (!this.accessToken) {
        throw new Error('No access token received from SFMC');
      }

      return this.accessToken;
    } catch (error: any) {
      console.error('Error obtaining SFMC access token:', error);
      
      // Log more detailed error information for debugging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Request made but no response received');
        console.error('Request details:', error.request);
      } else {
        console.error('Error details:', error.message);
      }
      
      // Throw the original error message instead of a generic one
      if (error.response && error.response.data) {
        // If it's an axios error with response data
        throw new Error(`SFMC Authentication Error: ${JSON.stringify(error.response.data)}`);
      } else if (error.message) {
        // If it has a message property
        throw new Error(`SFMC Authentication Error: ${error.message}`);
      } else {
        // Fallback to stringifying the entire error object
        throw new Error(`SFMC Authentication Error: ${JSON.stringify(error)}`);
      }
    }
  }

  /**
   * Make a request to the SFMC REST API
   */
  async makeRequest(
    method: string, 
    endpoint: string, 
    data?: any, 
    parameters?: Record<string, string | number | boolean>
  ): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.config.restBaseUri}${endpoint}`;
      
      const config: AxiosRequestConfig = {
        method: method.toLowerCase(),
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: parameters,
        proxy: this.createProxyConfig(this.config.proxy),
      };

      if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put' || method.toLowerCase() === 'patch')) {
        config.data = data;
      }

      const response = await this.axiosInstance.request(config);
      return response.data;
    } catch (error: any) {
      console.error(`Error making SFMC API request to ${endpoint}:`, error.response?.data || error);
      
      if (error.response) {
        throw new Error(`SFMC API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`SFMC API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Get SFMC data from a REST endpoint (GET request)
   */
  async getData(endpoint: string, parameters?: Record<string, string | number | boolean>): Promise<any> {
    return this.makeRequest('get', endpoint, undefined, parameters);
  }

  /**
   * Create SFMC data (POST request)
   */
  async createData(endpoint: string, data: any, parameters?: Record<string, string | number | boolean>): Promise<any> {
    return this.makeRequest('post', endpoint, data, parameters);
  }

  /**
   * Update SFMC data (PUT/PATCH request)
   */
  async updateData(
    endpoint: string, 
    data: any, 
    parameters?: Record<string, string | number | boolean>, 
    method: 'put' | 'patch' = 'put'
  ): Promise<any> {
    return this.makeRequest(method, endpoint, data, parameters);
  }

  /**
   * Delete SFMC data (DELETE request)
   */
  async deleteData(endpoint: string, parameters?: Record<string, string | number | boolean>): Promise<any> {
    return this.makeRequest('delete', endpoint, undefined, parameters);
  }
}