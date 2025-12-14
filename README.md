# EconChat M-2 - AI Economic Data Assistant

An AI-powered chat application that lets economists query economic data using natural language. EconChat wraps Claude API with 5 major economic data sources pre-connected.

**Version: M-2** - Enhanced Data Visualization UI

## What's New in M-2

### Professional Data Visualization
- **Source-specific table styling**: Tables automatically style based on data source (World Bank, IMF, FAO, UN Comtrade, OWID)
- **Platform color palettes**: Authentic colors matching official data platforms
- **Typography system**: Playfair Display for headlines, Lato/Open Sans for body text
- **Responsive charts**: SVG-based line and bar charts with animations

### Formatting Standards
- **Number formatting**: Comma thousands separators, scale abbreviations (K, M, B, T)
- **Missing data conventions**: Platform-specific indicators (.., n/a, ...)
- **Forecast highlighting**: IMF-style shaded cells for projection data
- **FAO data flags**: Superscript indicators for estimates, imputations

### Interactive Features
- **Hover tooltips**: Rich data tooltips on charts and tables
- **Sortable tables**: Click column headers to sort
- **Direct labeling**: OWID-style labels on line charts
- **Smooth animations**: Fade-in and slide-up transitions

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

## Data Sources & Styling

| Source | Style Class | Primary Color | Best For |
|--------|-------------|---------------|----------|
| **World Bank** | wb-style | #002244 | GDP, population, poverty, health, education |
| **IMF** | imf-style | #004C97 | GDP forecasts, inflation, unemployment |
| **FAO** | fao-style | #116AAB | Crop production, livestock, food security |
| **UN Comtrade** | un-style | #009edb | Trade flows, export/import partners |
| **Our World in Data** | owid-style | #3360a9 | Long-term trends, life expectancy, CO2 |

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

## Project Structure

```
ECONCHAT-M-2/
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
│   │   ├── index.css         # M-2 visualization theme
│   │   ├── utils/
│   │   │   └── formatters.ts # Number/data formatting
│   │   └── components/
│   │       ├── ChatInterface.tsx
│   │       ├── MessageBubble.tsx
│   │       ├── DataTable.tsx
│   │       ├── LineChart.tsx
│   │       └── BarChart.tsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

## CSS Theme Variables

```css
:root {
  /* Platform Primary Blues */
  --wb-blue-dark: #002244;
  --imf-blue: #004C97;
  --fao-blue: #116AAB;
  --un-blue: #009edb;
  --owid-blue: #3360a9;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Lato', 'Open Sans', sans-serif;

  /* Semantic Colors */
  --positive: #00AB51;
  --negative: #dc3545;
}
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **AI**: Claude Sonnet via Anthropic API
- **Data Sources**: REST APIs (World Bank, IMF, FAO, UN Comtrade, OWID)
- **Fonts**: Google Fonts (Playfair Display, Lato, Open Sans, Roboto)

## License

MIT

## Author

Baye - BayeDev
