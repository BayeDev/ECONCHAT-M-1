"use client";
/**
 * EconChat M-2 - ChartExport Component
 * Export functionality for charts: CSV, SVG, PNG, PDF
 * Plus citation generation for academic use
 *
 * Implementation approach:
 * - CSV: Direct data serialization using native JS (no library needed)
 * - SVG: Clone SVG element, inline all computed styles, serialize with XMLSerializer
 * - PNG: Render SVG to canvas using Image, then canvas.toBlob()
 * - PDF: Use jspdf library to create PDF with embedded PNG
 * - Citations: Generate citations in multiple academic formats
 */

import { useState, useCallback, RefObject } from 'react';

// Types for chart data
interface DataPoint {
  x: number | string;
  y: number | null;
}

interface Series {
  name: string;
  data: DataPoint[];
}

interface ChartExportData {
  title?: string;
  series?: Series[];
  source?: string;
  // Citation metadata (optional)
  indicator?: string;
  indicatorCode?: string;
  country?: string;
  year?: number | string;
  years?: number[];
  values?: number[];
}

interface ChartExportProps {
  data: ChartExportData;
  chartRef: RefObject<HTMLDivElement | null>;
  filename?: string;
}

// Citation format types
type CitationFormat = 'apa' | 'chicago' | 'harvard' | 'mla' | 'bibtex';

// Source to citation mapping
const SOURCE_CITATION_CONFIG: Record<string, {
  author: string;
  database: string;
  url: string;
}> = {
  'World Bank': {
    author: 'World Bank',
    database: 'World Development Indicators',
    url: 'https://data.worldbank.org',
  },
  'IMF': {
    author: 'International Monetary Fund',
    database: 'World Economic Outlook Database',
    url: 'https://www.imf.org/en/Publications/WEO',
  },
  'FAO': {
    author: 'Food and Agriculture Organization',
    database: 'FAOSTAT',
    url: 'https://www.fao.org/faostat',
  },
  'UN Comtrade': {
    author: 'United Nations',
    database: 'UN Comtrade Database',
    url: 'https://comtradeplus.un.org',
  },
  'Our World in Data': {
    author: 'Our World in Data',
    database: 'Our World in Data',
    url: 'https://ourworldindata.org',
  },
};

// ============================================
// CSV Export - Pure JavaScript Implementation
// ============================================

function exportToCSV(data: ChartExportData, filename: string): void {
  const { title, series, source } = data;
  const lines: string[] = [];

  // Add title as comment if present
  if (title) {
    lines.push(`# ${title}`);
  }

  // Build header row: first column is X values, then each series name
  const headers = ['Year/Category', ...series.map(s => s.name)];
  lines.push(headers.join(','));

  // Collect all unique X values across all series
  const allXValues = new Set<string | number>();
  series.forEach(s => s.data.forEach(d => allXValues.add(d.x)));

  // Sort X values (numeric if possible)
  const sortedX = Array.from(allXValues).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });

  // Build data rows
  sortedX.forEach(xVal => {
    const row: (string | number)[] = [xVal];
    series.forEach(s => {
      const point = s.data.find(d => d.x === xVal);
      row.push(point?.y !== null && point?.y !== undefined ? point.y : '');
    });
    lines.push(row.join(','));
  });

  // Add source as comment if present
  if (source) {
    lines.push('');
    lines.push(`# Source: ${source}`);
  }

  // Create and download file
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// ============================================
// SVG Export - Clone and Inline Styles
// ============================================

function exportToSVG(chartRef: RefObject<HTMLDivElement | null>, filename: string): void {
  const container = chartRef.current;
  if (!container) {
    console.error('Chart container not found');
    return;
  }

  // Query specifically for the chart SVG, not icon SVGs
  const svgElement = container.querySelector('svg[data-chart="true"]') || container.querySelector('svg.chart-svg');
  if (!svgElement) {
    console.error('SVG element not found in chart container');
    return;
  }

  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  // Set explicit dimensions
  const bbox = svgElement.getBoundingClientRect();
  clonedSvg.setAttribute('width', String(bbox.width));
  clonedSvg.setAttribute('height', String(bbox.height));
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Inline all computed styles for standalone SVG
  inlineStyles(svgElement, clonedSvg);

  // Serialize to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  // Add XML declaration
  const fullSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, `${filename}.svg`);
}

/**
 * Recursively inline computed styles from original to cloned elements
 */
function inlineStyles(original: Element, cloned: Element): void {
  const computedStyle = window.getComputedStyle(original);

  // Key SVG properties to inline
  const svgProps = [
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
    'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight',
    'text-anchor', 'dominant-baseline', 'transform'
  ];

  svgProps.forEach(prop => {
    const value = computedStyle.getPropertyValue(prop);
    if (value && value !== 'none' && value !== '') {
      (cloned as SVGElement).style.setProperty(prop, value);
    }
  });

  // Handle CSS variables by resolving them
  if (cloned instanceof SVGElement) {
    const style = cloned.getAttribute('style') || '';
    const resolvedStyle = style.replace(/var\(--[^)]+\)/g, (match) => {
      const varName = match.slice(4, -1);
      return computedStyle.getPropertyValue(varName) || '#333';
    });
    if (resolvedStyle !== style) {
      cloned.setAttribute('style', resolvedStyle);
    }

    // Also resolve CSS variables in direct attributes
    ['fill', 'stroke'].forEach(attr => {
      const attrValue = cloned.getAttribute(attr);
      if (attrValue && attrValue.startsWith('var(')) {
        const varName = attrValue.slice(4, -1);
        const resolved = computedStyle.getPropertyValue(varName) || '#333';
        cloned.setAttribute(attr, resolved);
      }
    });
  }

  // Recurse to children
  const originalChildren = original.children;
  const clonedChildren = cloned.children;
  for (let i = 0; i < originalChildren.length; i++) {
    inlineStyles(originalChildren[i], clonedChildren[i]);
  }
}

// ============================================
// PNG Export - SVG to Canvas to Blob
// ============================================

function exportToPNG(chartRef: RefObject<HTMLDivElement | null>, filename: string): void {
  const container = chartRef.current;
  if (!container) {
    console.error('Chart container not found');
    return;
  }

  // Query specifically for the chart SVG, not icon SVGs
  const svgElement = container.querySelector('svg[data-chart="true"]') || container.querySelector('svg.chart-svg');
  if (!svgElement) {
    console.error('SVG element not found');
    return;
  }

  // Clone and prepare SVG (same as SVG export)
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  const bbox = svgElement.getBoundingClientRect();
  const width = bbox.width || 720;
  const height = bbox.height || 400;

  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Inline styles
  inlineStyles(svgElement, clonedSvg);

  // Add white background for PNG
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', 'white');
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

  // Serialize SVG
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  // Create data URL
  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

  // Create image and render to canvas
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2; // 2x resolution for high DPI
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale and draw
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${filename}.png`);
      } else {
        console.error('Failed to create PNG blob');
      }
    }, 'image/png', 1.0);
  };

  img.onerror = (e) => {
    console.error('Failed to load SVG for PNG conversion:', e);
  };

  img.src = svgDataUrl;
}

// ============================================
// PDF Export - Using canvas to generate PDF
// ============================================

async function exportToPDF(
  chartRef: RefObject<HTMLDivElement | null>,
  data: ChartExportData,
  filename: string
): Promise<void> {
  const container = chartRef.current;
  if (!container) {
    console.error('Chart container not found');
    return;
  }

  // Query specifically for the chart SVG, not icon SVGs
  const svgElement = container.querySelector('svg[data-chart="true"]') || container.querySelector('svg.chart-svg');
  if (!svgElement) {
    console.error('SVG element not found');
    return;
  }

  // Clone and prepare SVG
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  const bbox = svgElement.getBoundingClientRect();
  const width = bbox.width || 720;
  const height = bbox.height || 400;

  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  inlineStyles(svgElement, clonedSvg);

  // Add white background
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', 'white');
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

  // Load jsPDF dynamically
  const { jsPDF } = await import('jspdf');

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    // Create PDF
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const pdf = new jsPDF('portrait', 'mm', 'a4');

    // Add title if present
    let yOffset = 20;
    if (data.title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(data.title, pdfWidth / 2, yOffset, { align: 'center' });
      yOffset += 10;
    }

    // Add chart image
    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (height / width) * imgWidth;
    pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
    yOffset += imgHeight + 10;

    // Add source if present
    if (data.source) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(`Source: ${data.source}`, 10, yOffset);
    }

    pdf.save(`${filename}.pdf`);
  };

  img.onerror = (e) => {
    console.error('Failed to load SVG for PDF:', e);
  };

  img.src = svgDataUrl;
}

// ============================================
// Helper: Download Blob
// ============================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// Citation Generation
// ============================================

function generateCitation(
  data: ChartExportData,
  format: CitationFormat
): string {
  const source = data.source || 'Data source';
  const config = SOURCE_CITATION_CONFIG[source] || {
    author: source,
    database: source,
    url: '',
  };

  const indicator = data.indicator || data.title || 'Data';
  const year = data.year || new Date().getFullYear();
  const accessDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  switch (format) {
    case 'apa':
      return `${config.author}. (${year}). ${indicator} [Data set]. ${config.database}. ${config.url}`;

    case 'chicago':
      return `${config.author}. "${indicator}." ${config.database}, ${year}. ${config.url}.`;

    case 'harvard':
      return `${config.author} (${year}) ${indicator}, ${config.database}. Available at: ${config.url} (Accessed: ${accessDate}).`;

    case 'mla':
      return `"${indicator}." ${config.database}, ${config.author}, ${year}, ${config.url}.`;

    case 'bibtex':
      const key = `${source.toLowerCase().replace(/\s+/g, '_')}_${year}`;
      return `@misc{${key},
  author = {${config.author}},
  title = {${indicator}},
  year = {${year}},
  howpublished = {${config.database}},
  url = {${config.url}},
  note = {Accessed: ${accessDate}}
}`;

    default:
      return `${config.author}. ${indicator}. ${config.database}, ${year}.`;
  }
}

function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}

// ============================================
// Main Component
// ============================================

export default function ChartExport({ data, chartRef, filename = 'chart' }: ChartExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [citationMenu, setCitationMenu] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);

  // Debug log
  if (typeof window !== 'undefined') {
    console.log('[ChartExport] Rendering export button for:', filename);
  }

  const handleExport = useCallback(async (format: 'csv' | 'svg' | 'png' | 'pdf') => {
    setExporting(format);

    try {
      switch (format) {
        case 'csv':
          exportToCSV(data, filename);
          break;
        case 'svg':
          exportToSVG(chartRef, filename);
          break;
        case 'png':
          exportToPNG(chartRef, filename);
          break;
        case 'pdf':
          await exportToPDF(chartRef, data, filename);
          break;
      }
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
    }

    setExporting(null);
    setIsOpen(false);
  }, [data, chartRef, filename]);

  const handleCopyCitation = useCallback(async (format: CitationFormat) => {
    const citation = generateCitation(data, format);
    const success = await copyToClipboard(citation);
    if (success) {
      setCopiedCitation(format);
      setTimeout(() => setCopiedCitation(null), 2000);
    }
  }, [data]);

  return (
    <div className="relative flex-shrink-0" style={{ minWidth: '80px' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setCitationMenu(false);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 500,
          color: '#2563eb',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
        title="Export chart"
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 py-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 z-50">
          {/* Export Section */}
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            Download
          </div>
          <button
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting === 'csv' ? 'Exporting...' : 'CSV Data'}
          </button>
          <button
            onClick={() => handleExport('svg')}
            disabled={!!exporting}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting === 'svg' ? 'Exporting...' : 'SVG Image'}
          </button>
          <button
            onClick={() => handleExport('png')}
            disabled={!!exporting}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting === 'png' ? 'Exporting...' : 'PNG Image'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Exporting...' : 'PDF Report'}
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-gray-200 dark:border-slate-700" />

          {/* Citation Section */}
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            Cite
          </div>
          <div className="relative">
            <button
              onClick={() => setCitationMenu(!citationMenu)}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
            >
              <span>Copy Citation</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Citation Format Submenu */}
            {citationMenu && (
              <div className="absolute left-full top-0 ml-1 py-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 z-50">
                {(['apa', 'chicago', 'harvard', 'mla', 'bibtex'] as CitationFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleCopyCitation(format)}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="uppercase">{format}</span>
                    {copiedCitation === format && (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
