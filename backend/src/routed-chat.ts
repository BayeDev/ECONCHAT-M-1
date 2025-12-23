/**
 * EconChat Routed Chat
 *
 * Integrates the 3-tier LLM router with the existing chat functionality.
 * Routes queries to optimal LLM while maintaining tool use and chart generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { allTools } from './data-tools.js';
import { executeTool } from './tool-executor.js';
import { classifyQuery, getTierName } from './llm_router/router.js';
import type { TierLevel } from './llm_router/types.js';
import type { ChartData, ChatResponse } from './claude-client.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Initialize clients (2-tier system: Claude Opus + Gemini)
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

// Model IDs (simplified 2-tier system)
const MODELS = {
  TIER1: 'claude-opus-4-5-20251101',     // Premium: Complex analysis only
  TIER2: 'gemini-2.5-flash',              // Standard: Everything else
  SONNET: 'claude-sonnet-4-20250514'      // Fallback only
};

// Cost per million tokens
const COSTS = {
  TIER1: { input: 15.0, output: 75.0 },
  TIER2: { input: 0.30, output: 2.50 },
  SONNET: { input: 3.0, output: 15.0 }
};

// System prompts optimized for each tier
const SYSTEM_PROMPTS = {
  TIER1: `You are EconChat, an expert AI assistant for economists at Multilateral Development Banks (MDBs).

You specialize in:
- Debt Sustainability Analysis (DSA) frameworks
- Hausmann-Rodrik-Velasco growth diagnostics
- Country economic briefs and assessments
- Macroeconomic frameworks and projections
- Binding constraints analysis
- Policy recommendations

CRITICAL - COUNTRY ACCURACY:
- Niger (NER) and Nigeria (NGA) are DIFFERENT countries
- Niger: landlocked West African country, capital Niamey, population ~25M, GDP ~$15B
- Nigeria: coastal West African country, capital Abuja, population ~220M, GDP ~$450B
- ALWAYS verify you are analyzing the EXACT country the user asked about

Provide thorough, nuanced analysis with actionable insights. Use proper economic terminology and cite relevant frameworks.`,

  TIER2: `You are EconChat, an AI assistant for economic data analysis.

You excel at:
- Answering questions about economic indicators and data
- Multi-country comparisons and regional analysis
- Trend analysis and historical data synthesis
- Data synthesis from multiple sources
- Clear structured overviews

CRITICAL - COUNTRY ACCURACY:
- Niger (NER) ≠ Nigeria (NGA) - these are DIFFERENT countries
- Congo Republic (COG) ≠ DR Congo (COD)
- Always use the correct country the user specified

Use tables for comparing data. Be thorough but concise.`
};

// Extended system prompt with tool descriptions
const TOOL_SYSTEM_PROMPT = `You are EconChat, an AI assistant specialized in helping economists and researchers query and analyze economic data from multiple international sources.

IMPORTANT: You MUST use the data tools to answer questions about economic data. Do NOT provide generic answers without fetching actual data. Always use the appropriate tool to get real data.

You have access to tools from 5 major data sources:

1. **World Bank** (wb_*) - Development indicators: GDP, population, poverty, health, education
   - Use wb_search_indicators to find indicator codes
   - Common: NY.GDP.MKTP.CD (GDP), SP.POP.TOTL (population)

2. **IMF** (imf_*) - Macroeconomic data and FORECASTS
   - WEO has forecasts up to 2028
   - Key: NGDP_RPCH (GDP growth %), PCPIPCH (inflation %), GGXWDG_NGDP (debt/GDP)

3. **FAO** (fao_*) - Agricultural and food data
   - Crop production, yields, livestock, food security

4. **UN Comtrade** (comtrade_*) - International trade data
   - Bilateral trade flows, top trading partners

5. **Our World in Data** (owid_*) - Cross-domain curated indicators (BEST FOR LONG-TERM TRENDS)
   - Life expectancy, CO2, human development, mortality, education
   - SUPPORTS CONTINENTS: Use 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania' as country names
   - Also supports: 'World', 'High-income countries', 'Low-income countries'
   - Use owid_get_chart_data with chart_slug='life-expectancy' and countries=['Africa', 'Asia', 'Europe'] for continent comparison
   - Use for_map=true for world maps

CRITICAL - COUNTRY CODE ACCURACY:
- Niger (West African country, capital Niamey) = NER
- Nigeria (West African country, capital Abuja) = NGA
- These are DIFFERENT countries! Always use the correct ISO code.
- Other commonly confused: Congo Republic (COG) vs DR Congo (COD)

GUIDELINES:
1. ALWAYS use tools to fetch data - never make up numbers
2. For life expectancy, health, and long-term trends -> use OWID tools
3. For GDP forecasts and macro data -> use IMF tools
4. For development indicators -> use World Bank tools
5. For agricultural data -> use FAO tools
6. For trade data -> use UN Comtrade tools
7. Use tables for multiple values
8. Always cite the data source
9. Format numbers nicely (billions, millions)

IMPORTANT - SUMMARY/OVERVIEW QUERIES (SEARCH ONCE, THEN FETCH):
When the user asks for a "summary", "overview", "key metrics", or "key indicators":

STEP 1 - ONE SEARCH ONLY: Make exactly 1 search call to discover indicators
- For health: owid_search_charts with query="health"
- For economy: wb_search_indicators with query="GDP"
- For trade: skip search, use comtrade_get_top_partners directly

STEP 2 - FETCH 4-5 DIVERSE INDICATORS: After the ONE search, immediately fetch data
- Pick 4-5 DIFFERENT indicator slugs from the search results
- Call owid_get_chart_data or wb_get_indicator_data for EACH indicator
- Always include countries parameter with the requested country

CRITICAL: Do NOT make more than 1 search call. After searching, you MUST fetch data.

HEALTH METRICS WORKFLOW:
1. owid_search_charts(query="health") -> get list of available charts
2. owid_get_chart_data(chart_slug="life-expectancy", countries=["Djibouti"])
3. owid_get_chart_data(chart_slug="infant-mortality", countries=["Djibouti"])
4. owid_get_chart_data(chart_slug="maternal-mortality", countries=["Djibouti"])
5. wb_get_indicator_data(indicator="SH.XPD.CHEX.PC.CD", countries=["DJI"]) for health expenditure

ECONOMIC OVERVIEW WORKFLOW:
1. wb_search_indicators(query="GDP") -> get indicator codes
2. imf_get_weo_data(indicator="NGDP_RPCH", countries=["DJI"])
3. imf_get_weo_data(indicator="PCPIPCH", countries=["DJI"])
4. wb_get_indicator_data(indicator="NY.GDP.MKTP.CD", countries=["DJI"])

The pattern is: 1 search + 4-5 data fetches = complete answer.`;

interface Message {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[];
}

export interface RoutedChatResponse extends ChatResponse {
  tierUsed: TierLevel;
  modelUsed: string;
  estimatedCost: number;
  latencyMs: number;
}

/**
 * Usage tracking for cost monitoring
 */
const usageTracker = {
  tier1Calls: 0,  // Claude Opus
  tier2Calls: 0,  // Gemini Flash
  toolCalls: 0,
  totalCost: 0,

  reset() {
    this.tier1Calls = 0;
    this.tier2Calls = 0;
    this.toolCalls = 0;
    this.totalCost = 0;
  },

  getStats() {
    return {
      tier1Calls: this.tier1Calls,
      tier2Calls: this.tier2Calls,
      toolCalls: this.toolCalls,
      totalCost: this.totalCost.toFixed(4)
    };
  }
};

export function getUsageStats() {
  return usageTracker.getStats();
}

export function resetUsageStats() {
  usageTracker.reset();
}

/**
 * Convert our tools to Gemini function declaration format
 */
function convertToolsToGeminiFormat(): any[] {
  return allTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema as any
  }));
}

/**
 * Helper function to call Gemini with retry logic for 503 errors
 */
async function callGeminiWithRetry(
  params: Parameters<typeof geminiClient.models.generateContent>[0],
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<Awaited<ReturnType<typeof geminiClient.models.generateContent>>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await geminiClient.models.generateContent(params);
    } catch (error) {
      lastError = error as Error;
      const status = (error as { status?: number }).status;

      // Only retry on 503 (overloaded) errors
      if (status === 503 && attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[Gemini] 503 error, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Execute tool calls using Gemini 2.5 Flash (10x cheaper than Sonnet!)
 * Falls back to Sonnet only if Gemini fails after retries
 */
async function executeToolsWithGemini(
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<{
  response: string;
  toolsUsed: string[];
  collectedData: Array<{ tool: string; result: unknown }>;
  inputTokens: number;
  outputTokens: number;
}> {
  const toolsUsed: string[] = [];
  const collectedData: Array<{ tool: string; result: unknown }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Build conversation context
    const historyText = conversationHistory
      .map(msg => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : '[complex content]'}`)
      .join('\n');

    const fullPrompt = historyText
      ? `Previous conversation:\n${historyText}\n\nUser: ${userMessage}`
      : userMessage;

    // Initial Gemini call with tools (with retry for 503 errors)
    let response = await callGeminiWithRetry({
      model: MODELS.TIER2,
      contents: fullPrompt,
      config: {
        systemInstruction: TOOL_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: convertToolsToGeminiFormat() }]
      }
    });

    totalInputTokens += response.usageMetadata?.promptTokenCount || 0;
    totalOutputTokens += response.usageMetadata?.candidatesTokenCount || 0;

    // Handle tool use loop
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) break;

      // Find function calls
      const functionCalls = candidate.content.parts.filter(
        (part: { functionCall?: unknown }) => part.functionCall
      );

      if (functionCalls.length === 0) break;

      iterations++;
      usageTracker.toolCalls++;

      const functionResponses: Array<{ name: string; response: { result: unknown } }> = [];

      for (const part of functionCalls) {
        const fc = part.functionCall as { name: string; args: Record<string, unknown> };
        toolsUsed.push(fc.name);
        console.log(`[Tool ${iterations}] ${fc.name}:`, JSON.stringify(fc.args).substring(0, 150));

        try {
          const result = await executeTool(fc.name, fc.args);
          collectedData.push({ tool: fc.name, result });
          functionResponses.push({
            name: fc.name,
            response: { result }
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Tool Error] ${fc.name}:`, errorMsg);
          functionResponses.push({
            name: fc.name,
            response: { result: { error: errorMsg } }
          });
        }
      }

      // Continue with tool results (with retry for 503 errors)
      response = await callGeminiWithRetry({
        model: MODELS.TIER2,
        contents: [
          { role: 'user', parts: [{ text: fullPrompt }] },
          { role: 'model', parts: candidate.content.parts },
          {
            role: 'user',
            parts: functionResponses.map(fr => ({
              functionResponse: {
                name: fr.name,
                response: fr.response
              }
            }))
          }
        ],
        config: {
          systemInstruction: TOOL_SYSTEM_PROMPT,
          tools: [{ functionDeclarations: convertToolsToGeminiFormat() }]
        }
      });

      totalInputTokens += response.usageMetadata?.promptTokenCount || 0;
      totalOutputTokens += response.usageMetadata?.candidatesTokenCount || 0;
    }

    // Calculate cost for Gemini tool execution
    const geminiCost = (totalInputTokens * COSTS.TIER2.input / 1_000_000) +
      (totalOutputTokens * COSTS.TIER2.output / 1_000_000);
    usageTracker.totalCost += geminiCost;

    return {
      response: response.text || '',
      toolsUsed: [...new Set(toolsUsed)],
      collectedData,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens
    };

  } catch (error) {
    console.error('[Tool Executor] Gemini failed, falling back to Sonnet:', error);
    // Fallback to Sonnet (only if Gemini completely fails)
    return executeToolsWithSonnetFallback(userMessage, conversationHistory);
  }
}

/**
 * Fallback: Execute tools with Claude Sonnet (only used if Gemini fails)
 */
async function executeToolsWithSonnetFallback(
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<{
  response: string;
  toolsUsed: string[];
  collectedData: Array<{ tool: string; result: unknown }>;
  inputTokens: number;
  outputTokens: number;
}> {
  console.log('[Tool Executor] Using Sonnet fallback...');

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: userMessage }
  ];

  const toolsUsed: string[] = [];
  const collectedData: Array<{ tool: string; result: unknown }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let response = await anthropicClient.messages.create({
    model: MODELS.SONNET,
    max_tokens: 4096,
    system: TOOL_SYSTEM_PROMPT,
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema
    })),
    messages
  });

  totalInputTokens += response.usage.input_tokens;
  totalOutputTokens += response.usage.output_tokens;

  let iterations = 0;
  const maxIterations = 10;

  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++;
    usageTracker.toolCalls++;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      toolsUsed.push(toolUse.name);
      console.log(`[Tool ${iterations}] ${toolUse.name}:`, JSON.stringify(toolUse.input).substring(0, 150));

      try {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        collectedData.push({ tool: toolUse.name, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result, null, 2)
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: ${errorMsg}`,
          is_error: true
        });
      }
    }

    messages.push({ role: 'assistant' as const, content: response.content });
    messages.push({ role: 'user' as const, content: toolResults });

    response = await anthropicClient.messages.create({
      model: MODELS.SONNET,
      max_tokens: 4096,
      system: TOOL_SYSTEM_PROMPT,
      tools: allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema
      })),
      messages
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
  }

  const textContent = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  const sonnetCost = (totalInputTokens * COSTS.SONNET.input / 1_000_000) +
    (totalOutputTokens * COSTS.SONNET.output / 1_000_000);
  usageTracker.totalCost += sonnetCost;

  return {
    response: textContent?.text || '',
    toolsUsed: [...new Set(toolsUsed)],
    collectedData,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens
  };
}

/**
 * Generate response using Tier 1 (Claude Opus 4.5)
 */
async function generateWithClaudeOpus(
  query: string,
  context?: string
): Promise<{ response: string; inputTokens: number; outputTokens: number }> {
  const content = context ? `${context}\n\nUser Query: ${query}` : query;

  const response = await anthropicClient.messages.create({
    model: MODELS.TIER1,
    max_tokens: 4096,
    system: SYSTEM_PROMPTS.TIER1,
    messages: [{ role: 'user', content }]
  });

  const textContent = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  const cost = (response.usage.input_tokens * COSTS.TIER1.input / 1_000_000) +
    (response.usage.output_tokens * COSTS.TIER1.output / 1_000_000);
  usageTracker.totalCost += cost;
  usageTracker.tier1Calls++;

  return {
    response: textContent?.text || '',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  };
}

/**
 * Generate response using Tier 2 (Gemini 2.5 Flash)
 */
async function generateWithGeminiFlash(
  query: string,
  context?: string
): Promise<{ response: string; inputTokens: number; outputTokens: number }> {
  const content = context ? `${context}\n\nUser Query: ${query}` : query;

  const response = await geminiClient.models.generateContent({
    model: MODELS.TIER2,
    contents: content,
    config: {
      systemInstruction: SYSTEM_PROMPTS.TIER2
    }
  });

  const inputTokens = response.usageMetadata?.promptTokenCount || 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

  const cost = (inputTokens * COSTS.TIER2.input / 1_000_000) +
    (outputTokens * COSTS.TIER2.output / 1_000_000);
  usageTracker.totalCost += cost;
  usageTracker.tier2Calls++;

  return {
    response: response.text || '',
    inputTokens,
    outputTokens
  };
}


/**
 * Main routed chat function
 *
 * Determines query complexity, executes tools if needed, and routes final
 * response generation to the optimal LLM tier.
 */
export async function routedChat(
  userMessage: string,
  conversationHistory: Message[] = [],
  options: {
    forceTier?: TierLevel;
    skipTools?: boolean;
  } = {}
): Promise<RoutedChatResponse> {
  const startTime = Date.now();

  // Classify query to determine tier
  const tier = options.forceTier || classifyQuery(userMessage);
  console.log(`[Router] Query classified as Tier ${tier} (${getTierName(tier)})`);

  let response: string;
  let toolsUsed: string[] = [];
  let collectedData: Array<{ tool: string; result: unknown }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Simplified 2-tier system: always use tools for data queries
  // Tier 1 = Claude Opus (complex analysis)
  // Tier 2 = Gemini Flash (everything else, including tool execution)
  const needsTools = !options.skipTools;

  console.log(`[Router] Tier ${tier}, NeedsTools: ${needsTools}`);

  // Execute tools if needed (uses Gemini for cost efficiency - 10x cheaper than Sonnet!)
  if (needsTools) {
    console.log(`[Router] Executing tools with Gemini...`);
    const toolResult = await executeToolsWithGemini(userMessage, conversationHistory);
    toolsUsed = toolResult.toolsUsed;
    collectedData = toolResult.collectedData;
    totalInputTokens += toolResult.inputTokens;
    totalOutputTokens += toolResult.outputTokens;

    // For Tier 2, Gemini already generated the response with tools
    // For Tier 1, pass the RAW DATA to Claude Opus for complex analysis
    if (tier === 1) {
      // Build context from raw tool data for Opus to analyze
      let dataContext = '';

      if (toolResult.collectedData.length > 0) {
        dataContext = 'RAW DATA FROM SOURCES:\n\n';
        for (const { tool, result } of toolResult.collectedData) {
          dataContext += `[${tool}]:\n${JSON.stringify(result, null, 2)}\n\n`;
        }
      }

      // Also include Gemini's preliminary analysis as reference
      if (toolResult.response) {
        dataContext += `\nPRELIMINARY ANALYSIS:\n${toolResult.response}`;
      }

      const context = dataContext || undefined;

      try {
        console.log(`[Router] Passing data to Claude Opus for Tier 1 analysis...`);
        const result = await generateWithClaudeOpus(userMessage, context);
        response = result.response;
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
      } catch (error) {
        console.error(`[Router] Claude Opus failed, using Gemini response:`, error);
        response = toolResult.response || 'Error generating response.';
      }
    } else {
      // Tier 2: use Gemini's response directly
      response = toolResult.response;
    }
  } else {
    // No tools needed - direct generation
    console.log(`[Router] Direct generation (no tools)...`);
    try {
      if (tier === 1) {
        const result = await generateWithClaudeOpus(userMessage);
        response = result.response;
        totalInputTokens = result.inputTokens;
        totalOutputTokens = result.outputTokens;
      } else {
        // Tier 2 (and any other): use Gemini
        const result = await generateWithGeminiFlash(userMessage);
        response = result.response;
        totalInputTokens = result.inputTokens;
        totalOutputTokens = result.outputTokens;
      }
    } catch (error) {
      console.error(`[Router] Generation failed:`, error);
      throw error;
    }
  }

  // Extract chart data (import the function from claude-client)
  const charts = extractAllChartData(collectedData, userMessage);

  const latencyMs = Date.now() - startTime;

  // Calculate estimated cost (simplified 2-tier)
  const tierCosts = tier === 1 ? COSTS.TIER1 : COSTS.TIER2;
  const estimatedCost = (totalInputTokens * tierCosts.input / 1_000_000) +
    (totalOutputTokens * tierCosts.output / 1_000_000);

  return {
    response,
    toolsUsed,
    chartData: charts[0],
    charts,
    tierUsed: tier === 1 ? 1 : 2,  // Normalize to 2-tier system
    modelUsed: tier === 1 ? MODELS.TIER1 : MODELS.TIER2,
    estimatedCost,
    latencyMs
  };
}

// Import chart extraction from claude-client (simplified version here for now)
function extractAllChartData(
  collectedData: Array<{ tool: string; result: unknown }>,
  userMessage: string
): ChartData[] {
  const charts: ChartData[] = [];
  const seenTitles = new Set<string>(); // Track titles to avoid duplicates

  for (const { tool, result } of collectedData) {
    if (!result || typeof result !== 'object') continue;

    let chartData: ChartData | null = null;

    // OWID data
    if ((tool === 'owid_get_chart_data' || tool === 'owid_get_data') && Array.isArray(result)) {
      chartData = parseOWIDDataSimple(result, userMessage);
    }

    // World Bank data
    if ((tool === 'wb_get_indicator' || tool === 'wb_get_indicator_data') && Array.isArray(result)) {
      chartData = parseWorldBankDataSimple(result);
    }

    // UN Comtrade data - top partners
    if (tool === 'comtrade_get_top_partners' && Array.isArray(result)) {
      chartData = parseComtradeTopPartners(result);
    }

    // UN Comtrade data - trade flow
    if (tool === 'comtrade_get_trade_data' && Array.isArray(result)) {
      chartData = parseComtradeTradeData(result);
    }

    // IMF data
    if ((tool === 'imf_get_indicator' || tool === 'imf_get_weo_data') && Array.isArray(result)) {
      chartData = parseIMFData(result);
    }

    // Add chart only if not a duplicate (by title)
    if (chartData && chartData.title && !seenTitles.has(chartData.title)) {
      seenTitles.add(chartData.title);
      charts.push(chartData);
    } else if (chartData && !chartData.title) {
      // No title, just add it
      charts.push(chartData);
    }

    // FAO data
    if ((tool === 'fao_get_data' || tool === 'fao_get_production') && Array.isArray(result)) {
      const faoChartData = parseFAOData(result);
      if (faoChartData && faoChartData.title && !seenTitles.has(faoChartData.title)) {
        seenTitles.add(faoChartData.title);
        charts.push(faoChartData);
      } else if (faoChartData && !faoChartData.title) {
        charts.push(faoChartData);
      }
    }
  }

  return charts;
}

// Common country name mappings for entity filtering
const COUNTRY_ALIASES: Record<string, string[]> = {
  'djibouti': ['djibouti'],
  'united states': ['united states', 'usa', 'us', 'america'],
  'united kingdom': ['united kingdom', 'uk', 'britain', 'england'],
  'south korea': ['south korea', 'korea, republic of', 'republic of korea'],
  'north korea': ['north korea', 'korea, democratic', 'dprk'],
  'democratic republic of congo': ['democratic republic of congo', 'congo, dem. rep.', 'dr congo', 'drc', 'congo-kinshasa'],
  'republic of congo': ['republic of congo', 'congo, rep.', 'congo-brazzaville'],
  'cote d\'ivoire': ['cote d\'ivoire', 'ivory coast'],
};

// Extract country/region names mentioned in the user message
function extractEntitiesFromMessage(userMessage: string): string[] {
  const userLower = userMessage.toLowerCase();
  const entities: string[] = [];

  // Common country names to look for
  const countryPatterns = [
    'djibouti', 'nigeria', 'niger', 'uganda', 'kenya', 'ethiopia', 'tanzania', 'ghana', 'senegal',
    'south africa', 'egypt', 'morocco', 'algeria', 'tunisia', 'libya', 'sudan', 'somalia', 'rwanda',
    'cameroon', 'angola', 'mozambique', 'madagascar', 'zambia', 'zimbabwe', 'botswana', 'namibia',
    'malawi', 'mali', 'burkina faso', 'benin', 'togo', 'guinea', 'sierra leone', 'liberia',
    'mauritania', 'gambia', 'cape verde', 'mauritius', 'seychelles', 'comoros', 'sao tome',
    'eritrea', 'burundi', 'central african', 'chad', 'gabon', 'equatorial guinea', 'congo',
    'lesotho', 'eswatini', 'swaziland',
    // Non-African
    'china', 'india', 'japan', 'germany', 'france', 'brazil', 'mexico', 'russia', 'canada',
    'australia', 'indonesia', 'pakistan', 'bangladesh', 'vietnam', 'thailand', 'philippines',
    'malaysia', 'singapore', 'united states', 'usa', 'uk', 'united kingdom'
  ];

  for (const country of countryPatterns) {
    if (userLower.includes(country)) {
      // Capitalize properly for matching
      entities.push(country.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  }

  return entities;
}

// Simplified chart parsers
function parseOWIDDataSimple(data: unknown[], userMessage: string): ChartData | null {
  if (!data || data.length === 0) return null;

  const seriesMap = new Map<string, Array<{ x: number; y: number | null }>>();
  let yLabel = 'Value';

  // Extract country names the user is asking about
  const requestedEntities = extractEntitiesFromMessage(userMessage);
  const userLower = userMessage.toLowerCase();

  // Determine if this is a world/global query
  const isGlobalQuery = userLower.includes('world') ||
    userLower.includes('global') ||
    userLower.includes('all countries') ||
    userLower.includes('compare countries') ||
    userLower.includes('by country');

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const entity = record.Entity || record.entity || record.country;
    const year = record.Year || record.year;

    let value: number | null = null;
    for (const [key, val] of Object.entries(record)) {
      if (!['Entity', 'entity', 'Country', 'country', 'Year', 'year', 'Code', 'code'].includes(key) &&
        typeof val === 'number') {
        value = val;
        if (yLabel === 'Value') yLabel = key;
        break;
      }
    }

    if (typeof entity === 'string' && typeof year === 'number') {
      // Filter: only include entities that match user's request (or all if global query)
      const entityLower = entity.toLowerCase();
      const shouldInclude = isGlobalQuery ||
        requestedEntities.length === 0 ||
        requestedEntities.some(req => entityLower.includes(req.toLowerCase()) || req.toLowerCase().includes(entityLower));

      if (shouldInclude) {
        if (!seriesMap.has(entity)) seriesMap.set(entity, []);
        seriesMap.get(entity)!.push({ x: year, y: value });
      }
    }
  }

  if (seriesMap.size === 0) return null;

  // Check if this should be a map
  const allYears = new Set<number>();
  for (const points of seriesMap.values()) {
    for (const p of points) allYears.add(p.x);
  }

  // Only use map when user explicitly asks for it
  // Don't auto-trigger map just because OWID returned many countries
  const useMap = (userLower.includes('map') || userLower.includes('global map')) &&
    (userLower.includes('world') || userLower.includes('global') || userLower.includes('all countries'));

  if (useMap) {
    const targetYear = Math.max(...allYears);
    const mapData = [];
    for (const [entity, points] of seriesMap) {
      const point = points.find(p => p.x === targetYear);
      if (point) {
        mapData.push({ entity, value: point.y });
      }
    }
    return {
      type: 'map',
      series: [],
      mapData,
      year: targetYear,
      title: yLabel,
      yLabel
    };
  }

  const series = Array.from(seriesMap.entries()).map(([name, points]) => ({
    name,
    data: points.sort((a, b) => a.x - b.x)
  }));

  return {
    type: 'line',
    series,
    title: yLabel,
    xLabel: 'Year',
    yLabel
  };
}

function parseWorldBankDataSimple(data: unknown[]): ChartData | null {
  if (!data || data.length === 0) return null;

  const seriesMap = new Map<string, Array<{ x: number; y: number | null }>>();
  let indicatorName = 'Value';

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const country = record.country || record.countryiso3code;
    const year = record.date || record.year;
    const value = record.value;

    // Try to get indicator name from various possible fields
    const indicator = record.indicator as string | { value?: string } | undefined;
    if (indicatorName === 'Value') {
      if (typeof indicator === 'string') {
        indicatorName = indicator;
      } else if (indicator?.value) {
        indicatorName = indicator.value;
      } else if (typeof record.indicatorName === 'string') {
        indicatorName = record.indicatorName;
      }
    }

    if (typeof country === 'string' && year) {
      const yearNum = typeof year === 'number' ? year : parseInt(String(year));
      if (!isNaN(yearNum)) {
        if (!seriesMap.has(country)) seriesMap.set(country, []);
        seriesMap.get(country)!.push({
          x: yearNum,
          y: typeof value === 'number' ? value : null
        });
      }
    }
  }

  if (seriesMap.size === 0) return null;

  // Count total data points
  let totalPoints = 0;
  for (const points of seriesMap.values()) {
    totalPoints += points.length;
  }

  // Don't create a chart for single data points - just show text
  if (totalPoints <= 1) {
    return null;
  }

  const chartType = determineChartType(seriesMap);
  const series = Array.from(seriesMap.entries()).map(([name, points]) => ({
    name,
    data: points.sort((a, b) => a.x - b.x)
  }));

  // Use a cleaner title
  const cleanTitle = indicatorName === 'Value' ? 'GDP' : indicatorName;

  return {
    type: chartType,
    series,
    title: cleanTitle,
    xLabel: chartType === 'bar' ? 'Country' : 'Year',
    yLabel: cleanTitle
  };
}

// Parse UN Comtrade top partners data into bar chart
function parseComtradeTopPartners(data: unknown[]): ChartData | null {
  if (!data || data.length === 0) return null;

  const barData: Array<{ x: number | string; y: number | null }> = [];

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    // Handle different field names from tool-executor return format
    const partner = record.partner || record.partnerDesc || record.partnerCode;
    const value = record.tradeValue || record.primaryValue || record.TradeValue || record.value;

    if (typeof partner === 'string' && typeof value === 'number') {
      barData.push({
        x: partner,
        y: value
      });
    }
  }

  if (barData.length === 0) return null;

  // Sort by value descending and take top 10
  barData.sort((a, b) => (b.y || 0) - (a.y || 0));
  const top10 = barData.slice(0, 10);

  return {
    type: 'bar',
    series: [{
      name: 'Trade Value',
      data: top10
    }],
    title: 'Top Trade Partners',
    xLabel: 'Partner',
    yLabel: 'Trade Value (USD)'
  };
}

// Parse UN Comtrade trade flow data
function parseComtradeTradeData(data: unknown[]): ChartData | null {
  if (!data || data.length === 0) return null;

  const seriesMap = new Map<string, Array<{ x: number; y: number | null }>>();

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const year = record.period || record.year;
    const value = record.primaryValue || record.TradeValue || record.value;
    const flowDesc = record.flowDesc || record.flow || 'Trade';

    if (typeof year === 'number' && typeof value === 'number') {
      const seriesName = typeof flowDesc === 'string' ? flowDesc : 'Trade';
      if (!seriesMap.has(seriesName)) seriesMap.set(seriesName, []);
      seriesMap.get(seriesName)!.push({ x: year, y: value });
    }
  }

  if (seriesMap.size === 0) return null;

  const series = Array.from(seriesMap.entries()).map(([name, points]) => ({
    name,
    data: points.sort((a, b) => a.x - b.x)
  }));

  return {
    type: 'line',
    series,
    title: 'Trade Flow',
    xLabel: 'Year',
    yLabel: 'Trade Value (USD)'
  };
}

// Helper to determine chart type based on data shape
function determineChartType(seriesMap: Map<string, Array<{ x: number; y: number | null }>>): 'line' | 'bar' {
  // Count unique years across all series
  const allYears = new Set<number>();
  for (const points of seriesMap.values()) {
    for (const p of points) allYears.add(p.x);
  }

  // Use BAR chart when comparing multiple countries for 1-2 years
  // Use LINE chart for time series data
  return (seriesMap.size > 1 && allYears.size <= 2) ? 'bar' : 'line';
}

// Parse IMF WEO data
function parseIMFData(data: unknown[]): ChartData | null {
  if (!data || data.length === 0) return null;

  const seriesMap = new Map<string, Array<{ x: number; y: number | null }>>();
  let indicatorName = 'Value';

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const country = record.country || record['@UNIT'] || record.ISO;
    const year = record.year || record['@TIME_PERIOD'];
    const value = record.value || record['@OBS_VALUE'];

    if (typeof record.indicator === 'string' && indicatorName === 'Value') {
      indicatorName = record.indicator;
    }

    if (typeof country === 'string' && year) {
      const yearNum = typeof year === 'number' ? year : parseInt(String(year));
      if (!isNaN(yearNum)) {
        if (!seriesMap.has(country)) seriesMap.set(country, []);
        seriesMap.get(country)!.push({
          x: yearNum,
          y: typeof value === 'number' ? value : null
        });
      }
    }
  }

  if (seriesMap.size === 0) return null;

  const chartType = determineChartType(seriesMap);
  const series = Array.from(seriesMap.entries()).map(([name, points]) => ({
    name,
    data: points.sort((a, b) => a.x - b.x)
  }));

  return {
    type: chartType,
    series,
    title: indicatorName,
    xLabel: chartType === 'bar' ? 'Country' : 'Year',
    yLabel: indicatorName
  };
}

// Parse FAO data
function parseFAOData(data: unknown[]): ChartData | null {
  if (!data || data.length === 0) return null;

  const seriesMap = new Map<string, Array<{ x: number; y: number | null }>>();
  let indicatorName = 'Value';

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const country = record.Area || record.area || record.country;
    const year = record.Year || record.year;
    const value = record.Value || record.value;
    const element = record.Element || record.element;

    if (typeof element === 'string' && indicatorName === 'Value') {
      indicatorName = element;
    }

    if (typeof country === 'string' && year) {
      const yearNum = typeof year === 'number' ? year : parseInt(String(year));
      if (!isNaN(yearNum)) {
        if (!seriesMap.has(country)) seriesMap.set(country, []);
        seriesMap.get(country)!.push({
          x: yearNum,
          y: typeof value === 'number' ? value : null
        });
      }
    }
  }

  if (seriesMap.size === 0) return null;

  const series = Array.from(seriesMap.entries()).map(([name, points]) => ({
    name,
    data: points.sort((a, b) => a.x - b.x)
  }));

  return {
    type: 'line',
    series,
    title: indicatorName,
    xLabel: 'Year',
    yLabel: indicatorName
  };
}

export default routedChat;
