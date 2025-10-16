import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { order, orderItem, payment, serviceReview, report } from '@/lib/schema';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const generateReportSchema = z.object({
  reportType: z.enum(['utilization', 'spending', 'performance', 'roi']),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (reportId) {
      // Get specific report
      const reportData = await db
        .select()
        .from(report)
        .where(and(
          eq(report.id, reportId),
          eq(report.generatedBy, userId)
        ))
        .limit(1);

      if (!reportData.length) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      return NextResponse.json(reportData[0]);
    }

    // Get user's reports list
    const reports = await db
      .select({
        id: report.id,
        name: report.name,
        type: report.type,
        generatedAt: report.generatedAt,
        data: report.data
      })
      .from(report)
      .where(eq(report.generatedBy, userId))
      .orderBy(desc(report.generatedAt))
      .limit(20);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Buyer reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { reportType, startDate, endDate, format } = generateReportSchema.parse(body);

    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData: any = {};
    let reportName = '';

    switch (reportType) {
      case 'utilization':
        reportName = `Service Utilization Report (${startDate} to ${endDate})`;
        reportData = await generateUtilizationReport(userId, start, end);
        break;

      case 'spending':
        reportName = `Spending Analysis Report (${startDate} to ${endDate})`;
        reportData = await generateSpendingReport(userId, start, end);
        break;

      case 'performance':
        reportName = `Provider Performance Report (${startDate} to ${endDate})`;
        reportData = await generatePerformanceReport(userId, start, end);
        break;

      case 'roi':
        reportName = `ROI Analysis Report (${startDate} to ${endDate})`;
        reportData = await generateROIReport(userId, start, end);
        break;
    }

    // Save report
    const savedReport = await db
      .insert(report)
      .values({
        name: reportName,
        type: reportType,
        parameters: { startDate, endDate, format },
        generatedBy: userId,
        data: reportData,
      })
      .returning();

    return NextResponse.json({
      success: true,
      report: savedReport[0]
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateUtilizationReport(userId: string, start: Date, end: Date) {
  const utilization = await db
    .select({
      serviceName: sql<string>`service.name`,
      quantity: sql<number>`sum(${orderItem.quantity})`,
      totalSpent: sql<number>`sum(${orderItem.totalPrice})`,
      orderCount: sql<number>`count(distinct ${order.id})`
    })
    .from(order)
    .innerJoin(orderItem, eq(order.id, orderItem.orderId))
    .innerJoin(sql`service`, eq(orderItem.listingId, sql`service.id`))
    .where(and(
      eq(order.buyerId, userId),
      eq(order.status, 'delivered'),
      gte(order.orderDate, start),
      lte(order.orderDate, end)
    ))
    .groupBy(sql`service.name`);

  return { utilization };
}

async function generateSpendingReport(userId: string, start: Date, end: Date) {
  const spending = await db
    .select({
      month: sql<string>`to_char(${order.orderDate}, 'YYYY-MM')`,
      totalSpent: sql<number>`sum(${order.totalAmount})`,
      orderCount: sql<number>`count(*)`,
      averageOrderValue: sql<number>`avg(${order.totalAmount})`
    })
    .from(order)
    .where(and(
      eq(order.buyerId, userId),
      eq(order.status, 'delivered'),
      gte(order.orderDate, start),
      lte(order.orderDate, end)
    ))
    .groupBy(sql`to_char(${order.orderDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${order.orderDate}, 'YYYY-MM')`);

  return { spending };
}

async function generatePerformanceReport(userId: string, start: Date, end: Date) {
  const performance = await db
    .select({
      providerName: sql<string>`company.name`,
      totalSpent: sql<number>`sum(${order.totalAmount})`,
      orderCount: sql<number>`count(*)`,
      averageRating: sql<number>`avg(${serviceReview.rating})`,
      onTimeDelivery: sql<number>`count(case when ${order.deliveryDate} <= ${order.orderDate} + interval '7 days' then 1 end) * 100.0 / count(*)`
    })
    .from(order)
    .innerJoin(sql`company`, eq(order.sellerId, sql`company.id`))
    .leftJoin(serviceReview, and(
      eq(serviceReview.userId, userId),
      eq(serviceReview.orderId, order.id)
    ))
    .where(and(
      eq(order.buyerId, userId),
      eq(order.status, 'delivered'),
      gte(order.orderDate, start),
      lte(order.orderDate, end)
    ))
    .groupBy(sql`company.name`);

  return { performance };
}

async function generateROIReport(userId: string, start: Date, end: Date) {
  const roi = await db
    .select({
      serviceName: sql<string>`service.name`,
      totalInvested: sql<number>`sum(${orderItem.totalPrice})`,
      averageRating: sql<number>`avg(${serviceReview.rating})`,
      utilizationRate: sql<number>`sum(${orderItem.quantity}) / sum(${orderItem.quantity}) * 100` // Simplified
    })
    .from(order)
    .innerJoin(orderItem, eq(order.id, orderItem.orderId))
    .innerJoin(sql`service`, eq(orderItem.listingId, sql`service.id`))
    .leftJoin(serviceReview, and(
      eq(serviceReview.userId, userId),
      eq(serviceReview.orderId, order.id)
    ))
    .where(and(
      eq(order.buyerId, userId),
      eq(order.status, 'delivered'),
      gte(order.orderDate, start),
      lte(order.orderDate, end)
    ))
    .groupBy(sql`service.name`);

  return { roi };
}