"use client";
/**
 * EconChat M-2 - AreaChart Component
 * Stacked area chart for composition over time (OWID-style)
 *
 * Use cases:
 * - Energy mix over time
 * - Export/import composition
 * - Population age structure
 * - Crop production breakdown
 */

import { useMemo, useState } from 'react';
import {
  formatLargeNumber,
  formatPercent,
  getSeriesColor
} from '../utils/formatters';

export interface AreaSeries {
  name: string;
  data: { x: number; y: number }[];
  color?: string;
}

export interface AreaChartProps {
  series: AreaSeries[];
  title?: string;
  subtitle?: string;
  sourceAttribution?: string;
  xLabel?: string;
  yLabel?: string;
  yFormat?: 'number' | 'percent';
  stacked?: boolean;          // Stack areas (default: true)
  normalized?: boolean;       // Show as 100% stacked
  showLegend?: boolean;
  height?: number;
}

export default function AreaChart({
  series,
  title,
  subtitle,
  sourceAttribution,
  xLabel,
  yLabel,
  yFormat = 'number',
  stacked = true,
  normalized = false,
  showLegend = true,
  height = 400
}: AreaChartProps) {
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    xValue: number;
    values: { name: string; value: number; color: string }[];
  } | null>(null);

  // Chart dimensions - use smaller viewBox so text appears larger when scaled
  const width = 420;
  const chartHeight = 260;
  const margin = { top: 20, right: 80, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Font sizes - larger to compensate for SVG scaling
  const fontSize = {
    axis: 14,
    axisTitle: 13,
    legend: 13
  };

  // Process data for stacking
  const { stackedData, xDomain, yDomain, xScale, yScale } = useMemo(() => {
    // Get all x values across all series
    const allX = new Set<number>();
    series.forEach(s => s.data.forEach(d => allX.add(d.x)));
    const sortedX = Array.from(allX).sort((a, b) => a - b);

    const xMin = sortedX[0];
    const xMax = sortedX[sortedX.length - 1];

    // Create aligned data with cumulative y values for stacking
    const alignedData: { x: number; values: number[]; cumulative: number[] }[] = sortedX.map(x => {
      const values = series.map(s => {
        const point = s.data.find(d => d.x === x);
        return point ? point.y : 0;
      });

      // For normalized, calculate percentages
      if (normalized) {
        const total = values.reduce((sum, v) => sum + v, 0);
        const normalizedValues = total > 0 ? values.map(v => (v / total) * 100) : values;
        const cumulative: number[] = [];
        let acc = 0;
        normalizedValues.forEach(v => {
          acc += v;
          cumulative.push(acc);
        });
        return { x, values: normalizedValues, cumulative };
      }

      // Regular stacking
      if (stacked) {
        const cumulative: number[] = [];
        let acc = 0;
        values.forEach(v => {
          acc += v;
          cumulative.push(acc);
        });
        return { x, values, cumulative };
      }

      // No stacking - each value is its own cumulative
      return { x, values, cumulative: values };
    });

    // Calculate y domain
    let yMax: number;
    if (normalized) {
      yMax = 100;
    } else if (stacked) {
      yMax = Math.max(...alignedData.map(d => d.cumulative[d.cumulative.length - 1])) * 1.05;
    } else {
      yMax = Math.max(...alignedData.flatMap(d => d.values)) * 1.05;
    }

    // Scale functions
    const xScale = (x: number): number => {
      return margin.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
    };

    const yScale = (y: number): number => {
      return margin.top + innerHeight - (y / yMax) * innerHeight;
    };

    return {
      stackedData: alignedData,
      xDomain: [xMin, xMax],
      yDomain: [0, yMax],
      xScale,
      yScale
    };
  }, [series, innerWidth, innerHeight, margin, stacked, normalized]);

  // Generate area path for a series
  const generateAreaPath = (seriesIndex: number): string => {
    if (stackedData.length === 0) return '';

    // Top line (current series cumulative)
    const topPoints = stackedData.map(d => ({
      x: xScale(d.x),
      y: yScale(d.cumulative[seriesIndex])
    }));

    // Bottom line (previous series cumulative, or 0 for first series)
    const bottomPoints = stackedData.map(d => ({
      x: xScale(d.x),
      y: seriesIndex === 0 ? yScale(0) : yScale(d.cumulative[seriesIndex - 1])
    })).reverse();

    // Create path
    let path = `M ${topPoints[0].x} ${topPoints[0].y}`;
    topPoints.slice(1).forEach(p => {
      path += ` L ${p.x} ${p.y}`;
    });
    bottomPoints.forEach(p => {
      path += ` L ${p.x} ${p.y}`;
    });
    path += ' Z';

    return path;
  };

  // Format y-axis value
  const formatYValue = (value: number): string => {
    if (yFormat === 'percent' || normalized) {
      return formatPercent(value, 0);
    }
    return formatLargeNumber(value);
  };

  // Generate ticks
  const yTicks = useMemo(() => {
    const [min, max] = yDomain;
    const tickCount = 5;
    const step = (max - min) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => min + i * step);
  }, [yDomain]);

  const xTicks = useMemo(() => {
    const [min, max] = xDomain;
    const range = max - min;
    const step = range <= 10 ? 1 : range <= 30 ? 5 : 10;
    const ticks: number[] = [];
    for (let i = Math.ceil(min / step) * step; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [xDomain]);

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find closest x value
    const scaledX = ((mouseX - margin.left) / innerWidth) * (xDomain[1] - xDomain[0]) + xDomain[0];
    const closestPoint = stackedData.reduce((closest, d) => {
      return Math.abs(d.x - scaledX) < Math.abs(closest.x - scaledX) ? d : closest;
    });

    if (closestPoint) {
      const values = series.map((s, i) => ({
        name: s.name,
        value: closestPoint.values[i],
        color: s.color || getSeriesColor(i)
      }));

      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        xValue: closestPoint.x,
        values
      });
    }
  };

  return (
    <div className="chart-container animate-fade-in" style={{ maxWidth: width }}>
      {/* Title */}
      {title && (
        <h3
          className="chart-title text-base font-semibold text-gray-800 dark:text-slate-200"
          style={{ fontFamily: "var(--font-body, 'Inter'), Inter, sans-serif" }}
        >
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          {subtitle}
        </p>
      )}

      {/* SVG Chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${chartHeight}`}
        className="overflow-visible chart-svg"
        style={{ maxHeight: height }}
        data-chart="true"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        <g className="grid-lines">
          {yTicks.map((tick, i) => (
            <line
              key={i}
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="var(--grid-line, #e5e7eb)"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Y-axis */}
        <g className="y-axis">
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={chartHeight - margin.bottom}
            stroke="var(--border-light, #d1d5db)"
            strokeWidth={1}
          />
          {yTicks.map((tick, i) => (
            <text
              key={i}
              x={margin.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={fontSize.axis}
              fontWeight="500"
              fill="var(--text-secondary)"
            >
              {formatYValue(tick)}
            </text>
          ))}
          {yLabel && (
            <text
              x={-(margin.top + innerHeight / 2)}
              y={12}
              transform="rotate(-90)"
              textAnchor="middle"
              fontSize={fontSize.axisTitle}
              fontWeight="500"
              fill="var(--text-secondary)"
            >
              {yLabel}
            </text>
          )}
        </g>

        {/* X-axis */}
        <g className="x-axis">
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={chartHeight - margin.bottom}
            y2={chartHeight - margin.bottom}
            stroke="var(--border-light, #d1d5db)"
            strokeWidth={1}
          />
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={xScale(tick)}
              y={chartHeight - margin.bottom + 18}
              textAnchor="middle"
              fontSize={fontSize.axis}
              fontWeight="500"
              fill="var(--text-secondary)"
            >
              {tick}
            </text>
          ))}
          {xLabel && (
            <text
              x={margin.left + innerWidth / 2}
              y={chartHeight - 8}
              textAnchor="middle"
              fontSize={fontSize.axisTitle}
              fontWeight="500"
              fill="var(--text-secondary)"
            >
              {xLabel}
            </text>
          )}
        </g>

        {/* Stacked areas - render in reverse order so first series is on top */}
        {[...series].reverse().map((s, reversedIndex) => {
          const i = series.length - 1 - reversedIndex;
          const color = s.color || getSeriesColor(i);
          const isHovered = hoveredSeries === s.name;
          const isMuted = hoveredSeries !== null && !isHovered;

          return (
            <path
              key={s.name}
              d={generateAreaPath(i)}
              fill={color}
              fillOpacity={isMuted ? 0.3 : 0.7}
              stroke={color}
              strokeWidth={isHovered ? 2 : 1}
              strokeOpacity={0.8}
              className="animate-fade-in"
              style={{ transition: 'all 200ms ease' }}
              onMouseEnter={() => setHoveredSeries(s.name)}
              onMouseLeave={() => setHoveredSeries(null)}
            />
          );
        })}

        {/* Vertical hover line */}
        {tooltip && (
          <line
            x1={xScale(tooltip.xValue)}
            x2={xScale(tooltip.xValue)}
            y1={margin.top}
            y2={chartHeight - margin.bottom}
            stroke="var(--text-secondary)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="chart-legend" style={{ marginTop: '16px', flexWrap: 'wrap' }}>
          {series.map((s, i) => {
            const color = s.color || getSeriesColor(i);
            const isHovered = hoveredSeries === s.name;
            return (
              <div
                key={s.name}
                className="legend-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: hoveredSeries && !isHovered ? 0.4 : 1,
                  cursor: 'pointer',
                  transition: 'opacity 200ms ease'
                }}
                onMouseEnter={() => setHoveredSeries(s.name)}
                onMouseLeave={() => setHoveredSeries(null)}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    backgroundColor: color,
                    borderRadius: '2px'
                  }}
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          className="chart-tooltip visible"
          style={{
            left: Math.min(tooltip.x + 15, width - 180),
            top: tooltip.y - 20,
            position: 'absolute',
            minWidth: '150px'
          }}
        >
          <div className="tooltip-title" style={{ fontWeight: 600, marginBottom: '8px' }}>
            {tooltip.xValue}
          </div>
          {tooltip.values.map((v, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: v.color,
                    borderRadius: '2px'
                  }}
                />
                <span style={{ fontSize: '12px' }}>{v.name}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {formatYValue(v.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Source attribution */}
      {sourceAttribution && (
        <div className="chart-source" style={{ marginTop: '12px' }}>{sourceAttribution}</div>
      )}
    </div>
  );
}

// ============================================
// Specialized Area Chart Variants
// ============================================

/**
 * 100% stacked area chart for composition
 */
export function CompositionChart(
  props: Omit<AreaChartProps, 'normalized' | 'stacked' | 'yFormat'>
) {
  return (
    <AreaChart
      {...props}
      normalized={true}
      stacked={true}
      yFormat="percent"
    />
  );
}

/**
 * Energy mix chart (OWID style)
 */
export function EnergyMixChart(
  props: Omit<AreaChartProps, 'yLabel'>
) {
  return (
    <AreaChart
      {...props}
      yLabel="Energy consumption (TWh)"
    />
  );
}
