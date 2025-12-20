// tool-executor.ts
// Executes tool calls against the actual APIs

import axios from 'axios';

// Country name to code mappings for UN Comtrade (comprehensive)
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
  'bunkers': 837, 'free zones': 838,
  // Additional countries
  'belgium': 56, 'bel': 56,
  'jordan': 400, 'jor': 400,
  'austria': 40, 'aut': 40,
  'poland': 616, 'pol': 616,
  'sweden': 752, 'swe': 752,
  'norway': 578, 'nor': 578,
  'denmark': 208, 'dnk': 208,
  'finland': 246, 'fin': 246,
  'ireland': 372, 'irl': 372,
  'portugal': 620, 'prt': 620,
  'greece': 300, 'grc': 300,
  'czech republic': 203, 'czechia': 203, 'cze': 203,
  'hungary': 348, 'hun': 348,
  'romania': 642, 'rou': 642,
  'ukraine': 804, 'ukr': 804,
  'israel': 376, 'isr': 376,
  'kuwait': 414, 'kwt': 414,
  'qatar': 634, 'qat': 634,
  'bahrain': 48, 'bhr': 48,
  'oman': 512, 'omn': 512,
  'iraq': 368, 'irq': 368,
  'iran': 364, 'irn': 364,
  'new zealand': 554, 'nzl': 554,
  'chile': 152, 'chl': 152,
  'colombia': 170, 'col': 170,
  'peru': 604, 'per': 604,
  'venezuela': 862, 'ven': 862,
  'ecuador': 218, 'ecu': 218,
  'philippines': 608, 'phl': 608,
  'hong kong': 344, 'hkg': 344,
  'taiwan': 158, 'twn': 158,
  'kenya': 404, 'ken': 404,
  'ethiopia': 231, 'eth': 231,
  'ghana': 288, 'gha': 288,
  'tanzania': 834, 'tza': 834,
  'algeria': 12, 'dza': 12,
  'tunisia': 788, 'tun': 788,
  'libya': 434, 'lby': 434,
  'sudan': 736, 'sdn': 736,
  'angola': 24, 'ago': 24,
  'kazakhstan': 398, 'kaz': 398,
  'uzbekistan': 860, 'uzb': 860,
  'sri lanka': 144, 'lka': 144,
  'myanmar': 104, 'mmr': 104, 'burma': 104,
  'cambodia': 116, 'khm': 116,
  'laos': 418, 'lao': 418,
  'nepal': 524, 'npl': 524,
  'luxembourg': 442, 'lux': 442,
  'slovakia': 703, 'svk': 703,
  'slovenia': 705, 'svn': 705,
  'croatia': 191, 'hrv': 191,
  'serbia': 688, 'srb': 688,
  'bulgaria': 100, 'bgr': 100,
  'lithuania': 440, 'ltu': 440,
  'latvia': 428, 'lva': 428,
  'estonia': 233, 'est': 233,
  'cyprus': 196, 'cyp': 196,
  'malta': 470, 'mlt': 470,
  'iceland': 352, 'isl': 352
};

// Reverse lookup: code to country name (comprehensive)
const COMTRADE_CODE_TO_NAME: Record<number, string> = {
  0: 'World',
  12: 'Algeria',
  24: 'Angola',
  32: 'Argentina',
  36: 'Australia',
  40: 'Austria',
  48: 'Bahrain',
  50: 'Bangladesh',
  56: 'Belgium',
  76: 'Brazil',
  100: 'Bulgaria',
  104: 'Myanmar',
  116: 'Cambodia',
  124: 'Canada',
  144: 'Sri Lanka',
  152: 'Chile',
  156: 'China',
  158: 'Taiwan',
  170: 'Colombia',
  191: 'Croatia',
  196: 'Cyprus',
  203: 'Czech Republic',
  208: 'Denmark',
  218: 'Ecuador',
  231: 'Ethiopia',
  233: 'Estonia',
  246: 'Finland',
  251: 'France',
  276: 'Germany',
  288: 'Ghana',
  300: 'Greece',
  344: 'Hong Kong',
  348: 'Hungary',
  352: 'Iceland',
  356: 'India',
  360: 'Indonesia',
  364: 'Iran',
  368: 'Iraq',
  372: 'Ireland',
  376: 'Israel',
  380: 'Italy',
  392: 'Japan',
  398: 'Kazakhstan',
  400: 'Jordan',
  404: 'Kenya',
  410: 'South Korea',
  414: 'Kuwait',
  418: 'Laos',
  428: 'Latvia',
  434: 'Libya',
  440: 'Lithuania',
  442: 'Luxembourg',
  458: 'Malaysia',
  470: 'Malta',
  484: 'Mexico',
  504: 'Morocco',
  512: 'Oman',
  524: 'Nepal',
  528: 'Netherlands',
  554: 'New Zealand',
  562: 'Niger',
  566: 'Nigeria',
  578: 'Norway',
  586: 'Pakistan',
  604: 'Peru',
  608: 'Philippines',
  616: 'Poland',
  620: 'Portugal',
  634: 'Qatar',
  642: 'Romania',
  643: 'Russia',
  682: 'Saudi Arabia',
  688: 'Serbia',
  702: 'Singapore',
  703: 'Slovakia',
  705: 'Slovenia',
  710: 'South Africa',
  724: 'Spain',
  736: 'Sudan',
  752: 'Sweden',
  756: 'Switzerland',
  764: 'Thailand',
  784: 'United Arab Emirates',
  788: 'Tunisia',
  792: 'Turkey',
  804: 'Ukraine',
  818: 'Egypt',
  826: 'United Kingdom',
  834: 'Tanzania',
  842: 'United States',
  860: 'Uzbekistan',
  862: 'Venezuela',
  704: 'Vietnam',
  // Special areas
  490: 'Other Asia N.E.S.',
  697: 'Other Europe N.E.S.',
  699: 'Other Africa N.E.S.',
  837: 'Bunkers',
  838: 'Free Zones',
  899: 'Areas N.E.S.'
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

// OWID chart catalog - EXPANDED with democracy, governance, and more topics
const OWID_CHARTS = [
  // Health & Demographics
  { slug: 'life-expectancy', name: 'Life expectancy at birth', topics: ['health', 'life', 'mortality', 'death', 'lifespan', 'longevity'] },
  { slug: 'population', name: 'Population', topics: ['population', 'people', 'demographic', 'inhabitants'] },
  { slug: 'fertility-rate', name: 'Total fertility rate', topics: ['fertility', 'birth', 'children', 'births'] },
  { slug: 'infant-mortality', name: 'Infant mortality rate', topics: ['infant', 'mortality', 'child', 'death', 'baby'] },
  { slug: 'maternal-mortality', name: 'Maternal mortality ratio', topics: ['maternal', 'mortality', 'pregnancy', 'mother'] },
  { slug: 'share-of-children-who-are-stunted', name: 'Child stunting', topics: ['stunting', 'nutrition', 'children', 'malnutrition', 'growth'] },

  // Economy
  { slug: 'gdp-per-capita-worldbank', name: 'GDP per capita', topics: ['gdp', 'economy', 'income', 'wealth'] },
  { slug: 'share-of-population-in-extreme-poverty', name: 'Extreme poverty rate', topics: ['poverty', 'poor', 'income'] },
  { slug: 'human-development-index', name: 'Human Development Index', topics: ['hdi', 'development', 'living standards'] },
  { slug: 'gini-coefficient', name: 'Gini coefficient (inequality)', topics: ['gini', 'inequality', 'income distribution'] },
  { slug: 'unemployment-rate', name: 'Unemployment rate', topics: ['unemployment', 'jobs', 'labor', 'work', 'employment'] },
  { slug: 'inflation-of-consumer-prices', name: 'Consumer price inflation', topics: ['inflation', 'prices', 'cpi'] },
  { slug: 'trade-as-share-of-gdp', name: 'Trade openness (% GDP)', topics: ['trade', 'exports', 'imports', 'openness'] },

  // Democracy & Governance (EXPANDED)
  { slug: 'democracy-index-eiu', name: 'Democracy Index (EIU)', topics: ['democracy', 'democratic', 'governance', 'political', 'freedom', 'elections', 'voting', 'autocracy', 'eiu'] },
  { slug: 'electoral-democracy-index', name: 'Electoral Democracy Index (V-Dem)', topics: ['democracy', 'electoral', 'elections', 'voting', 'democratic', 'vdem'] },
  { slug: 'liberal-democracy-index', name: 'Liberal Democracy Index (V-Dem)', topics: ['democracy', 'liberal', 'freedom', 'rights', 'vdem'] },
  { slug: 'political-regime', name: 'Political Regime Type', topics: ['regime', 'political', 'autocracy', 'democracy', 'government'] },
  { slug: 'human-rights-index-vdem', name: 'Human Rights Index', topics: ['human rights', 'rights', 'civil liberties', 'freedom'] },
  { slug: 'civil-liberties-index', name: 'Civil Liberties Index', topics: ['civil liberties', 'freedom', 'rights'] },
  { slug: 'freedom-of-expression', name: 'Freedom of Expression Index', topics: ['freedom', 'expression', 'speech', 'press', 'media'] },
  { slug: 'rule-of-law-index', name: 'Rule of Law Index', topics: ['rule of law', 'law', 'justice', 'legal', 'governance'] },
  { slug: 'corruption-perception-index', name: 'Corruption Perception Index', topics: ['corruption', 'transparency', 'governance', 'bribery'] },
  { slug: 'press-freedom-index', name: 'Press Freedom Index', topics: ['press', 'media', 'freedom', 'journalism', 'news'] },

  // Education
  { slug: 'literacy-rate-adult-total', name: 'Literacy rate', topics: ['literacy', 'education', 'reading', 'writing'] },
  { slug: 'government-expenditure-education-gdp', name: 'Education spending (% GDP)', topics: ['education', 'spending', 'government', 'schools'] },
  { slug: 'mean-years-of-schooling', name: 'Mean years of schooling', topics: ['education', 'schooling', 'years', 'attainment'] },
  { slug: 'primary-school-enrollment', name: 'Primary school enrollment', topics: ['education', 'primary', 'school', 'enrollment', 'children'] },
  { slug: 'secondary-school-enrollment', name: 'Secondary school enrollment', topics: ['education', 'secondary', 'school', 'enrollment'] },
  { slug: 'tertiary-school-enrollment', name: 'Tertiary school enrollment', topics: ['education', 'tertiary', 'university', 'higher education', 'college'] },

  // Energy & Environment
  { slug: 'co2-emissions-per-capita', name: 'CO2 emissions per capita', topics: ['co2', 'emissions', 'climate', 'carbon', 'environment'] },
  { slug: 'primary-energy-cons', name: 'Primary energy consumption', topics: ['energy', 'power', 'consumption'] },
  { slug: 'share-with-access-to-electricity', name: 'Access to electricity', topics: ['electricity', 'power', 'energy', 'electrification'] },
  { slug: 'share-electricity-renewables', name: 'Renewable electricity share', topics: ['renewable', 'electricity', 'solar', 'wind', 'clean'] },
  { slug: 'forest-area-share', name: 'Forest area (% of land)', topics: ['forest', 'deforestation', 'trees', 'land', 'environment'] },

  // Military & Security
  { slug: 'military-expenditure-share-gdp', name: 'Military spending (% GDP)', topics: ['military', 'defense', 'spending', 'army', 'armed forces'] },

  // Internet & Technology
  { slug: 'share-of-individuals-using-the-internet', name: 'Internet users (% population)', topics: ['internet', 'digital', 'technology', 'online', 'connectivity'] },
  { slug: 'mobile-cellular-subscriptions-per-100-people', name: 'Mobile subscriptions per 100', topics: ['mobile', 'phone', 'cellular', 'telecom'] }
];

// World Bank curated indicator catalog (WB API search is unreliable)
const WB_INDICATORS_CATALOG = [
  // Logistics & Infrastructure
  { code: 'LP.LPI.OVRL.XQ', name: 'Logistics Performance Index: Overall', topics: ['logistics', 'infrastructure', 'transport', 'trade'] },
  { code: 'LP.LPI.INFR.XQ', name: 'LPI: Quality of trade and transport infrastructure', topics: ['logistics', 'infrastructure', 'transport', 'road', 'port'] },
  { code: 'LP.LPI.CUST.XQ', name: 'LPI: Customs clearance efficiency', topics: ['logistics', 'customs', 'trade'] },
  { code: 'LP.LPI.LOGS.XQ', name: 'LPI: Logistics services quality', topics: ['logistics', 'services'] },
  { code: 'LP.LPI.TIME.XQ', name: 'LPI: Timeliness of shipments', topics: ['logistics', 'shipping', 'delivery'] },
  { code: 'LP.LPI.TRAC.XQ', name: 'LPI: Tracking and tracing', topics: ['logistics', 'tracking'] },
  { code: 'LP.LPI.ITRN.XQ', name: 'LPI: International shipments', topics: ['logistics', 'shipping', 'international'] },
  { code: 'LP.EXP.DURS.MD', name: 'Lead time to export (median days)', topics: ['export', 'trade', 'logistics'] },
  { code: 'LP.IMP.DURS.MD', name: 'Lead time to import (median days)', topics: ['import', 'trade', 'logistics'] },

  // Transport Infrastructure
  { code: 'IS.RRS.TOTL.KM', name: 'Rail lines (total route-km)', topics: ['rail', 'railway', 'transport', 'infrastructure'] },
  { code: 'IS.RRS.GOOD.MT.K6', name: 'Railways goods transported (million ton-km)', topics: ['rail', 'freight', 'transport'] },
  { code: 'IS.RRS.PASG.KM', name: 'Railways passengers (million passenger-km)', topics: ['rail', 'passenger', 'transport'] },
  { code: 'IS.AIR.PSGR', name: 'Air transport passengers carried', topics: ['air', 'aviation', 'transport', 'passengers'] },
  { code: 'IS.AIR.GOOD.MT.K1', name: 'Air transport freight (million ton-km)', topics: ['air', 'aviation', 'freight', 'cargo'] },
  { code: 'IS.AIR.DPRT', name: 'Air transport registered carrier departures', topics: ['air', 'aviation', 'flights'] },
  { code: 'IS.SHP.GOOD.TU', name: 'Container port traffic (TEU)', topics: ['port', 'shipping', 'container', 'maritime', 'trade'] },
  { code: 'IS.SHP.GCNW.XQ', name: 'Liner shipping connectivity index', topics: ['shipping', 'maritime', 'connectivity', 'port'] },
  { code: 'SH.STA.TRAF.P5', name: 'Road traffic deaths (per 100,000)', topics: ['road', 'traffic', 'safety', 'mortality'] },

  // Economy - GDP
  { code: 'NY.GDP.MKTP.CD', name: 'GDP (current US$)', topics: ['gdp', 'economy', 'output'] },
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', topics: ['gdp', 'growth', 'economy'] },
  { code: 'NY.GDP.PCAP.CD', name: 'GDP per capita (current US$)', topics: ['gdp', 'per capita', 'income'] },
  { code: 'NY.GDP.PCAP.PP.CD', name: 'GDP per capita, PPP (current international $)', topics: ['gdp', 'per capita', 'ppp'] },

  // Trade
  { code: 'NE.EXP.GNFS.ZS', name: 'Exports of goods and services (% of GDP)', topics: ['exports', 'trade'] },
  { code: 'NE.IMP.GNFS.ZS', name: 'Imports of goods and services (% of GDP)', topics: ['imports', 'trade'] },
  { code: 'TG.VAL.TOTL.GD.ZS', name: 'Merchandise trade (% of GDP)', topics: ['trade', 'merchandise'] },
  { code: 'BX.GSR.TRAN.ZS', name: 'Transport services (% of service exports)', topics: ['transport', 'services', 'exports'] },
  { code: 'BM.GSR.TRAN.ZS', name: 'Transport services (% of service imports)', topics: ['transport', 'services', 'imports'] },

  // Population & Demographics
  { code: 'SP.POP.TOTL', name: 'Population, total', topics: ['population', 'demographic'] },
  { code: 'SP.POP.GROW', name: 'Population growth (annual %)', topics: ['population', 'growth'] },
  { code: 'SP.URB.TOTL.IN.ZS', name: 'Urban population (% of total)', topics: ['urban', 'population', 'city'] },
  { code: 'SP.DYN.LE00.IN', name: 'Life expectancy at birth', topics: ['life expectancy', 'health', 'mortality'] },

  // Employment & Labor
  { code: 'SL.UEM.TOTL.ZS', name: 'Unemployment (% of total labor force)', topics: ['unemployment', 'labor', 'jobs'] },
  { code: 'SL.TLF.TOTL.IN', name: 'Labor force, total', topics: ['labor', 'workforce', 'employment'] },

  // Poverty & Inequality
  { code: 'SI.POV.DDAY', name: 'Poverty headcount ratio at $2.15/day', topics: ['poverty', 'poor'] },
  { code: 'SI.POV.GINI', name: 'Gini index', topics: ['inequality', 'gini', 'income distribution'] },

  // Education
  { code: 'SE.ADT.LITR.ZS', name: 'Literacy rate, adult total (%)', topics: ['literacy', 'education'] },
  { code: 'SE.XPD.TOTL.GD.ZS', name: 'Government expenditure on education (% of GDP)', topics: ['education', 'spending', 'government'] },
  { code: 'SE.PRM.ENRR', name: 'School enrollment, primary (% gross)', topics: ['education', 'school', 'primary'] },

  // Health
  { code: 'SH.XPD.CHEX.GD.ZS', name: 'Current health expenditure (% of GDP)', topics: ['health', 'spending', 'healthcare'] },
  { code: 'SH.DYN.MORT', name: 'Mortality rate, under-5 (per 1,000)', topics: ['mortality', 'child', 'health'] },

  // Energy & Environment
  { code: 'EG.USE.ELEC.KH.PC', name: 'Electric power consumption (kWh per capita)', topics: ['electricity', 'energy', 'power'] },
  { code: 'EG.ELC.ACCS.ZS', name: 'Access to electricity (% of population)', topics: ['electricity', 'energy', 'access'] },
  { code: 'EN.ATM.CO2E.PC', name: 'CO2 emissions (metric tons per capita)', topics: ['co2', 'emissions', 'climate', 'environment'] },

  // Technology
  { code: 'IT.NET.USER.ZS', name: 'Individuals using the Internet (% of population)', topics: ['internet', 'digital', 'technology'] },
  { code: 'IT.CEL.SETS.P2', name: 'Mobile cellular subscriptions (per 100 people)', topics: ['mobile', 'phone', 'telecom'] },

  // Finance
  { code: 'FP.CPI.TOTL.ZG', name: 'Inflation, consumer prices (annual %)', topics: ['inflation', 'prices', 'cpi'] },
  { code: 'FR.INR.RINR', name: 'Real interest rate (%)', topics: ['interest rate', 'finance'] },
  { code: 'PA.NUS.FCRF', name: 'Official exchange rate (LCU per US$)', topics: ['exchange rate', 'currency', 'forex'] },

  // Agriculture
  { code: 'AG.LND.AGRI.ZS', name: 'Agricultural land (% of land area)', topics: ['agriculture', 'land', 'farming'] },
  { code: 'NV.AGR.TOTL.ZS', name: 'Agriculture value added (% of GDP)', topics: ['agriculture', 'gdp', 'farming'] },

  // Business Environment
  { code: 'IC.BUS.EASE.XQ', name: 'Ease of doing business score', topics: ['business', 'ease', 'regulation'] },
  { code: 'IC.REG.DURS', name: 'Time required to start a business (days)', topics: ['business', 'startup', 'registration'] },
];

function getComtradeCode(country: string): number | undefined {
  const key = country.toLowerCase().trim();
  return COMTRADE_COUNTRY_CODES[key];
}

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
      const query = (params.query as string).toLowerCase();
      const queryTerms = query.split(/\s+/);

      // First, search our curated catalog (more reliable than WB API search)
      const catalogMatches = WB_INDICATORS_CATALOG.filter(ind => {
        const nameMatch = ind.name.toLowerCase().includes(query);
        const topicMatch = ind.topics.some(t =>
          queryTerms.some(term => t.includes(term) || term.includes(t))
        );
        return nameMatch || topicMatch;
      }).map(ind => ({
        code: ind.code,
        name: ind.name,
        description: `Topics: ${ind.topics.join(', ')}`
      }));

      // If catalog has good matches, return those
      if (catalogMatches.length >= 3) {
        console.log(`[WB] Found ${catalogMatches.length} indicators from curated catalog for "${query}"`);
        return catalogMatches.slice(0, 15);
      }

      // Also try the WB API search as fallback
      try {
        const response = await axios.get(
          `https://api.worldbank.org/v2/indicator?format=json&per_page=100&source=2&search=${encodeURIComponent(query)}`,
          { timeout: 15000 }
        );
        const apiIndicators = (response.data[1] || []).slice(0, 10).map((i: Record<string, unknown>) => ({
          code: i.id,
          name: i.name,
          description: ((i.sourceNote as string) || '').substring(0, 200)
        }));

        // Combine catalog and API results, catalog first
        const combined = [...catalogMatches];
        for (const api of apiIndicators) {
          if (!combined.some(c => c.code === api.code)) {
            combined.push(api);
          }
        }

        console.log(`[WB] Returning ${combined.length} indicators (${catalogMatches.length} catalog + ${apiIndicators.length} API) for "${query}"`);
        return combined.slice(0, 20);
      } catch (apiErr) {
        // If API fails, just return catalog matches
        console.log(`[WB] API search failed, returning ${catalogMatches.length} catalog matches`);
        return catalogMatches;
      }
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
      const forMap = params.for_map as boolean | undefined;

      // Continent names that need special handling
      const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
      const INCOME_GROUPS = ['World', 'High-income countries', 'Low-income countries', 'Middle-income countries', 'European Union'];

      // Check if any requested "countries" are actually continents or regions
      const requestedContinents = countries?.filter(c =>
        CONTINENTS.some(cont => cont.toLowerCase() === c.toLowerCase())
      ) || [];
      const requestedIncomeGroups = countries?.filter(c =>
        INCOME_GROUPS.some(ig => ig.toLowerCase() === c.toLowerCase())
      ) || [];
      const actualCountries = countries?.filter(c =>
        !CONTINENTS.some(cont => cont.toLowerCase() === c.toLowerCase()) &&
        !INCOME_GROUPS.some(ig => ig.toLowerCase() === c.toLowerCase())
      ) || [];

      // Always fetch full CSV and filter locally for best results
      let url = `https://ourworldindata.org/grapher/${chartSlug}.csv`;

      // Only try to use API filtering if we have actual country names (not continents)
      if (actualCountries.length > 0 && requestedContinents.length === 0 && requestedIncomeGroups.length === 0) {
        url += `?csvType=filtered&country=${actualCountries.map(c => '~' + c).join('')}`;
      }

      console.log(`[OWID] Fetching: ${url}`);
      console.log(`[OWID] Requested continents: ${requestedContinents.join(', ') || 'none'}`);
      console.log(`[OWID] Requested countries: ${actualCountries.join(', ') || 'none'}`);

      const response = await axios.get(url, { timeout: 30000 });

      // Parse CSV
      const lines = (response.data as string).split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      let data = lines.slice(1)
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

      // Filter by continent if continents were requested
      // OWID data often has "World region according to OWID" column
      if (requestedContinents.length > 0) {
        const regionColumn = headers.find(h => h.toLowerCase().includes('world region') || h.toLowerCase().includes('region'));
        if (regionColumn) {
          console.log(`[OWID] Filtering by continent using column: ${regionColumn}`);
          data = data.filter(r => {
            const region = String(r[regionColumn] || '').toLowerCase();
            return requestedContinents.some(cont => region.includes(cont.toLowerCase()));
          });
          console.log(`[OWID] After continent filter: ${data.length} records`);
        } else {
          console.log(`[OWID] No region column found in data, cannot filter by continent`);
        }
      }

      // Filter by income group if requested
      if (requestedIncomeGroups.length > 0) {
        // For income groups, filter by Entity name
        data = data.filter(r => {
          const entity = String(r.Entity || r.entity || '').toLowerCase();
          return requestedIncomeGroups.some(ig => entity.includes(ig.toLowerCase()) || ig.toLowerCase().includes(entity));
        });
        console.log(`[OWID] After income group filter: ${data.length} records`);
      }

      // For map visualization: filter to most recent year, return one record per country
      if (forMap && !countries?.length) {
        // Find the target year (specified or most recent available)
        const targetYear = endYear || startYear || Math.max(...data.map(r => r.Year as number).filter(y => !isNaN(y)));
        console.log(`[OWID] Map mode - filtering to year: ${targetYear}`);

        // Filter to just the target year
        data = data.filter(r => r.Year === targetYear);
        console.log(`[OWID] After year filter: ${data.length} records`);

        // Return all countries for the map (no arbitrary limit)
        return data;
      }

      // For time series queries with year range filter
      if (startYear || endYear) {
        const minYear = startYear || 0;
        const maxYear = endYear || 9999;
        data = data.filter(r => {
          const year = r.Year as number;
          return year >= minYear && year <= maxYear;
        });
      }

      // For time series, limit to 500 records
      console.log(`[OWID] Parsed ${data.length} records, returning ${Math.min(data.length, 500)}`);
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
