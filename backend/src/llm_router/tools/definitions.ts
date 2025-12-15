/**
 * Universal Tool Definitions for Economic Data Access
 *
 * These tool definitions are provider-agnostic and can be converted
 * to the specific format required by each LLM provider.
 */

import type { ToolDefinition } from '../types.js';

/**
 * Core economic data tools available to all LLM tiers
 */
export const ECON_TOOLS: ToolDefinition[] = [
  // World Bank Tools
  {
    name: 'wb_search_indicators',
    description: 'Search for World Bank indicator codes by keyword. Use this to find the right indicator code before fetching data.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term (e.g., "GDP growth", "inflation", "population")'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'wb_get_indicator',
    description: 'Fetch World Bank indicator data for a country. Common indicators: NY.GDP.MKTP.CD (GDP), SP.POP.TOTL (population), FP.CPI.TOTL.ZG (inflation)',
    parameters: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'ISO3 country code (e.g., NGA, USA, GBR, IND)'
        },
        indicator: {
          type: 'string',
          description: 'World Bank indicator code (e.g., NY.GDP.MKTP.CD)'
        },
        start_year: {
          type: 'integer',
          description: 'Start year for data range (e.g., 2010)'
        },
        end_year: {
          type: 'integer',
          description: 'End year for data range (e.g., 2023)'
        }
      },
      required: ['country', 'indicator']
    }
  },

  // IMF Tools
  {
    name: 'imf_get_weo_data',
    description: 'Fetch IMF World Economic Outlook data with forecasts. Key indicators: NGDP_RPCH (real GDP growth %), PCPIPCH (inflation %), LUR (unemployment %), BCA_NGDPD (current account % GDP)',
    parameters: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'ISO2 country code (e.g., NG, US, GB)'
        },
        indicator: {
          type: 'string',
          description: 'IMF WEO indicator code (e.g., NGDP_RPCH for GDP growth)'
        },
        start_year: {
          type: 'integer',
          description: 'Start year'
        },
        end_year: {
          type: 'integer',
          description: 'End year (can include forecast years up to 2029)'
        }
      },
      required: ['country', 'indicator']
    }
  },

  // FAO Tools
  {
    name: 'fao_get_production',
    description: 'Fetch agricultural production data from FAO. Includes crop production, yields, and livestock data.',
    parameters: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'Country name or ISO3 code'
        },
        item: {
          type: 'string',
          description: 'Product/crop name (e.g., Wheat, Rice, Maize, Cattle)'
        },
        element: {
          type: 'string',
          description: 'Data element: Production, Yield, Area harvested',
          enum: ['Production', 'Yield', 'Area harvested']
        },
        start_year: {
          type: 'integer',
          description: 'Start year'
        },
        end_year: {
          type: 'integer',
          description: 'End year'
        }
      },
      required: ['country', 'item']
    }
  },

  // UN Comtrade Tools
  {
    name: 'comtrade_get_trade_data',
    description: 'Fetch international trade data from UN Comtrade. Get export/import values by partner country.',
    parameters: {
      type: 'object',
      properties: {
        reporter: {
          type: 'string',
          description: 'Reporting country ISO3 code (e.g., NGA, USA)'
        },
        partner: {
          type: 'string',
          description: 'Partner country ISO3 code, or "World" for total'
        },
        flow: {
          type: 'string',
          description: 'Trade flow direction',
          enum: ['Export', 'Import', 'Both']
        },
        year: {
          type: 'integer',
          description: 'Year of trade data'
        }
      },
      required: ['reporter', 'year']
    }
  },
  {
    name: 'comtrade_get_top_partners',
    description: 'Get top trading partners for a country',
    parameters: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'Country ISO3 code'
        },
        flow: {
          type: 'string',
          description: 'Export or Import',
          enum: ['Export', 'Import']
        },
        year: {
          type: 'integer',
          description: 'Year of trade data'
        },
        limit: {
          type: 'integer',
          description: 'Number of top partners to return (default 10)'
        }
      },
      required: ['country', 'flow', 'year']
    }
  },

  // Our World in Data Tools
  {
    name: 'owid_get_chart_data',
    description: 'Fetch data from Our World in Data. Charts: life-expectancy, gdp-per-capita-worldbank, co2-emissions-per-capita, human-development-index, share-of-population-in-extreme-poverty',
    parameters: {
      type: 'object',
      properties: {
        chart_slug: {
          type: 'string',
          description: 'OWID chart identifier (e.g., life-expectancy, co2-emissions-per-capita)'
        },
        countries: {
          type: 'string',
          description: 'Comma-separated country names (e.g., "Nigeria,Ghana,Kenya")'
        },
        start_year: {
          type: 'integer',
          description: 'Start year'
        },
        end_year: {
          type: 'integer',
          description: 'End year'
        },
        for_map: {
          type: 'string',
          description: 'Set to "true" for world map data (all countries, single year)'
        }
      },
      required: ['chart_slug']
    }
  },
  {
    name: 'owid_search_charts',
    description: 'Search for available OWID chart slugs by topic',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term (e.g., "poverty", "health", "energy")'
        }
      },
      required: ['query']
    }
  }
];

/**
 * Convert tools to Anthropic format
 */
export function convertToolsForAnthropic(tools: ToolDefinition[]): Array<{
  name: string;
  description: string;
  input_schema: ToolDefinition['parameters'];
}> {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

/**
 * Convert tools to OpenAI/Groq format
 */
export function convertToolsForGroq(tools: ToolDefinition[]): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolDefinition['parameters'];
  };
}> {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * Convert tools to Google Gemini format
 */
export function convertToolsForGemini(tools: ToolDefinition[]): Array<{
  name: string;
  description: string;
  parameters: ToolDefinition['parameters'];
}> {
  // Gemini uses a similar format to the base definition
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

/**
 * Universal converter that routes to the right format
 */
export function convertToolsForProvider(
  tools: ToolDefinition[],
  provider: 'anthropic' | 'gemini' | 'groq'
): unknown[] {
  switch (provider) {
    case 'anthropic':
      return convertToolsForAnthropic(tools);
    case 'groq':
      return convertToolsForGroq(tools);
    case 'gemini':
      return convertToolsForGemini(tools);
    default:
      return tools;
  }
}

export default ECON_TOOLS;
