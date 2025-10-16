import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm';
import {
  order,
  orderItem,
  payment,
  listing,
  service,
  company,
  user,
  dashboardMetric,
  analyticsEvent,
  buyerAlert,
  fraudAlert,
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
    const companyId = searchParams.get('companyId');
    const realtime = searchParams.get('realtime') === 'true';

    // Real-time metrics (last 24 hours)
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Key Performance Indicators
    const kpis = await db
      .select({
        totalRevenue: sum(order.totalAmount),
        totalOrders: count(order.id),
        activeListings: sql<number>`count(distinct case when ${listing.isActive} = true then ${listing.id} end)`,
        totalUsers: sql<number>`count(distinct ${user.id})`,
        conversionRate: sql<number>`(count(case when ${order.status} = 'delivered' then 1 end)::decimal / count(*)) * 100`
      })
      .from(order)
      .leftJoin(listing, eq(order.sellerId, listing.companyId))
      .crossJoin(user)
      .where(and(
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        eq(order.status, 'delivered'),
        gte(order.orderDate, last30Days)
      ));

    // Real-time alerts and notifications
    const alerts = await db
      .select({
        alertId: buyerAlert.id,
        type: buyerAlert.alertType,
        title: buyerAlert.title,
        message: buyerAlert.message,
        severity: buyerAlert.severity,
        isRead: buyerAlert.isRead,
        createdAt: buyerAlert.createdAt
      })
      .from(buyerAlert)
      .where(and(
        eq(buyerAlert.userId, session.user.id),
        ...(realtime ? [gte(buyerAlert.createdAt, last24Hours)] : [])
      ))
      .orderBy(desc(buyerAlert.createdAt))
      .limit(10);

    // Live transaction feed
    const liveTransactions = await db
      .select({
        orderId: order.id,
        buyerName: sql<string>`buyer_user.name`,
        sellerName: sql<string>`company.name`,
        amount: order.totalAmount,
        currency: order.currency,
        status: order.status,
        timestamp: order.orderDate
      })
      .from(order)
      .innerJoin(sql`user as buyer_user`, eq(order.buyerId, sql`buyer_user.id`))
      .innerJoin(company, eq(order.sellerId, company.id))
      .where(and(
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        ...(realtime ? [gte(order.orderDate, last24Hours)] : [gte(order.orderDate, last7Days)])
      ))
      .orderBy(desc(order.orderDate))
      .limit(20);

    // Performance trends (hourly for last 24 hours)
    const performanceTrends = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${order.orderDate})`,
        revenue: sum(order.totalAmount),
        orders: count(order.id),
        averageOrderValue: avg(order.totalAmount)
      })
      .from(order)
      .where(and(
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        eq(order.status, 'delivered'),
        gte(order.orderDate, last24Hours)
      ))
      .groupBy(sql`date_trunc('hour', ${order.orderDate})`)
      .orderBy(sql`date_trunc('hour', ${order.orderDate})`);

    // System health metrics
    const systemHealth = await db
      .select({
        totalActiveUsers: sql<number>`count(distinct case when ${analyticsEvent.timestamp} >= ${last24Hours} then ${analyticsEvent.userId} end)`,
        totalSessions: sql<number>`count(distinct ${analyticsEvent.sessionId})`,
        errorRate: sql<number>`(count(case when ${analyticsEvent.eventType} = 'error' then 1 end)::decimal / count(*)) * 100`,
        averageResponseTime: sql<number>`avg(case when ${analyticsEvent.eventData}::json->>'responseTime' is not null then (${analyticsEvent.eventData}::json->>'responseTime')::numeric end)`
      })
      .from(analyticsEvent)
      .where(gte(analyticsEvent.timestamp, last24Hours));

    // Fraud detection alerts
    const fraudAlerts = await db
      .select({
        alertId: fraudAlert.id,
        type: fraudAlert.alertType,
        severity: fraudAlert.severity,
        description: fraudAlert.description,
        status: fraudAlert.status,
        createdAt: fraudAlert.createdAt
      })
      .from(fraudAlert)
      .where(and(
        ...(companyId ? [eq(fraudAlert.userId, companyId)] : []),
        eq(fraudAlert.status, 'open'),
        gte(fraudAlert.createdAt, last7Days)
      ))
      .orderBy(desc(fraudAlert.createdAt))
      .limit(5);

    // Revenue forecast (simple linear projection)
    const revenueHistory = await db
      .select({
        date: sql<string>`date_trunc('day', ${order.orderDate})`,
        revenue: sum(order.totalAmount)
      })
      .from(order)
      .where(and(
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        eq(order.status, 'delivered'),
        gte(order.orderDate, last30Days)
      ))
      .groupBy(sql`date_trunc('day', ${order.orderDate})`)
      .orderBy(sql`date_trunc('day', ${order.orderDate})`);

    // Calculate simple moving average for forecasting
    const recentRevenue = revenueHistory.slice(-7);
    const averageDailyRevenue = recentRevenue.length > 0
      ? recentRevenue.reduce((sum, day) => sum + Number(day.revenue || 0), 0) / recentRevenue.length
      : 0;

    const revenueForecast = {
      nextDay: averageDailyRevenue,
      nextWeek: averageDailyRevenue * 7,
      nextMonth: averageDailyRevenue * 30,
      confidence: 0.75 // Placeholder confidence score
    };

    // Top performing services (real-time)
    const topServices = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        revenue: sum(orderItem.totalPrice),
        orders: count(order.id),
        averageRating: avg(sql`case when ${serviceReview.rating} is not null then ${serviceReview.rating} else null end`)
      })
      .from(service)
      .innerJoin(listing, eq(service.id, listing.serviceId))
      .innerJoin(orderItem, eq(listing.id, orderItem.listingId))
      .innerJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.status, 'delivered'),
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        gte(order.orderDate, last7Days)
      ))
      .leftJoin(serviceReview, eq(service.id, serviceReview.serviceId))
      .groupBy(service.id, service.name)
      .orderBy(desc(sum(orderItem.totalPrice)))
      .limit(5);

    // Geographic distribution (real-time)
    const geographicData = await db
      .select({
        region: sql<string>`split_part(buyer_user.address, ',', 2)`,
        orders: count(order.id),
        revenue: sum(order.totalAmount)
      })
      .from(order)
      .innerJoin(sql`user as buyer_user`, eq(order.buyerId, sql`buyer_user.id`))
      .where(and(
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        eq(order.status, 'delivered'),
        gte(order.orderDate, last7Days),
        sql`buyer_user.address is not null`
      ))
      .groupBy(sql`split_part(buyer_user.address, ',', 2)`)
      .orderBy(desc(count(order.id)))
      .limit(10);

    return NextResponse.json({
      kpis: kpis[0],
      alerts,
      liveTransactions,
      performanceTrends,
      systemHealth: systemHealth[0],
      fraudAlerts,
      revenueForecast,
      topServices,
      geographicData,
      metadata: {
        companyId,
        realtime,
        lastUpdated: new Date().toISOString(),
        timeRange: realtime ? '24h' : '7d'
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}