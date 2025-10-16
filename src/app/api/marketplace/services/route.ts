import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, icd11Category, listing, company } from "@/lib/schema";
import { eq, and, like, or, desc, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');
  const specialty = searchParams.get('specialty');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = searchParams.get('sortOrder') || 'asc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereConditions = [eq(service.isActive, true)];

    if (categoryId) {
      whereConditions.push(eq(service.icd11CategoryId, categoryId));
    }

    if (search) {
      whereConditions.push(
        or(
          like(service.name, `%${search}%`),
          like(service.description, `%${search}%`)
        )!
      );
    }

    if (specialty) {
      whereConditions.push(like(service.description, `%${specialty}%`));
    }

    if (priceMin) {
      whereConditions.push(sql`${service.basePrice} >= ${priceMin}`);
    }

    if (priceMax) {
      whereConditions.push(sql`${service.basePrice} <= ${priceMax}`);
    }

    const orderBy = sortOrder === 'desc' ? desc(service.name) : asc(service.name);

    const services = await db
      .select({
        id: service.id,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        unit: service.unit,
        icd11CategoryId: service.icd11CategoryId,
        category: {
          code: icd11Category.code,
          title: icd11Category.title,
        },
        listingCount: sql<number>`count(${listing.id})`,
        minPrice: sql<number>`min(${listing.pricePerUnit})`,
        maxPrice: sql<number>`max(${listing.pricePerUnit})`,
      })
      .from(service)
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .leftJoin(listing, and(
        eq(listing.serviceId, service.id),
        eq(listing.isActive, true)
      ))
      .where(and(...whereConditions))
      .groupBy(service.id, icd11Category.id)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(service)
      .where(and(...whereConditions));

    return NextResponse.json({
      services,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}