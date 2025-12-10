/**
 * SDK Types
 *
 * Types to handle Letta SDK snake_case/camelCase inconsistency.
 * The SDK returns fields with inconsistent naming conventions,
 * so we normalize them with these types.
 */

/**
 * Content part for multipart messages (text + images)
 */
export interface ContentPart {
  type: 'text' | 'image';
  text?: string;
  source?: ImageSource;
}

/**
 * Image source for base64 encoded images
 */
export interface ImageSource {
  type: string;
  data?: string;
  mediaType?: string;
  media_type?: string;
  url?: string;
}

/**
 * Tool call structure (handles both naming conventions)
 */
export interface SdkToolCall {
  name?: string;
  tool_name?: string;
  arguments?: string | Record<string, unknown>;
  args?: string | Record<string, unknown>;
}

/**
 * Streaming chunk from SDK (handles both naming conventions)
 */
export interface SdkStreamingChunk {
  message_type?: string;
  messageType?: string;
  content?: string | ContentPart[];
  assistant_message?: string;
  assistantMessage?: string;
  reasoning?: string;
  hiddenReasoning?: string;
  tool_call?: SdkToolCall;
  toolCall?: SdkToolCall;
  tool_calls?: SdkToolCall[];
  tool_return?: string;
  toolReturn?: string;
  id?: string;
  message_id?: string;
  messageId?: string;
  error?: unknown;
}

/**
 * Message from SDK (handles both naming conventions)
 */
export interface SdkMessage {
  id: string;
  message_type?: string;
  messageType?: string;
  content?: string | ContentPart[];
  reasoning?: string;
  tool_call?: SdkToolCall;
  toolCall?: SdkToolCall;
  tool_calls?: SdkToolCall[];
  tool_response?: unknown;
  toolResponse?: unknown;
  tool_return?: string;
  toolReturn?: string;
  date?: string | Date;
  created_at?: string;
  senderId?: string;
  stepId?: string;
  step_id?: string;
  runId?: string;
}

/**
 * Normalize a message type field from SDK response
 */
export function normalizeMessageType(msg: SdkMessage | SdkStreamingChunk): string {
  return msg.message_type || msg.messageType || 'unknown';
}

/**
 * Normalize tool call from SDK response
 */
export function normalizeToolCall(msg: SdkMessage | SdkStreamingChunk): SdkToolCall | undefined {
  return msg.tool_call || msg.toolCall || (msg.tool_calls?.[0]);
}

/**
 * Normalize content from SDK response
 */
export function normalizeContent(msg: SdkStreamingChunk): string {
  return msg.assistant_message || msg.assistantMessage ||
         (typeof msg.content === 'string' ? msg.content : '') || '';
}

/**
 * Normalize reasoning from SDK response
 */
export function normalizeReasoning(msg: SdkStreamingChunk): string | undefined {
  return msg.reasoning || msg.hiddenReasoning;
}

/**
 * Normalize message ID from SDK response
 */
export function normalizeId(msg: SdkStreamingChunk): string | undefined {
  return msg.id || msg.message_id || msg.messageId;
}

/**
 * Extract text content from multipart content
 */
export function extractTextContent(content: string | ContentPart[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part): part is ContentPart => part.type === 'text')
      .map(part => part.text || '')
      .join('');
  }
  return '';
}
