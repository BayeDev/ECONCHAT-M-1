/**
 * Citation Generator API Routes
 * Endpoints for generating academic citations for data sources
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { citationTemplates } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

const router = Router();

// No authentication required for citation generation (public read-only)

// Citation format types
type CitationFormat = 'apa' | 'chicago' | 'harvard' | 'mla' | 'bibtex' | 'worldbank' | 'imf';

interface GenerateCitationParams {
  source: string;
  indicator?: string;
  indicatorCode?: string;
  country?: string;
  year?: number | string;
  url?: string;
  format?: CitationFormat;
}

/**
 * POST /api/citations/seed
 * Seed citation templates (admin only in production)
 */
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Clear existing templates
    await db.delete(citationTemplates);

    // Insert seed data
    const templates = [
      {
        source: 'worldbank',
        sourceName: 'World Bank World Development Indicators',
        baseUrl: 'https://data.worldbank.org',
        accessDateRequired: true,
        apaTemplate: 'World Bank. ({{year}}). {{indicator}} [Data set]. World Development Indicators. https://data.worldbank.org/indicator/{{indicatorCode}}',
        chicagoTemplate: 'World Bank. "{{indicator}}." World Development Indicators, {{year}}. {{url}}.',
        harvardTemplate: 'World Bank ({{year}}) {{indicator}}, World Development Indicators. Available at: {{url}} (Accessed: {{accessDate}}).',
        mlaTemplate: '"{{indicator}}." World Development Indicators, World Bank, {{year}}, {{url}}.',
        bibtexTemplate: '@misc{worldbank_{{indicatorCode}}_{{year}}, author = {World Bank}, title = {{{indicator}}}, year = {{{year}}}, howpublished = {World Development Indicators}, url = {{{url}}}, note = {Accessed: {{accessDate}}}}',
        worldBankTemplate: 'World Bank. {{year}}. "{{indicator}}." World Development Indicators. Washington, DC: World Bank.',
        imfTemplate: 'World Bank, World Development Indicators database. {{indicator}}, {{year}}.',
      },
      {
        source: 'imf',
        sourceName: 'International Monetary Fund',
        baseUrl: 'https://www.imf.org/en/Data',
        accessDateRequired: true,
        apaTemplate: 'International Monetary Fund. ({{year}}). {{indicator}} [Data set]. World Economic Outlook Database. https://www.imf.org/en/Publications/WEO',
        chicagoTemplate: 'International Monetary Fund. "{{indicator}}." World Economic Outlook Database, {{year}}. {{url}}.',
        harvardTemplate: 'International Monetary Fund ({{year}}) {{indicator}}, World Economic Outlook Database. Available at: {{url}} (Accessed: {{accessDate}}).',
        mlaTemplate: '"{{indicator}}." World Economic Outlook Database, International Monetary Fund, {{year}}, {{url}}.',
        bibtexTemplate: '@misc{imf_{{indicatorCode}}_{{year}}, author = {International Monetary Fund}, title = {{{indicator}}}, year = {{{year}}}, howpublished = {World Economic Outlook Database}, url = {{{url}}}, note = {Accessed: {{accessDate}}}}',
        worldBankTemplate: 'IMF. {{year}}. "{{indicator}}." World Economic Outlook Database. Washington, DC: International Monetary Fund.',
        imfTemplate: 'International Monetary Fund, World Economic Outlook Database, {{indicator}}, {{year}}.',
      },
      {
        source: 'fao',
        sourceName: 'Food and Agriculture Organization FAOSTAT',
        baseUrl: 'https://www.fao.org/faostat',
        accessDateRequired: true,
        apaTemplate: 'Food and Agriculture Organization. ({{year}}). {{indicator}} [Data set]. FAOSTAT. https://www.fao.org/faostat',
        chicagoTemplate: 'Food and Agriculture Organization. "{{indicator}}." FAOSTAT, {{year}}. {{url}}.',
        harvardTemplate: 'Food and Agriculture Organization ({{year}}) {{indicator}}, FAOSTAT. Available at: {{url}} (Accessed: {{accessDate}}).',
        mlaTemplate: '"{{indicator}}." FAOSTAT, Food and Agriculture Organization, {{year}}, {{url}}.',
        bibtexTemplate: '@misc{fao_{{indicatorCode}}_{{year}}, author = {Food and Agriculture Organization}, title = {{{indicator}}}, year = {{{year}}}, howpublished = {FAOSTAT}, url = {{{url}}}, note = {Accessed: {{accessDate}}}}',
        worldBankTemplate: 'FAO. {{year}}. "{{indicator}}." FAOSTAT. Rome: Food and Agriculture Organization.',
        imfTemplate: 'Food and Agriculture Organization, FAOSTAT database, {{indicator}}, {{year}}.',
      },
      {
        source: 'comtrade',
        sourceName: 'UN Comtrade International Trade Statistics',
        baseUrl: 'https://comtradeplus.un.org',
        accessDateRequired: true,
        apaTemplate: 'United Nations. ({{year}}). {{indicator}} [Data set]. UN Comtrade Database. https://comtradeplus.un.org',
        chicagoTemplate: 'United Nations. "{{indicator}}." UN Comtrade Database, {{year}}. {{url}}.',
        harvardTemplate: 'United Nations ({{year}}) {{indicator}}, UN Comtrade Database. Available at: {{url}} (Accessed: {{accessDate}}).',
        mlaTemplate: '"{{indicator}}." UN Comtrade Database, United Nations, {{year}}, {{url}}.',
        bibtexTemplate: '@misc{comtrade_{{indicatorCode}}_{{year}}, author = {United Nations}, title = {{{indicator}}}, year = {{{year}}}, howpublished = {UN Comtrade Database}, url = {{{url}}}, note = {Accessed: {{accessDate}}}}',
        worldBankTemplate: 'United Nations. {{year}}. "{{indicator}}." UN Comtrade Database. New York: United Nations.',
        imfTemplate: 'United Nations, UN Comtrade Database, {{indicator}}, {{year}}.',
      },
      {
        source: 'owid',
        sourceName: 'Our World in Data',
        baseUrl: 'https://ourworldindata.org',
        accessDateRequired: true,
        apaTemplate: 'Our World in Data. ({{year}}). {{indicator}} [Data visualization]. {{url}}',
        chicagoTemplate: 'Our World in Data. "{{indicator}}." {{year}}. {{url}}.',
        harvardTemplate: 'Our World in Data ({{year}}) {{indicator}}. Available at: {{url}} (Accessed: {{accessDate}}).',
        mlaTemplate: '"{{indicator}}." Our World in Data, {{year}}, {{url}}.',
        bibtexTemplate: '@misc{owid_{{indicatorCode}}_{{year}}, author = {Our World in Data}, title = {{{indicator}}}, year = {{{year}}}, url = {{{url}}}, note = {Accessed: {{accessDate}}}}',
        worldBankTemplate: 'Our World in Data. {{year}}. "{{indicator}}." {{url}}.',
        imfTemplate: 'Our World in Data, {{indicator}}, {{year}}, {{url}}.',
      },
    ];

    for (const template of templates) {
      await db.insert(citationTemplates).values(template);
    }

    res.json({ success: true, count: templates.length });
  } catch (error) {
    console.error('[Citations] Error seeding templates:', error);
    res.status(500).json({ error: 'Failed to seed citation templates' });
  }
});

/**
 * GET /api/citations/formats
 * List available citation formats
 */
router.get('/formats', async (_req: Request, res: Response) => {
  try {
    const formats = [
      { id: 'apa', name: 'APA (7th Edition)', description: 'American Psychological Association style' },
      { id: 'chicago', name: 'Chicago', description: 'Chicago Manual of Style' },
      { id: 'harvard', name: 'Harvard', description: 'Harvard referencing style' },
      { id: 'mla', name: 'MLA', description: 'Modern Language Association style' },
      { id: 'bibtex', name: 'BibTeX', description: 'LaTeX bibliography format' },
      { id: 'worldbank', name: 'World Bank', description: 'World Bank internal citation format' },
      { id: 'imf', name: 'IMF', description: 'IMF internal citation format' },
    ];

    res.json(formats);
  } catch (error) {
    console.error('[Citations] Error getting formats:', error);
    res.status(500).json({ error: 'Failed to get citation formats' });
  }
});

/**
 * GET /api/citations/generate
 * Generate a citation for a data source
 * Query params: source, indicator, indicatorCode, country, year, url, format
 */
router.get('/generate', async (req: Request, res: Response) => {
  try {
    const {
      source,
      indicator,
      indicatorCode,
      country,
      year,
      url,
      format = 'apa',
    } = req.query as Record<string, string | undefined>;

    if (!source) {
      return res.status(400).json({ error: 'Source is required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Get template for this source
    const template = await db.query.citationTemplates.findFirst({
      where: eq(citationTemplates.source, source.toLowerCase()),
    });

    if (!template) {
      return res.status(404).json({ error: `Citation template not found for source: ${source}` });
    }

    // Generate citation
    const citation = generateCitation(template, {
      source,
      indicator: indicator || indicatorCode || 'Data',
      indicatorCode: indicatorCode || '',
      country,
      year: year || new Date().getFullYear().toString(),
      url: url || template.baseUrl || '',
      format: format as CitationFormat,
    });

    res.json({
      source,
      format,
      citation,
      sourceName: template.sourceName,
      accessDate: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('[Citations] Error generating citation:', error);
    res.status(500).json({ error: 'Failed to generate citation' });
  }
});

/**
 * POST /api/citations/batch
 * Generate multiple citations at once
 * Body: { citations: [{ source, indicator, indicatorCode, country, year, url }], format }
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { citations, format = 'apa' } = req.body;

    if (!citations || !Array.isArray(citations) || citations.length === 0) {
      return res.status(400).json({ error: 'Citations array is required' });
    }

    if (citations.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 citations per batch' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Get unique sources
    const sources = [...new Set(citations.map(c => c.source?.toLowerCase()).filter(Boolean))];

    // Fetch all templates
    const templates = await db.select()
      .from(citationTemplates)
      .where(inArray(citationTemplates.source, sources));

    // Create template map
    const templateMap: Record<string, typeof templates[0]> = {};
    for (const t of templates) {
      templateMap[t.source] = t;
    }

    // Generate citations
    const results = citations.map((citationReq: GenerateCitationParams, index: number) => {
      const source = citationReq.source?.toLowerCase();
      const template = source ? templateMap[source] : null;

      if (!template) {
        return {
          index,
          error: `Template not found for source: ${source}`,
          citation: null,
        };
      }

      const citation = generateCitation(template, {
        ...citationReq,
        format: format as CitationFormat,
        year: citationReq.year || new Date().getFullYear(),
        url: citationReq.url || template.baseUrl || '',
      });

      return {
        index,
        source,
        citation,
        sourceName: template.sourceName,
        error: null,
      };
    });

    res.json({
      format,
      count: results.filter(r => r.citation).length,
      accessDate: new Date().toISOString().split('T')[0],
      citations: results,
    });
  } catch (error) {
    console.error('[Citations] Error generating batch citations:', error);
    res.status(500).json({ error: 'Failed to generate batch citations' });
  }
});

/**
 * GET /api/citations/templates
 * List all available citation templates
 */
router.get('/templates', async (_req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const templates = await db.select({
      source: citationTemplates.source,
      sourceName: citationTemplates.sourceName,
      baseUrl: citationTemplates.baseUrl,
      accessDateRequired: citationTemplates.accessDateRequired,
    }).from(citationTemplates);

    res.json(templates);
  } catch (error) {
    console.error('[Citations] Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get citation templates' });
  }
});

/**
 * GET /api/citations/templates/:source
 * Get citation template for a specific source (with all format templates)
 */
router.get('/templates/:source', async (req: Request, res: Response) => {
  try {
    const { source } = req.params;

    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const template = await db.query.citationTemplates.findFirst({
      where: eq(citationTemplates.source, source.toLowerCase()),
    });

    if (!template) {
      return res.status(404).json({ error: `Template not found for source: ${source}` });
    }

    res.json(template);
  } catch (error) {
    console.error('[Citations] Error getting template:', error);
    res.status(500).json({ error: 'Failed to get citation template' });
  }
});

// Helper function to generate citation from template
function generateCitation(
  template: typeof citationTemplates.$inferSelect,
  params: GenerateCitationParams
): string {
  const format = params.format || 'apa';

  // Select template string based on format
  let templateStr: string | null = null;
  switch (format) {
    case 'apa':
      templateStr = template.apaTemplate;
      break;
    case 'chicago':
      templateStr = template.chicagoTemplate;
      break;
    case 'harvard':
      templateStr = template.harvardTemplate;
      break;
    case 'mla':
      templateStr = template.mlaTemplate;
      break;
    case 'bibtex':
      templateStr = template.bibtexTemplate;
      break;
    case 'worldbank':
      templateStr = template.worldBankTemplate || template.apaTemplate;
      break;
    case 'imf':
      templateStr = template.imfTemplate || template.apaTemplate;
      break;
    default:
      templateStr = template.apaTemplate;
  }

  if (!templateStr) {
    return `${template.sourceName}. ${params.indicator || 'Data'}. ${params.year || new Date().getFullYear()}.`;
  }

  // Replace placeholders
  const accessDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let citation = templateStr
    .replace(/\{\{indicator\}\}/g, params.indicator || 'Data')
    .replace(/\{\{indicatorCode\}\}/g, params.indicatorCode || params.indicator || 'data')
    .replace(/\{\{country\}\}/g, params.country || '')
    .replace(/\{\{year\}\}/g, String(params.year || new Date().getFullYear()))
    .replace(/\{\{accessDate\}\}/g, accessDate)
    .replace(/\{\{url\}\}/g, params.url || template.baseUrl || '');

  // Clean up empty country references
  if (!params.country) {
    citation = citation
      .replace(/, \{\{country\}\}/g, '')
      .replace(/\{\{country\}\}, /g, '')
      .replace(/\{\{country\}\}/g, '');
  }

  return citation.trim();
}

export default router;
