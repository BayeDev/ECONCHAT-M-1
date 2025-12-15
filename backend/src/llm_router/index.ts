/**
 * EconChat 3-Tier LLM Router
 *
 * Routes queries to the optimal LLM based on complexity:
 * - Tier 1 (Premium): Claude Opus 4.5 - Complex economic analysis
 * - Tier 2 (Standard): Gemini 2.5 Flash - Medium complexity
 * - Tier 3 (Basic): Groq Llama 3.3 70B - Simple queries
 */

export { LLMRouter, classifyQuery, getTierName } from './router.js';
export { AnthropicClient } from './providers/anthropic.js';
export { GeminiClient } from './providers/gemini.js';
export { GroqClient } from './providers/groq.js';
export { convertToolsForProvider, ECON_TOOLS } from './tools/definitions.js';
export type {
  LLMResponse,
  LLMProvider,
  ToolDefinition,
  UsageStats,
  RouterConfig,
  TierLevel
} from './types.js';
