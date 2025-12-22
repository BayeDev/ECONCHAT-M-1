"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { TypingIndicator } from './ui/Skeleton';
import { cn } from '@/lib/utils';

// Chart data types matching backend
interface ChartDataPoint {
  x: number;
  y: number | null;
}

interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

// Map data types
interface MapDataPoint {
  entity: string;
  code?: string;
  value: number | null;
}

// Table data for table chart type
interface TableData {
  columns: Array<{ key: string; header: string; type?: string }>;
  rows: Array<Record<string, unknown>>;
}

interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'area' | 'map' | 'table';
  series: ChartSeries[];
  mapData?: MapDataPoint[];
  tableData?: TableData;
  year?: number;
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
  charts?: ChartData[];  // Multiple charts support
  timestamp: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
}

const EXAMPLE_QUERIES = [
  {
    text: "What's Nigeria's GDP growth forecast for 2024-2026?",
    icon: "📈",
    category: "Growth"
  },
  {
    text: "Compare wheat production in Egypt vs Morocco 2015-2023",
    icon: "🌾",
    category: "Agriculture"
  },
  {
    text: "Show Saudi Arabia's top 10 export partners in 2022",
    icon: "🚢",
    category: "Trade"
  },
  {
    text: "How has life expectancy changed in Bangladesh since 2000?",
    icon: "❤️",
    category: "Health"
  },
  {
    text: "Get inflation data for Argentina from IMF",
    icon: "💹",
    category: "Economy"
  }
];

// Storage key for persisting messages
const STORAGE_KEY = 'econchat_messages';

// Helper to serialize messages for localStorage (handles Date objects)
function serializeMessages(messages: Message[]): string {
  return JSON.stringify(messages.map(m => ({
    ...m,
    timestamp: m.timestamp.toISOString()
  })));
}

// Helper to deserialize messages from localStorage
function deserializeMessages(json: string): Message[] {
  try {
    const parsed = JSON.parse(json);
    return parsed.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string)
    }));
  } catch {
    return [];
  }
}

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  // Initialize messages from localStorage
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only access localStorage after mount (client-side)
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(`${STORAGE_KEY}_${sessionId}`);
    if (stored) {
      setMessages(deserializeMessages(stored));
    }
  }, [sessionId]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (mounted && messages.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, serializeMessages(messages));
    }
  }, [messages, sessionId, mounted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K to focus input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { API_URL } = await import('../config');
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        chartData: data.chartData,
        charts: data.charts,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please check if the backend server is running.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
    // Also reset backend session
    import('../config').then(({ API_URL }) => {
      fetch(`${API_URL}/api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      }).catch(console.error);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Clear chat button - only show when there are messages */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 flex justify-end px-4 pt-2">
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition flex items-center gap-1"
            title="Clear conversation"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear chat
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full py-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-wb-blue-100 dark:bg-wb-blue-900/30 rounded-2xl mb-3">
                <svg className="w-8 h-8 text-wb-blue-600 dark:text-wb-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/>
                  <path d="M7 16l4-8 4 6 3-4"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-2">
                Ask me about economic data
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">
                I can query data from World Bank, IMF, FAO, UN Comtrade, and Our World in Data.
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-300 font-mono text-[10px]">⌘K</kbd> to focus
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full px-2">
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(example.text)}
                  className={cn(
                    "flex items-start gap-2.5 text-left px-3 py-2.5 rounded-lg transition-all duration-200",
                    "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700",
                    "hover:bg-wb-blue-50 dark:hover:bg-wb-blue-900/20 hover:border-wb-blue-300 dark:hover:border-wb-blue-700",
                    "hover:shadow-md hover:-translate-y-0.5",
                    "focus:outline-none focus:ring-2 focus:ring-wb-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  )}
                >
                  <span className="text-xl flex-shrink-0" role="img" aria-label={example.category}>
                    {example.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-wb-blue-600 dark:text-wb-accent-400 uppercase tracking-wide">
                      {example.category}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mt-0.5 line-clamp-2">
                      {example.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {loading && (
              <div className="animate-fade-in">
                <TypingIndicator />
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-2 ml-4">
                  Querying data sources...
                </p>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
        <div className="max-w-3xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about economic data..."
              aria-label="Chat message input"
              className={cn(
                "w-full border rounded-xl px-4 py-3 transition-all duration-200",
                "bg-white dark:bg-slate-800",
                "border-gray-300 dark:border-slate-600",
                "text-gray-900 dark:text-slate-100",
                "placeholder:text-gray-400 dark:placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-wb-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              disabled={loading}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className={cn(
              "px-5 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
              "bg-wb-blue-600 hover:bg-wb-blue-700 text-white",
              "focus:outline-none focus:ring-2 focus:ring-wb-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-wb-blue-600"
            )}
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
