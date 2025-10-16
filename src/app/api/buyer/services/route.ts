import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { order, orderItem, listing, service, company } from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'expired', 'pending'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let whereConditions = [eq(order.buyerId, userId)];

    if (status) {
      if (status === 'active') {
        whereConditions.push(eq(order.status, 'delivered'));
      } else if (status === 'pending') {
        whereConditions.push(eq(order.status, 'pending'));
      } else if (status === 'expired') {
        // Services that have expired (simplified logic)
        whereConditions.push(eq(order.status, 'delivered'));
      }
    }

    // Get purchased services with details
    const services = await db
      .select({
        orderId: order.id,
        orderStatus: order.status,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        serviceId: service.id,
        serviceName: service.name,
        serviceDescription: service.description,
        unit: service.unit,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        totalPrice: orderItem.totalPrice,
        currency: order.currency,
        companyName: company.name,
        expiresAt: listing.expiresAt
      })
      .from(order)
      .innerJoin(orderItem, eq(order.id, orderItem.orderId))
      .innerJoin(listing, eq(orderItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(and(...whereConditions))
      .orderBy(desc(order.orderDate))
      .limit(limit)
      .offset((page - 1) * limit);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(order)
      .innerJoin(orderItem, eq(order.id, orderItem.orderId))
      .where(and(...whereConditions));

    return NextResponse.json({
      services,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Buyer services error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}