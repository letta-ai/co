export interface LettaAgent {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  system?: string;
  model?: string;
  embedding?: string;
  memory_blocks?: MemoryBlock[];
  tools?: string[];
  sources?: string[];
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface MemoryBlock {
  label: string;
  value: string;
}

export interface LettaMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
  tool_calls?: ToolCall[];
  message_type?: string;
  sender_id?: string;
  step_id?: string;
  run_id?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
  result?: any;
}

export interface SendMessageRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  max_steps?: number;
  use_assistant_message?: boolean;
  enable_thinking?: boolean;
  stream_tokens?: boolean;
  include_pings?: boolean;
}

export interface SendMessageResponse {
  messages: LettaMessage[];
  stop_reason?: {
    type: string;
    message?: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CreateAgentRequest {
  name: string;
  model?: string;
  embedding?: string;
  memoryBlocks?: MemoryBlock[];  // Changed from memory_blocks to memoryBlocks
  tools?: string[];
  sources?: string[];
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  sleeptimeEnable?: boolean;  // Changed from sleeptime_enable to sleeptimeEnable
  system?: string;
  includeBaseTools?: boolean;  // Changed to camelCase
  includeMultiAgentTools?: boolean;  // Changed to camelCase
  includeDefaultSource?: boolean;  // Changed to camelCase
  contextWindowLimit?: number;  // Changed to camelCase
  embeddingChunkSize?: number;  // Changed to camelCase
  maxTokens?: number;  // Changed to camelCase
  enableReasoner?: boolean;  // Changed to camelCase
}

export interface ListAgentsParams {
  name?: string;
  tags?: string[];
  match_all_tags?: boolean;
  before?: string;
  after?: string;
  limit?: number;
  query_text?: string;
  project_id?: string;
  template_id?: string;
  identity_id?: string;
}

export interface ListMessagesParams {
  after?: string;
  before?: string;
  limit?: number;
  group_id?: string;
  use_assistant_message?: boolean;
  assistant_message_tool_name?: string;
  assistant_message_tool_kwargs?: string;
  include_err?: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  response?: any;
  responseData?: any;
}

export interface LettaTool {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  source_code?: string;
  json_schema?: Record<string, any>;
  source_type?: string;
  module?: string;
  tool_type?: string;
}

export interface LettaModel {
  model: string;
  model_endpoint_type: string;
  context_window: number;
  provider_name: string;
  temperature?: number;
  max_tokens?: number;
  reasoning?: boolean;
}

export interface LettaEmbeddingModel {
  embedding_model: string;
  embedding_endpoint_type: string;
  provider_name: string;
  chunk_size?: number;
  dimensions?: number;
}

export interface StreamingChunk {
  message_type: 'ping' | 'assistant_message' | 'reasoning_message' | 'tool_call' | 'tool_response' | 'step_complete';
  content?: string;
  tool_call?: ToolCall;
  tool_response?: any;
  reasoning?: string;
  step?: number;
  run_id?: string;
  seq_id?: number;
}