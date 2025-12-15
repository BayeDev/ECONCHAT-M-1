/**
 * Groq Llama 3.3 70B Client
 * TIER 3 - Basic: Simple Queries
 *
 * Model: llama-3.3-70b-versatile
 * Cost: FREE (500K tokens/day limit)
 * Context: 128K tokens
 */

import Groq from 'groq-sdk';
import type { LLMResponse, ToolDefinition, TierLevel } from '../types.js';

const MODEL_ID = 'llama-3.3-70b-versatile';

// Type for Groq messages
type GroqMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

// Type for Groq tools
type GroqTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export class GroqClient {
  private client: Groq;
  private systemPrompt: string;

  constructor(apiKey?: string) {
    this.client = new Groq({
      apiKey: apiKey || process.env.GROQ_API_KEY
    });

    this.systemPrompt = `You are EconChat, an economic data assistant. Provide concise, accurate answers to economic data queries.

Focus on:
- Direct answers to data questions
- Clear explanations of economic indicators
- Brief context when helpful

Keep responses focused and to the point.`;
  }

  /**
   * Convert universal tool definitions to OpenAI/Groq format
   */
  private convertTools(tools: ToolDefinition[]): GroqTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>
      }
    }));
  }

  /**
   * Generate response using Groq Llama 3.3 70B
   */
  async generate(
    query: string,
    tools?: ToolDefinition[],
    conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    const messages: GroqMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...(conversationHistory || []).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { role: 'user', content: query }
    ];

    const requestParams: {
      model: string;
      messages: GroqMessage[];
      max_tokens: number;
      temperature: number;
      tools?: GroqTool[];
      tool_choice?: 'auto';
    } = {
      model: MODEL_ID,
      messages,
      max_tokens: 1024,
      temperature: 0.7
    };

    if (tools && tools.length > 0) {
      requestParams.tools = this.convertTools(tools);
      requestParams.tool_choice = 'auto';
    }

    const response = await this.client.chat.completions.create({
      ...requestParams,
      stream: false
    } as Parameters<typeof this.client.chat.completions.create>[0]) as Groq.Chat.ChatCompletion;

    // Extract content and tool calls
    const choice = response.choices[0];
    const message = choice.message;
    const textContent = message.content || '';

    const toolCalls: LLMResponse['toolCalls'] = [];
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}')
        });
      }
    }

    // Groq is free tier
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    return {
      tierUsed: 3 as TierLevel,
      model: MODEL_ID,
      provider: 'groq',
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCost: 0 // FREE tier
      },
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Continue conversation after tool execution
   */
  async continueWithToolResults(
    originalQuery: string,
    toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
    toolResults: Array<{ toolCallId: string; result: unknown }>,
    conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    const messages: GroqMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...(conversationHistory || []).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { role: 'user', content: originalQuery },
      {
        role: 'assistant',
        content: null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }))
      },
      ...toolResults.map(tr => ({
        role: 'tool' as const,
        tool_call_id: tr.toolCallId,
        content: JSON.stringify(tr.result)
      }))
    ];

    const response = await this.client.chat.completions.create({
      model: MODEL_ID,
      messages: messages as Parameters<typeof this.client.chat.completions.create>[0]['messages'],
      max_tokens: 1024,
      stream: false
    }) as Groq.Chat.ChatCompletion;

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    return {
      tierUsed: 3 as TierLevel,
      model: MODEL_ID,
      provider: 'groq',
      content: response.choices[0].message.content || '',
      usage: {
        inputTokens,
        outputTokens,
        estimatedCost: 0
      },
      latencyMs: Date.now() - startTime
    };
  }
}

export default GroqClient;
