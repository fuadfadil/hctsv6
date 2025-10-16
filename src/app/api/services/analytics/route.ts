import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, listing, orderItem, order, companyUser, analyticsEvent, dashboardMetric } from "@/lib/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const analyticsSchema = z.object({
  serviceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      serviceId: searchParams.get('serviceId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      period: searchParams.get('period') || '30d',
    };

    const validatedParams = analyticsSchema.parse(queryParams);

    // Check if user has permission to view analytics
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied. Only healthcare providers can view analytics." }, { status: 403 });
    }

    const { companyId } = companyUserRecord[0];

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (validatedParams.startDate && validatedParams.endDate) {
      startDate = new Date(validatedParams.startDate);
      endDate = new Date(validatedParams.endDate);
    } else {
      switch (validatedParams.period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(2020, 0, 1); // Far past date
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Build base query conditions
    let serviceConditions = [eq(listing.companyId, companyId)];
    let orderConditions = [];

    if (validatedParams.serviceId) {
      serviceConditions.push(eq(service.id, validatedParams.serviceId));
      orderConditions.push(eq(orderItem.listingId, validatedParams.serviceId));
    }

    // Get service performance metrics
    const serviceMetrics = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        totalOrders: sql<number>`count(distinct ${orderItem.orderId})`,
        totalQuantity: sql<number>`sum(${orderItem.quantity})`,
        totalRevenue: sql<number>`sum(${orderItem.totalPrice})`,
        averageOrderValue: sql<number>`avg(${orderItem.totalPrice})`,
        lastOrderDate: sql<Date>`max(${order.orderDate})`,
      })
      .from(service)
      .innerJoin(listing, eq(listing.serviceId, service.id))
      .leftJoin(orderItem, eq(orderItem.listingId, listing.id))
      .leftJoin(order, and(
        eq(order.id, orderItem.orderId),
        gte(order.orderDate, startDate),
        lte(order.orderDate, endDate)
      ))
      .where(and(...serviceConditions))
      .groupBy(service.id, service.name);

    // Get revenue trends (daily for the period)
    const revenueTrends = await db
      .select({
        date: sql<Date>`date(${order.orderDate})`,
        revenue: sql<number>`sum(${orderItem.totalPrice})`,
        orders: sql<number>`count(distinct ${orderItem.orderId})`,
      })
      .from(order)
      .innerJoin(orderItem, eq(orderItem.orderId, order.id))
      .innerJoin(listing, eq(listing.id, orderItem.listingId))
      .where(and(
        eq(listing.companyId, companyId),
        gte(order.orderDate, startDate),
        lte(order.orderDate, endDate),
        ...(validatedParams.serviceId ? [eq(listing.serviceId, validatedParams.serviceId)] : [])
      ))
      .groupBy(sql`date(${order.orderDate})`)
      .orderBy(sql`date(${order.orderDate})`);

    // Get top performing services
    const topServices = await db
      .select({
        serviceId: service.id,
        serviceName: service.name,
        revenue: sql<number>`sum(${orderItem.totalPrice})`,
        orders: sql<number>`count(distinct ${orderItem.orderId})`,
      })
      .from(service)
      .innerJoin(listing, eq(listing.serviceId, service.id))
      .leftJoin(orderItem, eq(orderItem.listingId, listing.id))
      .leftJoin(order, and(
        eq(order.id, orderItem.orderId),
        gte(order.orderDate, startDate),
        lte(order.orderDate, endDate)
      ))
      .where(eq(listing.companyId, companyId))
      .groupBy(service.id, service.name)
      .orderBy(desc(sql`sum(${orderItem.totalPrice})`))
      .limit(10);

    // Get dashboard metrics
    const dashboardMetrics = await db
      .select()
      .from(dashboardMetric)
      .where(and(
        eq(dashboardMetric.category, 'revenue'),
        gte(dashboardMetric.date, startDate),
        lte(dashboardMetric.date, endDate)
      ))
      .orderBy(desc(dashboardMetric.date))
      .limit(30);

    // Calculate summary statistics
    const totalRevenue = serviceMetrics.reduce((sum, service) => sum + (service.totalRevenue || 0), 0);
    const totalOrders = serviceMetrics.reduce((sum, service) => sum + (service.totalOrders || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalServices: serviceMetrics.length,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      serviceMetrics,
      revenueTrends,
      topServices,
      dashboardMetrics,
    });

  } catch (error) {
    console.error("Service analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}