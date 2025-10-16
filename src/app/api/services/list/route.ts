import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, listing, companyUser, icd11Category } from "@/lib/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const listServicesSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'basePrice', 'isActive']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  search: z.string().optional(),
  icd11Category: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      status: searchParams.get('status') || 'all',
      search: searchParams.get('search') || undefined,
      icd11Category: searchParams.get('icd11Category') || undefined,
    };

    const validatedParams = listServicesSchema.parse(queryParams);

    // Check if user has permission to view services
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied. Only healthcare providers can view services." }, { status: 403 });
    }

    const { companyId } = companyUserRecord[0];

    // Build the query
    let whereConditions = [
      eq(listing.companyId, companyId),
    ];

    // Add status filter
    if (validatedParams.status === 'active') {
      whereConditions.push(eq(service.isActive, true));
    } else if (validatedParams.status === 'inactive') {
      whereConditions.push(eq(service.isActive, false));
    }

    // Add search filter
    if (validatedParams.search) {
      whereConditions.push(sql`${service.name} ILIKE ${`%${validatedParams.search}%`} OR ${service.description} ILIKE ${`%${validatedParams.search}%`}`);
    }

    // Add ICD-11 category filter
    if (validatedParams.icd11Category) {
      whereConditions.push(eq(service.icd11CategoryId, validatedParams.icd11Category));
    }

    // Build sort order
    const sortColumn = validatedParams.sortBy === 'name' ? service.name :
                       validatedParams.sortBy === 'createdAt' ? service.createdAt :
                       validatedParams.sortBy === 'basePrice' ? service.basePrice :
                       service.isActive;

    const sortOrder = validatedParams.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(service)
      .innerJoin(listing, eq(listing.serviceId, service.id))
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0].count;
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const offset = (validatedParams.page - 1) * validatedParams.limit;

    // Get services with pagination
    const services = await db
      .select({
        id: service.id,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        unit: service.unit,
        isActive: service.isActive,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
        icd11Category: {
          id: icd11Category.id,
          code: icd11Category.code,
          title: icd11Category.title,
        },
        listing: {
          id: listing.id,
          quantity: listing.quantity,
          pricePerUnit: listing.pricePerUnit,
          currency: listing.currency,
          minOrderQuantity: listing.minOrderQuantity,
          maxOrderQuantity: listing.maxOrderQuantity,
          isActive: listing.isActive,
          expiresAt: listing.expiresAt,
        },
      })
      .from(service)
      .innerJoin(listing, eq(listing.serviceId, service.id))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .where(and(...whereConditions))
      .orderBy(sortOrder)
      .limit(validatedParams.limit)
      .offset(offset);

    return NextResponse.json({
      services,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalCount,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
    });

  } catch (error) {
    console.error("Service list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}