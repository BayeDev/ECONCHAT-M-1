/**
 * Google Gemini 2.5 Flash Client
 * TIER 2 - Standard: Medium Complexity Queries
 *
 * Model: gemini-2.5-flash
 * Cost: $0.30 input / $2.50 output per million tokens
 * Context: 1,000,000 tokens
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { LLMResponse, ToolDefinition, TierLevel } from '../types.js';

const MODEL_ID = 'gemini-2.5-flash';
const COST_PER_MILLION_INPUT = 0.30;
const COST_PER_MILLION_OUTPUT = 2.50;

export class GeminiClient {
  private client: GoogleGenAI;
  private systemPrompt: string;

  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY || ''
    });

    this.systemPrompt = `You are EconChat, an AI assistant specialized in economic data analysis for development economists.

You excel at:
- Multi-country comparisons and regional analysis
- Trend analysis and historical data synthesis
- Data visualization recommendations
- Synthesizing information from multiple sources
- Providing clear overviews of economic indicators

Be concise but thorough. Use tables and structured formats when comparing data across countries or time periods.`;
  }

  /**
   * Convert universal tool definitions to Gemini format
   */
  private convertTools(tools: ToolDefinition[]): object[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).map(([key, value]) => [
            key,
            {
              type: this.mapType(value.type),
              description: value.description,
              ...(value.enum ? { enum: value.enum } : {})
            }
          ])
        ),
        required: tool.parameters.required
      }
    }));
  }

  private mapType(type: string): Type {
    const typeMap: Record<string, Type> = {
      'string': Type.STRING,
      'number': Type.NUMBER,
      'integer': Type.INTEGER,
      'boolean': Type.BOOLEAN,
      'array': Type.ARRAY,
      'object': Type.OBJECT
    };
    return typeMap[type] || Type.STRING;
  }

  /**
   * Generate response using Gemini 2.5 Flash
   */
  async generate(
    query: string,
    tools?: ToolDefinition[],
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    // Build contents array
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add conversation history
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Add current query
    contents.push({
      role: 'user',
      parts: [{ text: query }]
    });

    // Build config
    const config: Record<string, unknown> = {
      systemInstruction: this.systemPrompt
    };

    if (tools && tools.length > 0) {
      config.tools = [{
        functionDeclarations: this.convertTools(tools)
      }];
    }

    const response = await this.client.models.generateContent({
      model: MODEL_ID,
      contents,
      config
    });

    // Extract text and tool calls
    let textContent = '';
    const toolCalls: LLMResponse['toolCalls'] = [];

    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if ('text' in part && part.text) {
            textContent += part.text;
          }
          if ('functionCall' in part && part.functionCall) {
            toolCalls.push({
              id: `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: part.functionCall.name || '',
              arguments: (part.functionCall.args as Record<string, unknown>) || {}
            });
          }
        }
      }
    }

    // Get token usage
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;

    // Calculate cost
    const inputCost = (inputTokens * COST_PER_MILLION_INPUT) / 1_000_000;
    const outputCost = (outputTokens * COST_PER_MILLION_OUTPUT) / 1_000_000;

    return {
      tierUsed: 2 as TierLevel,
      model: MODEL_ID,
      provider: 'gemini',
      content: textContent || response.text || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens,
        outputTokens,
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
    toolResults: Array<{ name: string; result: unknown }>,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    // Build contents with tool results as text (simplified approach)
    let content = originalQuery;

    if (toolResults.length > 0) {
      content += '\n\nTool Results:\n';
      for (const tr of toolResults) {
        content += `${tr.name}: ${JSON.stringify(tr.result)}\n`;
      }
    }

    const response = await this.client.models.generateContent({
      model: MODEL_ID,
      contents: content,
      config: {
        systemInstruction: this.systemPrompt
      }
    });

    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    const inputCost = (inputTokens * COST_PER_MILLION_INPUT) / 1_000_000;
    const outputCost = (outputTokens * COST_PER_MILLION_OUTPUT) / 1_000_000;

    return {
      tierUsed: 2 as TierLevel,
      model: MODEL_ID,
      provider: 'gemini',
      content: response.text || '',
      usage: {
        inputTokens,
        outputTokens,
        estimatedCost: inputCost + outputCost
      },
      latencyMs: Date.now() - startTime
    };
  }
}

export default GeminiClient;
