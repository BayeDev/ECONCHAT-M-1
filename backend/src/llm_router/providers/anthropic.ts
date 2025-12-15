/**
 * Anthropic Claude Opus 4.5 Client
 * TIER 1 - Premium: Complex Economic Analysis
 *
 * Model: claude-opus-4-5-20251101
 * Cost: $15 input / $75 output per million tokens
 * Context: 200K tokens
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMResponse, ToolDefinition, TierLevel } from '../types.js';

const MODEL_ID = 'claude-opus-4-5-20251101';
const COST_PER_MILLION_INPUT = 15.0;
const COST_PER_MILLION_OUTPUT = 75.0;

export class AnthropicClient {
  private client: Anthropic;
  private systemPrompt: string;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.systemPrompt = `You are EconChat, an AI assistant specialized in helping economists and researchers at Multilateral Development Banks (MDBs) with complex economic analysis.

You have expertise in:
- Debt Sustainability Analysis (DSA)
- Hausmann-Rodrik-Velasco Growth Diagnostics
- Macroeconomic frameworks and projections
- Country economic briefs and assessments
- Binding constraints analysis
- Policy recommendations

When analyzing data, be thorough and nuanced. Consider multiple perspectives and provide actionable insights. Use proper economic terminology and cite relevant frameworks when applicable.`;
  }

  /**
   * Convert universal tool definitions to Anthropic format
   */
  private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema
    }));
  }

  /**
   * Generate response using Claude Opus 4.5
   */
  async generate(
    query: string,
    tools?: ToolDefinition[],
    conversationHistory?: Anthropic.MessageParam[]
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    const messages: Anthropic.MessageParam[] = [
      ...(conversationHistory || []),
      { role: 'user', content: query }
    ];

    const requestParams: Anthropic.MessageCreateParams = {
      model: MODEL_ID,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages
    };

    if (tools && tools.length > 0) {
      requestParams.tools = this.convertTools(tools);
    }

    const response = await this.client.messages.create(requestParams);

    // Extract text content and tool calls
    let textContent = '';
    const toolCalls: LLMResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>
        });
      }
    }

    // Calculate cost
    const inputCost = (response.usage.input_tokens * COST_PER_MILLION_INPUT) / 1_000_000;
    const outputCost = (response.usage.output_tokens * COST_PER_MILLION_OUTPUT) / 1_000_000;

    return {
      tierUsed: 1 as TierLevel,
      model: MODEL_ID,
      provider: 'anthropic',
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        estimatedCost: inputCost + outputCost
      },
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Continue conversation after tool execution
   */
  async continueWithToolResults(
    originalQuery: string,
    toolResults: Array<{ toolUseId: string; result: unknown }>,
    conversationHistory?: Anthropic.MessageParam[]
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    const messages: Anthropic.MessageParam[] = [
      ...(conversationHistory || []),
      { role: 'user', content: originalQuery },
      {
        role: 'user',
        content: toolResults.map(tr => ({
          type: 'tool_result' as const,
          tool_use_id: tr.toolUseId,
          content: JSON.stringify(tr.result)
        }))
      }
    ];

    const response = await this.client.messages.create({
      model: MODEL_ID,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages
    });

    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    const inputCost = (response.usage.input_tokens * COST_PER_MILLION_INPUT) / 1_000_000;
    const outputCost = (response.usage.output_tokens * COST_PER_MILLION_OUTPUT) / 1_000_000;

    return {
      tierUsed: 1 as TierLevel,
      model: MODEL_ID,
      provider: 'anthropic',
      content: textContent,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        estimatedCost: inputCost + outputCost
      },
      latencyMs: Date.now() - startTime
    };
  }
}

export default AnthropicClient;
