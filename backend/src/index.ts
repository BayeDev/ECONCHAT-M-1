// index.ts
// Express server for EconChat API with 3-Tier LLM Routing

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chat, getSourcesFromTools } from './claude-client.js';
import { routedChat, getUsageStats, resetUsageStats, type RoutedChatResponse } from './routed-chat.js';
import { classifyQuery, getTierName } from './llm_router/router.js';

// Database & Auth imports
import { connectDatabase, checkDatabaseHealth } from './db/index.js';
import { webhookRoutes, adminRoutes, dataQualityRoutes, citationsRoutes } from './routes/index.js';
import { requireAuth, optionalAuth } from './middleware/auth.middleware.js';
import { checkUserLimits, checkBudgetLimits, checkMaintenanceMode, incrementUserUsage } from './middleware/rateLimit.middleware.js';
import { usageRepository } from './repositories/usage.repository.js';

const app = express();
app.use(cors());

// Raw body for webhooks (before express.json)
app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

app.use(express.json());

// Store conversation history per session (in production, use Redis or DB)
const sessions: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();

// Flag to enable/disable routing (set via env or API)
// Defaults to TRUE for cost savings
let useRouting = process.env.USE_LLM_ROUTING !== 'false';

// ============ WEBHOOK & ADMIN ROUTES ============
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// ============ MDB ENHANCEMENT ROUTES (Phase 1) ============
app.use('/api/data-quality', dataQualityRoutes);
app.use('/api/citations', citationsRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealth ? 'connected' : 'disconnected',
    routing: {
      enabled: useRouting,
      tiers: {
        1: 'Claude Opus 4.5 (Premium - Complex Analysis)',
        2: 'Gemini 2.5 Flash (Standard - Everything Else)'
      }
    }
  });
});

// Chat endpoint - supports both routed and non-routed modes
// Uses optional auth to track usage when user is logged in
app.post('/api/chat', optionalAuth, checkMaintenanceMode, checkBudgetLimits, async (req, res) => {
  const startTime = Date.now();
  let tierUsed = 0;
  let success = false;
  let errorMessage = '';

  try {
    const { message, sessionId = 'default', forceRouting, forceTier } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check user limits if authenticated
    if (req.user) {
      const limits = req.user.limits;
      if (limits && limits.dailyQueriesUsed >= limits.dailyQueryLimit) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Daily query limit reached. Please try again tomorrow.',
        });
      }
    }

    // Determine if we should use routing for this request
    const shouldRoute = forceRouting !== undefined ? forceRouting : useRouting;

    console.log(`\n[Chat] Session: ${sessionId}, Routing: ${shouldRoute ? 'ON' : 'OFF'}, User: ${req.user?.email || 'anonymous'}`);
    console.log(`[Chat] Message: ${message.substring(0, 100)}...`);

    // Get conversation history
    const history = sessions.get(sessionId) || [];

    let responseData;

    if (shouldRoute) {
      // Use 3-tier routed chat
      const tier = forceTier || classifyQuery(message);
      tierUsed = tier;
      console.log(`[Router] Classified as Tier ${tier} (${getTierName(tier)})`);

      const routedResponse = await routedChat(message, history, {
        forceTier: forceTier
      });

      // Update history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: routedResponse.response });
      sessions.set(sessionId, history.slice(-20));

      // Get human-readable source names
      const sources = getSourcesFromTools(routedResponse.toolsUsed);

      console.log(`[Response] Tier: ${routedResponse.tierUsed}, Model: ${routedResponse.modelUsed}`);
      console.log(`[Response] Sources: ${sources.join(', ')}, Cost: $${routedResponse.estimatedCost.toFixed(4)}, Latency: ${routedResponse.latencyMs}ms`);

      responseData = {
        response: routedResponse.response,
        toolsUsed: routedResponse.toolsUsed,
        sources,
        chartData: routedResponse.chartData,
        charts: routedResponse.charts,
        // Routing metadata
        routing: {
          tierUsed: routedResponse.tierUsed,
          tierName: getTierName(routedResponse.tierUsed),
          modelUsed: routedResponse.modelUsed,
          estimatedCost: routedResponse.estimatedCost,
          latencyMs: routedResponse.latencyMs
        }
      };

      // Log usage to database
      success = true;
      if (req.user) {
        await incrementUserUsage(req.user.id);
        await usageRepository.log({
          userId: req.user.id,
          query: message.substring(0, 500),
          tier: routedResponse.tierUsed === 1 ? 'TIER1' : 'TIER2',
          model: routedResponse.modelUsed,
          inputTokens: 0, // Would need to track from API response
          outputTokens: 0,
          cost: routedResponse.estimatedCost.toString(),
          responseTimeMs: routedResponse.latencyMs,
          toolsUsed: routedResponse.toolsUsed,
          success: true,
        });
      }
    } else {
      // Use original single-model chat (Claude Sonnet)
      const { response, toolsUsed, chartData, charts } = await chat(message, history);

      // Update history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response });
      sessions.set(sessionId, history.slice(-20));

      const sources = getSourcesFromTools(toolsUsed);
      console.log(`[Response] Sources: ${sources.join(', ')}, Length: ${response.length}, Charts: ${charts?.length || 0}`);

      responseData = {
        response,
        toolsUsed,
        sources,
        chartData,
        charts
      };

      success = true;
      if (req.user) {
        await incrementUserUsage(req.user.id);
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error('[Error]', error);
    errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed request
    if (req.user) {
      await usageRepository.log({
        userId: req.user.id,
        query: req.body?.message?.substring(0, 500) || '',
        tier: tierUsed === 1 ? 'TIER1' : 'TIER2',
        model: '',
        inputTokens: 0,
        outputTokens: 0,
        cost: '0',
        responseTimeMs: Date.now() - startTime,
        toolsUsed: [],
        success: false,
        errorMessage,
      });
    }

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

// ============ ROUTING ENDPOINTS ============

// Preview which tier would be used for a query (without executing)
app.post('/api/classify', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const tier = classifyQuery(message);
  const normalizedTier = tier === 1 ? 1 : 2;  // 2-tier system
  res.json({
    query: message,
    tier: normalizedTier,
    tierName: getTierName(tier),
    description: {
      1: 'Premium tier for complex analysis (DSA, diagnostics, reports) - Claude Opus 4.5',
      2: 'Standard tier for everything else - Gemini 2.5 Flash'
    }[normalizedTier]
  });
});

// Toggle routing on/off
app.post('/api/routing/toggle', (req, res) => {
  const { enabled } = req.body;
  useRouting = enabled !== undefined ? enabled : !useRouting;
  console.log(`[Routing] ${useRouting ? 'ENABLED' : 'DISABLED'}`);
  res.json({
    routing: useRouting,
    message: useRouting
      ? '2-tier routing enabled (Claude Opus for complex / Gemini Flash for standard)'
      : 'Routing disabled (using Claude Sonnet for all queries)'
  });
});

// Get routing status and usage stats
app.get('/api/routing/status', (req, res) => {
  const stats = getUsageStats();
  res.json({
    enabled: useRouting,
    tiers: {
      1: { name: 'Claude Opus 4.5', type: 'Premium', cost: '$15/$75 per M tokens', usage: 'Complex analysis only' },
      2: { name: 'Gemini 2.5 Flash', type: 'Standard', cost: '$0.30/$2.50 per M tokens', usage: 'Everything else' }
    },
    usage: stats
  });
});

// Reset usage stats
app.post('/api/routing/reset-stats', (req, res) => {
  resetUsageStats();
  res.json({ success: true, message: 'Usage stats reset' });
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

// Start server with database connection
async function startServer() {
  // Connect to database
  const dbConnected = await connectDatabase();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     EconChat Backend                      ║
║              with 2-Tier LLM Routing                      ║
║═══════════════════════════════════════════════════════════║
║  Server running on: http://localhost:${PORT}                 ║
║  Database: ${dbConnected ? 'Connected    ' : 'Not connected'}                               ║
║                                                           ║
║  LLM Routing: ${useRouting ? 'ENABLED ' : 'DISABLED'}                                    ║
║    Tier 1 (Premium):  Claude Opus 4.5  [Complex Analysis] ║
║    Tier 2 (Standard): Gemini 2.5 Flash [Everything Else]  ║
║                                                           ║
║  API Endpoints:                                           ║
║    POST /api/chat     - Chat with economic data           ║
║    POST /api/classify - Preview tier for a query          ║
║    POST /api/routing/toggle - Enable/disable routing      ║
║    GET  /api/routing/status - Get routing stats           ║
║    POST /api/reset    - Reset conversation                ║
║    GET  /api/health   - Health check                      ║
║    GET  /api/tools    - List available tools              ║
║    GET  /api/examples - Example queries                   ║
║                                                           ║
║  Admin Endpoints (Auth Required):                         ║
║    GET  /api/admin/dashboard - Dashboard summary          ║
║    GET  /api/admin/users     - List/manage users          ║
║    GET  /api/admin/usage/*   - Usage analytics            ║
║    GET  /api/admin/settings  - System settings            ║
║    POST /api/webhooks/clerk  - Clerk user sync            ║
║                                                           ║
║  MDB Enhancement Endpoints:                               ║
║    GET  /api/data-quality/*  - Data quality metadata      ║
║    GET  /api/citations/*     - Citation generator         ║
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
}

startServer().catch(console.error);
