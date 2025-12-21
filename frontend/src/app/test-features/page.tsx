"use client";
/**
 * Test Page for MDB Enhancement Features
 * Tests Data Quality Badge and Citation Generator
 */

import { useState } from 'react';
import DataTable, { Column } from '../../components/DataTable';
import DataQualityBadge, { DataQualityMetadata } from '../../components/DataQualityBadge';
import ChartExport from '../../components/ChartExport';
import LineChart, { Series } from '../../components/LineChart';

// Sample data for testing
const sampleGDPData = [
  { year: 2019, value: 2.3, flag: 'A' },
  { year: 2020, value: -1.8, flag: 'A' },
  { year: 2021, value: 3.6, flag: 'A' },
  { year: 2022, value: 3.1, flag: 'E' },
  { year: 2023, value: 2.9, flag: 'E' },
  { year: 2024, value: 3.2, flag: 'F' },
  { year: 2025, value: 3.5, flag: 'F' },
];

const columns: Column[] = [
  { key: 'year', header: 'Year', type: 'year' },
  { key: 'value', header: 'GDP Growth (%)', type: 'percent', decimals: 1 },
];

// Chart series data (LineChart expects series[] directly, not wrapped in data object)
const chartSeries: Series[] = [
  {
    name: 'GDP Growth',
    data: sampleGDPData.map(d => ({ x: d.year, y: d.value })),
  },
];

// Sample quality metadata
const qualityMetadata: DataQualityMetadata = {
  source: 'worldbank',
  sourceType: 'official',
  indicatorCode: 'NY.GDP.MKTP.KD.ZG',
  indicatorName: 'GDP Growth (annual %)',
  lastUpdated: '2024-09-15',
  dataFrequency: 'annual',
  coverageStart: 1960,
  coverageEnd: 2023,
  countryCount: 217,
  qualityScore: 0.95,
};

export default function TestFeaturesPage() {
  const [citationResult, setCitationResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Test citation API
  const testCitationAPI = async (format: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/citations/generate?source=worldbank&indicator=GDP%20Growth&indicatorCode=NY.GDP.MKTP.KD.ZG&year=2023&format=${format}`
      );
      const data = await response.json();
      setCitationResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setCitationResult(`Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">
          MDB Enhancement Features Test Page
        </h1>
        <p className="text-gray-600">
          This page demonstrates the new Phase 1 features: Data Quality Indicators and Citation Generator.
        </p>

        {/* Section 1: Data Quality Badges */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">1. Data Quality Badges</h2>
          <p className="text-gray-600 mb-4">
            Badges show the quality/type of data source (Official, Estimate, Projection, Imputed):
          </p>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Official:</span>
              <DataQualityBadge
                metadata={{ ...qualityMetadata, sourceType: 'official' }}
                size="md"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Estimate:</span>
              <DataQualityBadge
                metadata={{ ...qualityMetadata, sourceType: 'estimate' }}
                size="md"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Projection:</span>
              <DataQualityBadge
                metadata={{ ...qualityMetadata, sourceType: 'projection' }}
                size="md"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Imputed:</span>
              <DataQualityBadge
                metadata={{ ...qualityMetadata, sourceType: 'imputed' }}
                size="md"
              />
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Hover over badges to see detailed metadata (coverage years, country count, quality score).
          </p>
        </section>

        {/* Section 2: DataTable with Quality Badge */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">2. DataTable with Quality Badge</h2>
          <p className="text-gray-600 mb-4">
            Tables can display quality badges when showQualityBadge is enabled:
          </p>

          <DataTable
            columns={columns}
            data={sampleGDPData}
            source="worldbank"
            title="Nigeria GDP Growth Rate"
            subtitle="Annual percentage growth rate of GDP at market prices"
            sourceAttribution="Source: World Bank World Development Indicators"
            showQualityBadge={true}
            qualityMetadata={qualityMetadata}
            highlightForecasts={true}
          />
        </section>

        {/* Section 3: Chart with Export & Citation */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">3. Chart with Export & Citation Dropdown</h2>
          <p className="text-gray-600 mb-4">
            Charts include an export dropdown with citation copy functionality:
          </p>

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">Nigeria GDP Growth (2019-2025)</h3>
                <p className="text-sm text-gray-500">Annual percentage change</p>
              </div>
              <ChartExport
                data={{
                  title: 'Nigeria GDP Growth',
                  source: 'World Bank',
                  indicator: 'GDP Growth (annual %)',
                  indicatorCode: 'NY.GDP.MKTP.KD.ZG',
                  country: 'Nigeria',
                  years: [2019, 2020, 2021, 2022, 2023],
                  values: [2.3, -1.8, 3.6, 3.1, 2.9],
                }}
                filename="nigeria-gdp-growth"
              />
            </div>
            <LineChart
              series={chartSeries}
              title=""
              yFormat="percent"
              height={300}
              showForecasts={true}
              forecastStartYear={2024}
            />
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Click the export button (↓) to see CSV, SVG, PNG, PDF export options and the Citation dropdown.
          </p>
        </section>

        {/* Section 4: Test Citation API */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">4. Test Citation API Directly</h2>
          <p className="text-gray-600 mb-4">
            Click a format to generate a citation via the backend API:
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {['apa', 'chicago', 'harvard', 'mla', 'bibtex', 'worldbank', 'imf'].map((format) => (
              <button
                key={format}
                onClick={() => testCitationAPI(format)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 uppercase text-sm font-medium"
              >
                {format}
              </button>
            ))}
          </div>

          {citationResult && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
              {citationResult}
            </pre>
          )}
        </section>

        {/* Section 5: API Endpoints Reference */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">5. API Endpoints Reference</h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-900">Citation APIs:</h3>
              <ul className="list-disc list-inside text-gray-600 ml-2">
                <li><code>GET /api/citations/formats</code> - List available formats</li>
                <li><code>GET /api/citations/generate?source=...&indicator=...&format=...</code> - Generate citation</li>
                <li><code>POST /api/citations/batch</code> - Generate multiple citations</li>
                <li><code>GET /api/citations/templates</code> - List citation templates</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Data Quality APIs:</h3>
              <ul className="list-disc list-inside text-gray-600 ml-2">
                <li><code>GET /api/data-quality/sources</code> - List data sources</li>
                <li><code>GET /api/data-quality/source-types</code> - List quality indicators</li>
                <li><code>GET /api/data-quality/:source/:indicator</code> - Get metadata</li>
                <li><code>GET /api/data-quality/batch?sources=...&indicators=...</code> - Batch lookup</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
