/**
 * EconChat M-2 - DataTable Component
 * Renders data tables with source-specific styling
 */

import { useState, useMemo } from 'react';
import {
  formatValue,
  isForecastYear,
  isMissingValue,
  getMissingValueIndicator,
  type DataSource
} from '../utils/formatters';

export interface Column {
  key: string;
  header: string;
  type?: 'text' | 'number' | 'percent' | 'currency' | 'year' | 'trade';
  decimals?: number;
  sortable?: boolean;
  width?: string;
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
  maxHeight?: string;
}

type SortDirection = 'asc' | 'desc' | null;

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

  // Format cell value based on column type
  const formatCellValue = (value: unknown, column: Column, row: Record<string, unknown>): string => {
    if (isMissingValue(value)) {
      return getMissingValueIndicator(source);
    }

    const yearValue = row['year'] || row['Year'] || row['period'];
    const isForecast = highlightForecasts &&
      typeof yearValue === 'number' &&
      isForecastYear(yearValue);

    switch (column.type) {
      case 'number':
        return formatValue(value as number, {
          source,
          decimals: column.decimals ?? 0,
          type: 'number',
          isForecast
        });
      case 'percent':
        return formatValue(value as number, {
          source,
          decimals: column.decimals ?? 1,
          type: 'percent',
          isForecast
        });
      case 'currency':
      case 'trade':
        return formatValue(value as number, {
          source,
          decimals: column.decimals ?? 1,
          type: column.type,
          isForecast
        });
      case 'year':
        return String(value);
      default:
        return String(value);
    }
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

  return (
    <div className="animate-slide-up">
      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="chart-title text-lg">{title}</h3>}
          {subtitle && <p className="chart-subtitle text-sm">{subtitle}</p>}
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
