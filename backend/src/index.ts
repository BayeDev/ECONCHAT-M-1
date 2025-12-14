// index.ts
// Express server for EconChat API

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chat, getSourcesFromTools } from './claude-client.js';

const app = express();
app.use(cors());
app.use(express.json());

// Store conversation history per session (in production, use Redis or DB)
const sessions: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n[Chat] Session: ${sessionId}, Message: ${message.substring(0, 100)}...`);

    // Get conversation history
    const history = sessions.get(sessionId) || [];

    // Call Claude with tools
    const { response, toolsUsed } = await chat(message, history);

    // Update history (keep last 20 messages to manage context size)
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response });
    sessions.set(sessionId, history.slice(-20));

    // Get human-readable source names
    const sources = getSourcesFromTools(toolsUsed);

    console.log(`[Response] Sources: ${sources.join(', ')}, Length: ${response.length}`);

    res.json({
      response,
      toolsUsed,
      sources
    });
  } catch (error) {
    console.error('[Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// Reset conversation
app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  sessions.delete(sessionId);
  console.log(`[Reset] Session: ${sessionId}`);
  res.json({ success: true });
});

// List available tools (for debugging)
app.get('/api/tools', async (req, res) => {
  const { allTools } = await import('./data-tools.js');
  res.json({
    count: allTools.length,
    tools: allTools.map(t => ({
      name: t.name,
      description: t.description.substring(0, 100) + '...'
    }))
  });
});

// Example queries endpoint
app.get('/api/examples', (req, res) => {
  res.json({
    examples: [
      {
        query: "What's Nigeria's GDP growth forecast for 2024-2026?",
        source: 'IMF',
        description: 'Uses IMF WEO data for GDP forecasts'
      },
      {
        query: "Compare wheat production in Egypt vs Morocco from 2015-2023",
        source: 'FAO',
        description: 'Uses FAO FAOSTAT agricultural data'
      },
      {
        query: "Show Saudi Arabia's top 10 export partners in 2022",
        source: 'UN Comtrade',
        description: 'Uses UN Comtrade trade data'
      },
      {
        query: "How has life expectancy changed in Bangladesh since 2000?",
        source: 'Our World in Data',
        description: 'Uses OWID for long-term health trends'
      },
      {
        query: "What is the GDP per capita for Brazil, India, and China from 2015-2023?",
        source: 'World Bank',
        description: 'Uses World Bank WDI indicators'
      }
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     EconChat Backend                      ║
║═══════════════════════════════════════════════════════════║
║  Server running on: http://localhost:${PORT}                 ║
║                                                           ║
║  Endpoints:                                               ║
║    POST /api/chat     - Chat with economic data           ║
║    POST /api/reset    - Reset conversation                ║
║    GET  /api/health   - Health check                      ║
║    GET  /api/tools    - List available tools              ║
║    GET  /api/examples - Example queries                   ║
║                                                           ║
║  Data Sources:                                            ║
║    - World Bank (WDI indicators)                          ║
║    - IMF (WEO forecasts, IFS)                            ║
║    - FAO (Agricultural data)                              ║
║    - UN Comtrade (Trade data)                            ║
║    - Our World in Data (Cross-domain)                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
