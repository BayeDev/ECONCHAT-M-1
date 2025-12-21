/**
 * Citation Templates Seed Data
 *
 * Templates for generating citations in various academic formats.
 * Placeholders:
 *   {{indicator}} - Indicator name
 *   {{country}} - Country name
 *   {{year}} - Year of data
 *   {{accessDate}} - Date accessed (auto-generated)
 *   {{url}} - Data URL
 */

import { db } from '../index.js';
import { citationTemplates, NewCitationTemplate } from '../schema.js';

export const citationTemplatesSeedData: NewCitationTemplate[] = [
  {
    source: 'worldbank',
    sourceName: 'World Bank World Development Indicators',
    baseUrl: 'https://data.worldbank.org',
    accessDateRequired: true,
    apaTemplate: 'World Bank. ({{year}}). {{indicator}} [Data set]. World Development Indicators. https://data.worldbank.org/indicator/{{indicatorCode}}',
    chicagoTemplate: 'World Bank. "{{indicator}}." World Development Indicators, {{year}}. {{url}}.',
    harvardTemplate: 'World Bank ({{year}}) {{indicator}}, World Development Indicators. Available at: {{url}} (Accessed: {{accessDate}}).',
    mlaTemplate: '"{{indicator}}." World Development Indicators, World Bank, {{year}}, {{url}}.',
    bibtexTemplate: `@misc{worldbank_{{indicatorCode}}_{{year}},
  author = {{World Bank}},
  title = {{{indicator}}},
  year = {{{year}}},
  howpublished = {World Development Indicators},
  url = {{{url}}},
  note = {Accessed: {{accessDate}}}
}`,
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
    bibtexTemplate: `@misc{imf_{{indicatorCode}}_{{year}},
  author = {{International Monetary Fund}},
  title = {{{indicator}}},
  year = {{{year}}},
  howpublished = {World Economic Outlook Database},
  url = {{{url}}},
  note = {Accessed: {{accessDate}}}
}`,
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
    bibtexTemplate: `@misc{fao_{{indicatorCode}}_{{year}},
  author = {{Food and Agriculture Organization}},
  title = {{{indicator}}},
  year = {{{year}}},
  howpublished = {FAOSTAT},
  url = {{{url}}},
  note = {Accessed: {{accessDate}}}
}`,
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
    bibtexTemplate: `@misc{comtrade_{{indicatorCode}}_{{year}},
  author = {{United Nations}},
  title = {{{indicator}}},
  year = {{{year}}},
  howpublished = {UN Comtrade Database},
  url = {{{url}}},
  note = {Accessed: {{accessDate}}}
}`,
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
    bibtexTemplate: `@misc{owid_{{indicatorCode}}_{{year}},
  author = {{Our World in Data}},
  title = {{{indicator}}},
  year = {{{year}}},
  url = {{{url}}},
  note = {Accessed: {{accessDate}}}
}`,
    worldBankTemplate: 'Our World in Data. {{year}}. "{{indicator}}." {{url}}.',
    imfTemplate: 'Our World in Data, {{indicator}}, {{year}}, {{url}}.',
  },
];

export async function seedCitationTemplates() {
  console.log('Seeding citation templates...');

  if (!db) {
    throw new Error('Database not connected');
  }

  try {
    // Clear existing data
    await db.delete(citationTemplates);

    // Insert seed data
    for (const template of citationTemplatesSeedData) {
      await db.insert(citationTemplates).values(template);
    }

    console.log(`Inserted ${citationTemplatesSeedData.length} citation templates`);
    return { success: true, count: citationTemplatesSeedData.length };
  } catch (error) {
    console.error('Error seeding citation templates:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCitationTemplates()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
