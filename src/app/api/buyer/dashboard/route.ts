import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { order, orderItem, payment, buyerAnalytics, buyerAlert, serviceReview, investorPortfolio, portfolioHolding, company, companyType, companyUser } from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's company type to determine dashboard type
    const userCompany = await db
      .select({
        companyType: companyType.name
      })
      .from(company)
      .innerJoin(companyType, eq(company.typeId, companyType.id))
      .innerJoin(companyUser, and(
        eq(companyUser.companyId, company.id),
        eq(companyUser.userId, userId)
      ))
      .limit(1);

    const isInvestor = userCompany[0]?.companyType === 'investor';

    // Get dashboard metrics
    const [orderStats] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalSpent: sql<number>`sum(${order.totalAmount})`,
        pendingOrders: sql<number>`count(case when ${order.status} = 'pending' then 1 end)`,
        completedOrders: sql<number>`count(case when ${order.status} = 'delivered' then 1 end)`
      })
      .from(order)
      .where(eq(order.buyerId, userId));

    // Get recent orders
    const recentOrders = await db
      .select({
        id: order.id,
        totalAmount: order.totalAmount,
        currency: order.currency,
        status: order.status,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate
      })
      .from(order)
      .where(eq(order.buyerId, userId))
      .orderBy(desc(order.orderDate))
      .limit(5);

    // Get analytics data
    const analytics = await db
      .select()
      .from(buyerAnalytics)
      .where(and(
        eq(buyerAnalytics.userId, userId),
        eq(buyerAnalytics.period, 'monthly')
      ))
      .orderBy(desc(buyerAnalytics.date))
      .limit(12);

    // Get active alerts
    const alerts = await db
      .select()
      .from(buyerAlert)
      .where(and(
        eq(buyerAlert.userId, userId),
        eq(buyerAlert.isRead, false)
      ))
      .orderBy(desc(buyerAlert.createdAt))
      .limit(5);

    // Get portfolio data for investors
    let portfolioData = null;
    if (isInvestor) {
      const portfolios = await db
        .select({
          id: investorPortfolio.id,
          name: investorPortfolio.name,
          totalValue: investorPortfolio.totalValue,
          currency: investorPortfolio.currency
        })
        .from(investorPortfolio)
        .where(and(
          eq(investorPortfolio.userId, userId),
          eq(investorPortfolio.isActive, true)
        ));

      portfolioData = portfolios;
    }

    // Get review stats
    const [reviewStats] = await db
      .select({
        totalReviews: sql<number>`count(*)`,
        averageRating: sql<number>`avg(${serviceReview.rating})`
      })
      .from(serviceReview)
      .where(eq(serviceReview.userId, userId));

    const dashboard = {
      userType: isInvestor ? 'investor' : 'insurance',
      metrics: {
        totalOrders: orderStats.totalOrders || 0,
        totalSpent: orderStats.totalSpent || 0,
        pendingOrders: orderStats.pendingOrders || 0,
        completedOrders: orderStats.completedOrders || 0,
        averageRating: reviewStats.averageRating || 0,
        totalReviews: reviewStats.totalReviews || 0
      },
      recentOrders,
      analytics,
      alerts,
      portfolioData,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Buyer dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}