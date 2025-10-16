import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketData, service, listing } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');
  const icd11Code = searchParams.get('icd11Code');
  const region = searchParams.get('region') || 'Libya';
  const currency = searchParams.get('currency') || 'LYD';

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereConditions = [eq(marketData.region, region), eq(marketData.currency, currency)];

    if (serviceId) {
      whereConditions.push(eq(marketData.serviceId, serviceId));
    }

    if (icd11Code) {
      whereConditions.push(eq(marketData.icd11Code, icd11Code));
    }

    // Get market data
    const marketStats = await db
      .select({
        serviceId: marketData.serviceId,
        icd11Code: marketData.icd11Code,
        region: marketData.region,
        currency: marketData.currency,
        averagePrice: sql<number>`avg(${marketData.averagePrice})`,
        minPrice: sql<number>`min(${marketData.minPrice})`,
        maxPrice: sql<number>`max(${marketData.maxPrice})`,
        medianPrice: sql<number>`percentile_cont(0.5) within group (order by ${marketData.averagePrice})`,
        dataPoints: sql<number>`sum(${marketData.dataPoints})`,
        lastUpdated: sql<string>`max(${marketData.lastUpdated})`,
      })
      .from(marketData)
      .where(and(...whereConditions))
      .groupBy(marketData.serviceId, marketData.icd11Code, marketData.region, marketData.currency);

    // Get recent market trends
    const trends = await db
      .select({
        date: sql<string>`date(${marketData.lastUpdated})`,
        averagePrice: sql<number>`avg(${marketData.averagePrice})`,
        dataPoints: sql<number>`sum(${marketData.dataPoints})`,
      })
      .from(marketData)
      .where(and(...whereConditions))
      .groupBy(sql`date(${marketData.lastUpdated})`)
      .orderBy(desc(sql`date(${marketData.lastUpdated})`))
      .limit(30); // Last 30 days

    // Calculate trend
    let trend = 'stable';
    let trendPercentage = 0;

    if (trends.length >= 2) {
      const recent = trends[0].averagePrice;
      const previous = trends[1].averagePrice;
      trendPercentage = ((recent - previous) / previous) * 100;

      if (trendPercentage > 5) trend = 'increasing';
      else if (trendPercentage < -5) trend = 'decreasing';
    }

    // Get competitive analysis
    const competitiveAnalysis = marketStats.length > 0 ? {
      marketPosition: marketStats[0].averagePrice < 100 ? 'low' : marketStats[0].averagePrice > 200 ? 'high' : 'medium',
      priceRange: `${marketStats[0].minPrice} - ${marketStats[0].maxPrice}`,
      recommendedRange: {
        min: Math.max(marketStats[0].minPrice * 0.9, marketStats[0].averagePrice * 0.8),
        max: Math.min(marketStats[0].maxPrice * 1.1, marketStats[0].averagePrice * 1.2),
      },
    } : null;

    return NextResponse.json({
      marketStats,
      trends: trends.reverse(), // Oldest first for charting
      trend,
      trendPercentage,
      competitiveAnalysis,
      insights: [
        `Market shows ${trend} trend with ${Math.abs(trendPercentage).toFixed(1)}% change`,
        competitiveAnalysis ? `Positioned in ${competitiveAnalysis.marketPosition} price range` : 'Limited market data available',
        `Recommended price range: ${competitiveAnalysis?.recommendedRange.min.toFixed(2)} - ${competitiveAnalysis?.recommendedRange.max.toFixed(2)} ${currency}`,
      ],
    });

  } catch (error) {
    console.error("Market data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, icd11Code, region, currency, priceData } = body;

    if (!serviceId && !icd11Code) {
      return NextResponse.json({ error: "Either serviceId or icd11Code is required" }, { status: 400 });
    }

    // Update or insert market data
    await db
      .insert(marketData)
      .values({
        serviceId: serviceId || null,
        icd11Code,
        region: region || 'Libya',
        currency: currency || 'LYD',
        averagePrice: priceData.averagePrice,
        minPrice: priceData.minPrice,
        maxPrice: priceData.maxPrice,
        medianPrice: priceData.medianPrice,
        priceTrend: priceData.trend || 'stable',
        trendPercentage: priceData.trendPercentage || 0,
        dataPoints: priceData.dataPoints || 1,
      })
      .onConflictDoUpdate({
        target: [marketData.serviceId, marketData.icd11Code, marketData.region, marketData.currency],
        set: {
          averagePrice: priceData.averagePrice,
          minPrice: priceData.minPrice,
          maxPrice: priceData.maxPrice,
          medianPrice: priceData.medianPrice,
          priceTrend: priceData.trend || 'stable',
          trendPercentage: priceData.trendPercentage || 0,
          dataPoints: priceData.dataPoints || 1,
          lastUpdated: new Date(),
        },
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Market data update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}