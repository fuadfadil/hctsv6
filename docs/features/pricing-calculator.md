# Pricing Calculator

## Overview

The Pricing Calculator is an AI-powered tool that helps healthcare providers determine optimal pricing for their services. It combines ICD-11 classification data, market intelligence, AI-driven suggestions, and health unit conversions to provide comprehensive pricing recommendations.

## Key Components

### AI-Powered Pricing Engine
- **OpenAI GPT Integration**: Uses advanced language models for pricing analysis
- **Contextual Recommendations**: Considers service complexity, market conditions, and regional factors
- **Dynamic Learning**: Improves recommendations based on historical data and market trends

### ICD-11 Integration
- **Complexity Scoring**: Automatic complexity assessment based on ICD-11 codes
- **Service Categorization**: Maps medical conditions to appropriate service categories
- **Validation**: Real-time ICD-11 code validation and suggestions

### Market Intelligence
- **Real-time Data**: Aggregates pricing data from marketplace transactions
- **Trend Analysis**: Identifies pricing trends and market movements
- **Competitive Analysis**: Provides positioning relative to market averages

### Health Unit Conversion
- **Regional Rates**: Different conversion rates for various countries/regions
- **Currency Support**: Multi-currency pricing with automatic conversions
- **Bulk Discounts**: Volume-based pricing adjustments

## User Flows

### Service Pricing Calculation
1. **Service Input**
   - Enter service name and detailed description
   - Select or search for ICD-11 classification code
   - Specify quantity and optional base price

2. **AI Analysis**
   - System analyzes service complexity using ICD-11 data
   - Retrieves market data for similar services
   - Generates AI-powered pricing recommendations

3. **Market Research**
   - Compares pricing against market averages
   - Identifies competitive positioning
   - Provides trend analysis and insights

4. **Price Optimization**
   - Calculates bulk discounts for volume purchases
   - Applies regional pricing adjustments
   - Converts to health units for marketplace compatibility

### Bulk Pricing Operations
1. **Multiple Services**
   - Input multiple services for batch processing
   - Apply cross-service discount calculations
   - Generate comprehensive pricing reports

2. **Market Analysis**
   - Compare pricing across different regions
   - Analyze seasonal and temporal trends
   - Generate competitive intelligence reports

## Technical Details

### Core Algorithm
```typescript
// Pricing calculation with AI integration
const result = await PricingCalculator.calculatePricing({
  serviceName: input.serviceName,
  icd11Code: input.icd11Code,
  quantity: input.quantity,
  region: input.region,
  currency: input.currency,
});
```

### AI Prompt Engineering
```typescript
const prompt = `
You are a healthcare pricing expert. Analyze the following service and provide optimal pricing recommendations.

Service Details:
- Name: ${input.serviceName}
- ICD-11 Code: ${input.icd11Code}
- Complexity Score: ${complexityScore}
- Region: ${input.region}

Market Data:
- Average Price: ${marketData.averagePrice}
- Price Range: ${marketData.minPrice} - ${marketData.maxPrice}

Provide JSON with suggestedPrice, minPrice, and reasoning.
`;
```

### Database Tables
- `pricingCalculation`: Stores all pricing calculations with full audit trail
- `pricingAuditLog`: Tracks changes and user actions
- `marketData`: Aggregated market pricing intelligence
- `icd11Category`: ICD-11 classification data with complexity scores

### API Endpoints
- `POST /api/calculator/price`: Calculate pricing for individual services
- `GET /api/calculator/icd11`: Search and validate ICD-11 codes
- `GET /api/calculator/market`: Retrieve market data and trends
- `POST /api/calculator/bulk`: Process bulk pricing calculations

### Caching Strategy
- **Redis Integration**: Caches pricing results for 24 hours
- **Smart Keys**: Generates cache keys based on input parameters
- **Fallback Logic**: Graceful degradation when AI services unavailable

## Configuration

### Environment Variables
```env
# AI Configuration
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3

# Pricing Settings
DEFAULT_CURRENCY=LYD
DEFAULT_REGION=Libya
CACHE_TTL_HOURS=24

# ICD-11 Settings
ICD11_API_URL=https://id.who.int/icd/release/11/2023-01/mms
ICD11_CACHE_TTL=168

# Market Data
MARKET_DATA_RETENTION_DAYS=365
TREND_ANALYSIS_WINDOW_DAYS=90
```

### Health Unit Conversion Rates
```typescript
const HEALTH_UNIT_RATES: Record<string, number> = {
  'Libya': 1.0,        // Base rate
  'Tunisia': 0.8,
  'Egypt': 0.6,
  'Algeria': 0.7,
  'Morocco': 0.5,
  'Saudi Arabia': 0.4,
  'UAE': 0.3,
  'Qatar': 0.35,
  'Kuwait': 0.4,
  'Bahrain': 0.45,
};
```

### Bulk Discount Tiers
```typescript
const BULK_DISCOUNTS = [
  { minQuantity: 100, discount: 25 },
  { minQuantity: 50, discount: 15 },
  { minQuantity: 20, discount: 10 },
  { minQuantity: 10, discount: 5 },
];
```

## Troubleshooting

### Common Issues

**AI Service Unavailable**
- Check OpenAI API key configuration
- Verify API rate limits and quotas
- Falls back to rule-based pricing automatically

**ICD-11 Code Not Found**
- Verify code format and version
- Check ICD-11 API connectivity
- Use search functionality for similar codes

**Market Data Missing**
- Ensure marketplace has sufficient transaction history
- Check data aggregation job status
- Verify region and currency parameters

**Pricing Calculation Errors**
- Validate input parameters and data types
- Check decimal precision in calculations
- Review currency conversion rates

### Performance Optimization
- **Response Caching**: 24-hour cache for identical requests
- **Batch Processing**: Handle multiple calculations efficiently
- **Lazy Loading**: Load ICD-11 data on-demand
- **Database Indexing**: Optimized queries for market data

### Error Codes
- `INVALID_ICD11_CODE`: ICD-11 code validation failed
- `AI_SERVICE_UNAVAILABLE`: OpenAI API connection failed
- `MARKET_DATA_INSUFFICIENT`: Not enough data for market analysis
- `CALCULATION_TIMEOUT`: Pricing calculation exceeded time limit
- `INVALID_CURRENCY`: Unsupported currency code provided