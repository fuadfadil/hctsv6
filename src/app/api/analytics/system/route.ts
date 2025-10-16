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
  serviceReview,
  fraudAlert,
  complianceRecord
} from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
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

    // Trading Volume Analytics
    const tradingVolume = await db
      .select({
        totalTransactions: count(order.id),
        totalValue: sum(order.totalAmount),
        totalVolume: sum(orderItem.quantity),
        averageOrderValue: avg(order.totalAmount),
        period: sql<string>`date_trunc(${period}, ${order.orderDate})`
      })
      .from(order)
      .innerJoin(orderItem, eq(order.id, orderItem.orderId))
      .where(and(
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(sql`date_trunc(${period}, ${order.orderDate})`)
      .orderBy(desc(sql`date_trunc(${period}, ${order.orderDate})`))
      .limit(12);

    // Market Performance Analytics
    const marketPerformance = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        category: sql<string>`icd11_category.title`,
        totalListings: count(listing.id),
        averagePrice: avg(listing.pricePerUnit),
        totalVolume: sum(orderItem.quantity),
        totalRevenue: sum(orderItem.totalPrice),
        popularityScore: sql<number>`count(distinct ${order.buyerId})`
      })
      .from(service)
      .leftJoin(listing, eq(service.id, listing.serviceId))
      .leftJoin(orderItem, eq(listing.id, orderItem.listingId))
      .leftJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.status, 'delivered')
      ))
      .leftJoin(sql`icd11_category`, eq(service.icd11CategoryId, sql`icd11_category.id`))
      .groupBy(service.id, service.name, sql`icd11_category.title`)
      .orderBy(desc(sum(orderItem.totalPrice)))
      .limit(20);

    // Company Performance Analytics
    const companyPerformance = await db
      .select({
        companyId: company.id,
        companyName: company.name,
        companyType: sql<string>`company_type.name`,
        totalRevenue: sum(order.totalAmount),
        totalOrders: count(order.id),
        averageOrderValue: avg(order.totalAmount),
        customerCount: sql<number>`count(distinct ${order.buyerId})`,
        averageRating: avg(serviceReview.rating)
      })
      .from(company)
      .innerJoin(sql`company_type`, eq(company.typeId, sql`company_type.id`))
      .leftJoin(order, eq(company.id, order.sellerId))
      .leftJoin(serviceReview, and(
        eq(serviceReview.userId, order.buyerId),
        eq(serviceReview.orderId, order.id)
      ))
      .where(eq(order.status, 'delivered'))
      .groupBy(company.id, company.name, sql`company_type.name`)
      .orderBy(desc(sum(order.totalAmount)))
      .limit(20);

    // User Activity Analytics
    const userActivity = await db
      .select({
        totalUsers: count(user.id),
        activeUsers: sql<number>`count(distinct case when ${analyticsEvent.timestamp} >= now() - interval '30 days' then ${analyticsEvent.userId} end)`,
        newUsers: sql<number>`count(case when ${user.createdAt} >= now() - interval '30 days' then 1 end)`,
        totalSessions: count(sql`distinct ${analyticsEvent.sessionId}`)
      })
      .from(user)
      .leftJoin(analyticsEvent, eq(user.id, analyticsEvent.userId));

    // Compliance Metrics
    const complianceMetrics = await db
      .select({
        totalRecords: count(complianceRecord.id),
        compliantRecords: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)`,
        nonCompliantRecords: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'non_compliant' then 1 end)`,
        pendingReviews: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'pending_review' then 1 end)`
      })
      .from(complianceRecord);

    // Risk Analysis
    const riskAnalysis = await db
      .select({
        totalAlerts: count(fraudAlert.id),
        highSeverityAlerts: sql<number>`count(case when ${fraudAlert.severity} = 'high' then 1 end)`,
        criticalAlerts: sql<number>`count(case when ${fraudAlert.severity} = 'critical' then 1 end)`,
        resolvedAlerts: sql<number>`count(case when ${fraudAlert.status} = 'resolved' then 1 end)`
      })
      .from(fraudAlert);

    // Payment Analytics
    const paymentAnalytics = await db
      .select({
        totalPayments: count(payment.id),
        successfulPayments: sql<number>`count(case when ${payment.status} = 'completed' then 1 end)`,
        failedPayments: sql<number>`count(case when ${payment.status} = 'failed' then 1 end)`,
        totalValue: sum(payment.amount),
        averagePaymentValue: avg(payment.amount)
      })
      .from(payment);

    // Geographic Analysis (simplified - based on user addresses)
    const geographicAnalysis = await db
      .select({
        region: sql<string>`split_part(${user.address}, ',', 2)`,
        userCount: count(user.id),
        orderCount: count(order.id),
        totalValue: sum(order.totalAmount)
      })
      .from(user)
      .leftJoin(order, eq(user.id, order.buyerId))
      .where(sql`${user.address} is not null`)
      .groupBy(sql`split_part(${user.address}, ',', 2)`)
      .orderBy(desc(count(order.id)))
      .limit(10);

    // Real-time Dashboard Metrics
    const dashboardMetrics = await db
      .select()
      .from(dashboardMetric)
      .where(and(
        eq(dashboardMetric.period, period),
        ...(dateFilter ? [and(
          gte(dashboardMetric.date, new Date(startDate!)),
          lte(dashboardMetric.date, new Date(endDate!))
        )] : [])
      ))
      .orderBy(desc(dashboardMetric.date))
      .limit(50);

    return NextResponse.json({
      tradingVolume,
      marketPerformance,
      companyPerformance,
      userActivity: userActivity[0],
      complianceMetrics: complianceMetrics[0],
      riskAnalysis: riskAnalysis[0],
      paymentAnalytics: paymentAnalytics[0],
      geographicAnalysis,
      dashboardMetrics,
      metadata: {
        period,
        startDate,
        endDate,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('System analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system analytics' },
      { status: 500 }
    );
  }
}