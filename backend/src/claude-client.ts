// claude-client.ts
// Handles Claude API conversation with tool use

import Anthropic from '@anthropic-ai/sdk';
import { allTools } from './data-tools.js';
import { executeTool } from './tool-executor.js';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are EconChat, an AI assistant specialized in helping economists and researchers query and analyze economic data from multiple international sources.

You have access to tools from 5 major data sources:

1. **World Bank** (wb_*) - Development indicators: GDP, population, poverty, health, education, infrastructure
   - Use wb_search_indicators to find indicator codes
   - Common indicators: NY.GDP.MKTP.CD (GDP), SP.POP.TOTL (population), SI.POV.DDAY (poverty)

2. **IMF** (imf_*) - Macroeconomic data and FORECASTS
   - World Economic Outlook (WEO) has forecasts up to 2028
   - Key indicators: NGDP_RPCH (real GDP growth %), PCPIPCH (inflation %), LUR (unemployment %)
   - Use for inflation forecasts, GDP growth projections, fiscal data

3. **FAO** (fao_*) - Agricultural and food data
   - Crop production, yields, livestock, food security
   - Use for wheat, rice, maize production; agricultural trade

4. **UN Comtrade** (comtrade_*) - International trade data
   - Bilateral trade flows, top trading partners, commodity trade
   - Use for "who does X trade with?", export/import analysis

5. **Our World in Data** (owid_*) - Cross-domain curated indicators
   - Long time series, good for historical trends
   - Life expectancy, poverty, CO2 emissions, human development

GUIDELINES:
1. Choose the most appropriate data source for each query
2. If you need an indicator code, search for it first
3. Present data clearly - use tables when showing multiple values
4. Always mention the source of the data
5. For forecasts, use IMF WEO data
6. If one source fails, suggest alternatives
7. Format large numbers nicely (billions, millions with commas)
8. Be concise but informative

When presenting tabular data, format as a markdown table:
| Country | Year | Value |
|---------|------|-------|
| Nigeria | 2022 | 1,234 |`;

interface Message {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[];
}

// Structure for chart-ready time series data
export interface ChartDataPoint {
  x: number;  // year
  y: number | null;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'area';
  series: ChartSeries[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export interface ChatResponse {
  response: string;
  toolsUsed: string[];
  chartData?: ChartData;  // Structured data for visualization
}

export async function chat(
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<ChatResponse> {
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: userMessage }
  ];

  const toolsUsed: string[] = [];
  const collectedData: Array<{ tool: string; result: unknown }> = []; // Collect tool results for charts

  // Initial Claude call
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema
    })),
    messages
  });

  // Handle tool use loop
  let iterations = 0;
  const maxIterations = 15; // Allow more iterations for complex queries

  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      toolsUsed.push(toolUse.name);
      console.log(`[Tool Call ${iterations}] ${toolUse.name}:`, JSON.stringify(toolUse.input).substring(0, 200));

      try {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        const resultStr = JSON.stringify(result, null, 2);
        console.log(`[Tool Result] ${toolUse.name}: ${resultStr.substring(0, 200)}...`);

        // Collect data for chart generation
        collectedData.push({ tool: toolUse.name, result });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: resultStr
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Tool Error] ${toolUse.name}:`, errorMsg);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: ${errorMsg}`,
          is_error: true
        });
      }
    }

    // Continue conversation with tool results
    messages.push({ role: 'assistant' as const, content: response.content });
    messages.push({ role: 'user' as const, content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema
      })),
      messages
    });
  }

  // If we hit max iterations while still in tool_use, ask Claude to summarize with collected data
  if (iterations >= maxIterations && response.stop_reason === 'tool_use') {
    console.log(`[Warning] Hit max iterations (${maxIterations}), asking for summary`);
    messages.push({ role: 'assistant' as const, content: response.content });
    messages.push({
      role: 'user' as const,
      content: 'Please provide a comprehensive summary based on the data you have collected so far. Do not make any more tool calls.'
    });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages // No tools = forces text response
    });
  }

  // Extract text response
  const textContent = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  // Try to extract chart data from collected tool results
  const chartData = extractChartData(collectedData, userMessage);

  return {
    response: textContent?.text || 'No response generated',
    toolsUsed: [...new Set(toolsUsed)], // Deduplicate
    chartData
  };
}

// Extract chart-ready data from tool results
function extractChartData(
  collectedData: Array<{ tool: string; result: unknown }>,
  userMessage: string
): ChartData | undefined {
  // Look for time-series data from OWID, World Bank, or IMF
  for (const { tool, result } of collectedData) {
    if (!result || typeof result !== 'object') continue;

    // Handle OWID data format
    if (tool === 'owid_get_data' && Array.isArray(result)) {
      const chartData = parseOWIDData(result, userMessage);
      if (chartData) return chartData;
    }

    // Handle World Bank data format
    if (tool === 'wb_get_indicator' && Array.isArray(result)) {
      const chartData = parseWorldBankData(result, userMessage);
      if (chartData) return chartData;
    }

    // Handle IMF data format
    if (tool === 'imf_get_indicator') {
      const chartData = parseIMFData(result, userMessage);
      if (chartData) return chartData;
    }
  }

  return undefined;
}

// Parse OWID data into chart format
function parseOWIDData(data: unknown[], userMessage: string): ChartData | undefined {
  if (!data || data.length === 0) return undefined;

  // Group by entity (country/region)
  const seriesMap = new Map<string, ChartDataPoint[]>();

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const entity = record.entity || record.Entity || record.country;
    const year = record.year || record.Year;
    const value = record.value ?? record.Value ?? Object.values(record).find(v => typeof v === 'number' && v > 1000);

    if (typeof entity === 'string' && typeof year === 'number') {
      if (!seriesMap.has(entity)) {
        seriesMap.set(entity, []);
      }
      seriesMap.get(entity)!.push({
        x: year,
        y: typeof value === 'number' ? value : null
      });
    }
  }

  if (seriesMap.size === 0) return undefined;

  // Convert to series array
  const series: ChartSeries[] = [];
  for (const [name, points] of seriesMap) {
    // Sort by year
    points.sort((a, b) => a.x - b.x);
    series.push({ name, data: points });
  }

  // Determine chart title from user message
  const title = userMessage.length > 60 ? userMessage.substring(0, 60) + '...' : userMessage;

  return {
    type: 'line',
    series,
    title,
    xLabel: 'Year',
    yLabel: 'Value'
  };
}

// Parse World Bank data into chart format
function parseWorldBankData(data: unknown[], userMessage: string): ChartData | undefined {
  if (!data || data.length === 0) return undefined;

  // Group by country
  const seriesMap = new Map<string, ChartDataPoint[]>();

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const country = record.country || record.countryiso3code;
    const year = record.date || record.year;
    const value = record.value;

    if (country && year) {
      const countryName = typeof country === 'object' ? (country as Record<string, unknown>).value : country;
      const yearNum = typeof year === 'string' ? parseInt(year) : year;

      if (typeof countryName === 'string' && typeof yearNum === 'number') {
        if (!seriesMap.has(countryName)) {
          seriesMap.set(countryName, []);
        }
        seriesMap.get(countryName)!.push({
          x: yearNum,
          y: typeof value === 'number' ? value : null
        });
      }
    }
  }

  if (seriesMap.size === 0) return undefined;

  const series: ChartSeries[] = [];
  for (const [name, points] of seriesMap) {
    points.sort((a, b) => a.x - b.x);
    series.push({ name, data: points });
  }

  return {
    type: 'line',
    series,
    title: userMessage.length > 60 ? userMessage.substring(0, 60) + '...' : userMessage,
    xLabel: 'Year',
    yLabel: 'Value'
  };
}

// Parse IMF data into chart format
function parseIMFData(data: unknown, userMessage: string): ChartData | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const record = data as Record<string, unknown>;

  // IMF data often comes with country and values object
  if (record.values && typeof record.values === 'object') {
    const values = record.values as Record<string, number>;
    const country = (record.country || record.ISO || 'Country') as string;

    const points: ChartDataPoint[] = [];
    for (const [year, value] of Object.entries(values)) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum)) {
        points.push({ x: yearNum, y: typeof value === 'number' ? value : null });
      }
    }

    if (points.length > 0) {
      points.sort((a, b) => a.x - b.x);
      return {
        type: 'line',
        series: [{ name: country, data: points }],
        title: userMessage.length > 60 ? userMessage.substring(0, 60) + '...' : userMessage,
        xLabel: 'Year',
        yLabel: 'Value'
      };
    }
  }

  return undefined;
}

// Extract source prefixes from tool names
export function getSourcesFromTools(toolsUsed: string[]): string[] {
  const sourceMap: Record<string, string> = {
    wb: 'World Bank',
    imf: 'IMF',
    fao: 'FAO',
    comtrade: 'UN Comtrade',
    owid: 'Our World in Data'
  };

  const sources = new Set<string>();
  for (const tool of toolsUsed) {
    const prefix = tool.split('_')[0];
    if (sourceMap[prefix]) {
      sources.add(sourceMap[prefix]);
    }
  }
  return [...sources];
}
