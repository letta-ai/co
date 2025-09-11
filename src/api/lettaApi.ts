import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  LettaAgent,
  LettaMessage,
  SendMessageRequest,
  SendMessageResponse,
  CreateAgentRequest,
  ListAgentsParams,
  ListMessagesParams,
  LettaTool,
  LettaModel,
  LettaEmbeddingModel,
  ApiError
} from '../types/letta';

class LettaApiService {
  private client: AxiosInstance;
  private baseUrl: string = 'https://api.letta.com/v1';

  constructor(token?: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (token) {
      this.setAuthToken(token);
    }

    this.setupInterceptors();
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        let message = 'An error occurred';
        let status = 0;
        let code: string | undefined;

        if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
          message = 'Network error. Please check your internet connection and try again.';
        } else if (error.code === 'ECONNREFUSED') {
          message = 'Connection refused. The Letta service may be unavailable.';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Request timeout. Please try again.';
        } else if (error.response) {
          // Server responded with error status
          status = error.response.status;
          code = error.response.data?.code;

          switch (status) {
            case 400:
              message = error.response.data?.message || 'Bad request. Please check your input.';
              break;
            case 401:
              message = 'Invalid API token. Please check your credentials.';
              break;
            case 403:
              message = 'Access forbidden. Please check your permissions.';
              break;
            case 404:
              message = 'Resource not found.';
              break;
            case 429:
              message = 'Rate limit exceeded. Please wait before trying again.';
              break;
            case 500:
              message = 'Server error. Please try again later.';
              break;
            case 502:
            case 503:
            case 504:
              message = 'Service temporarily unavailable. Please try again later.';
              break;
            default:
              message = error.response.data?.message || error.message || message;
          }
        } else if (error.request) {
          // Request was made but no response received
          message = 'No response from server. Please check your network connection.';
        } else {
          // Something else happened
          message = error.message || message;
        }

        const apiError: ApiError = {
          message,
          status,
          code,
          response: error.response,
          responseData: error.response?.data,
        };
        
        return Promise.reject(apiError);
      }
    );

    // Add request interceptor for timeout handling
    this.client.interceptors.request.use(
      (config) => {
        config.timeout = 30000; // 30 seconds timeout
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  async listAgents(params?: ListAgentsParams): Promise<LettaAgent[]> {
    try {
      const response = await this.client.get<LettaAgent[]>('/agents', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<LettaAgent> {
    try {
      const response = await this.client.get<LettaAgent>(`/agents/${agentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createAgent(agentData: CreateAgentRequest): Promise<LettaAgent> {
    try {
      const response = await this.client.post<LettaAgent>('/agents', agentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      await this.client.delete(`/agents/${agentId}`);
    } catch (error) {
      throw error;
    }
  }

  async listMessages(agentId: string, params?: ListMessagesParams): Promise<LettaMessage[]> {
    try {
      const response = await this.client.get<LettaMessage[]>(
        `/agents/${agentId}/messages`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async sendMessage(
    agentId: string,
    messageData: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      const response = await this.client.post<SendMessageResponse>(
        `/agents/${agentId}/messages`,
        messageData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async sendMessageStream(
    agentId: string,
    messageData: SendMessageRequest,
    onChunk: (chunk: any) => void,
    onComplete: (response: SendMessageResponse) => void,
    onError: (error: ApiError) => void
  ): Promise<void> {
    try {
      const streamData = {
        ...messageData,
        stream_tokens: true,
        include_pings: true
      };

      const authHeader = this.client.defaults.headers.common['Authorization'];
      
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify(streamData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completeResponse: any = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonData = trimmedLine.replace('data: ', '');
                if (jsonData === '[DONE]') {
                  if (completeResponse) {
                    onComplete(completeResponse);
                  }
                  return;
                }
                
                const data = JSON.parse(jsonData);
                
                // Handle different message types based on Letta streaming format
                if (data.message_type === 'usage_statistics') {
                  // Final message with usage stats - create complete response
                  completeResponse = { messages: [], usage: data };
                } else if (data.message_type === 'ping') {
                  // Keep connection alive, don't send to UI
                  console.log('Received keepalive ping');
                } else {
                  // Send chunk to UI for real-time display
                  onChunk(data);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line, parseError);
              }
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const trimmedBuffer = buffer.trim();
            if (trimmedBuffer.startsWith('data: ') && !trimmedBuffer.includes('[DONE]')) {
              const data = JSON.parse(trimmedBuffer.replace('data: ', ''));
              if (data.message_type === 'usage_statistics') {
                completeResponse = { messages: [], usage: data };
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse final SSE data:', buffer);
          }
        }
        
        // Call onComplete if we have a complete response or if streaming ended
        if (completeResponse) {
          onComplete(completeResponse);
        } else {
          // Fallback - create a simple complete response
          onComplete({ messages: [] } as SendMessageResponse);
        }
        
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error('Stream error:', error);
      onError({
        message: error.message || 'Stream error',
        status: error.status || 0,
        response: error.response,
        responseData: error.response?.data,
      } as ApiError);
    }
  }

  // Utility method to check if the API is authenticated
  isAuthenticated(): boolean {
    return !!this.client.defaults.headers.common['Authorization'];
  }

  // Utility method to test the connection
  async testConnection(): Promise<boolean> {
    try {
      await this.listAgents({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async listTools(): Promise<LettaTool[]> {
    try {
      const response = await this.client.get<LettaTool[]>('/tools');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async listModels(): Promise<LettaModel[]> {
    try {
      const response = await this.client.get<LettaModel[]>('/models');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async listEmbeddingModels(): Promise<LettaEmbeddingModel[]> {
    try {
      const response = await this.client.get<LettaEmbeddingModel[]>('/models/embedding');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const lettaApi = new LettaApiService();

export { LettaApiService };
export default lettaApi;