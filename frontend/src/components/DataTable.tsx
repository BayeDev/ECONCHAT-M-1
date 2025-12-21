"use client";
/**
 * EconChat M-2 - DataTable Component
 * Renders data tables with source-specific styling
 *
 * Enhanced features:
 * - FAO flag notation (A, E, I, F, M)
 * - UN Comtrade coverage quality indicators
 * - IMF forecast cell highlighting
 * - Trade flow coloring (exports blue, imports red)
 * - Data quality badge integration (MDB Enhancement)
 */

import { useState, useMemo } from 'react';
import {
  formatValue,
  isForecastYear,
  isMissingValue,
  getMissingValueIndicator,
  FAO_FLAG_MEANINGS,
  getCoverageLevel,
  type DataSource,
  type FAOFlag
} from '../utils/formatters';
import DataQualityBadge, { DataQualityMetadata, SourceType } from './DataQualityBadge';

export interface Column {
  key: string;
  header: string;
  type?: 'text' | 'number' | 'percent' | 'currency' | 'year' | 'trade';
  decimals?: number;
  sortable?: boolean;
  width?: string;
  flagKey?: string;       // Column key containing FAO flag (A, E, I, F, M)
  coverageKey?: string;   // Column key containing coverage percentage
}

export interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  source?: DataSource;
  title?: string;
  subtitle?: string;
  sourceAttribution?: string;
  sortable?: boolean;
  showRowNumbers?: boolean;
  highlightForecasts?: boolean;
  showFAOFlags?: boolean;       // Show FAO flag superscripts
  showCoverageIndicator?: boolean;  // Show UN Comtrade coverage dots
  showQualityBadge?: boolean;   // Show MDB data quality badge
  qualityMetadata?: Partial<DataQualityMetadata>;  // Optional quality metadata
  maxHeight?: string;
}

type SortDirection = 'asc' | 'desc' | null;

// Helper to map source to source type
const SOURCE_TYPE_MAP: Record<DataSource, SourceType> = {
  worldbank: 'official',
  imf: 'official',
  fao: 'official',
  comtrade: 'official',
  owid: 'estimate',
};

export default function DataTable({
  columns,
  data,
  source = 'worldbank',
  title,
  subtitle,
  sourceAttribution,
  sortable = true,
  showRowNumbers = false,
  highlightForecasts = true,
  showFAOFlags = true,
  showCoverageIndicator = true,
  showQualityBadge = false,
  qualityMetadata,
  maxHeight
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Get table style class based on source
  const tableStyleClass = useMemo(() => {
    const styleMap: Record<DataSource, string> = {
      worldbank: 'wb-style',
      imf: 'imf-style',
      fao: 'fao-style',
      comtrade: 'un-style',
      owid: 'owid-style'
    };
    return styleMap[source];
  }, [source]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined
      if (isMissingValue(aVal) && isMissingValue(bVal)) return 0;
      if (isMissingValue(aVal)) return sortDirection === 'asc' ? 1 : -1;
      if (isMissingValue(bVal)) return sortDirection === 'asc' ? -1 : 1;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (columnKey: string, columnSortable?: boolean) => {
    if (!sortable || columnSortable === false) return;

    if (sortColumn === columnKey) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Format FAO flag superscript
  const formatFAOFlag = (flag: unknown): string => {
    if (!flag || !showFAOFlags || source !== 'fao') return '';
    const flagStr = String(flag).toUpperCase() as FAOFlag;
    if (flagStr === 'A') return ''; // Official figure, no indicator needed

    const flagInfo = FAO_FLAG_MEANINGS[flagStr];
    if (!flagInfo) return '';

    const flagClass = flagStr === 'E' ? 'estimate' :
                      flagStr === 'I' ? 'imputed' :
                      flagStr === 'F' ? 'calculated' : '';

    return `<sup class="data-flag ${flagClass}" title="${flagInfo.description}">${flagInfo.label}</sup>`;
  };

  // Format coverage indicator (UN Comtrade)
  const formatCoverageIndicator = (coverage: unknown): string => {
    if (!coverage || !showCoverageIndicator || source !== 'comtrade') return '';
    const coverageNum = typeof coverage === 'number' ? coverage : parseFloat(String(coverage));
    if (isNaN(coverageNum)) return '';

    const level = getCoverageLevel(coverageNum);
    const colors: Record<string, string> = {
      good: 'var(--positive, #00AB51)',
      medium: 'var(--warning, #FDB714)',
      poor: 'var(--negative, #dc3545)'
    };

    return `<span class="coverage-dot" style="background-color: ${colors[level]}" title="Data coverage: ${coverageNum.toFixed(0)}%"></span>`;
  };

  // Format cell value based on column type
  const formatCellValue = (value: unknown, column: Column, row: Record<string, unknown>): string => {
    if (isMissingValue(value)) {
      return getMissingValueIndicator(source);
    }

    const yearValue = row['year'] || row['Year'] || row['period'];
    const isForecast = highlightForecasts &&
      typeof yearValue === 'number' &&
      isForecastYear(yearValue);

    let formatted: string;

    switch (column.type) {
      case 'number':
        formatted = formatValue(value as number, {
          source,
          decimals: column.decimals ?? 0,
          type: 'number',
          isForecast
        });
        break;
      case 'percent':
        formatted = formatValue(value as number, {
          source,
          decimals: column.decimals ?? 1,
          type: 'percent',
          isForecast
        });
        break;
      case 'currency':
      case 'trade':
        formatted = formatValue(value as number, {
          source,
          decimals: column.decimals ?? 1,
          type: column.type,
          isForecast
        });
        break;
      case 'year':
        formatted = String(value);
        break;
      default:
        formatted = String(value);
    }

    // Add FAO flag if specified
    if (column.flagKey) {
      const flag = row[column.flagKey];
      formatted += formatFAOFlag(flag);
    }

    // Add coverage indicator if specified
    if (column.coverageKey) {
      const coverage = row[column.coverageKey];
      formatted = formatCoverageIndicator(coverage) + formatted;
    }

    return formatted;
  };

  // Get cell CSS classes
  const getCellClasses = (column: Column, value: unknown, row: Record<string, unknown>): string => {
    const classes: string[] = [];

    // Numeric alignment
    if (['number', 'percent', 'currency', 'trade', 'year'].includes(column.type || '')) {
      classes.push('numeric');
    }

    // Forecast highlighting (IMF style)
    if (highlightForecasts && source === 'imf') {
      const yearValue = row['year'] || row['Year'] || row['period'];
      if (typeof yearValue === 'number' && isForecastYear(yearValue)) {
        classes.push('forecast-cell');
      }
    }

    // Missing value
    if (isMissingValue(value)) {
      classes.push('missing-value');
    }

    // Trade flow coloring (UN COMTRADE)
    if (source === 'comtrade') {
      const flow = row['flow'] || row['flowDesc'];
      if (flow === 'Export' || flow === 'X') {
        classes.push('export-value');
      } else if (flow === 'Import' || flow === 'M') {
        classes.push('import-value');
      }
    }

    return classes.join(' ');
  };

  // Build quality metadata for badge
  const defaultQualityMetadata: DataQualityMetadata = useMemo(() => ({
    source,
    sourceType: SOURCE_TYPE_MAP[source] || 'official',
    indicatorName: title,
    ...qualityMetadata,
  }), [source, title, qualityMetadata]);

  return (
    <div className="animate-slide-up">
      {/* Title, subtitle, and quality badge */}
      {(title || subtitle || showQualityBadge) && (
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {title && <h3 className="chart-title text-lg">{title}</h3>}
              {subtitle && <p className="chart-subtitle text-sm">{subtitle}</p>}
            </div>
            {showQualityBadge && (
              <DataQualityBadge
                metadata={defaultQualityMetadata}
                size="sm"
                showLabel={true}
                showTooltip={true}
              />
            )}
          </div>
        </div>
      )}

      {/* Table container */}
      <div
        className="overflow-x-auto rounded-lg border border-gray-200"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table className={`data-table ${tableStyleClass}`}>
          <thead>
            <tr>
              {showRowNumbers && (
                <th className="numeric" style={{ width: '50px' }}>#</th>
              )}
              {columns.map((column) => {
                const isSortable = sortable && column.sortable !== false;
                const isSorted = sortColumn === column.key;

                return (
                  <th
                    key={column.key}
                    className={`
                      ${['number', 'percent', 'currency', 'trade', 'year'].includes(column.type || '') ? 'numeric' : ''}
                      ${isSortable ? 'sortable' : ''}
                      ${isSorted ? sortDirection || '' : ''}
                    `}
                    style={column.width ? { width: column.width } : undefined}
                    onClick={() => handleSort(column.key, column.sortable)}
                  >
                    {column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {showRowNumbers && (
                  <td className="numeric text-gray-400">{rowIndex + 1}</td>
                )}
                {columns.map((column) => {
                  const value = row[column.key];
                  const formattedValue = formatCellValue(value, column, row);
                  const cellClasses = getCellClasses(column, value, row);

                  return (
                    <td
                      key={column.key}
                      className={cellClasses}
                      dangerouslySetInnerHTML={{ __html: formattedValue }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAO Flag Legend */}
      {source === 'fao' && showFAOFlags && (
        <div className="fao-flag-legend" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-secondary, #6b7280)'
        }}>
          <span><sup className="data-flag estimate">E</sup> FAO estimate</span>
          <span><sup className="data-flag imputed">I</sup> Imputed value</span>
          <span><sup className="data-flag calculated">F</sup> Calculated aggregate</span>
          <span>— Missing (structural)</span>
        </div>
      )}

      {/* Coverage Legend */}
      {source === 'comtrade' && showCoverageIndicator && (
        <div className="coverage-legend" style={{
          display: 'flex',
          gap: '16px',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-secondary, #6b7280)'
        }}>
          <span>
            <span className="coverage-dot" style={{ backgroundColor: 'var(--positive, #00AB51)' }}></span>
            Good coverage (80%+)
          </span>
          <span>
            <span className="coverage-dot" style={{ backgroundColor: 'var(--warning, #FDB714)' }}></span>
            Medium (20-80%)
          </span>
          <span>
            <span className="coverage-dot" style={{ backgroundColor: 'var(--negative, #dc3545)' }}></span>
            Poor (&lt;20%)
          </span>
        </div>
      )}

      {/* Source attribution */}
      {sourceAttribution && (
        <div className="chart-source mt-2">{sourceAttribution}</div>
      )}
    </div>
  );
}

// ============================================
// Pre-configured table variants
// ============================================

export function WorldBankTable(props: Omit<DataTableProps, 'source'>) {
  return <DataTable {...props} source="worldbank" />;
}

export function IMFTable(props: Omit<DataTableProps, 'source'>) {
  return <DataTable {...props} source="imf" highlightForecasts />;
}

export function FAOTable(props: Omit<DataTableProps, 'source'>) {
  return <DataTable {...props} source="fao" />;
}

export function ComtradeTable(props: Omit<DataTableProps, 'source'>) {
  return <DataTable {...props} source="comtrade" />;
}

export function OWIDTable(props: Omit<DataTableProps, 'source'>) {
  return <DataTable {...props} source="owid" />;
}
