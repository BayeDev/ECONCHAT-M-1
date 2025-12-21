"use client";
/**
 * EconChat M-2 - DataQualityBadge Component
 * Displays data quality indicators for economic data
 *
 * Features:
 * - Source type badge (Official/Estimate/Projection/Imputed)
 * - Color-coded indicators
 * - Tooltip with detailed metadata
 * - Last updated info
 * - Coverage information
 */

import { useState } from 'react';

export type SourceType = 'official' | 'estimate' | 'projection' | 'imputed';

export interface DataQualityMetadata {
  source: string;
  indicatorCode?: string;
  indicatorName?: string;
  sourceType: SourceType;
  lastUpdated?: string | null;
  dataFrequency?: string;
  coverageStart?: number | null;
  coverageEnd?: number | null;
  countryCount?: number | null;
  qualityScore?: number | null;
  methodology?: string | null;
  sourceUrl?: string | null;
  _isDefault?: boolean;
}

export interface DataQualityBadgeProps {
  metadata: DataQualityMetadata;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// Source type configuration
const SOURCE_TYPE_CONFIG: Record<SourceType, {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  official: {
    label: 'Official Statistics',
    shortLabel: 'Official',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: '✓',
    description: 'Data from national statistical offices or international organizations',
  },
  estimate: {
    label: 'Estimate',
    shortLabel: 'Est.',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: '~',
    description: 'Estimated values based on models or incomplete data',
  },
  projection: {
    label: 'Projection',
    shortLabel: 'Proj.',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: '→',
    description: 'Future projections based on models and assumptions',
  },
  imputed: {
    label: 'Imputed',
    shortLabel: 'Imp.',
    color: 'text-violet-700 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    icon: '⊕',
    description: 'Missing values filled using statistical methods',
  },
};

// Source name lookup
const SOURCE_NAMES: Record<string, string> = {
  worldbank: 'World Bank WDI',
  imf: 'IMF',
  fao: 'FAO',
  comtrade: 'UN Comtrade',
  owid: 'Our World in Data',
};

export default function DataQualityBadge({
  metadata,
  size = 'md',
  showLabel = true,
  showTooltip = true,
  className = '',
}: DataQualityBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const config = SOURCE_TYPE_CONFIG[metadata.sourceType] || SOURCE_TYPE_CONFIG.official;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1',
  };

  // Format last updated date
  const formatLastUpdated = (date: string | null | undefined): string => {
    if (!date) return 'Unknown';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
    } catch {
      return date;
    }
  };

  // Format coverage range
  const formatCoverage = (): string => {
    const { coverageStart, coverageEnd } = metadata;
    if (coverageStart && coverageEnd) {
      return `${coverageStart}–${coverageEnd}`;
    }
    if (coverageStart) return `${coverageStart}–present`;
    if (coverageEnd) return `–${coverageEnd}`;
    return 'N/A';
  };

  // Get source display name
  const getSourceName = (): string => {
    return SOURCE_NAMES[metadata.source.toLowerCase()] || metadata.source;
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Badge */}
      <span
        className={`
          inline-flex items-center gap-1 rounded-full border font-medium
          ${config.color} ${config.bgColor} ${config.borderColor}
          ${sizeClasses[size]}
          cursor-default transition-colors duration-150
          hover:opacity-90
        `}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <span className="font-bold">{config.icon}</span>
        {showLabel && (
          <span>{size === 'sm' ? config.shortLabel : config.label}</span>
        )}
      </span>

      {/* Tooltip */}
      {showTooltip && isTooltipVisible && (
        <div
          className="
            absolute z-50 bottom-full left-0 mb-2
            bg-white dark:bg-slate-800
            border border-gray-200 dark:border-slate-700
            rounded-lg shadow-lg
            p-3 min-w-[220px] max-w-[300px]
            text-sm
          "
        >
          {/* Header */}
          <div className="font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {config.label}
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-slate-400 text-xs mb-3">
            {config.description}
          </p>

          {/* Metadata Grid */}
          <div className="space-y-1.5 text-xs">
            {/* Source */}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-500">Source:</span>
              <span className="text-gray-900 dark:text-slate-200 font-medium">
                {getSourceName()}
              </span>
            </div>

            {/* Indicator */}
            {metadata.indicatorName && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 dark:text-slate-500">Indicator:</span>
                <span className="text-gray-900 dark:text-slate-200 text-right truncate max-w-[150px]">
                  {metadata.indicatorName}
                </span>
              </div>
            )}

            {/* Last Updated */}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-500">Updated:</span>
              <span className="text-gray-900 dark:text-slate-200">
                {formatLastUpdated(metadata.lastUpdated)}
              </span>
            </div>

            {/* Coverage */}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-500">Coverage:</span>
              <span className="text-gray-900 dark:text-slate-200">
                {formatCoverage()}
              </span>
            </div>

            {/* Country Count */}
            {metadata.countryCount && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-500">Countries:</span>
                <span className="text-gray-900 dark:text-slate-200">
                  {metadata.countryCount}
                </span>
              </div>
            )}

            {/* Quality Score */}
            {metadata.qualityScore !== null && metadata.qualityScore !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-slate-500">Quality:</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(metadata.qualityScore as number) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-900 dark:text-slate-200">
                    {Math.round((metadata.qualityScore as number) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Frequency */}
            {metadata.dataFrequency && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-500">Frequency:</span>
                <span className="text-gray-900 dark:text-slate-200 capitalize">
                  {metadata.dataFrequency}
                </span>
              </div>
            )}
          </div>

          {/* Source URL */}
          {metadata.sourceUrl && (
            <a
              href={metadata.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-3 pt-2 border-t border-gray-100 dark:border-slate-700
                text-xs text-blue-600 dark:text-blue-400 hover:underline
                flex items-center gap-1
              "
            >
              View source data
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {/* Default indicator */}
          {metadata._isDefault && (
            <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 italic">
              * Default metadata (not stored in database)
            </p>
          )}

          {/* Tooltip arrow */}
          <div
            className="
              absolute -bottom-1.5 left-4 w-3 h-3
              bg-white dark:bg-slate-800
              border-r border-b border-gray-200 dark:border-slate-700
              transform rotate-45
            "
          />
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline badge for tables
 */
export function DataQualityIndicator({
  sourceType,
  className = '',
}: {
  sourceType: SourceType;
  className?: string;
}) {
  const config = SOURCE_TYPE_CONFIG[sourceType] || SOURCE_TYPE_CONFIG.official;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        w-5 h-5 rounded-full text-xs font-bold
        ${config.color} ${config.bgColor}
        ${className}
      `}
      title={config.label}
    >
      {config.icon}
    </span>
  );
}

/**
 * Source badge (simplified version)
 */
export function SourceBadge({
  source,
  className = '',
}: {
  source: string;
  className?: string;
}) {
  const sourceName = SOURCE_NAMES[source.toLowerCase()] || source;

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full
        text-xs font-medium
        bg-slate-100 dark:bg-slate-800
        text-slate-700 dark:text-slate-300
        ${className}
      `}
    >
      {sourceName}
    </span>
  );
}
