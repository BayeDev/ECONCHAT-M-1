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
   - For WORLD/GLOBAL MAP requests: use for_map=true to get all countries for one year

GUIDELINES:
1. Choose the most appropriate data source for each query
2. If you need an indicator code, search for it first
3. Present data clearly - use tables when showing multiple values
4. Always mention the source of the data
5. For forecasts, use IMF WEO data
6. If one source fails, suggest alternatives
7. Format large numbers nicely (billions, millions with commas)
8. Be concise but informative
9. For WORLD MAP requests (user says "world", "global", "map by country"): use owid_get_chart_data with for_map=true and optionally end_year for the target year

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

// Structure for map data
export interface MapDataPoint {
  entity: string;
  code?: string;
  value: number | null;
}

export interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'area' | 'map';
  series: ChartSeries[];
  mapData?: MapDataPoint[];  // For map visualizations
  year?: number;             // For map: which year the data represents
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export interface ChatResponse {
  response: string;
  toolsUsed: string[];
  chartData?: ChartData;  // Primary chart (backward compatible)
  charts?: ChartData[];   // Multiple charts support
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
  const charts = extractAllChartData(collectedData, userMessage);
  const chartData = charts.length > 0 ? charts[0] : undefined;

  return {
    response: textContent?.text || 'No response generated',
    toolsUsed: [...new Set(toolsUsed)], // Deduplicate
    chartData,  // Primary chart (backward compatible)
    charts      // All charts
  };
}

// Generate a fingerprint for chart data to detect duplicates
function getChartFingerprint(chart: ChartData): string {
  // Use only yLabel (indicator name) as fingerprint
  // This prevents duplicates when same indicator is fetched multiple times
  // Normalize by removing special characters and lowercasing
  return (chart.yLabel || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Extract ALL chart data from tool results (supports multiple charts)
function extractAllChartData(
  collectedData: Array<{ tool: string; result: unknown }>,
  userMessage: string
): ChartData[] {
  const charts: ChartData[] = [];
  const seenFingerprints = new Set<string>();

  for (const { tool, result } of collectedData) {
    if (!result || typeof result !== 'object') continue;

    // Handle OWID data formats (multiple tool names)
    if ((tool === 'owid_get_data' || tool === 'owid_get_chart_data') && Array.isArray(result)) {
      const chartData = parseOWIDData(result, userMessage);
      if (chartData) {
        const fingerprint = getChartFingerprint(chartData);
        if (!seenFingerprints.has(fingerprint)) {
          seenFingerprints.add(fingerprint);
          charts.push(chartData);
        } else {
          console.log(`[Chart] Skipping duplicate chart: ${chartData.yLabel}`);
        }
      }
    }

    // Handle World Bank data format
    if ((tool === 'wb_get_indicator' || tool === 'wb_get_indicator_data') && Array.isArray(result)) {
      const chartData = parseWorldBankData(result, userMessage);
      if (chartData) {
        const fingerprint = getChartFingerprint(chartData);
        if (!seenFingerprints.has(fingerprint)) {
          seenFingerprints.add(fingerprint);
          charts.push(chartData);
        } else {
          console.log(`[Chart] Skipping duplicate chart: ${chartData.yLabel}`);
        }
      }
    }

    // Handle IMF data format
    if ((tool === 'imf_get_indicator' || tool === 'imf_get_weo_data')) {
      const chartData = parseIMFData(result, userMessage);
      if (chartData) {
        const fingerprint = getChartFingerprint(chartData);
        if (!seenFingerprints.has(fingerprint)) {
          seenFingerprints.add(fingerprint);
          charts.push(chartData);
        } else {
          console.log(`[Chart] Skipping duplicate chart: ${chartData.yLabel}`);
        }
      }
    }
  }

  return charts;
}

// Extract chart-ready data from tool results (legacy - returns first match)
function extractChartData(
  collectedData: Array<{ tool: string; result: unknown }>,
  userMessage: string
): ChartData | undefined {
  const charts = extractAllChartData(collectedData, userMessage);
  return charts.length > 0 ? charts[0] : undefined;
}

// Extract requested entities (countries/regions) from user message
function extractRequestedEntities(userMessage: string): string[] {
  const msg = userMessage.toLowerCase();

  // If user is asking for world/global map, don't filter - show all countries
  if (msg.includes('world') || msg.includes('global') || msg.includes('worldwide') ||
      msg.includes('all countries') || msg.includes('by country')) {
    return []; // Empty array = no filtering = show all
  }

  // Common country names and their variations
  const countryMappings: Record<string, string[]> = {
    'China': ['china', 'chinese'],
    'United States': ['usa', 'us', 'united states', 'america', 'american'],
    'India': ['india', 'indian'],
    'Germany': ['germany', 'german'],
    'France': ['france', 'french'],
    'United Kingdom': ['uk', 'united kingdom', 'britain', 'british', 'england'],
    'Japan': ['japan', 'japanese'],
    'Brazil': ['brazil', 'brazilian'],
    'Russia': ['russia', 'russian'],
    'Canada': ['canada', 'canadian'],
    'Australia': ['australia', 'australian'],
    'Mexico': ['mexico', 'mexican'],
    'South Korea': ['south korea', 'korea', 'korean'],
    'Indonesia': ['indonesia', 'indonesian'],
    'Nigeria': ['nigeria', 'nigerian'],
    'South Africa': ['south africa'],
    'Egypt': ['egypt', 'egyptian'],
    'Morocco': ['morocco', 'moroccan'],
    'Argentina': ['argentina', 'argentine'],
    'Bangladesh': ['bangladesh', 'bangladeshi'],
    'Saudi Arabia': ['saudi arabia', 'saudi']
  };

  const found: string[] = [];

  for (const [standardName, variations] of Object.entries(countryMappings)) {
    for (const variation of variations) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${variation}\\b`, 'i');
      if (regex.test(msg)) {
        found.push(standardName);
        break;
      }
    }
  }

  return found;
}

// Check if an entity name matches any of the requested entities
function entityMatchesRequested(entity: string, requestedEntities: string[]): boolean {
  if (requestedEntities.length === 0) return true; // No filter if no entities specified

  const entityLower = entity.toLowerCase();

  for (const requested of requestedEntities) {
    const requestedLower = requested.toLowerCase();
    // Direct match
    if (entityLower === requestedLower) return true;
    // Partial match (e.g., "United States" matches "United States of America")
    if (entityLower.includes(requestedLower) || requestedLower.includes(entityLower)) return true;
    // Handle "US" -> "United States"
    if (requested === 'United States' && (entityLower === 'usa' || entityLower === 'us')) return true;
    if (entityLower === 'united states' && (requested.toLowerCase() === 'usa' || requested.toLowerCase() === 'us')) return true;
  }

  return false;
}

// Check if user is asking for a map visualization
function shouldUseMapVisualization(userMessage: string, entityCount: number, uniqueYears: number): boolean {
  const msg = userMessage.toLowerCase();

  // Explicit map request
  if (msg.includes('map') || msg.includes('world') || msg.includes('global') || msg.includes('by country')) {
    return true;
  }

  // Many countries + single year = map is better
  if (entityCount > 15 && uniqueYears === 1) {
    return true;
  }

  // Many countries + few years = map might be better
  if (entityCount > 30 && uniqueYears <= 3) {
    return true;
  }

  return false;
}

// Parse OWID data into chart format
function parseOWIDData(data: unknown[], userMessage: string): ChartData | undefined {
  if (!data || data.length === 0) return undefined;

  // Extract requested entities from user message to filter data
  const requestedEntities = extractRequestedEntities(userMessage);
  console.log(`[Chart] Requested entities: ${requestedEntities.join(', ') || 'none (showing all)'}`);

  // Group by entity (country/region) and collect all data points
  const seriesMap = new Map<string, ChartDataPoint[]>();
  const entityCodes = new Map<string, string>(); // Store entity -> code mapping
  const allYears = new Set<number>();
  let yLabel = 'Value';

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    // Handle various entity field names
    const entity = record.Entity || record.entity || record.country || record.Country;
    // Handle various year field names
    const year = record.Year || record.year;
    // Get country code if available
    const code = record.Code || record.code || record.ISO || record.iso;

    // Skip entities not in the requested list (if we have a filter)
    if (typeof entity === 'string' && requestedEntities.length > 0) {
      if (!entityMatchesRequested(entity, requestedEntities)) {
        continue; // Skip this entity
      }
    }

    // Find the value field - it could be named anything (e.g., "Period life expectancy at birth")
    // Skip known non-value fields and find the numeric value
    let value: number | null = null;
    const skipFields = ['Entity', 'entity', 'Country', 'country', 'Year', 'year', 'Code', 'code', 'ISO', 'iso', 'time'];

    for (const [key, val] of Object.entries(record)) {
      if (!skipFields.includes(key) && typeof val === 'number') {
        value = val;
        // Use the field name as y-axis label (clean it up)
        if (yLabel === 'Value') {
          yLabel = key;
        }
        break;
      }
    }

    if (typeof entity === 'string' && typeof year === 'number') {
      if (!seriesMap.has(entity)) {
        seriesMap.set(entity, []);
      }
      seriesMap.get(entity)!.push({
        x: year,
        y: value
      });
      allYears.add(year);

      // Store code for map visualization
      if (typeof code === 'string') {
        entityCodes.set(entity, code);
      }
    }
  }

  if (seriesMap.size === 0) return undefined;

  // Determine if we should use map visualization
  const useMap = shouldUseMapVisualization(userMessage, seriesMap.size, allYears.size);
  console.log(`[Chart] Entities: ${seriesMap.size}, Years: ${allYears.size}, UseMap: ${useMap}`);

  if (useMap) {
    // Create map data - use most recent year's data
    const targetYear = Math.max(...allYears);
    const mapData: MapDataPoint[] = [];

    for (const [entity, points] of seriesMap) {
      // Find the value for target year
      const point = points.find(p => p.x === targetYear);
      if (point) {
        mapData.push({
          entity,
          code: entityCodes.get(entity),
          value: point.y
        });
      }
    }

    console.log(`[Chart] Map data points: ${mapData.length}, Year: ${targetYear}`);
    // Log some sample map data
    console.log(`[Chart] Sample map data:`, mapData.slice(0, 3));

    return {
      type: 'map',
      series: [], // Empty for map type
      mapData,
      year: targetYear,
      title: yLabel,
      yLabel
    };
  }

  // Convert to series array for line chart
  const series: ChartSeries[] = [];
  for (const [name, points] of seriesMap) {
    // Sort by year
    points.sort((a, b) => a.x - b.x);
    series.push({ name, data: points });
  }

  console.log(`[Chart] Final series count: ${series.length}, entities: ${series.map(s => s.name).join(', ')}`);

  // Use the indicator name (yLabel) as the chart title for clarity
  // This is better than using the truncated user message
  const title = yLabel;

  return {
    type: 'line',
    series,
    title,
    xLabel: 'Year',
    yLabel
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
