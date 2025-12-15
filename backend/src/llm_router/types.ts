/**
 * Type definitions for the 3-Tier LLM Router
 */

export type TierLevel = 1 | 2 | 3;

export type LLMProvider = 'anthropic' | 'gemini' | 'groq';

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  tierUsed: TierLevel;
  model: string;
  provider: LLMProvider;
  content: string;
  toolCalls?: ToolCall[];
  usage: UsageStats;
  fallbackUsed?: boolean;
  originalTier?: TierLevel;
  latencyMs?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface RouterConfig {
  enableFallback?: boolean;
  defaultTier?: TierLevel;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface TierConfig {
  tier: TierLevel;
  provider: LLMProvider;
  model: string;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  contextWindow: number;
  maxOutputTokens: number;
}

// Tier configurations
export const TIER_CONFIGS: Record<TierLevel, TierConfig> = {
  1: {
    tier: 1,
    provider: 'anthropic',
    model: 'claude-opus-4-5-20251101',
    costPerMillionInput: 15.0,
    costPerMillionOutput: 75.0,
    contextWindow: 200_000,
    maxOutputTokens: 4096
  },
  2: {
    tier: 2,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    costPerMillionInput: 0.30,
    costPerMillionOutput: 2.50,
    contextWindow: 1_000_000,
    maxOutputTokens: 8192
  },
  3: {
    tier: 3,
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    contextWindow: 128_000,
    maxOutputTokens: 1024
  }
};
