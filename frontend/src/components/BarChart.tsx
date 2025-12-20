"use client";
/**
 * EconChat M-2 - BarChart Component
 * SVG-based bar chart with World Bank DataBank styling
 */

import { useMemo, useState, useRef } from 'react';
import {
  formatLargeNumber,
  formatPercent,
  getSeriesColor
} from '../utils/formatters';
import ChartExport from './ChartExport';

export interface BarData {
  label: string;
  value: number | null;
  color?: string;
  group?: string;
}

export interface BarChartProps {
  data: BarData[];
  title?: string;
  subtitle?: string;
  sourceAttribution?: string;
  orientation?: 'vertical' | 'horizontal';
  yFormat?: 'number' | 'percent' | 'currency';
  showValues?: boolean;
  showGrid?: boolean;
  barWidth?: number;
  height?: number;
  colorByValue?: boolean; // Use positive/negative colors
}

export default function BarChart({
  data,
  title,
  subtitle,
  sourceAttribution,
  orientation = 'vertical',
  yFormat = 'number',
  showValues = true,
  showGrid = true,
  barWidth = 0.66, // World Bank standard: 2/3 bars, 1/3 spacing
  height = 400,
  colorByValue = false
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: { label: string; value: string };
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Chart dimensions
  const width = 680;
  const margin = orientation === 'horizontal'
    ? { top: 20, right: 80, bottom: 30, left: 120 }
    : { top: 20, right: 20, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Filter out null values
  const validData = data.filter(d => d.value !== null) as (BarData & { value: number })[];

  // Calculate scales
  const { valueScale, valueDomain, valueTicks } = useMemo(() => {
    const values = validData.map(d => d.value);
    const maxValue = Math.max(...values, 0) * 1.1;
    const minValue = Math.min(...values, 0);

    const domain: [number, number] = [
      minValue < 0 ? minValue * 1.1 : 0,
      maxValue
    ];

    // Value scale
    const scale = (value: number): number => {
      const range = orientation === 'horizontal' ? innerWidth : innerHeight;
      const normalized = (value - domain[0]) / (domain[1] - domain[0]);
      return orientation === 'horizontal'
        ? normalized * range
        : range - normalized * range;
    };

    // Generate ticks
    const tickCount = 5;
    const step = (domain[1] - domain[0]) / (tickCount - 1);
    const ticks = Array.from({ length: tickCount }, (_, i) => domain[0] + i * step);

    return { valueScale: scale, valueDomain: domain, valueTicks: ticks };
  }, [validData, innerWidth, innerHeight, orientation]);

  // Category scale
  const categoryScale = useMemo(() => {
    const bandWidth = (orientation === 'horizontal' ? innerHeight : innerWidth) / validData.length;
    return (index: number): number => {
      return bandWidth * index + bandWidth / 2;
    };
  }, [validData.length, innerWidth, innerHeight, orientation]);

  // Bar dimensions
  const bandWidth = (orientation === 'horizontal' ? innerHeight : innerWidth) / validData.length;
  const actualBarWidth = bandWidth * barWidth;

  // Format value
  const formatValue = (value: number): string => {
    switch (yFormat) {
      case 'percent':
        return formatPercent(value, 1);
      case 'currency':
        return '$' + formatLargeNumber(value);
      default:
        return formatLargeNumber(value);
    }
  };

  // Get bar color
  const getBarColor = (d: BarData, index: number): string => {
    if (d.color) return d.color;
    if (colorByValue && d.value !== null) {
      return d.value >= 0 ? 'var(--positive)' : 'var(--negative)';
    }
    return getSeriesColor(index);
  };

  // Handle mouse events
  const handleBarHover = (
    index: number,
    e: React.MouseEvent<SVGRectElement>,
    d: BarData & { value: number }
  ) => {
    setHoveredIndex(index);
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (parentRect) {
      setTooltip({
        visible: true,
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top - 10,
        content: {
          label: d.label,
          value: formatValue(d.value)
        }
      });
    }
  };

  // Zero line position
  const zeroPosition = valueScale(0);

  // Convert bar data to series format for export
  const exportSeries = useMemo(() => [{
    name: title || 'Data',
    data: data.map(d => ({ x: d.label, y: d.value }))
  }], [data, title]);

  return (
    <div className="chart-container animate-fade-in" style={{ maxWidth: width }} ref={chartRef}>
      {/* Header with title and export */}
      <div className="chart-header flex items-start justify-between mb-2">
        <div className="flex-1">
          {title && <h3 className="chart-title">{title}</h3>}
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        {/* Export button */}
        <ChartExport
          data={{
            title: title,
            series: exportSeries,
            source: sourceAttribution
          }}
          chartRef={chartRef}
          filename={title?.toLowerCase().replace(/\s+/g, '-') || 'chart-data'}
        />
      </div>

      {/* SVG Chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible chart-svg"
        data-chart="true"
        onMouseLeave={() => {
          setHoveredIndex(null);
          setTooltip(null);
        }}
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="grid-lines">
            {valueTicks.map((tick, i) => (
              orientation === 'horizontal' ? (
                <line
                  key={i}
                  x1={margin.left + valueScale(tick)}
                  x2={margin.left + valueScale(tick)}
                  y1={margin.top}
                  y2={height - margin.bottom}
                  stroke="var(--grid-line)"
                  strokeWidth={1}
                />
              ) : (
                <line
                  key={i}
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={margin.top + valueScale(tick)}
                  y2={margin.top + valueScale(tick)}
                  stroke="var(--grid-line)"
                  strokeWidth={1}
                />
              )
            ))}
          </g>
        )}

        {/* Zero line */}
        {valueDomain[0] < 0 && (
          orientation === 'horizontal' ? (
            <line
              x1={margin.left + zeroPosition}
              x2={margin.left + zeroPosition}
              y1={margin.top}
              y2={height - margin.bottom}
              stroke="var(--border-medium)"
              strokeWidth={1}
            />
          ) : (
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={margin.top + zeroPosition}
              y2={margin.top + zeroPosition}
              stroke="var(--border-medium)"
              strokeWidth={1}
            />
          )
        )}

        {/* Bars */}
        {validData.map((d, i) => {
          const color = getBarColor(d, i);
          const isHovered = hoveredIndex === i;
          const barStart = d.value >= 0 ? zeroPosition : valueScale(d.value);
          const barLength = Math.abs(valueScale(d.value) - zeroPosition);

          if (orientation === 'horizontal') {
            const y = margin.top + categoryScale(i) - actualBarWidth / 2;
            const x = margin.left + (d.value >= 0 ? zeroPosition : barStart);

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barLength}
                  height={actualBarWidth}
                  fill={color}
                  opacity={isHovered ? 1 : 0.85}
                  rx={2}
                  style={{
                    transition: 'opacity 200ms ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => handleBarHover(i, e, d)}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setTooltip(null);
                  }}
                />
                {/* Value label */}
                {showValues && (
                  <text
                    x={x + barLength + 5}
                    y={y + actualBarWidth / 2}
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="var(--text-secondary)"
                  >
                    {formatValue(d.value)}
                  </text>
                )}
                {/* Category label */}
                <text
                  x={margin.left - 8}
                  y={y + actualBarWidth / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="var(--text-primary)"
                >
                  {d.label}
                </text>
              </g>
            );
          } else {
            const x = margin.left + categoryScale(i) - actualBarWidth / 2;
            const y = margin.top + (d.value >= 0 ? barStart - barLength : zeroPosition);

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={actualBarWidth}
                  height={barLength}
                  fill={color}
                  opacity={isHovered ? 1 : 0.85}
                  rx={2}
                  style={{
                    transition: 'opacity 200ms ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => handleBarHover(i, e, d)}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setTooltip(null);
                  }}
                />
                {/* Value label (at top of bar) */}
                {showValues && (
                  <text
                    x={x + actualBarWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-secondary)"
                  >
                    {formatValue(d.value)}
                  </text>
                )}
                {/* Category label */}
                <text
                  x={x + actualBarWidth / 2}
                  y={height - margin.bottom + 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--text-primary)"
                  transform={`rotate(-45, ${x + actualBarWidth / 2}, ${height - margin.bottom + 15})`}
                >
                  {d.label.length > 12 ? d.label.slice(0, 12) + '...' : d.label}
                </text>
              </g>
            );
          }
        })}

        {/* Value axis */}
        <g className="value-axis">
          {valueTicks.map((tick, i) => (
            orientation === 'horizontal' ? (
              <text
                key={i}
                x={margin.left + valueScale(tick)}
                y={height - margin.bottom + 15}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {formatValue(tick)}
              </text>
            ) : (
              <text
                key={i}
                x={margin.left - 8}
                y={margin.top + valueScale(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {formatValue(tick)}
              </text>
            )
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          className="chart-tooltip visible"
          style={{
            left: tooltip.x,
            top: tooltip.y - 40,
            position: 'absolute',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="tooltip-title">{tooltip.content.label}</div>
          <div className="tooltip-value">{tooltip.content.value}</div>
        </div>
      )}

      {/* Source attribution */}
      {sourceAttribution && (
        <div className="chart-source">{sourceAttribution}</div>
      )}
    </div>
  );
}

// ============================================
// Specialized Bar Chart Variants
// ============================================

/**
 * Horizontal bar chart for rankings (World Bank DataBank style)
 */
export function RankingChart(props: Omit<BarChartProps, 'orientation'>) {
  return <BarChart {...props} orientation="horizontal" showValues />;
}

/**
 * Trade partners chart (UN COMTRADE style)
 */
export function TradePartnersChart(
  props: Omit<BarChartProps, 'orientation' | 'yFormat'>
) {
  return (
    <BarChart
      {...props}
      orientation="horizontal"
      yFormat="currency"
      showValues
    />
  );
}
