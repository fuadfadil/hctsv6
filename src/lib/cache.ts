import { db } from './db';
import { cachedPricingData } from './schema';

export class PricingCache {
  private static readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Get cached data by key
   */
  static async get(key: string): Promise<any | null> {
    try {
      const [cacheEntry] = await db
        .select()
        .from(cachedPricingData)
        .where(eq(cachedPricingData.cacheKey, key))
        .limit(1);

      if (!cacheEntry) return null;

      // Check if cache is expired
      if (new Date() > cacheEntry.expiresAt) {
        // Clean up expired cache
        await this.delete(key);
        return null;
      }

      return JSON.parse(cacheEntry.data as string);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, data: any, ttlMs: number = this.CACHE_TTL): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMs);

      await db
        .insert(cachedPricingData)
        .values({
          cacheKey: key,
          data: JSON.stringify(data),
          expiresAt,
        })
        .onConflictDoUpdate({
          target: cachedPricingData.cacheKey,
          set: {
            data: JSON.stringify(data),
            expiresAt,
          },
        });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    try {
      await db
        .delete(cachedPricingData)
        .where(eq(cachedPricingData.cacheKey, key));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  static async cleanup(): Promise<void> {
    try {
      await db
        .delete(cachedPricingData)
        .where(sql`${cachedPricingData.expiresAt} < now()`);
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Generate cache key for pricing calculations
   */
  static generatePricingKey(input: {
    serviceName: string;
    icd11Code?: string;
    quantity: number;
    region: string;
    currency: string;
  }): string {
    return `pricing:${input.serviceName}:${input.icd11Code || 'none'}:${input.quantity}:${input.region}:${input.currency}`;
  }

  /**
   * Generate cache key for market data
   */
  static generateMarketKey(params: {
    serviceId?: string;
    icd11Code?: string;
    region: string;
    currency: string;
  }): string {
    return `market:${params.serviceId || 'none'}:${params.icd11Code || 'none'}:${params.region}:${params.currency}`;
  }

  /**
   * Generate cache key for ICD-11 data
   */
  static generateICD11Key(code: string): string {
    return `icd11:${code}`;
  }
}

// Import eq and sql for the cache operations
import { eq, sql } from 'drizzle-orm';