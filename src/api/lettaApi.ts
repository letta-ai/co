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
      
      // Transform messages to match our interface, preserving tool step types
      const transformedMessages = (response.messages || []).map((message: any) => {
        const type = message.messageType;
        // Extract possible tool call/return shapes from SDK variants
        const toolCall = message.tool_call || message.toolCall || (message.tool_calls && message.tool_calls[0]);
        const toolReturn = message.tool_response || message.toolResponse || message.tool_return || message.toolReturn;

        // Default role mapping
        let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant';
        if (type === 'user_message') {
          role = 'user';
        } else if (type === 'system_message') {
          role = 'system';
        } else if (type === 'assistant_message' || type === 'reasoning_message') {
          role = 'assistant';
        } else if (type === 'tool_call' || type === 'tool_call_message' || type === 'tool_response' || type === 'tool_return_message' || type === 'tool_message') {
          // Preserve tool role for tool steps
          role = 'tool';
        }

        // Prefer original content; downstream UI will render tool steps into readable lines when needed
        const content: string = message.content || message.reasoning || '';

        return {
          id: message.id,
          role,
          content,
          created_at: message.date ? message.date.toISOString() : new Date().toISOString(),
          tool_calls: message.tool_calls,
          message_type: type,
          sender_id: message.senderId,
          step_id: message.stepId,
          run_id: message.runId,
          // Pass through tool details for UI reassembly
          tool_call: toolCall,
          tool_response: toolReturn,
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
      
      // Build streaming request. Enable token streaming by default
      const lettaStreamingRequest: any = {
        messages: messageData.messages.map(msg => ({
          role: msg.role,
          content: [{ type: "text", text: msg.content }]
        })),
        // Token streaming provides partial chunks for real-time UX
        streamTokens: messageData.stream_tokens !== false,
      };
      // Optional ping events if requested by caller
      if ((messageData as any).include_pings === true) {
        lettaStreamingRequest.includePings = true;
      }
      
      console.log('=== SIMPLIFIED REQUEST ===');
      console.log('Request:', JSON.stringify(lettaStreamingRequest, null, 2));
      console.log('Messages count:', lettaStreamingRequest.messages.length);
      
      const stream = await this.client.agents.messages.createStream(agentId, lettaStreamingRequest);

      // Handle the stream response using async iteration
      try {
        for await (const chunk of stream) {
          console.log('=== RAW CHUNK RECEIVED ===');
          console.log('Raw chunk:', JSON.stringify(chunk, null, 2));
          console.log('Chunk keys:', Object.keys(chunk));
          console.log('message_type variants:', {
            messageType: chunk.messageType,
            message_type: chunk.message_type
          });
          console.log('Content variants:', {
            content: chunk.content,
            assistantMessage: chunk.assistantMessage, 
            assistant_message: chunk.assistant_message
          });
          
          onChunk({
            message_type: (chunk as any).message_type || (chunk as any).messageType,
            content: (chunk as any).assistant_message || (chunk as any).assistantMessage || (chunk as any).content,
            reasoning: (chunk as any).reasoning || (chunk as any).hiddenReasoning,
            tool_call: (chunk as any).tool_call || (chunk as any).toolCall,
            tool_response: (chunk as any).tool_response || (chunk as any).toolResponse || (chunk as any).toolReturn,
            step: (chunk as any).step || (chunk as any).stepId,
            run_id: (chunk as any).run_id || (chunk as any).runId,
            seq_id: (chunk as any).seq_id || (chunk as any).seqId,
            id: (chunk as any).id || (chunk as any).message_id || (chunk as any).messageId
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

      // Group messages by run_id and step_id to associate reasoning with assistant messages
      const groupedMessages = new Map<string, any[]>();

      // First pass: group messages by run_id + step_id
      response.forEach((message: any) => {
        const key = `${message.runId || 'no-run'}-${message.stepId || 'no-step'}`;
        if (!groupedMessages.has(key)) {
          groupedMessages.set(key, []);
        }
        groupedMessages.get(key)!.push(message);
      });

      // Second pass: process groups to combine reasoning with assistant messages
      const transformedMessages: LettaMessage[] = [];

      for (const [key, messageGroup] of groupedMessages) {
        // Sort messages in the group by creation time or message order
        messageGroup.sort((a, b) => {
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          }
          return 0;
        });

        // Find reasoning and assistant messages in this group
        const reasoningMessages = messageGroup.filter((m: any) => m.messageType === 'reasoning_message');
        const otherMessages = messageGroup.filter(m => m.messageType !== 'reasoning_message');

        // Combine reasoning content
        const combinedReasoning = reasoningMessages
          .map(m => m.reasoning || m.content || '')
          .filter(r => r.trim())
          .join(' ');

        // Process other messages and attach reasoning to assistant messages
        otherMessages.forEach((message: any) => {
          // Filter out heartbeat messages from user messages
          if (message.messageType === 'user_message' && typeof message.content === 'string') {
            try {
              const parsed = JSON.parse(message.content);
              if (parsed?.type === 'heartbeat') {
                return; // Skip heartbeat messages
              }
            } catch {
              // Keep message if content is not valid JSON
            }
          }

          // Map messageType to role and content for our components
          const type = message.messageType as string;
          const toolCall = message.tool_call || message.toolCall || (message.tool_calls && message.tool_calls[0]);
          const toolReturn = message.tool_response || message.toolResponse || message.tool_return || message.toolReturn;

          let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant';
          if (type === 'user_message') {
            role = 'user';
          } else if (type === 'system_message') {
            role = 'system';
          } else if (type === 'assistant_message' || type === 'reasoning_message') {
            role = 'assistant';
          } else if (type === 'tool_call' || type === 'tool_call_message' || type === 'tool_response' || type === 'tool_return_message' || type === 'tool_message') {
            role = 'tool';
          }

          // Derive a readable content string for tool steps
          let content: string = message.content || '';
          if ((!content || typeof content !== 'string') && type) {
            if (type === 'tool_call' || type === 'tool_call_message' || type === 'tool_message') {
              const callObj = toolCall?.function ? toolCall.function : toolCall;
              const name = callObj?.name || callObj?.tool_name || 'tool';
              const argsRaw = callObj?.arguments ?? callObj?.args ?? {};
              let args = '';
              try {
                if (typeof argsRaw === 'string') {
                  args = argsRaw;
                } else {
                  args = JSON.stringify(argsRaw);
                }
              } catch { args = String(argsRaw); }
              content = `${name}(${args})`;
            } else if (type === 'tool_response' || type === 'tool_return_message') {
              if (toolReturn != null) {
                try { content = typeof toolReturn === 'string' ? toolReturn : JSON.stringify(toolReturn); }
                catch { content = String(toolReturn); }
              }
            }
          }

          const transformedMessage: LettaMessage = {
            id: message.id,
            role,
            content,
            created_at: message.date ? message.date.toISOString() : new Date().toISOString(),
            tool_calls: message.tool_calls,
            message_type: type,
            sender_id: message.senderId,
            step_id: message.stepId || message.step_id,
            run_id: message.runId,
            // Pass through tool details for UI reassembly
            tool_call: toolCall,
            tool_response: toolReturn,
          };

          // Attach reasoning to assistant messages
          if (role === 'assistant' && combinedReasoning) {
            transformedMessage.reasoning = combinedReasoning;
          }

          transformedMessages.push(transformedMessage);
        });
      }

      // Sort final messages by creation time
      transformedMessages.sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
      
      // Fetch raw models from SDK (shape can vary between SDK versions)
      const response = await this.client.models?.list?.() || [];

      // Normalize to a consistent shape expected by the app
      const normalizeProvider = (raw: any, modelName?: string): string | undefined => {
        const direct = raw?.provider_name || raw?.provider || raw?.vendor || raw?.providerName;
        if (direct) return String(direct);
        const name = modelName || raw?.model || raw?.name || raw?.id;
        if (!name || typeof name !== 'string') return undefined;
        const lower = name.toLowerCase();
        if (lower.includes('gpt') || lower.startsWith('o3') || lower.startsWith('o4')) return 'openai';
        if (lower.includes('claude')) return 'anthropic';
        if (lower.includes('gemini') || lower.startsWith('g') && lower.includes('flash')) return 'google_ai';
        if (lower.includes('letta')) return 'letta';
        if (lower.includes('llama') || lower.includes('mistral') || lower.includes('mixtral')) return 'together';
        return undefined;
      };

      const normalize = (raw: any) => {
        const modelName = raw?.model || raw?.name || (typeof raw?.id === 'string' ? raw.id.split('/').pop() : undefined);
        const provider = normalizeProvider(raw, modelName);
        const contextWindow = raw?.context_window || raw?.contextWindow || raw?.max_context || raw?.maxContext || raw?.context || 0;
        const endpointType = raw?.model_endpoint_type || raw?.endpoint_type || raw?.type || raw?.modelType || 'chat';
        return {
          model: modelName,
          provider_name: provider,
          context_window: contextWindow,
          model_endpoint_type: endpointType,
          // pass through optional known fields if present
          temperature: raw?.temperature,
          max_tokens: raw?.max_tokens || raw?.maxTokens,
          // include original for debugging if needed by callers
          _raw: raw,
        } as any;
      };

      const normalized = Array.isArray(response) ? response.map(normalize).filter(m => !!m.model) : [];
      return normalized;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Approve or deny an approval request
  async approveToolRequest(
    agentId: string,
    params: { approval_request_id: string; approve: boolean; reason?: string }
  ): Promise<SendMessageResponse> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      const requestBody: any = {
        messages: [
          {
            type: 'approval',
            approve: params.approve,
            approvalRequestId: params.approval_request_id,
            reason: params.reason,
          },
        ],
      };

      const response = await this.client.agents.messages.create(agentId, requestBody);

      const transformedMessages = (response.messages || []).map((message: any) => {
        const type = message.messageType;
        const toolCall = message.tool_call || message.toolCall || (message.tool_calls && message.tool_calls[0]);
        const toolReturn = message.tool_response || message.toolResponse || message.tool_return || message.toolReturn;

        let role: 'user' | 'assistant' | 'system' | 'tool' = 'assistant';
        if (type === 'user_message') role = 'user';
        else if (type === 'system_message') role = 'system';
        else if (type === 'tool_call' || type === 'tool_call_message' || type === 'tool_response' || type === 'tool_return_message' || type === 'tool_message') role = 'tool';

        const content: string = message.content || message.reasoning || '';

        return {
          id: message.id,
          role,
          content,
          created_at: message.date ? message.date.toISOString() : new Date().toISOString(),
          tool_calls: message.tool_calls,
          message_type: type,
          sender_id: message.senderId,
          step_id: message.stepId,
          run_id: message.runId,
          tool_call: toolCall,
          tool_response: toolReturn,
        } as LettaMessage;
      });

      return {
        messages: transformedMessages,
        stop_reason: response.stopReason,
        usage: response.usage,
      };
    } catch (error) {
      console.error('approveToolRequest - error:', error);
      throw this.handleError(error);
    }
  }

  async listEmbeddingModels(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      // Note: SDK shapes can vary; apply same normalization basics
      const response = await this.client.models?.embedding?.list?.() || [];
      const normalized = Array.isArray(response)
        ? response.map((raw: any) => {
            const modelName = raw?.embedding_model || raw?.model || raw?.name || raw?.id;
            const provider = raw?.provider_name || raw?.provider || raw?.vendor;
            return {
              model: modelName,
              provider_name: provider,
              context_window: raw?.context_window || raw?.contextWindow || 0,
              model_endpoint_type: raw?.embedding_endpoint_type || raw?.endpoint_type || 'embedding',
              _raw: raw,
            } as any;
          }).filter((m: any) => !!m.model)
        : [];
      return normalized;
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
