/**
 * EconChat M-2 - Data Formatting Utilities
 * Based on World Bank, IMF, FAO, UN COMTRADE, OWID specifications
 */

// ============================================
// Number Formatting
// ============================================

/**
 * Format large numbers with scale abbreviations (K, M, B, T)
 * Used consistently across all platforms
 */
export function formatLargeNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return sign + (absValue / 1e12).toFixed(decimals) + 'T';
  }
  if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toFixed(decimals) + 'B';
  }
  if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toFixed(decimals) + 'M';
  }
  if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toFixed(decimals) + 'K';
  }
  return sign + absValue.toFixed(decimals);
}

/**
 * Format trade values (UN COMTRADE style)
 */
export function formatTradeValue(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toString();
}

/**
 * Format number with comma thousands separator
 */
export function formatWithCommas(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format percentage values
 * IMF style: 1 decimal for GDP growth, inflation
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  return value.toFixed(decimals) + '%';
}

/**
 * Format currency values in USD
 */
export function formatUSD(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  return '$' + formatWithCommas(value, decimals);
}

/**
 * Format GDP values (billions USD with 3 decimals - IMF standard)
 */
export function formatGDP(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  // Assume input is in current USD, convert to billions
  const billions = value / 1e9;
  return '$' + billions.toFixed(3) + 'B';
}

// ============================================
// Missing Value Conventions
// ============================================

export type DataSource = 'worldbank' | 'imf' | 'fao' | 'comtrade' | 'owid';

/**
 * Get missing value indicator by data source
 */
export function getMissingValueIndicator(source: DataSource): string {
  const indicators: Record<DataSource, string> = {
    worldbank: '..',
    imf: 'n/a',
    fao: '...',
    comtrade: '—',
    owid: '—'
  };
  return indicators[source];
}

/**
 * Check if a value is missing/null
 */
export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['', '..', '...', 'n/a', 'na', '-', '—', 'null'].includes(normalized);
  }
  if (typeof value === 'number') return isNaN(value);
  return false;
}

// ============================================
// FAO Data Flags
// ============================================

export type FAOFlag = 'A' | 'E' | 'I' | 'M' | 'F';

export const FAO_FLAG_MEANINGS: Record<FAOFlag, { label: string; description: string }> = {
  'A': { label: '', description: 'Official figure' },
  'E': { label: 'E', description: 'FAO estimate' },
  'I': { label: 'I', description: 'Imputed value' },
  'M': { label: '—', description: 'Missing (structural)' },
  'F': { label: 'F', description: 'Calculated aggregate' }
};

/**
 * Format value with FAO flag
 */
export function formatWithFAOFlag(value: number | string, flag?: FAOFlag): string {
  if (isMissingValue(value)) {
    return flag === 'M' ? '—' : '...';
  }

  const formattedValue = typeof value === 'number' ? formatWithCommas(value) : value;

  if (!flag || flag === 'A') {
    return formattedValue;
  }

  return `${formattedValue}<sup class="data-flag ${flag === 'E' ? 'estimate' : flag === 'I' ? 'imputed' : 'calculated'}">${FAO_FLAG_MEANINGS[flag].label}</sup>`;
}

// ============================================
// Agricultural Units (FAO)
// ============================================

export function formatTonnes(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M tonnes';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K tonnes';
  }
  return formatWithCommas(value) + ' tonnes';
}

export function formatHectares(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M ha';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K ha';
  }
  return formatWithCommas(value) + ' ha';
}

export function formatYield(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  // hg/ha (hectograms per hectare)
  return formatWithCommas(value, 2) + ' hg/ha';
}

// ============================================
// Nutritional Data (FAO)
// ============================================

export function formatCalories(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return formatWithCommas(value, 0) + ' kcal/capita/day';
}

export function formatProtein(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return value.toFixed(1) + ' g/capita/day';
}

// ============================================
// Year & Period Formatting
// ============================================

/**
 * Format fiscal year (IMF style)
 */
export function formatFiscalYear(startYear: number): string {
  return `${startYear}/${(startYear + 1).toString().slice(-2)}`;
}

/**
 * Format year range
 */
export function formatYearRange(startYear: number, endYear: number): string {
  return `${startYear}–${endYear}`;
}

// ============================================
// HS Code Formatting (UN COMTRADE)
// ============================================

export function formatHSCode(code: string, description?: string): string {
  const formattedCode = code.padStart(6, '0');
  const level = code.length <= 2 ? 'Chapter' : code.length <= 4 ? 'Heading' : 'Subheading';

  if (description) {
    return `${formattedCode} — ${description}`;
  }
  return `${formattedCode} (${level})`;
}

// ============================================
// Value Classification
// ============================================

/**
 * Get CSS class for positive/negative values
 */
export function getValueClass(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'value-missing';
  }
  if (value > 0) return 'value-positive';
  if (value < 0) return 'value-negative';
  return '';
}

/**
 * Get trend indicator class
 */
export function getTrendClass(currentValue: number, previousValue: number): string {
  const change = currentValue - previousValue;
  const threshold = Math.abs(previousValue) * 0.01; // 1% threshold for "flat"

  if (change > threshold) return 'trend-up';
  if (change < -threshold) return 'trend-down';
  return 'trend-flat';
}

/**
 * Check if year is a forecast (IMF style - after current year)
 */
export function isForecastYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year > currentYear;
}

// ============================================
// Coverage Quality (UN COMTRADE)
// ============================================

export type CoverageLevel = 'good' | 'medium' | 'poor';

export function getCoverageLevel(percentage: number): CoverageLevel {
  if (percentage >= 80) return 'good';
  if (percentage >= 20) return 'medium';
  return 'poor';
}

export function getCoverageClass(percentage: number): string {
  return `coverage-indicator ${getCoverageLevel(percentage)}`;
}

// ============================================
// Source-specific number formatting
// ============================================

export interface FormatOptions {
  source?: DataSource;
  decimals?: number;
  type?: 'currency' | 'percent' | 'number' | 'trade';
  isForecast?: boolean;
}

/**
 * Universal formatter that applies source-specific rules
 */
export function formatValue(
  value: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  const { source = 'worldbank', decimals = 1, type = 'number', isForecast = false } = options;

  if (isMissingValue(value)) {
    return getMissingValueIndicator(source);
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return getMissingValueIndicator(source);
  }

  let formatted: string;

  switch (type) {
    case 'currency':
      formatted = formatLargeNumber(numValue, decimals);
      break;
    case 'percent':
      formatted = formatPercent(numValue, decimals);
      break;
    case 'trade':
      formatted = formatTradeValue(numValue);
      break;
    default:
      formatted = formatWithCommas(numValue, decimals);
  }

  // Add forecast styling class marker if needed
  if (isForecast) {
    return `<span class="value-forecast">${formatted}</span>`;
  }

  return formatted;
}

// ============================================
// Color Utilities
// ============================================

export const SOURCE_COLORS: Record<DataSource, { primary: string; light: string }> = {
  worldbank: { primary: '#002244', light: 'rgba(0, 34, 68, 0.1)' },
  imf: { primary: '#004C97', light: 'rgba(0, 76, 151, 0.1)' },
  fao: { primary: '#116AAB', light: 'rgba(17, 106, 171, 0.1)' },
  comtrade: { primary: '#009edb', light: 'rgba(0, 158, 219, 0.1)' },
  owid: { primary: '#3360a9', light: 'rgba(51, 96, 169, 0.1)' }
};

export const OWID_CATEGORICAL_COLORS = [
  '#3360a9', // Blue
  '#c15065', // Red/Coral
  '#e6753d', // Orange
  '#6d3e91', // Purple
  '#c9a227', // Yellow
  '#578145', // Green
  '#883039'  // Dark Red
];

export const WB_WARM_COLORS = ['#F05023', '#FDB714', '#EB1C2D', '#F78D28'];
export const WB_COOL_COLORS = ['#009CA7', '#00AB51', '#872B90', '#00A996'];

/**
 * Get color for a data series by index
 */
export function getSeriesColor(index: number, palette: 'owid' | 'wb-warm' | 'wb-cool' = 'owid'): string {
  const colors = palette === 'owid'
    ? OWID_CATEGORICAL_COLORS
    : palette === 'wb-warm'
      ? WB_WARM_COLORS
      : WB_COOL_COLORS;

  return colors[index % colors.length];
}
