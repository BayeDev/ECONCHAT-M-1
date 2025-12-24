"use client";
/**
 * EconChat M-2 - LineChart Component
 * SVG-based line chart with OWID-style inline legends and typography
 *
 * OWID Specifications:
 * - Line stroke: 1.2px solid (2.5px hover), Circle markers: 2.5px radius
 * - Typography: Georgia/Playfair 24px titles, Lato 12px labels
 * - Inline legend labels at last data point
 * - Dashed lines for forecasts/projections
 */

import { useMemo, useState, useRef } from 'react';
import {
  formatLargeNumber,
  formatPercent,
  getSeriesColor
} from '../utils/formatters';
import ChartExport from './ChartExport';

export interface DataPoint {
  x: number | string;
  y: number | null;
  label?: string;
}

export interface Series {
  name: string;
  data: DataPoint[];
  color?: string;
}

export interface LineChartProps {
  series: Series[];
  title?: string;
  subtitle?: string;
  sourceAttribution?: string;
  xLabel?: string;
  yLabel?: string;
  yFormat?: 'number' | 'percent' | 'currency';
  showForecasts?: boolean;
  forecastStartYear?: number;
  showLegend?: boolean;
  directLabeling?: boolean;
  height?: number;
  strokeWidth?: number;        // OWID default: 1.2px
  markerRadius?: number;       // OWID default: 2.5px
  hoverStrokeWidth?: number;   // OWID default: 2.5px
}

export default function LineChart({
  series,
  title,
  subtitle,
  sourceAttribution,
  xLabel,
  yLabel,
  yFormat = 'number',
  showForecasts = true,
  forecastStartYear,
  showLegend = true,
  directLabeling = true,
  height = 400,
  strokeWidth = 1.2,      // OWID spec
  markerRadius = 2.5,     // OWID spec
  hoverStrokeWidth = 2.5  // OWID spec
}: LineChartProps) {
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: { series: string; x: string; y: string };
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Chart dimensions - use smaller viewBox so text appears larger when scaled
  const width = 400;
  const chartHeight = 250;
  const margin = { top: 20, right: directLabeling ? 60 : 20, bottom: 50, left: 65 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Font sizes - larger to compensate for SVG scaling
  const fontSize = {
    axis: 14,
    axisTitle: 13,
    seriesLabel: 14
  };

  // Calculate scales
  const { xScale, yScale, xDomain, yDomain } = useMemo(() => {
    // Debug: log what data we're receiving
    console.log('[LineChart] series received:', series.map(s => ({
      name: s.name,
      dataPoints: s.data.length,
      xRange: s.data.length > 0 ? `${s.data[0]?.x} - ${s.data[s.data.length-1]?.x}` : 'empty',
      yRange: s.data.length > 0 ? `${s.data[0]?.y} - ${s.data[s.data.length-1]?.y}` : 'empty'
    })));

    // Get all x values
    const allX = series.flatMap(s => s.data.map(d => d.x));
    const numericX = allX.filter(x => typeof x === 'number') as number[];

    let xMin: number, xMax: number;
    if (numericX.length > 0 && numericX.length === allX.length) {
      xMin = Math.min(...numericX);
      xMax = Math.max(...numericX);
    } else {
      xMin = 0;
      xMax = Math.max(allX.length - 1, 1);
    }

    // Get all y values (filter out null/undefined)
    const allY = series.flatMap(s => s.data.map(d => d.y).filter((y): y is number => y !== null && y !== undefined));

    // Handle empty data case
    const yMin = allY.length > 0 ? Math.min(0, Math.min(...allY)) : 0;
    const yMax = allY.length > 0 ? Math.max(...allY) * 1.1 : 100; // 10% padding, default to 100 if no data

    // Scale functions with protection against division by zero
    const xRange = xMax - xMin || 1; // Prevent division by zero
    const yRange = yMax - yMin || 1; // Prevent division by zero

    const xScale = (x: number | string): number => {
      const numX = typeof x === 'number' ? x : 0;
      return margin.left + ((numX - xMin) / xRange) * innerWidth;
    };

    const yScale = (y: number): number => {
      return margin.top + innerHeight - ((y - yMin) / yRange) * innerHeight;
    };

    return {
      xScale,
      yScale,
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax]
    };
  }, [series, innerWidth, innerHeight, margin]);

  // Generate path data for a series
  const generatePath = (data: DataPoint[]): string => {
    const validPoints = data.filter(d => d.y !== null);
    if (validPoints.length === 0) return '';

    return validPoints
      .map((d, i) => {
        const x = xScale(d.x);
        const y = yScale(d.y!);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Format y-axis value
  const formatYValue = (value: number): string => {
    switch (yFormat) {
      case 'percent':
        return formatPercent(value, 1);
      case 'currency':
        return '$' + formatLargeNumber(value);
      default:
        return formatLargeNumber(value);
    }
  };

  // Generate y-axis ticks
  const yTicks = useMemo(() => {
    const [min, max] = yDomain;
    const tickCount = 5;
    const step = (max - min) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => min + i * step);
  }, [yDomain]);

  // Generate x-axis ticks
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

  // Determine forecast region
  const forecastX = forecastStartYear
    ? xScale(forecastStartYear)
    : showForecasts
      ? xScale(new Date().getFullYear() + 1)
      : null;

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find closest point
    type ClosestPoint = { seriesName: string; xVal: number | string; yVal: number; dist: number };
    let closest: ClosestPoint | null = null;

    for (const s of series) {
      for (const d of s.data) {
        if (d.y === null) continue;
        const px = xScale(d.x);
        const py = yScale(d.y);
        const distance = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

        if (distance < 30 && (closest === null || distance < closest.dist)) {
          closest = { seriesName: s.name, xVal: d.x, yVal: d.y, dist: distance };
        }
      }
    }

    if (closest) {
      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        content: {
          series: closest.seriesName,
          x: String(closest.xVal),
          y: formatYValue(closest.yVal)
        }
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="chart-container animate-fade-in" ref={chartRef}>
      {/* Header with title and export */}
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="flex-1 min-w-0">
          {/* Title - smaller, balanced with chart */}
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
        </div>
        {/* Export button */}
        <div className="flex-shrink-0">
          <ChartExport
            data={{
              title: title,
              series: series.map(s => ({ name: s.name, data: s.data.map(d => ({ x: d.x, y: d.y })) })),
              source: sourceAttribution
            }}
            chartRef={chartRef}
            filename={title?.toLowerCase().replace(/\s+/g, '-') || 'chart-data'}
          />
        </div>
      </div>

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
        {/* Forecast region background */}
        {forecastX && forecastX < width - margin.right && (
          <rect
            x={forecastX}
            y={margin.top}
            width={width - margin.right - forecastX}
            height={innerHeight}
            fill="rgba(0, 0, 0, 0.03)"
          />
        )}

        {/* Grid lines */}
        <g className="grid-lines">
          {yTicks.map((tick, i) => (
            <line
              key={i}
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="var(--grid-line)"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Zero line if applicable */}
        {yDomain[0] < 0 && yDomain[1] > 0 && (
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={yScale(0)}
            y2={yScale(0)}
            stroke="var(--border-medium)"
            strokeWidth={1}
          />
        )}

        {/* Y-axis */}
        <g className="y-axis">
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={chartHeight - margin.bottom}
            stroke="var(--border-light)"
            strokeWidth={1}
          />
          {yTicks.map((tick, i) => (
            <g key={i}>
              <text
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
            </g>
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
              style={{ fontFamily: 'var(--font-body), Lato, sans-serif' }}
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
            stroke="var(--border-light)"
            strokeWidth={1}
          />
          {xTicks.map((tick, i) => (
            <g key={i}>
              <text
                x={xScale(tick)}
                y={chartHeight - margin.bottom + 18}
                textAnchor="middle"
                fontSize={fontSize.axis}
                fontWeight="500"
                fill="var(--text-secondary)"
              >
                {tick}
              </text>
            </g>
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

        {/* Data lines */}
        {series.map((s, i) => {
          const color = s.color || getSeriesColor(i);
          const isHovered = hoveredSeries === s.name;
          const isMuted = hoveredSeries !== null && !isHovered;
          const opacity = isMuted ? 0.3 : 1;

          // Split into historical and forecast portions
          const forecastStart = forecastStartYear || new Date().getFullYear() + 1;
          const historicalData = s.data.filter(d => typeof d.x === 'number' && d.x < forecastStart);
          const forecastData = s.data.filter(d => typeof d.x === 'number' && d.x >= forecastStart);

          return (
            <g key={s.name} opacity={opacity}>
              {/* Historical line (solid) - OWID: 1.2px stroke, 2.5px on hover */}
              <path
                d={generatePath(historicalData)}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? hoverStrokeWidth : strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-fade-in line-path"
                style={{ transition: 'stroke-width 200ms ease' }}
              />

              {/* Forecast line (dashed) */}
              {forecastData.length > 0 && (
                <path
                  d={generatePath([historicalData[historicalData.length - 1], ...forecastData])}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? hoverStrokeWidth : strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6,4"
                  className="animate-fade-in line-path"
                  style={{ transition: 'stroke-width 200ms ease' }}
                />
              )}

              {/* Data points - OWID: 2.5px radius markers */}
              {s.data.map((d, j) => {
                if (d.y === null) return null;
                const pointRadius = isHovered ? markerRadius * 1.6 : markerRadius;
                return (
                  <circle
                    key={j}
                    cx={xScale(d.x)}
                    cy={yScale(d.y)}
                    r={pointRadius}
                    fill={color}
                    stroke="white"
                    strokeWidth={1.5}
                    className="data-marker"
                    style={{ transition: 'r 200ms ease' }}
                  />
                );
              })}

              {/* Direct label (OWID style) */}
              {directLabeling && s.data.length > 0 && (
                <text
                  x={xScale(s.data[s.data.length - 1].x) + 8}
                  y={yScale(s.data[s.data.length - 1].y || 0)}
                  dominantBaseline="middle"
                  fontSize={fontSize.seriesLabel}
                  fontWeight="600"
                  fill={color}
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend (if not using direct labeling) */}
      {showLegend && !directLabeling && (
        <div className="chart-legend">
          {series.map((s, i) => {
            const color = s.color || getSeriesColor(i);
            return (
              <div
                key={s.name}
                className={`legend-item ${hoveredSeries === s.name ? '' : hoveredSeries ? 'muted' : ''}`}
                onMouseEnter={() => setHoveredSeries(s.name)}
                onMouseLeave={() => setHoveredSeries(null)}
              >
                <div className="legend-line" style={{ backgroundColor: color }} />
                <span className="legend-label">{s.name}</span>
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
            left: tooltip.x + 10,
            top: tooltip.y - 40,
            position: 'absolute'
          }}
        >
          <div className="tooltip-title">{tooltip.content.series}</div>
          <div className="tooltip-label">{tooltip.content.x}</div>
          <div className="tooltip-value">{tooltip.content.y}</div>
        </div>
      )}

      {/* Source attribution */}
      {sourceAttribution && (
        <div className="chart-source">{sourceAttribution}</div>
      )}
    </div>
  );
}
