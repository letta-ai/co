import { LettaClient } from '@letta-ai/letta-client';
import type { 
  LettaAgent, 
  LettaMessage, 
  Project,
  ListProjectsParams,
  ListProjectsResponse,
  ListAgentsParams,
  ListMessagesParams,
  CreateAgentRequest,
  SendMessageRequest,
  SendMessageResponse,
  StreamingChunk,
  ApiError 
} from '../types/letta';

class LettaApiService {
  private client: LettaClient | null = null;

  constructor(token?: string) {
    if (token) {
      this.setAuthToken(token);
    }
  }

  setAuthToken(token: string): void {
    console.log('setAuthToken - Token length:', token ? token.length : 0);
    console.log('setAuthToken - Token preview:', token ? token.substring(0, 10) + '...' : 'null');
    
    // Initialize the official Letta client - no base URL needed, routes to Letta cloud by default
    this.client = new LettaClient({ token });
    
    console.log('setAuthToken - Client created successfully:', !!this.client);
  }

  removeAuthToken(): void {
    this.client = null;
  }

  isAuthenticated(): boolean {
    return this.client !== null;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.agents.list({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async listProjects(params: ListProjectsParams = {}): Promise<ListProjectsResponse> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      const response = await this.client.projects.list(params);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listAgents(params?: ListAgentsParams): Promise<LettaAgent[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      console.log('listAgents - calling SDK with params:', params);
      console.log('listAgents - JSON stringify params:', JSON.stringify(params));
      
      const response = await this.client.agents.list(params);
      console.log('listAgents - SDK response count:', response?.length || 0);
      console.log('listAgents - first few agents project_ids:', 
        response?.slice(0, 3)?.map(a => ({ name: a.name, project_id: a.project_id })) || []
      );
      
      return response;
    } catch (error) {
      console.error('listAgents - error:', error);
      throw this.handleError(error);
    }
  }

  async listAgentsForProject(projectId: string, params: Omit<ListAgentsParams, 'projectId'> = {}): Promise<LettaAgent[]> {
    try {
      const enhancedParams: ListAgentsParams = {
        ...params,
        projectId: projectId,
        sortBy: params.sortBy || 'last_run_completion'
      };
      
      console.log('listAgentsForProject - projectId:', projectId);
      console.log('listAgentsForProject - enhancedParams:', enhancedParams);
      
      const result = await this.listAgents(enhancedParams);
      console.log('listAgentsForProject - result count:', result?.length || 0);
      
      return result;
    } catch (error) {
      console.error('listAgentsForProject - error:', error);
      throw this.handleError(error);
    }
  }

  async getAgent(agentId: string): Promise<LettaAgent> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      const response = await this.client.agents.get(agentId);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createAgent(agentData: CreateAgentRequest): Promise<LettaAgent> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      const response = await this.client.agents.create(agentData);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      await this.client.agents.delete(agentId);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendMessage(agentId: string, messageData: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      console.log('sendMessage - agentId:', agentId);
      console.log('sendMessage - messageData:', messageData);
      
      const lettaRequest = {
        messages: messageData.messages.map(msg => ({
          type: "message" as const,
          role: msg.role,
          content: msg.content  // Use string directly instead of array
        })),
        maxSteps: messageData.max_steps,
        useAssistantMessage: messageData.use_assistant_message,
        enableThinking: messageData.enable_thinking ? 'true' : undefined
      };
      
      const response = await this.client.agents.messages.create(agentId, lettaRequest);
      
      // Transform messages to match our interface
      const transformedMessages = (response.messages || []).map((message: any) => {
        let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant';
        
        if (message.messageType === 'user_message') {
          role = 'user';
        } else if (message.messageType === 'system_message') {
          role = 'system';
        } else if (message.messageType === 'tool_message' || message.messageType === 'tool_call') {
          role = 'tool';
        } else {
          role = 'assistant';
        }

        return {
          id: message.id,
          role: role,
          content: message.content || message.reasoning || '',
          created_at: message.date ? message.date.toISOString() : new Date().toISOString(),
          tool_calls: message.tool_calls,
          message_type: message.messageType,
          sender_id: message.senderId,
          step_id: message.stepId,
          run_id: message.runId
        };
      });
      
      return {
        messages: transformedMessages,
        stop_reason: response.stopReason,
        usage: response.usage
      };
    } catch (error) {
      console.error('sendMessage - error:', error);
      throw this.handleError(error);
    }
  }

  async sendMessageStream(
    agentId: string,
    messageData: SendMessageRequest,
    onChunk: (chunk: StreamingChunk) => void,
    onComplete: (response: SendMessageResponse) => void,
    onError: (error: any) => void
  ): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      console.log('sendMessageStream - agentId:', agentId);
      console.log('sendMessageStream - messageData:', messageData);
      console.log('Client initialized:', !!this.client);
      
      // Transform messages with detailed logging
      const transformedMessages = messageData.messages.map((msg, index) => {
        const transformedMsg = {
          role: msg.role,
          content: [
            {
              type: "text",
              text: msg.content
            }
          ]
        };
        console.log(`Transformed message ${index}:`, transformedMsg);
        return transformedMsg;
      });
      
      const lettaStreamingRequest = {
        messages: transformedMessages,
        maxSteps: messageData.max_steps,
        useAssistantMessage: messageData.use_assistant_message,
        enableThinking: messageData.enable_thinking ? 'true' : undefined,
        streamTokens: messageData.stream_tokens,
        includePings: messageData.include_pings
      };
      
      console.log('=== FULL REQUEST OBJECT ===');
      console.log('lettaStreamingRequest:', JSON.stringify(lettaStreamingRequest, null, 2));
      console.log('=== END REQUEST OBJECT ===');
      
      console.log('Individual field values:');
      console.log('- messages.length:', lettaStreamingRequest.messages.length);
      console.log('- maxSteps:', lettaStreamingRequest.maxSteps);
      console.log('- useAssistantMessage:', lettaStreamingRequest.useAssistantMessage);
      console.log('- enableThinking:', lettaStreamingRequest.enableThinking);
      console.log('- streamTokens:', lettaStreamingRequest.streamTokens);
      console.log('- includePings:', lettaStreamingRequest.includePings);
      
      const stream = await this.client.agents.messages.createStream(agentId, lettaStreamingRequest);

      // Handle the stream response using async iteration
      try {
        for await (const chunk of stream) {
          console.log('Stream chunk received:', chunk);
          onChunk({
            message_type: chunk.messageType || chunk.message_type,
            content: chunk.content || chunk.assistantMessage,
            reasoning: chunk.reasoning,
            tool_call: chunk.toolCall,
            tool_response: chunk.toolResponse,
            step: chunk.step,
            run_id: chunk.runId,
            seq_id: chunk.seqId
          });
        }
        
        // Stream completed successfully
        onComplete({
          messages: [],
          usage: undefined
        });
      } catch (streamError) {
        console.error('Stream iteration error:', streamError);
        console.error('Stream error details:', {
          message: streamError.message,
          statusCode: streamError.statusCode,
          body: streamError.body,
          rawResponse: streamError.rawResponse,
          stack: streamError.stack
        });
        onError(this.handleError(streamError));
      }
    } catch (error) {
      console.error('sendMessageStream setup error:', error);
      console.error('Setup error details:', {
        message: error.message,
        statusCode: error.statusCode,
        body: error.body,
        rawResponse: error.rawResponse,
        stack: error.stack,
        name: error.name,
        constructor: error.constructor.name
      });
      onError(this.handleError(error));
    }
  }

  async listMessages(agentId: string, params?: ListMessagesParams): Promise<LettaMessage[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      console.log('listMessages - agentId:', agentId);
      console.log('listMessages - params:', params);
      
      const response = await this.client.agents.messages.list(agentId, params);
      console.log('listMessages - response count:', response?.length || 0);
      
      // Transform SDK response to match our LettaMessage interface
      const transformedMessages: LettaMessage[] = response.map((message: any) => {
        // Map messageType to role for our components
        let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant';
        
        if (message.messageType === 'user_message') {
          role = 'user';
        } else if (message.messageType === 'system_message') {
          role = 'system';
        } else if (message.messageType === 'tool_message' || message.messageType === 'tool_call') {
          role = 'tool';
        } else {
          role = 'assistant'; // assistant_message, reasoning_message, etc.
        }

        return {
          id: message.id,
          role: role,
          content: message.content || message.reasoning || '',
          created_at: message.date ? message.date.toISOString() : new Date().toISOString(),
          tool_calls: message.tool_calls,
          message_type: message.messageType,
          sender_id: message.senderId,
          step_id: message.stepId,
          run_id: message.runId
        };
      });
      
      console.log('listMessages - transformed messages:', transformedMessages.slice(0, 2));
      return transformedMessages;
    } catch (error) {
      console.error('listMessages - error:', error);
      throw this.handleError(error);
    }
  }

  async listTools(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      const response = await this.client.tools.list();
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listModels(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      // Note: This might be different in the SDK - adjust as needed
      const response = await this.client.models?.list?.() || [];
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listEmbeddingModels(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      // Note: This might be different in the SDK - adjust as needed  
      const response = await this.client.models?.embedding?.list?.() || [];
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ApiError {
    console.error('handleError - Full error object:', error);
    console.error('handleError - Error keys:', Object.keys(error));
    
    let message = 'An error occurred';
    let status = 0;
    let code: string | undefined;

    if (error?.message) {
      message = error.message;
    }

    // Check for SDK error properties
    if (error?.statusCode) {
      status = error.statusCode;
    } else if (error?.status) {
      status = error.status;
    }

    if (error?.code) {
      code = error.code;
    }

    const apiError = {
      message,
      status,
      code,
      response: error?.response || error?.rawResponse,
      responseData: error?.responseData || error?.data || error?.body
    };
    
    console.error('handleError - Returning API error:', apiError);
    return apiError;
  }
}

// Create singleton instance
const lettaApi = new LettaApiService();

export { LettaApiService };
export default lettaApi;