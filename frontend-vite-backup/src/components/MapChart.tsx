/**
 * EconChat - MapChart Component
 * Choropleth world map visualization using react-simple-maps
 */

import { memo, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';

// World TopoJSON from Natural Earth (hosted by react-simple-maps)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Country name to ISO code mapping (for matching data to map regions)
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'Afghanistan': 'AFG',
  'Albania': 'ALB',
  'Algeria': 'DZA',
  'Angola': 'AGO',
  'Argentina': 'ARG',
  'Armenia': 'ARM',
  'Australia': 'AUS',
  'Austria': 'AUT',
  'Azerbaijan': 'AZE',
  'Bangladesh': 'BGD',
  'Belarus': 'BLR',
  'Belgium': 'BEL',
  'Benin': 'BEN',
  'Bolivia': 'BOL',
  'Bosnia and Herzegovina': 'BIH',
  'Botswana': 'BWA',
  'Brazil': 'BRA',
  'Bulgaria': 'BGR',
  'Burkina Faso': 'BFA',
  'Burundi': 'BDI',
  'Cambodia': 'KHM',
  'Cameroon': 'CMR',
  'Canada': 'CAN',
  'Central African Republic': 'CAF',
  'Chad': 'TCD',
  'Chile': 'CHL',
  'China': 'CHN',
  'Colombia': 'COL',
  'Democratic Republic of Congo': 'COD',
  'Congo': 'COG',
  'Costa Rica': 'CRI',
  'Croatia': 'HRV',
  'Cuba': 'CUB',
  'Cyprus': 'CYP',
  'Czech Republic': 'CZE',
  'Czechia': 'CZE',
  'Denmark': 'DNK',
  'Dominican Republic': 'DOM',
  'Ecuador': 'ECU',
  'Egypt': 'EGY',
  'El Salvador': 'SLV',
  'Estonia': 'EST',
  'Ethiopia': 'ETH',
  'Finland': 'FIN',
  'France': 'FRA',
  'Gabon': 'GAB',
  'Georgia': 'GEO',
  'Germany': 'DEU',
  'Ghana': 'GHA',
  'Greece': 'GRC',
  'Guatemala': 'GTM',
  'Guinea': 'GIN',
  'Haiti': 'HTI',
  'Honduras': 'HND',
  'Hungary': 'HUN',
  'Iceland': 'ISL',
  'India': 'IND',
  'Indonesia': 'IDN',
  'Iran': 'IRN',
  'Iraq': 'IRQ',
  'Ireland': 'IRL',
  'Israel': 'ISR',
  'Italy': 'ITA',
  'Ivory Coast': 'CIV',
  "Cote d'Ivoire": 'CIV',
  'Jamaica': 'JAM',
  'Japan': 'JPN',
  'Jordan': 'JOR',
  'Kazakhstan': 'KAZ',
  'Kenya': 'KEN',
  'Kuwait': 'KWT',
  'Kyrgyzstan': 'KGZ',
  'Laos': 'LAO',
  'Latvia': 'LVA',
  'Lebanon': 'LBN',
  'Liberia': 'LBR',
  'Libya': 'LBY',
  'Lithuania': 'LTU',
  'Luxembourg': 'LUX',
  'Madagascar': 'MDG',
  'Malawi': 'MWI',
  'Malaysia': 'MYS',
  'Mali': 'MLI',
  'Mauritania': 'MRT',
  'Mexico': 'MEX',
  'Moldova': 'MDA',
  'Mongolia': 'MNG',
  'Morocco': 'MAR',
  'Mozambique': 'MOZ',
  'Myanmar': 'MMR',
  'Namibia': 'NAM',
  'Nepal': 'NPL',
  'Netherlands': 'NLD',
  'New Zealand': 'NZL',
  'Nicaragua': 'NIC',
  'Niger': 'NER',
  'Nigeria': 'NGA',
  'North Korea': 'PRK',
  'Norway': 'NOR',
  'Oman': 'OMN',
  'Pakistan': 'PAK',
  'Palestine': 'PSE',
  'Panama': 'PAN',
  'Papua New Guinea': 'PNG',
  'Paraguay': 'PRY',
  'Peru': 'PER',
  'Philippines': 'PHL',
  'Poland': 'POL',
  'Portugal': 'PRT',
  'Qatar': 'QAT',
  'Romania': 'ROU',
  'Russia': 'RUS',
  'Rwanda': 'RWA',
  'Saudi Arabia': 'SAU',
  'Senegal': 'SEN',
  'Serbia': 'SRB',
  'Sierra Leone': 'SLE',
  'Singapore': 'SGP',
  'Slovakia': 'SVK',
  'Slovenia': 'SVN',
  'Somalia': 'SOM',
  'South Africa': 'ZAF',
  'South Korea': 'KOR',
  'South Sudan': 'SSD',
  'Spain': 'ESP',
  'Sri Lanka': 'LKA',
  'Sudan': 'SDN',
  'Sweden': 'SWE',
  'Switzerland': 'CHE',
  'Syria': 'SYR',
  'Taiwan': 'TWN',
  'Tajikistan': 'TJK',
  'Tanzania': 'TZA',
  'Thailand': 'THA',
  'Togo': 'TGO',
  'Tunisia': 'TUN',
  'Turkey': 'TUR',
  'Turkmenistan': 'TKM',
  'Uganda': 'UGA',
  'Ukraine': 'UKR',
  'United Arab Emirates': 'ARE',
  'United Kingdom': 'GBR',
  'United States': 'USA',
  'United States of America': 'USA',
  'Uruguay': 'URY',
  'Uzbekistan': 'UZB',
  'Venezuela': 'VEN',
  'Vietnam': 'VNM',
  'Yemen': 'YEM',
  'Zambia': 'ZMB',
  'Zimbabwe': 'ZWE'
};

// ISO numeric to ISO alpha-3 mapping (for world-atlas TopoJSON)
// Complete list covering all countries in the world-atlas dataset
const ISO_NUM_TO_ALPHA: Record<string, string> = {
  '004': 'AFG', '008': 'ALB', '012': 'DZA', '016': 'ASM', '020': 'AND',
  '024': 'AGO', '028': 'ATG', '032': 'ARG', '051': 'ARM', '036': 'AUS',
  '040': 'AUT', '031': 'AZE', '044': 'BHS', '048': 'BHR', '050': 'BGD',
  '052': 'BRB', '112': 'BLR', '056': 'BEL', '084': 'BLZ', '204': 'BEN',
  '060': 'BMU', '064': 'BTN', '068': 'BOL', '070': 'BIH', '072': 'BWA',
  '076': 'BRA', '096': 'BRN', '100': 'BGR', '854': 'BFA', '108': 'BDI',
  '132': 'CPV', '116': 'KHM', '120': 'CMR', '124': 'CAN', '140': 'CAF',
  '148': 'TCD', '152': 'CHL', '156': 'CHN', '170': 'COL', '174': 'COM',
  '178': 'COG', '180': 'COD', '188': 'CRI', '191': 'HRV', '192': 'CUB',
  '196': 'CYP', '203': 'CZE', '208': 'DNK', '262': 'DJI', '212': 'DMA',
  '214': 'DOM', '218': 'ECU', '818': 'EGY', '222': 'SLV', '226': 'GNQ',
  '232': 'ERI', '233': 'EST', '748': 'SWZ', '231': 'ETH', '242': 'FJI',
  '246': 'FIN', '250': 'FRA', '266': 'GAB', '270': 'GMB', '268': 'GEO',
  '276': 'DEU', '288': 'GHA', '300': 'GRC', '308': 'GRD', '320': 'GTM',
  '324': 'GIN', '624': 'GNB', '328': 'GUY', '332': 'HTI', '340': 'HND',
  '344': 'HKG', '348': 'HUN', '352': 'ISL', '356': 'IND', '360': 'IDN',
  '364': 'IRN', '368': 'IRQ', '372': 'IRL', '376': 'ISR', '380': 'ITA',
  '384': 'CIV', '388': 'JAM', '392': 'JPN', '400': 'JOR', '398': 'KAZ',
  '404': 'KEN', '296': 'KIR', '408': 'PRK', '410': 'KOR', '414': 'KWT',
  '417': 'KGZ', '418': 'LAO', '428': 'LVA', '422': 'LBN', '426': 'LSO',
  '430': 'LBR', '434': 'LBY', '438': 'LIE', '440': 'LTU', '442': 'LUX',
  '450': 'MDG', '454': 'MWI', '458': 'MYS', '462': 'MDV', '466': 'MLI',
  '470': 'MLT', '584': 'MHL', '478': 'MRT', '480': 'MUS', '484': 'MEX',
  '583': 'FSM', '498': 'MDA', '492': 'MCO', '496': 'MNG', '499': 'MNE',
  '504': 'MAR', '508': 'MOZ', '104': 'MMR', '516': 'NAM', '520': 'NRU',
  '524': 'NPL', '528': 'NLD', '554': 'NZL', '558': 'NIC', '562': 'NER',
  '566': 'NGA', '807': 'MKD', '578': 'NOR', '512': 'OMN', '586': 'PAK',
  '585': 'PLW', '275': 'PSE', '591': 'PAN', '598': 'PNG', '600': 'PRY',
  '604': 'PER', '608': 'PHL', '616': 'POL', '620': 'PRT', '630': 'PRI',
  '634': 'QAT', '642': 'ROU', '643': 'RUS', '646': 'RWA', '659': 'KNA',
  '662': 'LCA', '670': 'VCT', '882': 'WSM', '674': 'SMR', '678': 'STP',
  '682': 'SAU', '686': 'SEN', '688': 'SRB', '690': 'SYC', '694': 'SLE',
  '702': 'SGP', '703': 'SVK', '705': 'SVN', '090': 'SLB', '706': 'SOM',
  '710': 'ZAF', '728': 'SSD', '724': 'ESP', '144': 'LKA', '729': 'SDN',
  '740': 'SUR', '752': 'SWE', '756': 'CHE', '760': 'SYR', '158': 'TWN',
  '762': 'TJK', '834': 'TZA', '764': 'THA', '626': 'TLS', '768': 'TGO',
  '776': 'TON', '780': 'TTO', '788': 'TUN', '792': 'TUR', '795': 'TKM',
  '798': 'TUV', '800': 'UGA', '804': 'UKR', '784': 'ARE', '826': 'GBR',
  '840': 'USA', '858': 'URY', '860': 'UZB', '548': 'VUT', '862': 'VEN',
  '704': 'VNM', '887': 'YEM', '894': 'ZMB', '716': 'ZWE',
  // Additional territories and special cases
  '304': 'GRL', '234': 'FRO', '831': 'GGY', '832': 'JEY', '833': 'IMN',
  '248': 'ALA', '535': 'BES', '531': 'CUW', '534': 'SXM', '663': 'MAF',
  '652': 'BLM', '744': 'SJM', '136': 'CYM', '660': 'AIA', '092': 'VGB',
  '796': 'TCA', '850': 'VIR', '474': 'MTQ', '312': 'GLP', '254': 'GUF',
  '638': 'REU', '175': 'MYT', '258': 'PYF', '540': 'NCL', '876': 'WLF',
  '580': 'MNP', '316': 'GUM', '574': 'NFK'
};

export interface MapDataPoint {
  entity: string;
  code?: string;
  value: number | null;
}

interface MapChartProps {
  data: MapDataPoint[];
  title?: string;
  year?: number;
  valueLabel?: string;
  sourceAttribution?: string;
}

// OWID-inspired color palette for choropleth
const COLOR_RANGE = [
  '#f7fbff',
  '#deebf7',
  '#c6dbef',
  '#9ecae1',
  '#6baed6',
  '#4292c6',
  '#2171b5',
  '#08519c',
  '#08306b'
];

const DEFAULT_COLOR = '#f5f5f5';
const STROKE_COLOR = '#ffffff';
const HOVER_COLOR = '#ffd700';

function MapChart({ data, title, year, valueLabel, sourceAttribution }: MapChartProps) {
  // Build a lookup map from ISO code to value
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();

    console.log('[MapChart] Processing data points:', data.length);

    for (const point of data) {
      if (point.value === null) continue;

      // Try to get ISO code from data or lookup by name
      let iso = point.code;
      if (!iso || iso.length !== 3) {
        iso = COUNTRY_NAME_TO_ISO[point.entity];
      }

      if (iso) {
        map.set(iso, point.value);
      } else {
        // Log entities we couldn't match
        console.log('[MapChart] No ISO code for:', point.entity, point.code);
      }
    }

    console.log('[MapChart] Mapped countries:', map.size);
    // Log a few sample entries
    const entries = Array.from(map.entries()).slice(0, 5);
    console.log('[MapChart] Sample entries:', entries);

    return map;
  }, [data]);

  // Create color scale based on data values
  const colorScale = useMemo(() => {
    const values = Array.from(dataMap.values()).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return () => DEFAULT_COLOR;

    return scaleQuantile<string>()
      .domain(values)
      .range(COLOR_RANGE);
  }, [dataMap]);

  // Format large numbers
  const formatValue = (value: number): string => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(1);
  };

  // Get legend values
  const legendValues = useMemo(() => {
    const values = Array.from(dataMap.values()).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = (max - min) / (COLOR_RANGE.length - 1);

    return COLOR_RANGE.map((color, i) => ({
      color,
      value: min + step * i
    }));
  }, [dataMap]);

  return (
    <div className="map-chart bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Title */}
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="chart-title text-lg font-semibold text-gray-800">
            {title}
            {year && <span className="text-gray-500 font-normal ml-2">({year})</span>}
          </h3>
        </div>
      )}

      {/* Map */}
      <div className="relative" style={{ height: 400 }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [0, 30]
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) => {
                // Log first few geographies to debug
                if (geographies.length > 0 && dataMap.size > 0) {
                  console.log('[MapChart] First geo ID:', geographies[0].id, 'type:', typeof geographies[0].id);
                  console.log('[MapChart] DataMap has', dataMap.size, 'entries');
                  // Check if USA (840) would match
                  const testNum = String(geographies.find(g => g.properties?.name === 'United States of America')?.id || '840').padStart(3, '0');
                  console.log('[MapChart] USA lookup test:', testNum, '->', ISO_NUM_TO_ALPHA[testNum], '-> has value:', dataMap.has(ISO_NUM_TO_ALPHA[testNum] || ''));
                }
                return geographies.map((geo) => {
                  // Get ISO alpha-3 code from numeric ID
                  // The TopoJSON uses string IDs like "840" for USA
                  // We need to pad to 3 digits for our lookup table
                  const isoNum = String(geo.id).padStart(3, '0');
                  const isoAlpha = ISO_NUM_TO_ALPHA[isoNum] || '';
                  const value = dataMap.get(isoAlpha);
                  const hasData = value !== undefined;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={hasData ? colorScale(value) : DEFAULT_COLOR}
                      stroke={STROKE_COLOR}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: hasData ? HOVER_COLOR : '#e0e0e0',
                          outline: 'none',
                          cursor: hasData ? 'pointer' : 'default'
                        },
                        pressed: { outline: 'none' }
                      }}
                      onMouseEnter={() => {
                        // Could add tooltip here
                      }}
                    />
                  );
                });
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        {legendValues.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">{valueLabel || 'Value'}</div>
            <div className="flex items-center gap-0.5">
              {legendValues.map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-6 h-3"
                    style={{ backgroundColor: item.color }}
                  />
                  {(i === 0 || i === legendValues.length - 1) && (
                    <span className="text-xs text-gray-600 mt-1">
                      {formatValue(item.value)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Source attribution */}
      {sourceAttribution && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          Source: {sourceAttribution}
        </div>
      )}
    </div>
  );
}

export default memo(MapChart);
