/**
 * Data Quality API Routes
 * Endpoints for retrieving data quality metadata for indicators
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { dataQualityMetadata } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

const router = Router();

// No authentication required for data quality metadata (public read-only)

/**
 * GET /api/data-quality/:source/:indicator
 * Get data quality metadata for a specific source/indicator combination
 */
router.get('/:source/:indicator', async (req: Request, res: Response) => {
  try {
    const { source, indicator } = req.params;

    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const metadata = await db.query.dataQualityMetadata.findFirst({
      where: and(
        eq(dataQualityMetadata.source, source.toLowerCase()),
        eq(dataQualityMetadata.indicatorCode, indicator)
      ),
    });

    if (!metadata) {
      // Return default metadata if not found in database
      return res.json({
        source: source.toLowerCase(),
        indicatorCode: indicator,
        sourceType: 'official',
        dataFrequency: 'annual',
        qualityScore: null,
        lastUpdated: null,
        coverageStart: null,
        coverageEnd: null,
        countryCount: null,
        methodology: null,
        sourceUrl: getDefaultSourceUrl(source.toLowerCase()),
        _isDefault: true,
      });
    }

    res.json(metadata);
  } catch (error) {
    console.error('[DataQuality] Error getting metadata:', error);
    res.status(500).json({ error: 'Failed to get data quality metadata' });
  }
});

/**
 * GET /api/data-quality/batch
 * Get data quality metadata for multiple indicators at once
 * Query params: sources (comma-separated), indicators (comma-separated)
 */
router.get('/batch', async (req: Request, res: Response) => {
  try {
    const { sources, indicators } = req.query;

    if (!sources && !indicators) {
      return res.status(400).json({ error: 'At least one of sources or indicators is required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    let query = db.select().from(dataQualityMetadata);

    // Build conditions
    const conditions = [];

    if (sources) {
      const sourceList = (sources as string).split(',').map(s => s.trim().toLowerCase());
      conditions.push(inArray(dataQualityMetadata.source, sourceList));
    }

    if (indicators) {
      const indicatorList = (indicators as string).split(',').map(i => i.trim());
      conditions.push(inArray(dataQualityMetadata.indicatorCode, indicatorList));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    // Return as a map for easy lookup
    const metadataMap: Record<string, any> = {};
    for (const meta of results) {
      const key = `${meta.source}:${meta.indicatorCode}`;
      metadataMap[key] = meta;
    }

    res.json({
      count: results.length,
      metadata: metadataMap,
    });
  } catch (error) {
    console.error('[DataQuality] Error getting batch metadata:', error);
    res.status(500).json({ error: 'Failed to get batch data quality metadata' });
  }
});

/**
 * GET /api/data-quality/sources
 * List all available data sources with their base info
 */
router.get('/sources', async (_req: Request, res: Response) => {
  try {
    const sources = [
      {
        id: 'worldbank',
        name: 'World Bank World Development Indicators',
        shortName: 'WDI',
        url: 'https://data.worldbank.org',
        defaultSourceType: 'official',
        updateFrequency: 'Annually (April and September)',
      },
      {
        id: 'imf',
        name: 'International Monetary Fund',
        shortName: 'IMF',
        url: 'https://www.imf.org/en/Data',
        defaultSourceType: 'official',
        updateFrequency: 'Biannually (WEO), Monthly (IFS)',
      },
      {
        id: 'fao',
        name: 'Food and Agriculture Organization',
        shortName: 'FAO',
        url: 'https://www.fao.org/faostat',
        defaultSourceType: 'official',
        updateFrequency: 'Annually',
      },
      {
        id: 'comtrade',
        name: 'UN Comtrade',
        shortName: 'COMTRADE',
        url: 'https://comtradeplus.un.org',
        defaultSourceType: 'official',
        updateFrequency: 'Monthly',
      },
      {
        id: 'owid',
        name: 'Our World in Data',
        shortName: 'OWID',
        url: 'https://ourworldindata.org',
        defaultSourceType: 'estimate',
        updateFrequency: 'Varies by dataset',
      },
    ];

    res.json(sources);
  } catch (error) {
    console.error('[DataQuality] Error getting sources:', error);
    res.status(500).json({ error: 'Failed to get data sources' });
  }
});

/**
 * GET /api/data-quality/source-types
 * List available source type classifications
 */
router.get('/source-types', async (_req: Request, res: Response) => {
  try {
    const sourceTypes = [
      {
        id: 'official',
        name: 'Official Statistics',
        description: 'Data from national statistical offices or international organizations',
        color: '#22c55e', // green
        icon: 'check-circle',
      },
      {
        id: 'estimate',
        name: 'Estimate',
        description: 'Estimated values based on models or incomplete data',
        color: '#eab308', // yellow
        icon: 'calculator',
      },
      {
        id: 'projection',
        name: 'Projection/Forecast',
        description: 'Future projections based on models and assumptions',
        color: '#f97316', // orange
        icon: 'trending-up',
      },
      {
        id: 'imputed',
        name: 'Imputed',
        description: 'Missing values filled using statistical methods',
        color: '#8b5cf6', // purple
        icon: 'git-branch',
      },
    ];

    res.json(sourceTypes);
  } catch (error) {
    console.error('[DataQuality] Error getting source types:', error);
    res.status(500).json({ error: 'Failed to get source types' });
  }
});

// Helper function to get default source URL
function getDefaultSourceUrl(source: string): string {
  const urls: Record<string, string> = {
    worldbank: 'https://data.worldbank.org',
    imf: 'https://www.imf.org/en/Data',
    fao: 'https://www.fao.org/faostat',
    comtrade: 'https://comtradeplus.un.org',
    owid: 'https://ourworldindata.org',
  };
  return urls[source] || '';
}

export default router;
