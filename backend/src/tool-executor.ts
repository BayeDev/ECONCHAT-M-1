// tool-executor.ts
// Executes tool calls against the actual APIs

import axios from 'axios';

// Country name to code mappings for UN Comtrade
const COMTRADE_COUNTRY_CODES: Record<string, number> = {
  'usa': 842, 'united states': 842, 'us': 842,
  'china': 156, 'chn': 156,
  'germany': 276, 'deu': 276,
  'japan': 392, 'jpn': 392,
  'united kingdom': 826, 'uk': 826, 'gbr': 826,
  'france': 251, 'fra': 251,
  'india': 356, 'ind': 356,
  'italy': 380, 'ita': 380,
  'brazil': 76, 'bra': 76,
  'canada': 124, 'can': 124,
  'south korea': 410, 'korea': 410, 'kor': 410,
  'russia': 643, 'rus': 643,
  'australia': 36, 'aus': 36,
  'spain': 724, 'esp': 724,
  'mexico': 484, 'mex': 484,
  'indonesia': 360, 'idn': 360,
  'netherlands': 528, 'nld': 528,
  'saudi arabia': 682, 'sau': 682,
  'turkey': 792, 'tur': 792,
  'switzerland': 756, 'che': 756,
  'nigeria': 566, 'nga': 566,
  'niger': 562, 'ner': 562,
  'south africa': 710, 'zaf': 710,
  'egypt': 818, 'egy': 818,
  'morocco': 504, 'mar': 504,
  'argentina': 32, 'arg': 32,
  'pakistan': 586, 'pak': 586,
  'bangladesh': 50, 'bgd': 50,
  'vietnam': 704, 'vnm': 704,
  'thailand': 764, 'tha': 764,
  'malaysia': 458, 'mys': 458,
  'singapore': 702, 'sgp': 702,
  'uae': 784, 'united arab emirates': 784, 'are': 784,
  'world': 0,
  // Additional codes for reverse lookup
  'areas n.e.s.': 899, 'areas nes': 899,
  'other asia nes': 490,
  'other europe nes': 697,
  'other africa nes': 699,
  'bunkers': 837, 'free zones': 838
};

// FAO country name mappings (FAO uses numeric area codes)
const FAO_COUNTRY_CODES: Record<string, number> = {
  'egypt': 59, 'morocco': 143, 'nigeria': 159, 'niger': 158, 'south africa': 202,
  'brazil': 21, 'argentina': 9, 'usa': 231, 'united states': 231,
  'china': 351, 'india': 100, 'indonesia': 101, 'pakistan': 165,
  'russia': 185, 'ukraine': 230, 'france': 68, 'germany': 79,
  'australia': 10, 'canada': 33, 'mexico': 138, 'japan': 110,
  'turkey': 223, 'iran': 102, 'thailand': 216, 'vietnam': 237,
  'bangladesh': 16, 'philippines': 171, 'ethiopia': 62, 'kenya': 114
};

// FAO item codes
const FAO_ITEM_CODES: Record<string, number> = {
  'wheat': 15, 'rice': 27, 'rice, paddy': 27, 'maize': 56, 'corn': 56,
  'barley': 44, 'sorghum': 83, 'millet': 79, 'oats': 75,
  'soybeans': 236, 'sugar cane': 156, 'cotton': 328, 'coffee': 656,
  'cocoa': 661, 'tea': 667, 'tobacco': 826, 'potatoes': 116,
  'tomatoes': 388, 'onions': 403, 'bananas': 486, 'oranges': 490,
  'apples': 515, 'grapes': 560,
  'cattle': 866, 'buffalo': 946, 'sheep': 976, 'goats': 1016,
  'pigs': 1034, 'chickens': 1057, 'ducks': 1068
};

// FAO element codes
const FAO_ELEMENT_CODES: Record<string, number> = {
  'production': 5510, 'area harvested': 5312, 'yield': 5419,
  'stocks': 5071, 'import quantity': 5610, 'export quantity': 5910
};

// OWID chart catalog
const OWID_CHARTS = [
  { slug: 'life-expectancy', name: 'Life expectancy at birth', topics: ['health', 'life', 'mortality', 'death'] },
  { slug: 'gdp-per-capita-worldbank', name: 'GDP per capita', topics: ['gdp', 'economy', 'income', 'wealth'] },
  { slug: 'share-of-population-in-extreme-poverty', name: 'Extreme poverty rate', topics: ['poverty', 'poor', 'income'] },
  { slug: 'human-development-index', name: 'Human Development Index', topics: ['hdi', 'development', 'living standards'] },
  { slug: 'co2-emissions-per-capita', name: 'CO2 emissions per capita', topics: ['co2', 'emissions', 'climate', 'carbon', 'environment'] },
  { slug: 'literacy-rate-adult-total', name: 'Literacy rate', topics: ['literacy', 'education', 'reading', 'writing'] },
  { slug: 'primary-energy-cons', name: 'Primary energy consumption', topics: ['energy', 'power', 'consumption'] },
  { slug: 'population', name: 'Population', topics: ['population', 'people', 'demographic', 'inhabitants'] },
  { slug: 'fertility-rate', name: 'Total fertility rate', topics: ['fertility', 'birth', 'children', 'births'] },
  { slug: 'infant-mortality', name: 'Infant mortality rate', topics: ['infant', 'mortality', 'child', 'death', 'baby'] },
  { slug: 'unemployment-rate', name: 'Unemployment rate', topics: ['unemployment', 'jobs', 'labor', 'work', 'employment'] },
  { slug: 'share-with-access-to-electricity', name: 'Access to electricity', topics: ['electricity', 'power', 'energy', 'electrification'] },
  { slug: 'maternal-mortality', name: 'Maternal mortality ratio', topics: ['maternal', 'mortality', 'pregnancy', 'mother'] },
  { slug: 'share-of-children-who-are-stunted', name: 'Child stunting', topics: ['stunting', 'nutrition', 'children', 'malnutrition', 'growth'] },
  { slug: 'gini-coefficient', name: 'Gini coefficient (inequality)', topics: ['gini', 'inequality', 'income distribution'] },
  { slug: 'inflation-of-consumer-prices', name: 'Consumer price inflation', topics: ['inflation', 'prices', 'cpi'] },
  { slug: 'government-expenditure-education-gdp', name: 'Education spending (% GDP)', topics: ['education', 'spending', 'government'] },
  { slug: 'military-expenditure-share-gdp', name: 'Military spending (% GDP)', topics: ['military', 'defense', 'spending'] },
  { slug: 'trade-as-share-of-gdp', name: 'Trade openness (% GDP)', topics: ['trade', 'exports', 'imports', 'openness'] }
];

function getComtradeCode(country: string): number | undefined {
  const key = country.toLowerCase().trim();
  return COMTRADE_COUNTRY_CODES[key];
}

// Reverse lookup: code to country name
const COMTRADE_CODE_TO_NAME: Record<number, string> = Object.entries(COMTRADE_COUNTRY_CODES)
  .filter(([name]) => name.length > 3) // Skip short codes
  .reduce((acc, [name, code]) => {
    // Capitalize properly
    const properName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (!acc[code]) acc[code] = properName;
    return acc;
  }, {} as Record<number, string>);

function getCountryNameFromCode(code: number): string {
  return COMTRADE_CODE_TO_NAME[code] || `Country (${code})`;
}

function getFaoCountryCode(country: string): number | undefined {
  const key = country.toLowerCase().trim();
  return FAO_COUNTRY_CODES[key];
}

export async function executeTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
  console.log(`Executing tool: ${toolName}`, JSON.stringify(params));

  try {
    // ============ WORLD BANK ============
    if (toolName === 'wb_list_countries') {
      const response = await axios.get(
        'https://api.worldbank.org/v2/country?format=json&per_page=300',
        { timeout: 15000 }
      );
      const countries = response.data[1] || [];
      return countries.slice(0, 100).map((c: Record<string, unknown>) => ({
        code: c.id,
        iso3: c.iso2Code,
        name: c.name,
        region: (c.region as Record<string, unknown>)?.value,
        incomeLevel: (c.incomeLevel as Record<string, unknown>)?.value
      }));
    }

    if (toolName === 'wb_search_indicators') {
      const query = params.query as string;
      const response = await axios.get(
        `https://api.worldbank.org/v2/indicator?format=json&per_page=100&source=2&search=${encodeURIComponent(query)}`,
        { timeout: 15000 }
      );
      const indicators = response.data[1] || [];
      return indicators.slice(0, 20).map((i: Record<string, unknown>) => ({
        code: i.id,
        name: i.name,
        description: ((i.sourceNote as string) || '').substring(0, 200)
      }));
    }

    if (toolName === 'wb_get_indicator_data') {
      const indicator = params.indicator as string;
      const countries = (params.countries as string[]).join(';');
      const startYear = params.start_year || 2000;
      const endYear = params.end_year || 2023;

      const response = await axios.get(
        `https://api.worldbank.org/v2/country/${countries}/indicator/${indicator}?format=json&per_page=1000&date=${startYear}:${endYear}`,
        { timeout: 20000 }
      );

      const data = response.data[1] || [];
      return data
        .filter((d: Record<string, unknown>) => d.value !== null)
        .map((d: Record<string, unknown>) => ({
          country: (d.country as Record<string, unknown>)?.value,
          countryCode: d.countryiso3code,
          year: parseInt(d.date as string),
          value: d.value,
          indicator: (d.indicator as Record<string, unknown>)?.value
        }))
        .sort((a: { year: number }, b: { year: number }) => a.year - b.year);
    }

    // ============ IMF ============
    if (toolName === 'imf_list_datasets') {
      return [
        { id: 'WEO', name: 'World Economic Outlook', description: 'GDP forecasts, inflation, unemployment, fiscal data' },
        { id: 'IFS', name: 'International Financial Statistics', description: 'Exchange rates, interest rates, monetary data' },
        { id: 'DOT', name: 'Direction of Trade Statistics', description: 'Bilateral trade flows' },
        { id: 'BOP', name: 'Balance of Payments', description: 'Current account, capital flows' },
        { id: 'GFS', name: 'Government Finance Statistics', description: 'Fiscal accounts, government debt' },
        { id: 'FSI', name: 'Financial Soundness Indicators', description: 'Banking sector health' }
      ];
    }

    if (toolName === 'imf_get_weo_data') {
      const indicator = params.indicator as string;
      const countries = (params.countries as string[]).join('+');
      const startYear = (params.start_year as number) || 2020;
      const endYear = (params.end_year as number) || 2028;

      const periods = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
      ).join(',');

      const response = await axios.get(
        `https://www.imf.org/external/datamapper/api/v1/${indicator}/${countries}?periods=${periods}`,
        { timeout: 20000 }
      );

      const results: Array<{ country: string; year: number; value: number; indicator: string }> = [];
      const data = response.data?.values?.[indicator];

      if (data) {
        for (const [country, values] of Object.entries(data)) {
          for (const [year, value] of Object.entries(values as Record<string, number>)) {
            if (value !== null && value !== undefined) {
              results.push({
                country,
                year: parseInt(year),
                value: value as number,
                indicator
              });
            }
          }
        }
      }

      return results.sort((a, b) => a.year - b.year);
    }

    if (toolName === 'imf_list_countries') {
      // Return common country codes for IMF
      return [
        { code: 'USA', name: 'United States' },
        { code: 'CHN', name: 'China' },
        { code: 'JPN', name: 'Japan' },
        { code: 'DEU', name: 'Germany' },
        { code: 'GBR', name: 'United Kingdom' },
        { code: 'FRA', name: 'France' },
        { code: 'IND', name: 'India' },
        { code: 'BRA', name: 'Brazil' },
        { code: 'ARG', name: 'Argentina' },
        { code: 'NGA', name: 'Nigeria' },
        { code: 'EGY', name: 'Egypt' },
        { code: 'SAU', name: 'Saudi Arabia' },
        { code: 'ZAF', name: 'South Africa' },
        { code: 'MEX', name: 'Mexico' },
        { code: 'IDN', name: 'Indonesia' },
        { code: 'TUR', name: 'Turkey' },
        { code: 'RUS', name: 'Russia' },
        { code: 'KOR', name: 'South Korea' },
        { code: 'PAK', name: 'Pakistan' },
        { code: 'BGD', name: 'Bangladesh' }
      ];
    }

    // ============ FAO ============
    if (toolName === 'fao_list_datasets') {
      // FAO API may be down, return static list
      return [
        { code: 'QCL', name: 'Crops and livestock products', description: 'Production, area, yield data' },
        { code: 'FBS', name: 'Food Balances', description: 'Food supply and utilization' },
        { code: 'TP', name: 'Trade', description: 'Agricultural trade data' },
        { code: 'PP', name: 'Producer Prices', description: 'Agricultural producer prices' },
        { code: 'FS', name: 'Food Security', description: 'Food security indicators' },
        { code: 'RL', name: 'Land Use', description: 'Agricultural land data' },
        { code: 'EM', name: 'Emissions', description: 'Agricultural emissions data' }
      ];
    }

    if (toolName === 'fao_search_items') {
      const query = (params.query as string).toLowerCase();
      const matches = Object.entries(FAO_ITEM_CODES)
        .filter(([name]) => name.includes(query))
        .map(([name, code]) => ({ name, code }));
      return matches;
    }

    if (toolName === 'fao_get_production_data') {
      const item = (params.item as string).toLowerCase();
      const countries = params.countries as string[];
      const element = (params.element as string).toLowerCase();
      const startYear = params.start_year || 2015;
      const endYear = params.end_year || 2023;

      const itemCode = FAO_ITEM_CODES[item];
      const elementCode = FAO_ELEMENT_CODES[element] || 5510;

      if (!itemCode) {
        return { error: `Item '${item}' not found. Try: wheat, rice, maize, cattle, etc.` };
      }

      // Get area codes for countries
      const areaCodes = countries
        .map(c => getFaoCountryCode(c))
        .filter(code => code !== undefined);

      if (areaCodes.length === 0) {
        return { error: `Countries not found in FAO database. Available: Egypt, Morocco, Nigeria, Brazil, USA, China, India, etc.` };
      }

      try {
        const response = await axios.get(
          `https://fenixservices.fao.org/faostat/api/v1/en/data/QCL`,
          {
            params: {
              area: areaCodes.join(','),
              item: itemCode,
              element: elementCode,
              year: `${startYear}:${endYear}`
            },
            timeout: 30000
          }
        );

        const data = response.data?.data || [];
        return data.map((d: Record<string, unknown>) => ({
          country: d.Area,
          year: d.Year,
          item: d.Item,
          element: d.Element,
          value: d.Value,
          unit: d.Unit
        }));
      } catch (error) {
        // FAO API often has issues, return helpful error
        return {
          error: 'FAO API is currently unavailable. The FAO FAOSTAT API experiences intermittent downtime.',
          suggestion: 'Try using World Bank or Our World in Data for agricultural indicators.'
        };
      }
    }

    // ============ UN COMTRADE ============
    if (toolName === 'comtrade_get_trade_data') {
      const reporter = params.reporter as string;
      const partner = params.partner as string | undefined;
      const flow = params.flow as string;
      const commodity = (params.commodity as string) || 'TOTAL';
      const year = params.year as number;

      const reporterCode = getComtradeCode(reporter);
      if (!reporterCode && reporterCode !== 0) {
        return { error: `Country '${reporter}' not found. Try: USA, China, Saudi Arabia, Nigeria, etc.` };
      }

      const partnerCode = partner ? getComtradeCode(partner) : undefined;
      const flowCode = flow === 'export' ? 'X' : 'M';

      let url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&flowCode=${flowCode}&cmdCode=${commodity}&period=${year}`;
      if (partnerCode !== undefined) {
        url += `&partnerCode=${partnerCode}`;
      }

      const response = await axios.get(url, { timeout: 30000 });
      const data = response.data?.data || [];

      return data.slice(0, 50).map((d: Record<string, unknown>) => ({
        reporter: d.reporterDesc,
        partner: d.partnerDesc,
        flow: d.flowDesc,
        commodity: d.cmdDesc,
        commodityCode: d.cmdCode,
        year: d.period,
        tradeValue: d.primaryValue,
        quantity: d.qty,
        unit: d.qtyUnitAbbr
      }));
    }

    if (toolName === 'comtrade_get_top_partners') {
      const country = params.country as string;
      const flow = params.flow as string;
      const year = params.year as number;
      const limit = (params.limit as number) || 10;

      const countryCode = getComtradeCode(country);
      if (!countryCode && countryCode !== 0) {
        return { error: `Country '${country}' not found. Try: USA, China, Saudi Arabia, Nigeria, etc.` };
      }

      const flowCode = flow === 'export' ? 'X' : 'M';
      const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${countryCode}&flowCode=${flowCode}&cmdCode=TOTAL&period=${year}`;

      const response = await axios.get(url, { timeout: 30000 });
      const data = response.data?.data || [];

      // Sort by trade value and return top partners
      const sorted = data
        .filter((d: Record<string, unknown>) => d.partnerCode !== 0) // Exclude 'World' total
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          (b.primaryValue as number) - (a.primaryValue as number)
        )
        .slice(0, limit);

      return sorted.map((d: Record<string, unknown>, i: number) => ({
        rank: i + 1,
        partner: d.partnerDesc || getCountryNameFromCode(d.partnerCode as number),
        partnerCode: d.partnerCode,
        tradeValue: d.primaryValue,
        year: d.period
      }));
    }

    if (toolName === 'comtrade_get_reference_data') {
      const type = params.type as string;
      const search = params.search as string | undefined;

      if (type === 'countries') {
        let countries = Object.entries(COMTRADE_COUNTRY_CODES)
          .filter(([name]) => name.length > 3) // Filter out short codes
          .map(([name, code]) => ({ name, code }));

        if (search) {
          const searchLower = search.toLowerCase();
          countries = countries.filter(c => c.name.includes(searchLower));
        }
        return countries;
      }

      if (type === 'commodities') {
        return [
          { code: 'TOTAL', name: 'All commodities' },
          { code: '01-05', name: 'Live animals, animal products' },
          { code: '06-15', name: 'Vegetable products, fats' },
          { code: '16-24', name: 'Foodstuffs, beverages, tobacco' },
          { code: '25-27', name: 'Mineral products' },
          { code: '27', name: 'Mineral fuels, oils' },
          { code: '28-38', name: 'Chemical products' },
          { code: '39-40', name: 'Plastics, rubber' },
          { code: '72-83', name: 'Base metals' },
          { code: '84', name: 'Machinery, mechanical appliances' },
          { code: '85', name: 'Electrical machinery, electronics' },
          { code: '87', name: 'Vehicles' },
          { code: '88-89', name: 'Aircraft, ships' }
        ];
      }

      return { error: 'Type must be "countries" or "commodities"' };
    }

    // ============ OUR WORLD IN DATA ============
    if (toolName === 'owid_search_charts') {
      const query = (params.query as string).toLowerCase();

      return OWID_CHARTS.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.topics.some(t => t.includes(query))
      );
    }

    if (toolName === 'owid_get_chart_data') {
      const chartSlug = params.chart_slug as string;
      const countries = params.countries as string[] | undefined;
      const startYear = params.start_year as number | undefined;
      const endYear = params.end_year as number | undefined;

      let url = `https://ourworldindata.org/grapher/${chartSlug}.csv`;

      const queryParams: string[] = [];
      if (countries?.length) {
        queryParams.push('csvType=filtered');
        queryParams.push(`country=${countries.map(c => '~' + c).join('')}`);
      }
      if (startYear && endYear) {
        queryParams.push(`time=${startYear}..${endYear}`);
      }
      if (queryParams.length) {
        url += '?' + queryParams.join('&');
      }

      const response = await axios.get(url, { timeout: 20000 });

      // Parse CSV
      const lines = (response.data as string).split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string | number> = {};
          headers.forEach((h, i) => {
            const val = values[i];
            // Try to parse as number
            const num = parseFloat(val);
            row[h] = isNaN(num) ? val : num;
          });
          return row;
        });

      return data.slice(0, 500);
    }

    throw new Error(`Unknown tool: ${toolName}`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return { error: 'Request timed out. The data source may be slow or unavailable.' };
      }
      if (error.response?.status === 404) {
        return { error: 'Data not found. Check parameters and try again.' };
      }
      if (error.response?.status === 521) {
        return { error: 'Data source temporarily unavailable (server down).' };
      }
      return { error: `API error: ${error.message}` };
    }
    throw error;
  }
}
