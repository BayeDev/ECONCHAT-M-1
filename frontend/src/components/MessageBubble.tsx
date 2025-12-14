/**
 * EconChat M-2 - MessageBubble Component
 * Enhanced message display with source-specific styling and chart rendering
 */

import { useMemo } from 'react';
import { type DataSource } from '../utils/formatters';
import LineChart from './LineChart';
import BarChart from './BarChart';

// Chart data types
interface ChartDataPoint {
  x: number;
  y: number | null;
}

interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'area';
  series: ChartSeries[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  chartData?: ChartData;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

// Map source names to DataSource type
const SOURCE_MAP: Record<string, DataSource> = {
  'World Bank': 'worldbank',
  'IMF': 'imf',
  'FAO': 'fao',
  'UN Comtrade': 'comtrade',
  'Our World in Data': 'owid'
};

// Source badge styles with platform colors
const SOURCE_BADGE_CLASSES: Record<string, string> = {
  'World Bank': 'source-badge world-bank',
  'IMF': 'source-badge imf',
  'FAO': 'source-badge fao',
  'UN Comtrade': 'source-badge un-comtrade',
  'Our World in Data': 'source-badge owid'
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Determine primary source for table styling
  const primarySource = useMemo(() => {
    if (!message.sources || message.sources.length === 0) return null;
    return SOURCE_MAP[message.sources[0]] || null;
  }, [message.sources]);

  // Get table style class based on primary source
  const tableStyleClass = useMemo(() => {
    if (!primarySource) return '';
    const styleMap: Record<DataSource, string> = {
      worldbank: 'wb-style',
      imf: 'imf-style',
      fao: 'fao-style',
      comtrade: 'un-style',
      owid: 'owid-style'
    };
    return styleMap[primarySource];
  }, [primarySource]);

  // Format the content with markdown-like parsing
  const formattedContent = useMemo(() => {
    let content = message.content;

    // Escape HTML (but preserve our injected classes)
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers: # ## ###
    content = content.replace(/^### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-2 text-gray-800">$1</h4>');
    content = content.replace(/^## (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>');
    content = content.replace(/^# (.*$)/gim, '<h2 class="chart-title text-xl mt-4 mb-2">$1</h2>');

    // Bold: **text** or __text__
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    content = content.replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>');

    // Italic: *text* or _text_
    content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Code: `code`
    content = content.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>'
    );

    // Lists: - item or * item
    content = content.replace(
      /^[\-\*] (.*)$/gm,
      '<li class="ml-4 list-disc text-gray-700">$1</li>'
    );

    // Wrap consecutive list items
    content = content.replace(
      /(<li[^>]*>.*<\/li>\n?)+/g,
      '<ul class="my-2 space-y-1">$&</ul>'
    );

    // Detect and format markdown tables with source-specific styling
    if (content.includes('|') && content.includes('\n')) {
      const lines = content.split('\n');
      let inTable = false;
      const resultLines: string[] = [];
      let tableRows: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
          // Skip separator lines (|---|---|)
          if (trimmedLine.replace(/[\|\-\s:]/g, '').length === 0) {
            continue;
          }

          if (!inTable) {
            inTable = true;
            tableRows = [];
          }

          tableRows.push(trimmedLine);
        } else {
          if (inTable) {
            // End of table - render it
            resultLines.push(renderTable(tableRows, tableStyleClass));
            inTable = false;
            tableRows = [];
          }
          resultLines.push(line);
        }
      }

      // Handle table at end of content
      if (inTable && tableRows.length > 0) {
        resultLines.push(renderTable(tableRows, tableStyleClass));
      }

      content = resultLines.join('\n');
    }

    // Line breaks
    content = content.replace(/\n/g, '<br/>');

    // Clean up multiple <br/> tags
    content = content.replace(/(<br\/>){3,}/g, '<br/><br/>');

    return content;
  }, [message.content, tableStyleClass]);

  // Render markdown table with source-specific styling
  function renderTable(rows: string[], styleClass: string): string {
    if (rows.length === 0) return '';

    let html = `<div class="overflow-x-auto my-4 rounded-lg border border-gray-200 animate-slide-up">`;
    html += `<table class="data-table ${styleClass}">`;

    rows.forEach((row, i) => {
      const cells = row.split('|').filter(c => c.trim());
      const isHeader = i === 0;

      if (isHeader) {
        html += '<thead>';
      }

      html += '<tr>';
      cells.forEach(cell => {
        const cellContent = cell.trim();
        const tag = isHeader ? 'th' : 'td';

        // Detect numeric cells for right alignment
        const isNumeric = /^[\d\$\-\+\.\,\%]+$/.test(cellContent.replace(/[^\d\$\-\+\.\,\%]/g, ''));
        const alignClass = isNumeric && !isHeader ? 'numeric' : '';

        // Detect forecast values (italic or with year > current)
        const isForecast = cellContent.includes('*') ||
          (isNumeric && /^\d{4}$/.test(cellContent) && parseInt(cellContent) > new Date().getFullYear());

        const cellClass = [alignClass, isForecast ? 'forecast-cell' : ''].filter(Boolean).join(' ');

        html += `<${tag}${cellClass ? ` class="${cellClass}"` : ''}>${cellContent}</${tag}>`;
      });
      html += '</tr>';

      if (isHeader) {
        html += '</thead><tbody>';
      }
    });

    html += '</tbody></table></div>';
    return html;
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div
        className={`max-w-[90%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 shadow-sm'
        }`}
      >
        {/* Message content */}
        <div
          className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)'
          }}
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />

        {/* Chart visualization */}
        {message.chartData && message.chartData.series.length > 0 && (
          <div className="mt-4">
            {message.chartData.type === 'line' && (
              <LineChart
                series={message.chartData.series.map(s => ({
                  name: s.name,
                  data: s.data.map(d => ({ x: d.x, y: d.y }))
                }))}
                title={message.chartData.title}
                xLabel={message.chartData.xLabel}
                yLabel={message.chartData.yLabel}
                sourceAttribution={message.sources?.join(', ')}
                directLabeling={true}
                height={350}
              />
            )}
            {message.chartData.type === 'bar' && (
              <BarChart
                data={message.chartData.series[0]?.data.map((d) => ({
                  label: String(d.x),
                  value: d.y
                })) || []}
                title={message.chartData.title}
                sourceAttribution={message.sources?.join(', ')}
                orientation="vertical"
                height={350}
              />
            )}
          </div>
        )}

        {/* Source tags with platform-specific styling */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Sources:</span>
            {message.sources.map((source, i) => {
              const badgeClass = SOURCE_BADGE_CLASSES[source] || 'source-badge';
              return (
                <span key={i} className={badgeClass}>
                  {source}
                </span>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs mt-3 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
