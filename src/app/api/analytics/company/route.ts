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
  serviceReview,
  companyUser,
  buyerAnalytics
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
    const period = searchParams.get('period') || 'monthly'; // 'daily', 'weekly', 'monthly', 'yearly'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check if user has access to this company
    const userCompanyAccess = await db
      .select()
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, session.user.id)
      ));

    if (userCompanyAccess.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let dateFilter = undefined;
    if (startDate && endDate) {
      dateFilter = and(
        gte(order.orderDate, new Date(startDate)),
        lte(order.orderDate, new Date(endDate))
      );
    }

    // Revenue Analytics
    const revenueAnalytics = await db
      .select({
        period: sql<string>`date_trunc(${period}, ${order.orderDate})`,
        totalRevenue: sum(order.totalAmount),
        orderCount: count(order.id),
        averageOrderValue: avg(order.totalAmount),
        currency: order.currency
      })
      .from(order)
      .where(and(
        eq(order.sellerId, companyId),
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(sql`date_trunc(${period}, ${order.orderDate})`, order.currency)
      .orderBy(desc(sql`date_trunc(${period}, ${order.orderDate})`))
      .limit(12);

    // Service Performance
    const servicePerformance = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        category: sql<string>`icd11_category.title`,
        totalSold: sum(orderItem.quantity),
        totalRevenue: sum(orderItem.totalPrice),
        orderCount: count(order.id),
        averagePrice: avg(orderItem.unitPrice),
        averageRating: avg(serviceReview.rating)
      })
      .from(service)
      .innerJoin(listing, eq(service.id, listing.serviceId))
      .innerJoin(orderItem, eq(listing.id, orderItem.listingId))
      .innerJoin(order, and(
        eq(orderItem.orderId, order.id),
        eq(order.sellerId, companyId),
        eq(order.status, 'delivered')
      ))
      .leftJoin(sql`icd11_category`, eq(service.icd11CategoryId, sql`icd11_category.id`))
      .leftJoin(serviceReview, and(
        eq(serviceReview.serviceId, service.id),
        eq(serviceReview.orderId, order.id)
      ))
      .groupBy(service.id, service.name, sql`icd11_category.title`)
      .orderBy(desc(sum(orderItem.totalPrice)))
      .limit(20);

    // Customer Analytics
    const customerAnalytics = await db
      .select({
        customerId: order.buyerId,
        customerName: sql<string>`buyer_user.name`,
        totalOrders: count(order.id),
        totalSpent: sum(order.totalAmount),
        averageOrderValue: avg(order.totalAmount),
        lastOrderDate: sql<string>`max(${order.orderDate})`,
        averageRating: avg(serviceReview.rating)
      })
      .from(order)
      .innerJoin(sql`user as buyer_user`, eq(order.buyerId, sql`buyer_user.id`))
      .leftJoin(serviceReview, and(
        eq(serviceReview.userId, order.buyerId),
        eq(serviceReview.orderId, order.id)
      ))
      .where(and(
        eq(order.sellerId, companyId),
        eq(order.status, 'delivered')
      ))
      .groupBy(order.buyerId, sql`buyer_user.name`)
      .orderBy(desc(sum(order.totalAmount)))
      .limit(20);

    // Utilization and Performance Metrics
    const utilizationMetrics = await db
      .select({
        totalListings: count(listing.id),
        activeListings: sql<number>`count(case when ${listing.isActive} = true then 1 end)`,
        totalOrders: count(order.id),
        completedOrders: sql<number>`count(case when ${order.status} = 'delivered' then 1 end)`,
        pendingOrders: sql<number>`count(case when ${order.status} = 'pending' then 1 end)`,
        cancelledOrders: sql<number>`count(case when ${order.status} = 'cancelled' then 1 end)`,
        totalRevenue: sum(order.totalAmount),
        averageOrderValue: avg(order.totalAmount)
      })
      .from(listing)
      .leftJoin(order, and(
        eq(listing.companyId, order.sellerId),
        eq(listing.id, orderItem.listingId)
      ))
      .leftJoin(orderItem, eq(order.id, orderItem.orderId))
      .where(eq(listing.companyId, companyId));

    // Geographic Distribution
    const geographicDistribution = await db
      .select({
        region: sql<string>`split_part(buyer_user.address, ',', 2)`,
        orderCount: count(order.id),
        totalRevenue: sum(order.totalAmount),
        customerCount: sql<number>`count(distinct ${order.buyerId})`
      })
      .from(order)
      .innerJoin(sql`user as buyer_user`, eq(order.buyerId, sql`buyer_user.id`))
      .where(and(
        eq(order.sellerId, companyId),
        eq(order.status, 'delivered'),
        sql`buyer_user.address is not null`
      ))
      .groupBy(sql`split_part(buyer_user.address, ',', 2)`)
      .orderBy(desc(count(order.id)))
      .limit(10);

    // Payment Performance
    const paymentPerformance = await db
      .select({
        totalPayments: count(payment.id),
        successfulPayments: sql<number>`count(case when ${payment.status} = 'completed' then 1 end)`,
        failedPayments: sql<number>`count(case when ${payment.status} = 'failed' then 1 end)`,
        pendingPayments: sql<number>`count(case when ${payment.status} = 'pending' then 1 end)`,
        averagePaymentTime: sql<number>`avg(extract(epoch from (${payment.processedAt} - ${payment.paymentDate})) / 3600)`
      })
      .from(payment)
      .innerJoin(order, eq(payment.orderId, order.id))
      .where(eq(order.sellerId, companyId));

    // Customer Satisfaction
    const customerSatisfaction = await db
      .select({
        averageRating: avg(serviceReview.rating),
        totalReviews: count(serviceReview.id),
        fiveStarReviews: sql<number>`count(case when ${serviceReview.rating} = 5 then 1 end)`,
        fourStarReviews: sql<number>`count(case when ${serviceReview.rating} = 4 then 1 end)`,
        threeStarReviews: sql<number>`count(case when ${serviceReview.rating} = 3 then 1 end)`,
        twoStarReviews: sql<number>`count(case when ${serviceReview.rating} = 2 then 1 end)`,
        oneStarReviews: sql<number>`count(case when ${serviceReview.rating} = 1 then 1 end)`
      })
      .from(serviceReview)
      .innerJoin(order, eq(serviceReview.orderId, order.id))
      .where(eq(order.sellerId, companyId));

    // Growth Trends
    const growthTrends = await db
      .select({
        period: sql<string>`date_trunc(${period}, ${order.orderDate})`,
        revenue: sum(order.totalAmount),
        orders: count(order.id),
        customers: sql<number>`count(distinct ${order.buyerId})`
      })
      .from(order)
      .where(and(
        eq(order.sellerId, companyId),
        eq(order.status, 'delivered'),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(sql`date_trunc(${period}, ${order.orderDate})`)
      .orderBy(desc(sql`date_trunc(${period}, ${order.orderDate})`))
      .limit(24);

    return NextResponse.json({
      revenueAnalytics,
      servicePerformance,
      customerAnalytics,
      utilization: utilizationMetrics[0],
      geographicDistribution,
      paymentPerformance: paymentPerformance[0],
      customerSatisfaction: customerSatisfaction[0],
      growthTrends,
      metadata: {
        companyId,
        period,
        startDate,
        endDate,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Company analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company analytics' },
      { status: 500 }
    );
  }
}