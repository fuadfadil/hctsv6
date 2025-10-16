import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, icd11Category, listing, company } from "@/lib/schema";
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const icd11Code = searchParams.get('icd11');
  const categoryId = searchParams.get('categoryId');
  const location = searchParams.get('location');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query && !icd11Code && !categoryId) {
    return NextResponse.json({ error: "Search query, ICD-11 code, or category ID required" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereConditions = [eq(service.isActive, true), eq(listing.isActive, true)];

    if (query) {
      whereConditions.push(
        or(
          like(service.name, `%${query}%`),
          like(service.description, `%${query}%`),
          like(company.name, `%${query}%`)
        )!
      );
    }

    if (icd11Code) {
      whereConditions.push(like(icd11Category.code, `%${icd11Code}%`));
    }

    if (categoryId) {
      whereConditions.push(eq(service.icd11CategoryId, categoryId));
    }

    if (location) {
      whereConditions.push(like(company.address, `%${location}%`));
    }

    if (priceMin) {
      whereConditions.push(sql`${listing.pricePerUnit} >= ${priceMin}`);
    }

    if (priceMax) {
      whereConditions.push(sql`${listing.pricePerUnit} <= ${priceMax}`);
    }

    const results = await db
      .select({
        id: listing.id,
        serviceId: service.id,
        serviceName: service.name,
        serviceDescription: service.description,
        unit: service.unit,
        quantity: listing.quantity,
        pricePerUnit: listing.pricePerUnit,
        currency: listing.currency,
        minOrderQuantity: listing.minOrderQuantity,
        companyName: company.name,
        companyAddress: company.address,
        categoryCode: icd11Category.code,
        categoryTitle: icd11Category.title,
        createdAt: listing.createdAt,
      })
      .from(listing)
      .innerJoin(service, eq(listing.serviceId, service.id))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(and(...whereConditions))
      .orderBy(desc(listing.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .innerJoin(service, eq(listing.serviceId, service.id))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(and(...whereConditions));

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    });

  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}