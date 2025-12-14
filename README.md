# EconChat M-1 - AI Economic Data Assistant

An AI-powered chat application that lets economists query economic data using natural language. EconChat wraps Claude API with 5 major economic data sources pre-connected.

**Version: M-1**

## Features

- **Natural Language Queries**: Ask questions in plain English about economic data
- **5 Data Sources**: World Bank, IMF, FAO, UN Comtrade, Our World in Data
- **Smart Routing**: Claude automatically selects the best data source for your query
- **Source Attribution**: See which data sources were used for each response
- **Conversation Memory**: Follow-up questions maintain context

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key

### 1. Clone and Setup

```bash
git clone https://github.com/BayeDev/ECONCHAT-M-1.git
cd ECONCHAT-M-1

# Setup backend
cd backend
npm install
cp ../.env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 2. Start Backend

```bash
cd backend
export ANTHROPIC_API_KEY=your_key_here
npm run dev
```

Backend will start at http://localhost:3001

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start at http://localhost:5173

## Data Sources

| Source | Tools | Best For |
|--------|-------|----------|
| **World Bank** | wb_* | GDP, population, poverty, health, education indicators |
| **IMF** | imf_* | GDP forecasts, inflation, unemployment, fiscal data |
| **FAO** | fao_* | Crop production, livestock, food security |
| **UN Comtrade** | comtrade_* | Trade flows, export/import partners |
| **Our World in Data** | owid_* | Long-term trends, life expectancy, CO2, poverty |

## Example Queries

### World Bank
- "What is Nigeria's GDP per capita from 2015 to 2023?"
- "Compare poverty rates in India and Bangladesh"

### IMF
- "What's the inflation forecast for Argentina 2024-2026?"
- "Show GDP growth projections for BRICS countries"

### FAO
- "Compare wheat production in Egypt vs Morocco 2015-2023"
- "Get rice yields for Vietnam and Thailand"

### UN Comtrade
- "Show Saudi Arabia's top 10 export partners in 2022"
- "What does Nigeria import from China?"

### Our World in Data
- "How has life expectancy changed in Japan since 1960?"
- "Compare CO2 emissions per capita: USA vs China vs EU"

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send a message, get AI response with data |
| `/api/reset` | POST | Reset conversation history |
| `/api/health` | GET | Health check |
| `/api/tools` | GET | List available tools |
| `/api/examples` | GET | Get example queries |

### Chat Request

```json
{
  "message": "What's Nigeria's GDP growth forecast?",
  "sessionId": "optional-session-id"
}
```

### Chat Response

```json
{
  "response": "Based on IMF World Economic Outlook data...",
  "toolsUsed": ["imf_get_weo_data"],
  "sources": ["IMF"]
}
```

## Docker Deployment

```bash
# Create .env file with your API keys
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Build and run
docker-compose up --build

# Access at http://localhost:3000
```

## Project Structure

```
ECONCHAT-M-1/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── claude-client.ts  # Claude API with tools
│   │   ├── data-tools.ts     # Tool definitions
│   │   └── tool-executor.ts  # API call implementations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── ChatInterface.tsx
│   │       └── MessageBubble.tsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `COMTRADE_API_KEY` | No | UN Comtrade API key for full access |
| `PORT` | No | Backend port (default: 3001) |

## Known Limitations

- **FAO API**: May experience intermittent downtime (HTTP 521 errors)
- **IMF SDMX API**: Some endpoints may be unreachable; WEO works reliably
- **UN Comtrade**: Preview API limited to 500 records without API key
- **Rate Limits**: Each data source has its own rate limits

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **AI**: Claude Sonnet via Anthropic API
- **Data Sources**: REST APIs (World Bank, IMF, FAO, UN Comtrade, OWID)

## License

MIT

## Author

Baye - BayeDev
