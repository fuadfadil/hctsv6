import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { buyerAnalytics, order, orderItem, payment, serviceReview } from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // 'daily', 'weekly', 'monthly'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = undefined;
    if (startDate && endDate) {
      dateFilter = and(
        gte(buyerAnalytics.date, new Date(startDate)),
        lte(buyerAnalytics.date, new Date(endDate))
      );
    }

    // Get analytics data
    const analytics = await db
      .select()
      .from(buyerAnalytics)
      .where(and(
        eq(buyerAnalytics.userId, userId),
        eq(buyerAnalytics.period, period),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .orderBy(desc(buyerAnalytics.date));

    // Calculate utilization metrics
    const utilizationMetrics = await db
      .select({
        totalPurchased: sql<number>`sum(${orderItem.quantity})`,
        totalSpent: sql<number>`sum(${orderItem.totalPrice})`,
        orderCount: sql<number>`count(distinct ${order.id})`
      })
      .from(order)
      .innerJoin(orderItem, eq(order.id, orderItem.orderId))
      .where(and(
        eq(order.buyerId, userId),
        eq(order.status, 'delivered')
      ));

    // Get ROI analysis (simplified - based on service reviews and utilization)
    const roiAnalysis = await db
      .select({
        averageRating: sql<number>`avg(${serviceReview.rating})`,
        reviewCount: sql<number>`count(*)`
      })
      .from(serviceReview)
      .where(eq(serviceReview.userId, userId));

    // Get spending trends
    const spendingTrends = await db
      .select({
        month: sql<string>`to_char(${order.orderDate}, 'YYYY-MM')`,
        totalSpent: sql<number>`sum(${order.totalAmount})`,
        orderCount: sql<number>`count(*)`
      })
      .from(order)
      .where(and(
        eq(order.buyerId, userId),
        eq(order.status, 'delivered')
      ))
      .groupBy(sql`to_char(${order.orderDate}, 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${order.orderDate}, 'YYYY-MM')`))
      .limit(12);

    // Get provider performance
    const providerPerformance = await db
      .select({
        providerId: order.sellerId,
        providerName: sql<string>`company.name`,
        totalSpent: sql<number>`sum(${order.totalAmount})`,
        orderCount: sql<number>`count(*)`,
        averageRating: sql<number>`avg(${serviceReview.rating})`
      })
      .from(order)
      .innerJoin(sql`company`, eq(order.sellerId, sql`company.id`))
      .leftJoin(serviceReview, and(
        eq(serviceReview.userId, userId),
        eq(serviceReview.orderId, order.id)
      ))
      .where(and(
        eq(order.buyerId, userId),
        eq(order.status, 'delivered')
      ))
      .groupBy(order.sellerId, sql`company.name`)
      .orderBy(desc(sql`sum(${order.totalAmount})`))
      .limit(10);

    return NextResponse.json({
      analytics,
      utilization: {
        totalPurchased: utilizationMetrics[0]?.totalPurchased || 0,
        totalSpent: utilizationMetrics[0]?.totalSpent || 0,
        orderCount: utilizationMetrics[0]?.orderCount || 0
      },
      roi: {
        averageRating: roiAnalysis[0]?.averageRating || 0,
        reviewCount: roiAnalysis[0]?.reviewCount || 0
      },
      spendingTrends,
      providerPerformance
    });
  } catch (error) {
    console.error('Buyer analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}