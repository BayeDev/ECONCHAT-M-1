/**
 * EconChat 2-Tier LLM Router
 *
 * Intelligently routes queries to the optimal LLM based on complexity:
 * - Tier 1 (Claude Opus 4.5): Complex economic analysis, DSA, diagnostics
 * - Tier 2 (Gemini 2.5 Flash): Everything else (simple queries, comparisons, data lookups)
 */

import { AnthropicClient } from './providers/anthropic.js';
import { GeminiClient } from './providers/gemini.js';
import { ECON_TOOLS } from './tools/definitions.js';
import type {
  LLMResponse,
  ToolDefinition,
  TierLevel,
  RouterConfig,
  TIER_CONFIGS
} from './types.js';

// Classification patterns for each tier
const TIER1_PATTERNS = [
  // Complex analysis keywords
  'analysis', 'analyze', 'diagnostic', 'diagnostics',
  'sustainability', 'sustainable',
  'report', 'brief', 'assessment', 'framework',
  'binding constraints', 'growth diagnostic', 'dsa',
  'debt sustainability',
  // Deep reasoning
  'explain why', 'implications', 'recommend', 'recommendations',
  'scenario', 'projection analysis', 'forecast implications',
  // Document generation
  'generate a', 'create a report', 'write a brief', 'draft a',
  'country economic brief', 'economic outlook',
  // Methodological
  'hausmann', 'rodrik', 'velasco', 'hrv',
  'macroeconomic framework', 'fiscal framework',
  'policy implications', 'structural reform',
  // Complex queries
  'what are the main', 'evaluate', 'assess the impact',
  'long-term', 'medium-term outlook'
];

const TIER2_PATTERNS = [
  // Comparison keywords
  'compare', 'comparison', 'versus', ' vs ', ' vs.',
  'relative to', 'compared to', 'against',
  // Trend analysis
  'trend', 'trends', 'over time', 'historical',
  'trajectory', 'evolution', 'changed',
  // Multi-entity
  'across countries', 'regional', 'multiple countries',
  'across regions', 'different countries',
  // Synthesis
  'summarize', 'synthesis', 'overview', 'summary',
  // Time-based analysis
  'how has', 'how have', 'evolution of',
  'since', 'from.*to', 'between.*and',
  // Aggregation
  'average', 'total', 'aggregate', 'combined'
];

// Country/region indicators for complexity heuristics
const COMPLEXITY_INDICATORS = [
  'countries', 'nations', 'economies',
  'africa', 'asia', 'europe', 'americas',
  'ecowas', 'sadc', 'eac', 'comesa',
  'g20', 'g7', 'brics', 'oecd',
  'developing', 'emerging', 'frontier'
];

/**
 * Classify a query to determine which tier should handle it
 *
 * @param query - The user's query text
 * @returns TierLevel (1, 2, or 3)
 */
export function classifyQuery(query: string): TierLevel {
  const queryLower = query.toLowerCase();

  // Check for Tier 1 patterns (complex analysis)
  for (const pattern of TIER1_PATTERNS) {
    if (queryLower.includes(pattern)) {
      console.log(`[Router] Tier 1 match: "${pattern}"`);
      return 1;
    }
  }

  // Check for Tier 2 patterns (medium complexity)
  for (const pattern of TIER2_PATTERNS) {
    // Handle regex patterns
    if (pattern.includes('.*')) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(queryLower)) {
        console.log(`[Router] Tier 2 regex match: "${pattern}"`);
        return 2;
      }
    } else if (queryLower.includes(pattern)) {
      console.log(`[Router] Tier 2 match: "${pattern}"`);
      return 2;
    }
  }

  // Complexity heuristics based on entity count
  const complexityScore = COMPLEXITY_INDICATORS.reduce((score, indicator) => {
    return score + (queryLower.includes(indicator) ? 1 : 0);
  }, 0);

  // Count explicit country mentions (comma-separated or "and")
  const countryMentions = (queryLower.match(/,/g) || []).length +
    (queryLower.match(/ and /g) || []).length;

  if (complexityScore >= 2 || countryMentions >= 2) {
    console.log(`[Router] Tier 2 by complexity: score=${complexityScore}, mentions=${countryMentions}`);
    return 2;
  }

  // Check query length as a rough complexity proxy
  const wordCount = query.split(/\s+/).length;
  if (wordCount > 30) {
    console.log(`[Router] Tier 1 by length: ${wordCount} words`);
    return 1;
  }

  // Default to Tier 2 for everything else (Gemini handles simple queries too)
  console.log(`[Router] Tier 2 (default): standard query`);
  return 2;
}

/**
 * Get tier name for logging/display
 */
export function getTierName(tier: TierLevel): string {
  const names: Record<TierLevel, string> = {
    1: 'Premium (Claude Opus 4.5)',
    2: 'Standard (Gemini 2.5 Flash)',
    3: 'Standard (Gemini 2.5 Flash)'  // Map old Tier 3 to Tier 2
  };
  return names[tier];
}

/**
 * Main LLM Router class (2-tier: Claude Opus + Gemini Flash)
 */
export class LLMRouter {
  private anthropicClient: AnthropicClient;
  private geminiClient: GeminiClient;
  private config: RouterConfig;
  private tools: ToolDefinition[];

  // Usage tracking
  private usageStats = {
    tier1Calls: 0,
    tier2Calls: 0,
    totalCost: 0,
    fallbackCount: 0
  };

  constructor(config: RouterConfig = {}) {
    this.config = {
      enableFallback: true,
      defaultTier: 2,  // Default to Gemini
      maxRetries: 2,
      timeoutMs: 30000,
      ...config
    };

    // Initialize clients (2-tier only)
    this.anthropicClient = new AnthropicClient();
    this.geminiClient = new GeminiClient();

    // Use economic data tools by default
    this.tools = ECON_TOOLS;
  }

  /**
   * Set custom tools for the router
   */
  setTools(tools: ToolDefinition[]): void {
    this.tools = tools;
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return { ...this.usageStats };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.usageStats = {
      tier1Calls: 0,
      tier2Calls: 0,
      totalCost: 0,
      fallbackCount: 0
    };
  }

  /**
   * Route and generate response for a query
   *
   * @param query - User's query text
   * @param options - Optional configuration
   * @returns LLMResponse with content, tier used, cost, etc.
   */
  async generate(
    query: string,
    options: {
      forceTier?: TierLevel;
      includeTools?: boolean;
      conversationHistory?: Array<{ role: string; content: string }>;
    } = {}
  ): Promise<LLMResponse> {
    const { forceTier, includeTools = true, conversationHistory } = options;

    // Determine tier
    const tier = forceTier || classifyQuery(query);
    const tools = includeTools ? this.tools : undefined;

    console.log(`[Router] Query routed to Tier ${tier} (${getTierName(tier)})`);
    console.log(`[Router] Query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

    try {
      let response: LLMResponse;

      if (tier === 1) {
        response = await this.anthropicClient.generate(query, tools);
        this.usageStats.tier1Calls++;
      } else {
        // Tier 2 (and any other) uses Gemini
        response = await this.geminiClient.generate(query, tools);
        this.usageStats.tier2Calls++;
      }

      this.usageStats.totalCost += response.usage.estimatedCost;
      return response;

    } catch (error) {
      console.error(`[Router] Tier ${tier} failed:`, error);

      // Fallback logic if enabled
      if (this.config.enableFallback) {
        return this.handleFallback(query, tier, tools, error as Error);
      }

      throw error;
    }
  }

  /**
   * Handle fallback when a tier fails
   * Tier 2 → Tier 1 (Gemini fails → try Claude)
   */
  private async handleFallback(
    query: string,
    originalTier: TierLevel,
    tools?: ToolDefinition[],
    originalError?: Error
  ): Promise<LLMResponse> {
    console.log(`[Router] Attempting fallback from Tier ${originalTier}`);
    this.usageStats.fallbackCount++;

    // If Gemini (Tier 2) fails, try Claude (Tier 1)
    if (originalTier !== 1) {
      try {
        console.log(`[Router] Trying fallback to Tier 1 (Claude Opus)`);
        const response = await this.anthropicClient.generate(query, tools);
        this.usageStats.tier1Calls++;
        this.usageStats.totalCost += response.usage.estimatedCost;

        return {
          ...response,
          fallbackUsed: true,
          originalTier
        };
      } catch (fallbackError) {
        console.error(`[Router] Fallback to Tier 1 failed:`, fallbackError);
      }
    }

    // All fallbacks failed
    throw new Error(`All LLM tiers failed. Original error: ${originalError?.message}`);
  }

  /**
   * Generate with forced tier (for testing or specific use cases)
   */
  async generateWithTier(
    tier: TierLevel,
    query: string,
    includeTools = true
  ): Promise<LLMResponse> {
    return this.generate(query, { forceTier: tier, includeTools });
  }

  /**
   * Batch process multiple queries (routes each independently)
   */
  async batchGenerate(
    queries: string[],
    options: { includeTools?: boolean } = {}
  ): Promise<LLMResponse[]> {
    const results: LLMResponse[] = [];

    for (const query of queries) {
      const response = await this.generate(query, options);
      results.push(response);
    }

    return results;
  }
}

export default LLMRouter;
