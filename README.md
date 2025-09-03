# Korea Stock Analyzer MCP Server

A Model Context Protocol (MCP) server that provides comprehensive Korean stock market analysis using strategies from 6 legendary investors: Warren Buffett, Peter Lynch, Benjamin Graham, Joel Greenblatt, Philip Fisher, and John Templeton.

## Features

- 📊 **Real-time Korean stock data** - Direct access to KOSPI/KOSDAQ data via pykrx (no API key required)
- 🎯 **6 Investment Strategies** - Analysis based on proven methodologies from investment legends
- 📈 **7 Powerful Tools** - Complete toolkit for stock analysis and valuation
- 🚀 **Zero Configuration** - Works out of the box with Claude Desktop
- 🇰🇷 **Korean Market Focused** - Optimized for Korean equity analysis

## Installation

### For Claude Desktop Users

Add this configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "korea-stock-analyzer": {
      "command": "npx",
      "args": ["@mrbaeksang/korea-stock-analyzer-mcp"]
    }
  }
}
```

### For Developers

```bash
# Clone the repository
git clone https://github.com/Mrbaeksang/korea-stock-analyzer-mcp.git
cd korea-stock-analyzer-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run the server
npm start
```

## Available Tools

### 1. `get_financial_data`
Fetches comprehensive financial data including PER, PBR, EPS, BPS, ROE, and dividend yield.

```typescript
// Example usage in Claude
"Get financial data for Samsung Electronics"
```

### 2. `get_technical_indicators`
Provides technical analysis with moving averages, RSI, MACD, and 52-week high/low positions.

```typescript
// Example usage in Claude
"Show technical indicators for SK Hynix"
```

### 3. `calculate_dcf`
Calculates intrinsic value using Discounted Cash Flow analysis.

```typescript
// Example usage in Claude
"Calculate DCF valuation for LG Electronics"
```

### 4. `search_news`
Searches latest news and sentiment analysis (requires Naver API keys).

```typescript
// Example usage in Claude
"Find recent news about POSCO"
```

### 5. `get_supply_demand`
Analyzes institutional and foreign investor trading patterns over 5/20/60 day periods.

```typescript
// Example usage in Claude
"Check supply and demand for Kakao"
```

### 6. `compare_peers`
Compares valuation metrics with industry peers.

```typescript
// Example usage in Claude
"Compare Samsung Electronics with SK Hynix"
```

### 7. `analyze_equity`
**The Ultimate Tool** - Comprehensive analysis using all 6 investment gurus' strategies with buy/hold/sell recommendations.

```typescript
// Example usage in Claude
"Analyze NAVER using all investment strategies"
```

## Investment Strategies

### 🎩 Warren Buffett
- **Owner Earnings**: Net Income + Depreciation - Maintenance CapEx
- **Focus**: High ROE (>15%), sustainable competitive advantages

### 📊 Peter Lynch  
- **PEGY Ratio**: PER / (Growth Rate + Dividend Yield)
- **Target**: PEGY < 1.0 indicates undervaluation

### 💼 Benjamin Graham
- **Graham Number**: √(22.5 × EPS × BPS)
- **Safety Margin**: Buy when price < 67% of Graham Number

### 🎯 Joel Greenblatt
- **Magic Formula**: High EBIT/EV + High ROIC
- **Ranking**: Combines value and quality metrics

### 🔍 Philip Fisher
- **15-Point Checklist**: Qualitative business assessment
- **Growth Focus**: Long-term growth potential

### 🌍 John Templeton
- **Maximum Pessimism**: Buy at point of maximum pessimism
- **Contrarian**: Focus on out-of-favor stocks

## Example Usage

```python
# In Claude Desktop, simply ask:
"Analyze Samsung Electronics stock"
"Is POSCO a good value investment?"
"Compare KB Financial with other banks"
"Show me undervalued stocks in KOSPI"
```

## Requirements

- Node.js 18+
- Python 3.9+ (automatically handled)
- Claude Desktop (for MCP integration)

## Python Dependencies

The server automatically installs required Python packages:
- `pykrx` - Korean stock market data
- `pandas` - Data manipulation
- `numpy` - Numerical computations

## Configuration

No configuration required! The server works out of the box with Korean stock data.

For advanced users who want news search functionality:
1. Get Naver API credentials from [Naver Developers](https://developers.naver.com)
2. Set environment variables:
   ```bash
   NAVER_CLIENT_ID=your_client_id
   NAVER_CLIENT_SECRET=your_client_secret
   ```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture

```
├── src/
│   ├── server.ts           # Main MCP server
│   ├── services/           # Core services
│   │   ├── data-fetcher.ts # pykrx data fetching
│   │   ├── calculator.ts   # DCF calculations
│   │   └── supply-demand.ts # Trading volume analysis
│   └── analyzers/          # Investment strategies
│       ├── buffett.ts      # Buffett's Owner Earnings
│       ├── lynch.ts        # Lynch's PEGY
│       ├── graham.ts       # Graham Number
│       ├── greenblatt.ts   # Magic Formula
│       ├── fisher.ts       # 15-Point Checklist
│       └── templeton.ts    # Maximum Pessimism
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [pykrx](https://github.com/sharebook-kr/pykrx) - Korean stock market data
- [Anthropic](https://anthropic.com) - Model Context Protocol
- Investment strategy inspirations from legendary investors

## Support

- 🐛 [Report Issues](https://github.com/Mrbaeksang/korea-stock-analyzer-mcp/issues)
- 💬 [Discussions](https://github.com/Mrbaeksang/korea-stock-analyzer-mcp/discussions)
- ⭐ Star this repo if you find it useful!

## Disclaimer

This tool is for educational and research purposes only. Not financial advice. Always do your own research before making investment decisions.

---

Made with ❤️ for Korean stock investors using Claude Desktop