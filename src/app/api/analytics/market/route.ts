import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, sql, count, sum, avg, min, max } from 'drizzle-orm';
import {
  listing,
  service,
  order,
  orderItem,
  marketData,
  pricingCalculation,
  healthUnitRate,
  icd11Category,
  serviceReview
} from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const region = searchParams.get('region');
    const period = searchParams.get('period') || 'monthly'; // 'daily', 'weekly', 'monthly', 'yearly'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = undefined;
    if (startDate && endDate) {
      dateFilter = and(
        gte(order.orderDate, new Date(startDate)),
        lte(order.orderDate, new Date(endDate))
      );
    }

    // Market Price Trends
    const priceTrends = await db
      .select({
        period: sql<string>`date_trunc(${period}, ${order.orderDate})`,
        category: sql<string>`icd11_category.title`,
        averagePrice: avg(orderItem.unitPrice),
        minPrice: min(orderItem.unitPrice),
        maxPrice: max(orderItem.unitPrice),
        medianPrice: sql<number>`percentile_cont(0.5) within group (order by ${orderItem.unitPrice})`,
        volume: sum(orderItem.quantity),
        transactionCount: count(orderItem.id)
      })
      .from(orderItem)
      .innerJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .innerJoin(listing, eq(orderItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .where(categoryId ? eq(service.icd11CategoryId, categoryId) : undefined)
      .groupBy(sql`date_trunc(${period}, ${order.orderDate})`, sql`icd11_category.title`)
      .orderBy(desc(sql`date_trunc(${period}, ${order.orderDate})`))
      .limit(24);

    // Service Popularity and Demand
    const servicePopularity = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        category: sql<string>`icd11_category.title`,
        totalOrders: count(order.id),
        totalVolume: sum(orderItem.quantity),
        totalRevenue: sum(orderItem.totalPrice),
        uniqueBuyers: sql<number>`count(distinct ${order.buyerId})`,
        averageRating: avg(serviceReview.rating),
        growthRate: sql<number>`case when lag(sum(${orderItem.totalPrice})) over (order by date_trunc(${period}, ${order.orderDate})) = 0 then null else ((sum(${orderItem.totalPrice}) - lag(sum(${orderItem.totalPrice})) over (order by date_trunc(${period}, ${order.orderDate}))) / lag(sum(${orderItem.totalPrice})) over (order by date_trunc(${period}, ${order.orderDate}))) * 100 end`
      })
      .from(service)
      .innerJoin(listing, eq(service.id, listing.serviceId))
      .innerJoin(orderItem, eq(listing.id, orderItem.listingId))
      .innerJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .leftJoin(serviceReview, eq(service.id, serviceReview.serviceId))
      .groupBy(service.id, service.name, sql`icd11_category.title`, sql`date_trunc(${period}, ${order.orderDate})`)
      .orderBy(desc(sum(orderItem.totalPrice)))
      .limit(50);

    // Regional Market Analysis
    const regionalAnalysis = await db
      .select({
        region: sql<string>`coalesce(${region}, split_part(buyer_user.address, ',', 2))`,
        totalOrders: count(order.id),
        totalRevenue: sum(order.totalAmount),
        averageOrderValue: avg(order.totalAmount),
        uniqueBuyers: sql<number>`count(distinct ${order.buyerId})`,
        uniqueSellers: sql<number>`count(distinct ${order.sellerId})`,
        topCategory: sql<string>`mode() within group (order by icd11_category.title)`
      })
      .from(order)
      .innerJoin(sql`user as buyer_user`, eq(order.buyerId, sql`buyer_user.id`))
      .innerJoin(orderItem, eq(order.id, orderItem.orderId))
      .innerJoin(listing, eq(orderItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .where(and(
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : []),
        ...(region ? [sql`split_part(buyer_user.address, ',', 2) = ${region}`] : [])
      ))
      .groupBy(sql`coalesce(${region}, split_part(buyer_user.address, ',', 2))`)
      .orderBy(desc(sum(order.totalAmount)))
      .limit(20);

    // Market Forecasting Data (simplified)
    const forecastingData = await db
      .select({
        period: sql<string>`date_trunc(${period}, ${order.orderDate})`,
        totalRevenue: sum(order.totalAmount),
        totalOrders: count(order.id),
        totalVolume: sum(orderItem.quantity),
        averagePrice: avg(orderItem.unitPrice),
        uniqueBuyers: sql<number>`count(distinct ${order.buyerId})`,
        uniqueSellers: sql<number>`count(distinct ${order.sellerId})`
      })
      .from(order)
      .innerJoin(orderItem, eq(order.id, orderItem.orderId))
      .where(and(
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(sql`date_trunc(${period}, ${order.orderDate})`)
      .orderBy(desc(sql`date_trunc(${period}, ${order.orderDate})`))
      .limit(36); // Last 3 years of monthly data

    // Health Unit Rate Trends
    const healthUnitTrends = await db
      .select({
        currency: healthUnitRate.currency,
        rate: healthUnitRate.rate,
        effectiveDate: healthUnitRate.effectiveDate,
        changePercentage: sql<number>`case when lag(${healthUnitRate.rate}) over (partition by ${healthUnitRate.currency} order by ${healthUnitRate.effectiveDate}) = 0 then null else ((${healthUnitRate.rate} - lag(${healthUnitRate.rate}) over (partition by ${healthUnitRate.currency} order by ${healthUnitRate.effectiveDate})) / lag(${healthUnitRate.rate}) over (partition by ${healthUnitRate.currency} order by ${healthUnitRate.effectiveDate})) * 100 end`
      })
      .from(healthUnitRate)
      .where(and(
        eq(healthUnitRate.isActive, true),
        ...(dateFilter ? [and(
          gte(healthUnitRate.effectiveDate, new Date(startDate!)),
          lte(healthUnitRate.effectiveDate, new Date(endDate!))
        )] : [])
      ))
      .orderBy(desc(healthUnitRate.effectiveDate))
      .limit(100);

    // Market Intelligence - Price Predictions (simplified ML-based)
    const pricePredictions = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        currentAveragePrice: avg(orderItem.unitPrice),
        predictedPrice: sql<number>`avg(${orderItem.unitPrice}) * 1.05`, // Simple 5% increase prediction
        confidence: sql<number>`0.75`, // Placeholder confidence score
        trend: sql<string>`case when avg(${orderItem.unitPrice}) > lag(avg(${orderItem.unitPrice})) over (order by date_trunc(${period}, ${order.orderDate})) then 'increasing' when avg(${orderItem.unitPrice}) < lag(avg(${orderItem.unitPrice})) over (order by date_trunc(${period}, ${order.orderDate})) then 'decreasing' else 'stable' end`
      })
      .from(service)
      .innerJoin(listing, eq(service.id, listing.serviceId))
      .innerJoin(orderItem, eq(listing.id, orderItem.listingId))
      .innerJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(service.id, service.name, sql`date_trunc(${period}, ${order.orderDate})`)
      .orderBy(desc(avg(orderItem.unitPrice)))
      .limit(20);

    // Competitive Analysis
    const competitiveAnalysis = await db
      .select({
        companyId: listing.companyId,
        companyName: sql<string>`company.name`,
        marketShare: sql<number>`(sum(${orderItem.totalPrice}) / (select sum(total_amount) from "order" where status = 'delivered')) * 100`,
        averagePrice: avg(orderItem.unitPrice),
        serviceCount: sql<number>`count(distinct ${listing.serviceId})`,
        customerCount: sql<number>`count(distinct ${order.buyerId})`,
        rating: avg(serviceReview.rating)
      })
      .from(listing)
      .innerJoin(sql`company`, eq(listing.companyId, sql`company.id`))
      .innerJoin(orderItem, eq(listing.id, orderItem.listingId))
      .innerJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .leftJoin(serviceReview, and(
        eq(serviceReview.serviceId, listing.serviceId),
        eq(serviceReview.orderId, order.id)
      ))
      .groupBy(listing.companyId, sql`company.name`)
      .orderBy(desc(sql`(sum(${orderItem.totalPrice}) / (select sum(total_amount) from "order" where status = 'delivered')) * 100`))
      .limit(10);

    return NextResponse.json({
      priceTrends,
      servicePopularity,
      regionalAnalysis,
      forecastingData,
      healthUnitTrends,
      pricePredictions,
      competitiveAnalysis,
      metadata: {
        categoryId,
        region,
        period,
        startDate,
        endDate,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Market analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market analytics' },
      { status: 500 }
    );
  }
}