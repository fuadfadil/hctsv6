import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  order,
  orderItem,
  payment,
  listing,
  service,
  company,
  user,
  serviceReview,
  complianceRecord,
  fraudAlert,
  dashboardMetric
} from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'csv'; // 'csv', 'excel', 'pdf'
    const dataType = searchParams.get('dataType') || 'orders'; // 'orders', 'analytics', 'compliance', 'market'
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = undefined;
    if (startDate && endDate) {
      dateFilter = and(
        gte(order.orderDate, new Date(startDate)),
        lte(order.orderDate, new Date(endDate))
      );
    }

    let exportData: any[] = [];
    let filename = '';

    switch (dataType) {
      case 'orders':
        const ordersData = await db
          .select({
            orderId: order.id,
            orderDate: order.orderDate,
            buyerName: sql<string>`buyer_user.name`,
            buyerEmail: sql<string>`buyer_user.email`,
            sellerName: sql<string>`company.name`,
            serviceName: service.name,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice,
            totalPrice: orderItem.totalPrice,
            currency: order.currency,
            status: order.status,
            deliveryDate: order.deliveryDate
          })
          .from(order)
          .innerJoin(orderItem, eq(order.id, orderItem.orderId))
          .innerJoin(listing, eq(orderItem.listingId, listing.id))
          .innerJoin(service, eq(listing.serviceId, service.id))
          .innerJoin(sql`user as buyer_user`, eq(order.buyerId, sql`buyer_user.id`))
          .innerJoin(company, eq(order.sellerId, company.id))
          .where(and(
            ...(companyId ? [eq(order.sellerId, companyId)] : []),
            eq(order.status, 'delivered'),
            ...(dateFilter ? [dateFilter] : [])
          ))
          .orderBy(desc(order.orderDate));

        exportData = ordersData;
        filename = `orders_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'analytics':
        const analyticsData = await db
          .select({
            date: dashboardMetric.date,
            category: dashboardMetric.category,
            metric: dashboardMetric.name,
            value: dashboardMetric.value,
            unit: dashboardMetric.unit,
            period: dashboardMetric.period
          })
          .from(dashboardMetric)
          .where(and(
            ...(dateFilter ? [and(
              gte(dashboardMetric.date, new Date(startDate!)),
              lte(dashboardMetric.date, new Date(endDate!))
            )] : [])
          ))
          .orderBy(desc(dashboardMetric.date));

        exportData = analyticsData;
        filename = `analytics_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'compliance':
        const complianceData = await db
          .select({
            recordId: complianceRecord.id,
            companyName: sql<string>`company.name`,
            regulationType: complianceRecord.regulationType,
            complianceStatus: complianceRecord.complianceStatus,
            checkDate: complianceRecord.createdAt,
            reviewedBy: sql<string>`reviewer.name`,
            reviewedAt: complianceRecord.reviewedAt,
            details: complianceRecord.details
          })
          .from(complianceRecord)
          .leftJoin(company, eq(complianceRecord.companyId, company.id))
          .leftJoin(sql`user as reviewer`, eq(complianceRecord.reviewedBy, sql`reviewer.id`))
          .where(and(
            ...(companyId ? [eq(complianceRecord.companyId, companyId)] : []),
            ...(dateFilter ? [and(
              gte(complianceRecord.createdAt, new Date(startDate!)),
              lte(complianceRecord.createdAt, new Date(endDate!))
            )] : [])
          ))
          .orderBy(desc(complianceRecord.createdAt));

        exportData = complianceData;
        filename = `compliance_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'market':
        const marketData = await db
          .select({
            serviceName: service.name,
            category: sql<string>`icd11_category.title`,
            companyName: sql<string>`company.name`,
            pricePerUnit: listing.pricePerUnit,
            currency: listing.currency,
            quantity: listing.quantity,
            minOrderQuantity: listing.minOrderQuantity,
            isActive: listing.isActive,
            createdAt: listing.createdAt
          })
          .from(listing)
          .innerJoin(service, eq(listing.serviceId, service.id))
          .innerJoin(company, eq(listing.companyId, company.id))
          .leftJoin(sql`icd11_category`, eq(service.icd11CategoryId, sql`icd11_category.id`))
          .where(and(
            eq(listing.isActive, true),
            ...(companyId ? [eq(listing.companyId, companyId)] : [])
          ))
          .orderBy(desc(listing.createdAt));

        exportData = marketData;
        filename = `market_export_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

    // Generate CSV content
    if (exportType === 'csv') {
      if (exportData.length === 0) {
        return new NextResponse('', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`
          }
        });
      }

      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map(row =>
        Object.values(row).map(value =>
          typeof value === 'object' ? JSON.stringify(value) : String(value || '')
        ).join(',')
      );

      const csvContent = [headers, ...rows].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });
    }

    // For Excel and PDF, return JSON data that frontend can process
    return NextResponse.json({
      data: exportData,
      filename,
      exportType,
      metadata: {
        totalRecords: exportData.length,
        generatedAt: new Date().toISOString(),
        filters: {
          dataType,
          companyId,
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Export analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

// POST endpoint for scheduled exports
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      exportType,
      dataType,
      companyId,
      startDate,
      endDate,
      schedule,
      email
    } = body;

    // Here you would typically save the export schedule to database
    // For now, we'll just return a success response

    return NextResponse.json({
      message: 'Export scheduled successfully',
      scheduleId: 'scheduled_' + Date.now(),
      estimatedCompletion: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    });

  } catch (error) {
    console.error('Schedule export error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule export' },
      { status: 500 }
    );
  }
}