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

  // Chart dimensions - increased left margin for Y-axis label
  const width = 720;
  const margin = { top: 20, right: directLabeling ? 100 : 20, bottom: 50, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const { xScale, yScale, xDomain, yDomain } = useMemo(() => {
    // Get all x values
    const allX = series.flatMap(s => s.data.map(d => d.x));
    const numericX = allX.filter(x => typeof x === 'number') as number[];

    let xMin: number, xMax: number;
    if (numericX.length === allX.length) {
      xMin = Math.min(...numericX);
      xMax = Math.max(...numericX);
    } else {
      xMin = 0;
      xMax = allX.length - 1;
    }

    // Get all y values
    const allY = series.flatMap(s => s.data.map(d => d.y).filter(y => y !== null)) as number[];
    const yMin = Math.min(0, Math.min(...allY));
    const yMax = Math.max(...allY) * 1.1; // 10% padding

    // Scale functions
    const xScale = (x: number | string): number => {
      const numX = typeof x === 'number' ? x : 0;
      return margin.left + ((numX - xMin) / (xMax - xMin)) * innerWidth;
    };

    const yScale = (y: number): number => {
      return margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;
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
    <div className="chart-container animate-fade-in" style={{ maxWidth: width }} ref={chartRef}>
      {/* Header with title and export */}
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="flex-1 min-w-0">
          {/* Title - OWID: Georgia/Playfair 24px, semibold */}
          {title && (
            <h3
              className="chart-title"
              style={{ fontFamily: "var(--font-display, 'Georgia'), Georgia, serif", fontSize: '24px' }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="chart-subtitle"
              style={{ fontFamily: "var(--font-body, 'Lato'), Lato, sans-serif", fontSize: '14px' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {/* Export button - always visible */}
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
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible chart-svg"
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
            y2={height - margin.bottom}
            stroke="var(--border-light)"
            strokeWidth={1}
          />
          {yTicks.map((tick, i) => (
            <g key={i}>
              <text
                x={margin.left - 10}
                y={yScale(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="12"
                fill="var(--text-secondary)"
              >
                {formatYValue(tick)}
              </text>
            </g>
          ))}
          {yLabel && (
            <text
              x={-(margin.top + innerHeight / 2)}
              y={20}
              transform="rotate(-90)"
              textAnchor="middle"
              fontSize="12"
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
            y1={height - margin.bottom}
            y2={height - margin.bottom}
            stroke="var(--border-light)"
            strokeWidth={1}
          />
          {xTicks.map((tick, i) => (
            <g key={i}>
              <text
                x={xScale(tick)}
                y={height - margin.bottom + 20}
                textAnchor="middle"
                fontSize="12"
                fill="var(--text-secondary)"
              >
                {tick}
              </text>
            </g>
          ))}
          {xLabel && (
            <text
              x={margin.left + innerWidth / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize="12"
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
                  fontSize="12"
                  fontWeight="500"
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
