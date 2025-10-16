import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { ICD11API } from './icd11';
import { PricingCache } from './cache';

// Pricing calculation schemas
export const PricingInputSchema = z.object({
  serviceName: z.string().min(1),
  serviceDescription: z.string().optional(),
  icd11Code: z.string().optional(),
  quantity: z.number().min(1).default(1),
  basePrice: z.number().optional(),
  currency: z.string().default('LYD'),
  region: z.string().default('Libya'),
});

export const PricingResultSchema = z.object({
  basePrice: z.number(),
  aiSuggestedPrice: z.number(),
  marketAveragePrice: z.number(),
  complexityScore: z.number(),
  discountPercentage: z.number(),
  finalPrice: z.number(),
  healthUnits: z.number(),
  currency: z.string(),
  reasoning: z.string(),
  marketInsights: z.array(z.string()),
});

export type PricingInput = z.infer<typeof PricingInputSchema>;
export type PricingResult = z.infer<typeof PricingResultSchema>;

// Health unit conversion rates (LYD to Health Units)
const HEALTH_UNIT_RATES: Record<string, number> = {
  'Libya': 1.0, // Base rate
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

export class PricingCalculator {
  /**
   * Calculate comprehensive pricing with AI suggestions
   */
  static async calculatePricing(input: PricingInput): Promise<PricingResult> {
    const validatedInput = PricingInputSchema.parse(input);

    // Check cache first
    const cacheKey = PricingCache.generatePricingKey({
      serviceName: validatedInput.serviceName,
      icd11Code: validatedInput.icd11Code,
      quantity: validatedInput.quantity,
      region: validatedInput.region,
      currency: validatedInput.currency,
    });

    const cachedResult = await PricingCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Get ICD-11 complexity score
    const complexityScore = validatedInput.icd11Code
      ? ICD11API.getComplexityScore(validatedInput.icd11Code)
      : 2.0; // Default medium complexity

    // Get market data (mock for now - would integrate with real market data)
    const marketData = await this.getMarketData(validatedInput);

    // Calculate base price if not provided
    const basePrice = validatedInput.basePrice || this.calculateBasePrice(validatedInput, complexityScore);

    // Get AI pricing suggestion
    const aiSuggestion = await this.getAIPricingSuggestion(validatedInput, marketData, complexityScore);

    // Calculate bulk discount
    const discountPercentage = this.calculateBulkDiscount(validatedInput.quantity);

    // Calculate final price
    const discountedPrice = basePrice * (1 - discountPercentage / 100);
    const finalPrice = Math.max(discountedPrice, aiSuggestion.minPrice);

    // Convert to health units
    const healthUnits = this.convertToHealthUnits(finalPrice, validatedInput.currency, validatedInput.region);

    const result = {
      basePrice,
      aiSuggestedPrice: aiSuggestion.suggestedPrice,
      marketAveragePrice: marketData.averagePrice,
      complexityScore,
      discountPercentage,
      finalPrice,
      healthUnits,
      currency: validatedInput.currency,
      reasoning: aiSuggestion.reasoning,
      marketInsights: marketData.insights,
    };

    // Cache the result
    await PricingCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get AI-powered pricing suggestions using OpenAI
   */
  private static async getAIPricingSuggestion(
    input: PricingInput,
    marketData: any,
    complexityScore: number
  ): Promise<{ suggestedPrice: number; minPrice: number; reasoning: string }> {
    try {
      const prompt = `
You are a healthcare pricing expert. Analyze the following service and provide optimal pricing recommendations.

Service Details:
- Name: ${input.serviceName}
- Description: ${input.serviceDescription || 'Not provided'}
- ICD-11 Code: ${input.icd11Code || 'Not specified'}
- Quantity: ${input.quantity}
- Region: ${input.region}
- Complexity Score (1-4): ${complexityScore}

Market Data:
- Average Price: ${marketData.averagePrice} ${input.currency}
- Price Range: ${marketData.minPrice} - ${marketData.maxPrice} ${input.currency}
- Market Trend: ${marketData.trend}

Provide a JSON response with:
- suggestedPrice: Optimal price point
- minPrice: Minimum viable price
- reasoning: Brief explanation of pricing strategy

Consider factors like:
- Service complexity
- Market competition
- Regional economic factors
- Healthcare accessibility
- Quality standards
`;

      const response = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3,
      });

      const result = JSON.parse(response.text);

      return {
        suggestedPrice: parseFloat(result.suggestedPrice),
        minPrice: parseFloat(result.minPrice),
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('AI pricing suggestion error:', error);
      // Fallback to rule-based pricing
      return this.getFallbackPricing(input, marketData, complexityScore);
    }
  }

  /**
   * Fallback pricing calculation when AI fails
   */
  private static getFallbackPricing(
    input: PricingInput,
    marketData: any,
    complexityScore: number
  ): { suggestedPrice: number; minPrice: number; reasoning: string } {
    const baseMultiplier = complexityScore * 1.5;
    const marketAdjusted = marketData.averagePrice * baseMultiplier;
    const quantityDiscount = input.quantity > 10 ? 0.9 : 1.0;

    const suggestedPrice = marketAdjusted * quantityDiscount;
    const minPrice = suggestedPrice * 0.7;

    return {
      suggestedPrice,
      minPrice,
      reasoning: `Rule-based pricing: Complexity factor ${complexityScore}, market adjustment applied, quantity discount ${quantityDiscount}`,
    };
  }

  /**
   * Get market data for pricing insights
   */
  private static async getMarketData(input: PricingInput): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    trend: string;
    insights: string[];
  }> {
    // Mock market data - in production, this would query real market data
    const basePrice = this.calculateBasePrice(input, 2.0);

    return {
      averagePrice: basePrice * 1.2,
      minPrice: basePrice * 0.8,
      maxPrice: basePrice * 1.8,
      trend: 'stable',
      insights: [
        'Market demand is steady for this service type',
        'Competitive pricing in the region',
        'Similar services priced between 80-180% of base rate',
      ],
    };
  }

  /**
   * Calculate base price from service details
   */
  private static calculateBasePrice(input: PricingInput, complexityScore: number): number {
    // Base pricing algorithm
    let basePrice = 100; // Minimum base price

    // Adjust for complexity
    basePrice *= complexityScore;

    // Adjust for service type (rough categorization)
    if (input.serviceName.toLowerCase().includes('surgery')) {
      basePrice *= 5;
    } else if (input.serviceName.toLowerCase().includes('consultation')) {
      basePrice *= 1.5;
    } else if (input.serviceName.toLowerCase().includes('test') || input.serviceName.toLowerCase().includes('scan')) {
      basePrice *= 2;
    }

    // Regional adjustment
    const regionalMultiplier = HEALTH_UNIT_RATES[input.region] || 1.0;
    basePrice *= regionalMultiplier;

    return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate bulk discount percentage
   */
  private static calculateBulkDiscount(quantity: number): number {
    if (quantity >= 100) return 25;
    if (quantity >= 50) return 15;
    if (quantity >= 20) return 10;
    if (quantity >= 10) return 5;
    return 0;
  }

  /**
   * Convert currency to health units
   */
  private static convertToHealthUnits(amount: number, currency: string, region: string): number {
    // For now, assume LYD is the base currency
    // In production, this would use real exchange rates
    const regionalRate = HEALTH_UNIT_RATES[region] || 1.0;

    if (currency === 'LYD') {
      return amount / regionalRate;
    }

    // Add currency conversion logic here for other currencies
    // For now, assume 1:1 conversion
    return amount / regionalRate;
  }

  /**
   * Bulk pricing calculation for multiple services
   */
  static async calculateBulkPricing(
    services: Array<PricingInput & { id: string }>
  ): Promise<Array<PricingResult & { id: string }>> {
    const results = await Promise.all(
      services.map(async (service) => {
        const result = await this.calculatePricing(service);
        return { ...result, id: service.id };
      })
    );

    // Apply additional bulk discounts across services
    const totalServices = services.length;
    if (totalServices >= 5) {
      results.forEach(result => {
        result.discountPercentage += 5;
        result.finalPrice *= 0.95;
      });
    }

    return results;
  }
}