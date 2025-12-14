// data-tools.ts
// Tool definitions for all 5 economic data sources - EconChat M-1

export const allTools = [
  // ============ WORLD BANK TOOLS ============
  {
    name: "wb_list_countries",
    description: "List all countries available in World Bank data with their ISO codes and regions. Use this to find country codes.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: []
    }
  },
  {
    name: "wb_search_indicators",
    description: "Search World Bank indicators by keyword. Returns indicator codes and descriptions. Use this to find the right indicator code before fetching data. Common searches: 'gdp', 'population', 'poverty', 'education', 'health'",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g., 'gdp', 'poverty', 'population', 'education')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "wb_get_indicator_data",
    description: "Get World Bank indicator data for specific countries and years. Common indicators: NY.GDP.MKTP.CD (GDP current USD), NY.GDP.PCAP.CD (GDP per capita), SP.POP.TOTL (population), SI.POV.DDAY (poverty headcount), SE.ADT.LITR.ZS (literacy rate)",
    input_schema: {
      type: "object" as const,
      properties: {
        indicator: {
          type: "string",
          description: "Indicator code (e.g., 'NY.GDP.MKTP.CD' for GDP)"
        },
        countries: {
          type: "array",
          items: { type: "string" },
          description: "ISO3 country codes (e.g., ['NGA', 'EGY', 'SAU'])"
        },
        start_year: {
          type: "number",
          description: "Start year (e.g., 2015)"
        },
        end_year: {
          type: "number",
          description: "End year (e.g., 2023)"
        }
      },
      required: ["indicator", "countries"]
    }
  },

  // ============ IMF TOOLS ============
  {
    name: "imf_list_datasets",
    description: "List available IMF datasets. Key datasets: WEO (World Economic Outlook with forecasts), IFS (International Financial Statistics), DOT (Direction of Trade), BOP (Balance of Payments), GFS (Government Finance Statistics)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: []
    }
  },
  {
    name: "imf_get_weo_data",
    description: "Get IMF World Economic Outlook data - includes GDP forecasts, inflation, unemployment, fiscal indicators. This is THE source for macroeconomic forecasts. Key indicators: NGDP_RPCH (real GDP growth %), PCPIPCH (inflation %), LUR (unemployment %), GGXWDG_NGDP (govt debt % GDP), BCA_NGDPD (current account % GDP)",
    input_schema: {
      type: "object" as const,
      properties: {
        indicator: {
          type: "string",
          description: "WEO indicator: NGDP_RPCH (real GDP growth), PCPIPCH (inflation), LUR (unemployment), GGXWDG_NGDP (govt debt % GDP)"
        },
        countries: {
          type: "array",
          items: { type: "string" },
          description: "ISO3 country codes (e.g., ['ARG', 'BRA'])"
        },
        start_year: {
          type: "number",
          description: "Start year (e.g., 2020)"
        },
        end_year: {
          type: "number",
          description: "End year - can be future for forecasts (e.g., 2028)"
        }
      },
      required: ["indicator", "countries"]
    }
  },
  {
    name: "imf_list_countries",
    description: "List countries available in IMF data with their codes. Returns country codes that can be used with other IMF tools.",
    input_schema: {
      type: "object" as const,
      properties: {
        dataset: {
          type: "string",
          description: "Dataset to get countries for (e.g., 'IFS', 'DOT', 'BOP')"
        }
      },
      required: ["dataset"]
    }
  },

  // ============ FAO TOOLS ============
  {
    name: "fao_list_datasets",
    description: "List all FAO FAOSTAT datasets. Key domains: QCL (crops/livestock production), FBS (food balances), TP (trade), PP (producer prices), FS (food security), RL (land use), EM (emissions)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: []
    }
  },
  {
    name: "fao_search_items",
    description: "Search FAO items (crops, livestock, commodities) by name. Returns item codes for use in data queries.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g., 'wheat', 'rice', 'cattle', 'maize')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "fao_get_production_data",
    description: "Get agricultural production data from FAO - crop yields, livestock numbers, production quantities. Use for wheat, rice, maize, cattle, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        item: {
          type: "string",
          description: "Crop or livestock item (e.g., 'Wheat', 'Rice', 'Maize', 'Cattle')"
        },
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Country names (e.g., ['Egypt', 'Morocco'])"
        },
        element: {
          type: "string",
          enum: ["Production", "Area harvested", "Yield"],
          description: "What to measure: Production (tonnes), Area harvested (ha), Yield (kg/ha)"
        },
        start_year: { type: "number" },
        end_year: { type: "number" }
      },
      required: ["item", "countries", "element"]
    }
  },

  // ============ UN COMTRADE TOOLS ============
  {
    name: "comtrade_get_trade_data",
    description: "Get bilateral trade data - imports/exports between countries by commodity. Use for trade flow analysis. Commodity codes: TOTAL (all), 27 (mineral fuels/oil), 84 (machinery), 85 (electronics), 87 (vehicles)",
    input_schema: {
      type: "object" as const,
      properties: {
        reporter: {
          type: "string",
          description: "Reporting country name or code (e.g., 'Saudi Arabia', 'USA')"
        },
        partner: {
          type: "string",
          description: "Partner country name, or 'World' for all partners"
        },
        flow: {
          type: "string",
          enum: ["import", "export"],
          description: "Trade flow direction"
        },
        commodity: {
          type: "string",
          description: "HS commodity code or 'TOTAL'. Examples: '27' (mineral fuels), '84' (machinery), '85' (electronics)"
        },
        year: { type: "number" }
      },
      required: ["reporter", "flow", "year"]
    }
  },
  {
    name: "comtrade_get_top_partners",
    description: "Get top trading partners for a country - ranked by trade value. Great for answering 'who does X trade with most?'",
    input_schema: {
      type: "object" as const,
      properties: {
        country: {
          type: "string",
          description: "Country name (e.g., 'Saudi Arabia', 'Nigeria')"
        },
        flow: {
          type: "string",
          enum: ["import", "export"],
          description: "Trade flow: import or export"
        },
        year: { type: "number" },
        limit: {
          type: "number",
          description: "Number of top partners to return (default 10)"
        }
      },
      required: ["country", "flow", "year"]
    }
  },
  {
    name: "comtrade_get_reference_data",
    description: "Get reference data - country codes, commodity codes for UN Comtrade queries",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["countries", "commodities"],
          description: "Type of reference data"
        },
        search: {
          type: "string",
          description: "Optional search term to filter results"
        }
      },
      required: ["type"]
    }
  },

  // ============ OUR WORLD IN DATA TOOLS ============
  {
    name: "owid_search_charts",
    description: "Search Our World in Data charts by topic. Returns chart slugs that can be used to fetch data. Good for finding cross-domain indicators on topics like health, poverty, energy, climate.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g., 'life expectancy', 'poverty', 'co2 emissions', 'education')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "owid_get_chart_data",
    description: "Get data from an Our World in Data chart. Common charts: life-expectancy, gdp-per-capita-worldbank, share-of-population-in-extreme-poverty, human-development-index, co2-emissions-per-capita, literacy-rate-adult-total",
    input_schema: {
      type: "object" as const,
      properties: {
        chart_slug: {
          type: "string",
          description: "Chart identifier (e.g., 'life-expectancy', 'gdp-per-capita-worldbank')"
        },
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Country names (e.g., ['Japan', 'United States', 'Bangladesh'])"
        },
        start_year: { type: "number" },
        end_year: { type: "number" }
      },
      required: ["chart_slug"]
    }
  }
];

export type ToolName = typeof allTools[number]['name'];
