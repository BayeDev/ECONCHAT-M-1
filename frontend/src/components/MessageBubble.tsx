import { useMemo } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  'World Bank': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'IMF': { bg: 'bg-green-100', text: 'text-green-800' },
  'FAO': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'UN Comtrade': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Our World in Data': { bg: 'bg-pink-100', text: 'text-pink-800' }
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Format the content with markdown-like parsing
  const formattedContent = useMemo(() => {
    let content = message.content;

    // Escape HTML
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Bold: **text** or __text__
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Code: `code`
    content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Detect and format markdown tables
    if (content.includes('|') && content.includes('\n')) {
      const lines = content.split('\n');
      let inTable = false;
      const resultLines: string[] = [];
      let tableRows: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
          // Skip separator lines
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
            resultLines.push(renderTable(tableRows));
            inTable = false;
            tableRows = [];
          }
          resultLines.push(line);
        }
      }

      // Handle table at end of content
      if (inTable && tableRows.length > 0) {
        resultLines.push(renderTable(tableRows));
      }

      content = resultLines.join('\n');
    }

    // Line breaks
    content = content.replace(/\n/g, '<br/>');

    return content;
  }, [message.content]);

  function renderTable(rows: string[]): string {
    if (rows.length === 0) return '';

    let html = '<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse text-sm">';

    rows.forEach((row, i) => {
      const cells = row.split('|').filter(c => c.trim());
      const isHeader = i === 0;

      html += '<tr>';
      cells.forEach(cell => {
        const tag = isHeader ? 'th' : 'td';
        const cellClass = isHeader
          ? 'border border-gray-300 px-3 py-2 bg-gray-50 font-semibold text-left'
          : 'border border-gray-300 px-3 py-2';
        html += `<${tag} class="${cellClass}">${cell.trim()}</${tag}>`;
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 shadow-sm'
        }`}
      >
        {/* Message content */}
        <div
          className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />

        {/* Source tags */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Sources:</span>
            {message.sources.map((source, i) => {
              const style = SOURCE_STYLES[source] || { bg: 'bg-gray-100', text: 'text-gray-800' };
              return (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                >
                  {source}
                </span>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
