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
  ApiError, 
  MemoryBlock
} from '../types/letta';

class LettaApiService {
  private client: LettaClient | null = null;
  private token: string | null = null;

  constructor(token?: string) {
    if (token) {
      this.setAuthToken(token);
    }
  }

  async listAgentBlocks(agentId: string): Promise<MemoryBlock[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      const blocks = await this.client.agents.blocks.list(agentId);
      return blocks as unknown as MemoryBlock[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  setAuthToken(token: string): void {
    console.log('setAuthToken - Token length:', token ? token.length : 0);
    console.log('setAuthToken - Token preview:', token ? token.substring(0, 10) + '...' : 'null');
    
    // Initialize the official Letta client - no base URL needed, routes to Letta cloud by default
    this.client = new LettaClient({ token });
    this.token = token;
    
    console.log('setAuthToken - Client created successfully:', !!this.client);
  }

  removeAuthToken(): void {
    this.client = null;
    this.token = null;
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

  // Utility to find a project by ID by paginating listProjects
  async getProjectById(projectId: string): Promise<Project | null> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      let hasNext = true;
      let offset = 0;
      const limit = 50;
      while (hasNext && offset < 2000) {
        const res = await this.listProjects({ limit, offset });
        const found = (res.projects || []).find(p => p.id === projectId) || null;
        if (found) return found;
        hasNext = !!res.hasNextPage;
        offset += limit;
      }
      return null;
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

  async findAgentByTags(tags: string[]): Promise<LettaAgent | null> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      console.log('findAgentByTags - searching for tags:', tags);

      const agents = await this.listAgents({
        tags,
        matchAllTags: true,
        limit: 1
      });

      console.log('findAgentByTags - found agents:', agents.length);

      return agents.length > 0 ? agents[0] : null;
    } catch (error) {
      console.error('findAgentByTags - error:', error);
      throw this.handleError(error);
    }
  }

  async getAgent(agentId: string): Promise<LettaAgent> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      
      // SDK uses `retrieve` for fetching a single agent
      const response = await this.client.agents.retrieve(agentId);
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
        messages: messageData.messages.map(msg => {
          // Only use array format for multimodal content (images)
          // Use string format for text-only messages
          const content = Array.isArray(msg.content) ? msg.content : msg.content;

          return {
            role: msg.role,
            content: content
          };
        }),
        maxSteps: messageData.max_steps,
        useAssistantMessage: messageData.use_assistant_message,
        enableThinking: messageData.enable_thinking ? 'true' : undefined
      };

      console.log('sendMessage - lettaRequest:', JSON.stringify(lettaRequest, null, 2).substring(0, 2000));

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
      
      // Build streaming request following docs format exactly
      const lettaStreamingRequest: any = {
        messages: messageData.messages.map(msg => {
          // Only use array format for multimodal content (images)
          // Use string format for text-only messages
          const content = Array.isArray(msg.content) ? msg.content : msg.content;

          return {
            role: msg.role,
            content: content
          };
        }),
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

      // Detailed logging of message structure
      lettaStreamingRequest.messages.forEach((msg: any, idx: number) => {
        console.log(`Message ${idx}:`, JSON.stringify(msg, null, 2));
        if (Array.isArray(msg.content)) {
          msg.content.forEach((item: any, itemIdx: number) => {
            console.log(`  Content item ${itemIdx}:`, JSON.stringify(item, null, 2));
            if (item.type === 'image' && item.source) {
              console.log(`    Image source keys:`, Object.keys(item.source));
              console.log(`    Image source type:`, item.source.type);
              console.log(`    Image source has media_type:`, 'media_type' in item.source);
              console.log(`    Image source has mediaType:`, 'mediaType' in item.source);
              console.log(`    Image source has data:`, 'data' in item.source);
              console.log(`    Image data length:`, item.source.data?.length);
              console.log(`    Image mediaType value:`, item.source.mediaType || item.source.media_type);
            }
          });
        }
      });

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

      // Defensive sanitize to avoid accidental union-conflicting keys
      const sanitized: any = JSON.parse(JSON.stringify(requestBody));
      delete sanitized.group_id; delete sanitized.groupId;
      if (Array.isArray(sanitized.messages)) {
        sanitized.messages = sanitized.messages.map((m: any) => {
          const { group_id, groupId, ...rest } = m || {};
          return rest;
        });
      }

      console.log('approveToolRequest - requestBody:', JSON.stringify(sanitized));

      try {
        const response = await this.client.agents.messages.create(agentId, sanitized);
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
          stop_reason: (response as any).stopReason,
          usage: (response as any).usage,
        };
      } catch (sdkErr: any) {
        // If the server complains about group_id on ApprovalCreate, retry with raw fetch and minimal body
        const bodyStr = sdkErr?.body ? JSON.stringify(sdkErr.body) : '';
        if (sdkErr?.statusCode === 400 && /ApprovalCreate/.test(bodyStr) && /group_id/.test(bodyStr) && this.token) {
          const raw = {
            messages: [
              {
                type: 'approval',
                approve: params.approve,
                approval_request_id: params.approval_request_id,
                ...(params.reason ? { reason: params.reason } : {}),
              },
            ],
          } as any;
          const resp = await fetch(`https://api.letta.com/v1/agents/${encodeURIComponent(agentId)}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
            },
            body: JSON.stringify(raw),
          });
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Approval POST failed: ${resp.status} ${txt}`);
          }
          const json = await resp.json();
          const transformedMessages = (json.messages || []).map((message: any) => {
            const type = message.message_type || message.messageType;
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
              created_at: message.date ? new Date(message.date).toISOString() : new Date().toISOString(),
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
            stop_reason: json.stop_reason || json.stopReason,
            usage: json.usage,
          };
        }
        throw sdkErr;
      }
    } catch (error) {
      console.error('approveToolRequest - error:', error);
      throw this.handleError(error);
    }
  }

  // Approve/deny via streaming endpoint (background mode)
  async approveToolRequestStream(
    agentId: string,
    params: { approval_request_id: string; approve: boolean; reason?: string },
    onChunk?: (chunk: StreamingChunk) => void,
    onComplete?: (response: SendMessageResponse) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      const body: any = {
        messages: [
          {
            type: 'approval',
            approve: params.approve,
            approvalRequestId: params.approval_request_id,
            reason: params.reason,
          },
        ],
        streamTokens: true,
        background: true,
        includePings: true,
      };

      const stream = await this.client.agents.messages.createStream(agentId, body);

      for await (const chunk of stream) {
        const mt = (chunk as any).message_type || (chunk as any).messageType;
        const mapped: StreamingChunk = {
          message_type: mt,
          content: (chunk as any).assistant_message || (chunk as any).assistantMessage || (chunk as any).content,
          reasoning: (chunk as any).reasoning,
          tool_call: (chunk as any).tool_call,
          tool_response: (chunk as any).tool_response || (chunk as any).toolReturn,
          step: (chunk as any).step,
          run_id: (chunk as any).run_id || (chunk as any).runId,
          seq_id: (chunk as any).seq_id || (chunk as any).seqId,
          id: (chunk as any).id || (chunk as any).message_id || (chunk as any).messageId,
        };
        onChunk?.(mapped);

        // Close early when we receive the approval response or initial tool result
        if (mt === 'approval_response_message' || mt === 'tool_return_message') {
          onComplete?.({ messages: [], usage: undefined });
          return; // stop awaiting the stream so UI can resume
        }
      }

      // Fallback: if stream ends without explicit response, still complete
      onComplete?.({ messages: [], usage: undefined });
    } catch (err) {
      onError?.(this.handleError(err));
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

  // Folder management
  async listFolders(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }
      const folders = await this.client.folders.list();
      return folders;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFolder(name: string, description?: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      // Cloud API doesn't allow embedding config
      const folder = await this.client.folders.create({
        name,
        description
      });

      return folder;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadFileToFolder(folderId: string, file: File): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      console.log('uploadFileToFolder - folderId:', folderId, 'fileName:', file.name);

      // Upload the file and get the job
      const job = await this.client.folders.files.upload(file, folderId);
      console.log('Upload job created:', job.id);

      return job;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      const job = await this.client.jobs.retrieve(jobId);
      return job;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listFolderFiles(folderId: string): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      const files = await this.client.folders.files.list(folderId);
      return files;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteFile(folderId: string, fileId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      await this.client.folders.files.delete(folderId, fileId);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async attachFolderToAgent(agentId: string, folderId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      await this.client.agents.folders.attach(agentId, folderId);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async detachFolderFromAgent(agentId: string, folderId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized. Please set auth token first.');
      }

      await this.client.agents.folders.detach(agentId, folderId);
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
