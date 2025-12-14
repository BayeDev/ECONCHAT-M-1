/**
 * EconChat M-2 - ScatterChart Component
 * Gapminder-style bubble chart with continent coloring
 *
 * OWID/Gapminder Specifications:
 * - Bubbles sized by population (sqrt scale)
 * - Continent-based coloring
 * - Log scale support for x-axis (GDP per capita)
 * - Tooltips showing country, values
 * - Optional timeline animation
 */

import { useMemo, useState } from 'react';
import {
  formatLargeNumber,
  getContinentColor
} from '../utils/formatters';

export interface BubbleDataPoint {
  id: string;
  label: string;          // Country/entity name
  x: number;              // X-axis value (e.g., GDP per capita)
  y: number;              // Y-axis value (e.g., life expectancy)
  size?: number;          // Bubble size (e.g., population)
  continent?: string;     // For coloring
  color?: string;         // Override color
  year?: number;          // For timeline animation
}

export interface ScatterChartProps {
  data: BubbleDataPoint[];
  title?: string;
  subtitle?: string;
  sourceAttribution?: string;
  xLabel?: string;
  yLabel?: string;
  xFormat?: 'number' | 'currency' | 'log';
  yFormat?: 'number' | 'percent';
  sizeLabel?: string;     // Label for size legend (e.g., "Population")
  showLegend?: boolean;
  height?: number;
  minBubbleRadius?: number;
  maxBubbleRadius?: number;
  useLogScaleX?: boolean; // Gapminder uses log scale for income
}

export default function ScatterChart({
  data,
  title,
  subtitle,
  sourceAttribution,
  xLabel,
  yLabel,
  xFormat = 'number',
  yFormat = 'number',
  sizeLabel = 'Population',
  showLegend = true,
  height = 500,
  minBubbleRadius = 4,
  maxBubbleRadius = 40,
  useLogScaleX = false
}: ScatterChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    point: BubbleDataPoint;
  } | null>(null);

  // Chart dimensions
  const width = 720;
  const margin = { top: 40, right: 120, bottom: 60, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const { xScale, yScale, sizeScale, xDomain, yDomain } = useMemo(() => {
    const xValues = data.map(d => d.x).filter(x => x > 0);
    const yValues = data.map(d => d.y);
    const sizeValues = data.map(d => d.size || 1);

    let xMin = Math.min(...xValues);
    let xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues) * 1.05;
    const sizeMin = Math.min(...sizeValues);
    const sizeMax = Math.max(...sizeValues);

    // Add padding for log scale
    if (useLogScaleX) {
      xMin = Math.max(1, xMin * 0.8);
      xMax = xMax * 1.2;
    } else {
      xMin = Math.min(0, xMin);
      xMax = xMax * 1.05;
    }

    // X scale (linear or log)
    const xScale = (x: number): number => {
      if (useLogScaleX && x > 0) {
        const logMin = Math.log10(xMin);
        const logMax = Math.log10(xMax);
        const logX = Math.log10(x);
        return margin.left + ((logX - logMin) / (logMax - logMin)) * innerWidth;
      }
      return margin.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
    };

    // Y scale (linear)
    const yScale = (y: number): number => {
      return margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;
    };

    // Size scale (sqrt for area perception)
    const sizeScale = (size: number): number => {
      const normalized = (Math.sqrt(size) - Math.sqrt(sizeMin)) /
                         (Math.sqrt(sizeMax) - Math.sqrt(sizeMin));
      return minBubbleRadius + normalized * (maxBubbleRadius - minBubbleRadius);
    };

    return {
      xScale,
      yScale,
      sizeScale,
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax]
    };
  }, [data, innerWidth, innerHeight, margin, useLogScaleX, minBubbleRadius, maxBubbleRadius]);

  // Format axis values
  const formatXValue = (value: number): string => {
    if (xFormat === 'currency') return '$' + formatLargeNumber(value);
    if (xFormat === 'log') return formatLargeNumber(value);
    return formatLargeNumber(value);
  };

  const formatYValue = (value: number): string => {
    if (yFormat === 'percent') return value.toFixed(1) + '%';
    return formatLargeNumber(value);
  };

  // Generate axis ticks
  const xTicks = useMemo(() => {
    const [min, max] = xDomain;
    if (useLogScaleX) {
      // Log scale ticks
      const logMin = Math.floor(Math.log10(min));
      const logMax = Math.ceil(Math.log10(max));
      const ticks: number[] = [];
      for (let i = logMin; i <= logMax; i++) {
        ticks.push(Math.pow(10, i));
        if (i < logMax) {
          ticks.push(2 * Math.pow(10, i));
          ticks.push(5 * Math.pow(10, i));
        }
      }
      return ticks.filter(t => t >= min && t <= max);
    }
    // Linear ticks
    const tickCount = 6;
    const step = (max - min) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => min + i * step);
  }, [xDomain, useLogScaleX]);

  const yTicks = useMemo(() => {
    const [min, max] = yDomain;
    const tickCount = 6;
    const step = (max - min) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => min + i * step);
  }, [yDomain]);

  // Get unique continents for legend
  const continents = useMemo(() => {
    const uniqueContinents = new Set(data.map(d => d.continent).filter(Boolean));
    return Array.from(uniqueContinents) as string[];
  }, [data]);

  // Handle mouse events
  const handleBubbleHover = (
    point: BubbleDataPoint,
    e: React.MouseEvent<SVGCircleElement>
  ) => {
    setHoveredPoint(point.id);
    const svg = e.currentTarget.closest('svg');
    const rect = svg?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        point
      });
    }
  };

  // Get bubble color
  const getBubbleColor = (point: BubbleDataPoint): string => {
    if (point.color) return point.color;
    if (point.continent) return getContinentColor(point.continent);
    return '#3360a9';
  };

  return (
    <div className="chart-container animate-fade-in" style={{ maxWidth: width }}>
      {/* Title - OWID: Georgia/Playfair 24px */}
      {title && (
        <h3
          className="chart-title"
          style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: '24px' }}
        >
          {title}
        </h3>
      )}
      {subtitle && (
        <p
          className="chart-subtitle"
          style={{ fontFamily: "var(--font-body), Lato, sans-serif", fontSize: '14px' }}
        >
          {subtitle}
        </p>
      )}

      {/* SVG Chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        onMouseLeave={() => {
          setHoveredPoint(null);
          setTooltip(null);
        }}
      >
        {/* Grid lines */}
        <g className="grid-lines">
          {yTicks.map((tick, i) => (
            <line
              key={`y-${i}`}
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="var(--grid-line, #e5e7eb)"
              strokeWidth={1}
            />
          ))}
          {xTicks.map((tick, i) => (
            <line
              key={`x-${i}`}
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={margin.top}
              y2={height - margin.bottom}
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
            y2={height - margin.bottom}
            stroke="var(--border-light, #d1d5db)"
            strokeWidth={1}
          />
          {yTicks.map((tick, i) => (
            <text
              key={i}
              x={margin.left - 10}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fontFamily="var(--font-body), Lato, sans-serif"
              fill="var(--text-secondary, #6b7280)"
            >
              {formatYValue(tick)}
            </text>
          ))}
          {yLabel && (
            <text
              x={-height / 2}
              y={20}
              transform="rotate(-90)"
              textAnchor="middle"
              fontSize="13"
              fontFamily="var(--font-body), Lato, sans-serif"
              fill="var(--text-secondary, #6b7280)"
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
            stroke="var(--border-light, #d1d5db)"
            strokeWidth={1}
          />
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={xScale(tick)}
              y={height - margin.bottom + 20}
              textAnchor="middle"
              fontSize="12"
              fontFamily="var(--font-body), Lato, sans-serif"
              fill="var(--text-secondary, #6b7280)"
            >
              {formatXValue(tick)}
            </text>
          ))}
          {xLabel && (
            <text
              x={margin.left + innerWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize="13"
              fontFamily="var(--font-body), Lato, sans-serif"
              fill="var(--text-secondary, #6b7280)"
            >
              {xLabel}
            </text>
          )}
        </g>

        {/* Bubbles - sorted by size (largest first) for proper layering */}
        {[...data]
          .sort((a, b) => (b.size || 1) - (a.size || 1))
          .map((point) => {
            const isHovered = hoveredPoint === point.id;
            const color = getBubbleColor(point);
            const radius = sizeScale(point.size || 1);

            return (
              <circle
                key={point.id}
                cx={xScale(point.x)}
                cy={yScale(point.y)}
                r={radius}
                fill={color}
                fillOpacity={isHovered ? 0.9 : 0.7}
                stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
                strokeWidth={isHovered ? 2 : 1}
                style={{
                  cursor: 'pointer',
                  transition: 'all 200ms ease'
                }}
                onMouseEnter={(e) => handleBubbleHover(point, e)}
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  setTooltip(null);
                }}
              />
            );
          })}

        {/* Country label for hovered bubble */}
        {hoveredPoint && data.find(d => d.id === hoveredPoint) && (
          <text
            x={xScale(data.find(d => d.id === hoveredPoint)!.x)}
            y={yScale(data.find(d => d.id === hoveredPoint)!.y) -
               sizeScale(data.find(d => d.id === hoveredPoint)!.size || 1) - 8}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fontFamily="var(--font-body), Lato, sans-serif"
            fill="var(--text-primary, #1f2937)"
          >
            {data.find(d => d.id === hoveredPoint)!.label}
          </text>
        )}
      </svg>

      {/* Continent Legend */}
      {showLegend && continents.length > 0 && (
        <div className="chart-legend" style={{ marginTop: '16px' }}>
          {continents.map((continent) => (
            <div key={continent} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getContinentColor(continent)
                }}
              />
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-body), Lato, sans-serif' }}>
                {continent}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Size Legend */}
      {showLegend && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary, #6b7280)' }}>
            {sizeLabel}:
          </span>
          {[minBubbleRadius, (minBubbleRadius + maxBubbleRadius) / 2, maxBubbleRadius].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width={r * 2 + 4} height={r * 2 + 4}>
                <circle
                  cx={r + 2}
                  cy={r + 2}
                  r={r}
                  fill="#ccc"
                  fillOpacity={0.5}
                  stroke="#999"
                  strokeWidth={1}
                />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          className="chart-tooltip visible"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 60,
            position: 'absolute',
            minWidth: '140px'
          }}
        >
          <div className="tooltip-title" style={{ fontWeight: 600 }}>
            {tooltip.point.label}
          </div>
          {tooltip.point.continent && (
            <div style={{ fontSize: '11px', color: getContinentColor(tooltip.point.continent) }}>
              {tooltip.point.continent}
            </div>
          )}
          <div className="tooltip-label" style={{ marginTop: '4px' }}>
            {xLabel || 'X'}: {formatXValue(tooltip.point.x)}
          </div>
          <div className="tooltip-label">
            {yLabel || 'Y'}: {formatYValue(tooltip.point.y)}
          </div>
          {tooltip.point.size && (
            <div className="tooltip-label">
              {sizeLabel}: {formatLargeNumber(tooltip.point.size)}
            </div>
          )}
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
// Specialized Scatter Chart Variants
// ============================================

/**
 * Gapminder-style bubble chart (GDP vs Life Expectancy)
 */
export function GapminderChart(
  props: Omit<ScatterChartProps, 'useLogScaleX' | 'xLabel' | 'yLabel' | 'xFormat'>
) {
  return (
    <ScatterChart
      {...props}
      useLogScaleX={true}
      xLabel="GDP per capita (USD, log scale)"
      yLabel="Life expectancy (years)"
      xFormat="currency"
    />
  );
}

/**
 * Development indicators chart
 */
export function DevelopmentChart(
  props: Omit<ScatterChartProps, 'showLegend'>
) {
  return (
    <ScatterChart
      {...props}
      showLegend={true}
    />
  );
}
