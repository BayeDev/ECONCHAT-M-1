/**
 * Citation Service
 * Handles citation generation and formatting logic
 */

import { db } from '../db/index.js';
import { citationTemplates, CitationTemplate } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export type CitationFormat = 'apa' | 'chicago' | 'harvard' | 'mla' | 'bibtex' | 'worldbank' | 'imf';

export interface CitationParams {
  source: string;
  indicator?: string;
  indicatorCode?: string;
  indicatorName?: string;
  country?: string;
  year?: number | string;
  url?: string;
  accessDate?: Date;
}

export interface GeneratedCitation {
  text: string;
  format: CitationFormat;
  source: string;
  sourceName: string;
  accessDate: string;
}

export class CitationService {
  private templateCache: Map<string, CitationTemplate> = new Map();

  /**
   * Get citation template for a source (cached)
   */
  async getTemplate(source: string): Promise<CitationTemplate | null> {
    const normalizedSource = source.toLowerCase();

    // Check cache
    if (this.templateCache.has(normalizedSource)) {
      return this.templateCache.get(normalizedSource)!;
    }

    // Return null if database not connected
    if (!db) {
      return null;
    }

    // Fetch from database
    const template = await db.query.citationTemplates.findFirst({
      where: eq(citationTemplates.source, normalizedSource),
    });

    if (template) {
      this.templateCache.set(normalizedSource, template);
    }

    return template || null;
  }

  /**
   * Generate a single citation
   */
  async generateCitation(
    params: CitationParams,
    format: CitationFormat = 'apa'
  ): Promise<GeneratedCitation | null> {
    const template = await this.getTemplate(params.source);

    if (!template) {
      return null;
    }

    const text = this.formatCitation(template, params, format);
    const accessDate = params.accessDate || new Date();

    return {
      text,
      format,
      source: params.source,
      sourceName: template.sourceName,
      accessDate: accessDate.toISOString().split('T')[0],
    };
  }

  /**
   * Generate multiple citations
   */
  async generateBatchCitations(
    citationParams: CitationParams[],
    format: CitationFormat = 'apa'
  ): Promise<(GeneratedCitation | null)[]> {
    const results: (GeneratedCitation | null)[] = [];

    for (const params of citationParams) {
      const citation = await this.generateCitation(params, format);
      results.push(citation);
    }

    return results;
  }

  /**
   * Generate all format variants for a single citation
   */
  async generateAllFormats(params: CitationParams): Promise<Record<CitationFormat, string>> {
    const template = await this.getTemplate(params.source);

    if (!template) {
      // Return fallback citations
      const fallback = this.generateFallbackCitation(params);
      return {
        apa: fallback,
        chicago: fallback,
        harvard: fallback,
        mla: fallback,
        bibtex: fallback,
        worldbank: fallback,
        imf: fallback,
      };
    }

    const formats: CitationFormat[] = ['apa', 'chicago', 'harvard', 'mla', 'bibtex', 'worldbank', 'imf'];
    const result: Record<string, string> = {};

    for (const format of formats) {
      result[format] = this.formatCitation(template, params, format);
    }

    return result as Record<CitationFormat, string>;
  }

  /**
   * Format citation using template
   */
  private formatCitation(
    template: CitationTemplate,
    params: CitationParams,
    format: CitationFormat
  ): string {
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
      return this.generateFallbackCitation(params);
    }

    // Prepare replacements
    const indicator = params.indicatorName || params.indicator || 'Data';
    const indicatorCode = params.indicatorCode || this.slugify(indicator);
    const year = params.year || new Date().getFullYear();
    const url = params.url || template.baseUrl || '';
    const accessDate = (params.accessDate || new Date()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Replace placeholders
    let citation = templateStr
      .replace(/\{\{indicator\}\}/g, indicator)
      .replace(/\{\{indicatorCode\}\}/g, indicatorCode)
      .replace(/\{\{year\}\}/g, String(year))
      .replace(/\{\{accessDate\}\}/g, accessDate)
      .replace(/\{\{url\}\}/g, url);

    // Handle country (remove if not provided)
    if (params.country) {
      citation = citation.replace(/\{\{country\}\}/g, params.country);
    } else {
      citation = citation
        .replace(/, \{\{country\}\}/g, '')
        .replace(/\{\{country\}\}, /g, '')
        .replace(/\{\{country\}\}/g, '');
    }

    return citation.trim();
  }

  /**
   * Generate fallback citation when template not available
   */
  private generateFallbackCitation(params: CitationParams): string {
    const indicator = params.indicatorName || params.indicator || 'Data';
    const year = params.year || new Date().getFullYear();
    const source = this.getSourceDisplayName(params.source);

    return `${source}. (${year}). ${indicator}.${params.url ? ` ${params.url}` : ''}`;
  }

  /**
   * Get human-readable source name
   */
  private getSourceDisplayName(source: string): string {
    const names: Record<string, string> = {
      worldbank: 'World Bank',
      imf: 'International Monetary Fund',
      fao: 'Food and Agriculture Organization',
      comtrade: 'United Nations',
      owid: 'Our World in Data',
    };
    return names[source.toLowerCase()] || source;
  }

  /**
   * Convert string to slug for BibTeX keys
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

// Export singleton instance
export const citationService = new CitationService();

// Export helper function for quick citation generation
export async function generateCitation(
  params: CitationParams,
  format: CitationFormat = 'apa'
): Promise<string | null> {
  const result = await citationService.generateCitation(params, format);
  return result?.text || null;
}
