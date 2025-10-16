import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { serviceReview, order, service, company } from '@/lib/schema';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createReviewSchema = z.object({
  orderId: z.string(),
  serviceId: z.string(),
  rating: z.number().min(1).max(5),
  reviewText: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let whereConditions = [eq(serviceReview.userId, userId)];

    if (serviceId) {
      whereConditions.push(eq(serviceReview.serviceId, serviceId));
    }

    // Get user's reviews
    const reviews = await db
      .select({
        id: serviceReview.id,
        rating: serviceReview.rating,
        reviewText: serviceReview.reviewText,
        isVerified: serviceReview.isVerified,
        helpfulVotes: serviceReview.helpfulVotes,
        createdAt: serviceReview.createdAt,
        serviceName: service.name,
        serviceDescription: service.description,
        companyName: company.name,
        orderId: serviceReview.orderId
      })
      .from(serviceReview)
      .innerJoin(service, eq(serviceReview.serviceId, service.id))
      .innerJoin(order, eq(serviceReview.orderId, order.id))
      .innerJoin(company, eq(order.sellerId, company.id))
      .where(and(...whereConditions))
      .orderBy(desc(serviceReview.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Get total count
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(serviceReview)
      .where(and(...whereConditions));

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Buyer reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
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
    const { orderId, serviceId, rating, reviewText } = createReviewSchema.parse(body);

    // Verify the user has purchased this service
    const orderCheck = await db
      .select()
      .from(order)
      .where(and(
        eq(order.id, orderId),
        eq(order.buyerId, userId),
        eq(order.status, 'delivered')
      ))
      .limit(1);

    if (!orderCheck.length) {
      return NextResponse.json(
        { error: 'You can only review services you have purchased and received' },
        { status: 403 }
      );
    }

    // Check if review already exists
    const existingReview = await db
      .select()
      .from(serviceReview)
      .where(and(
        eq(serviceReview.userId, userId),
        eq(serviceReview.orderId, orderId),
        eq(serviceReview.serviceId, serviceId)
      ))
      .limit(1);

    if (existingReview.length) {
      return NextResponse.json(
        { error: 'You have already reviewed this service' },
        { status: 400 }
      );
    }

    // Create review
    const newReview = await db
      .insert(serviceReview)
      .values({
        userId,
        serviceId,
        orderId,
        rating,
        reviewText,
        isVerified: true, // Verified purchase
      })
      .returning();

    return NextResponse.json({
      success: true,
      review: newReview[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}