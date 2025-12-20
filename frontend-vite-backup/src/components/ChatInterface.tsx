import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

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

interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'area' | 'map';
  series: ChartSeries[];
  mapData?: MapDataPoint[];
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
    icon: "📈"
  },
  {
    text: "Compare wheat production in Egypt vs Morocco 2015-2023",
    icon: "🌾"
  },
  {
    text: "Show Saudi Arabia's top 10 export partners in 2022",
    icon: "🚢"
  },
  {
    text: "How has life expectancy changed in Bangladesh since 2000?",
    icon: "❤️"
  },
  {
    text: "Get inflation data for Argentina from IMF",
    icon: "💹"
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
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${sessionId}`);
    return stored ? deserializeMessages(stored) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, serializeMessages(messages));
    }
  }, [messages, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text: string) => {
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
      const res = await fetch('/api/chat', {
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
  };

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
    fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    }).catch(console.error);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      {/* Clear chat button - only show when there are messages */}
      {messages.length > 0 && (
        <div className="flex justify-end px-4 pt-2">
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Ask me about economic data
              </h2>
              <p className="text-gray-500 max-w-md">
                I can query data from World Bank, IMF, FAO, UN Comtrade, and Our World in Data.
                Try one of the examples below or ask your own question.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(example.text)}
                  className="flex items-start gap-3 text-left bg-white border border-gray-200 px-4 py-3 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition shadow-sm"
                >
                  <span className="text-xl">{example.icon}</span>
                  <span className="text-sm text-gray-700">{example.text}</span>
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
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-gray-500 text-sm">Querying data sources...</span>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about economic data..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
