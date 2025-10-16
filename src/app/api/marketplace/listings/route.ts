import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listing, service, company, companyUser, icd11Category } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createListingSchema = z.object({
  serviceId: z.string(),
  packageId: z.string().optional(),
  quantity: z.number().min(1),
  pricePerUnit: z.string(),
  currency: z.string().default("LYD"),
  minOrderQuantity: z.number().min(1).default(1),
  maxOrderQuantity: z.number().optional(),
  expiresAt: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereConditions = [eq(listing.isActive, true)];

    if (companyId) {
      // Check if user has permission to view listings for this company
      const companyUserRecord = await db
        .select()
        .from(companyUser)
        .where(and(
          eq(companyUser.companyId, companyId),
          eq(companyUser.userId, session.user.id),
          eq(companyUser.isActive, true)
        ))
        .limit(1);

      if (!companyUserRecord.length) {
        return NextResponse.json({ error: "Access denied to this company's listings" }, { status: 403 });
      }

      whereConditions.push(eq(listing.companyId, companyId));
    }

    const listings = await db
      .select({
        id: listing.id,
        serviceId: listing.serviceId,
        packageId: listing.packageId,
        quantity: listing.quantity,
        pricePerUnit: listing.pricePerUnit,
        currency: listing.currency,
        minOrderQuantity: listing.minOrderQuantity,
        maxOrderQuantity: listing.maxOrderQuantity,
        isActive: listing.isActive,
        expiresAt: listing.expiresAt,
        createdAt: listing.createdAt,
        service: {
          name: service.name,
          description: service.description,
          unit: service.unit,
        },
        category: {
          code: icd11Category.code,
          title: icd11Category.title,
        },
        company: {
          name: company.name,
          type: company.typeId,
        },
      })
      .from(listing)
      .innerJoin(service, eq(listing.serviceId, service.id))
      .leftJoin(icd11Category, eq(service.icd11CategoryId, icd11Category.id))
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(and(...whereConditions))
      .orderBy(desc(listing.createdAt));

    return NextResponse.json({ listings });

  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const listingData = createListingSchema.parse(body);

    // Check if user has permission to create listings for their company
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "No associated company found" }, { status: 403 });
    }

    // Only admins and managers can create listings
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify service exists
    const serviceRecord = await db
      .select()
      .from(service)
      .where(eq(service.id, listingData.serviceId))
      .limit(1);

    if (!serviceRecord.length) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const newListing = await db.insert(listing).values({
      companyId: companyUserRecord[0].companyId,
      serviceId: listingData.serviceId,
      packageId: listingData.packageId,
      quantity: listingData.quantity,
      pricePerUnit: listingData.pricePerUnit,
      currency: listingData.currency,
      minOrderQuantity: listingData.minOrderQuantity,
      maxOrderQuantity: listingData.maxOrderQuantity,
      expiresAt: listingData.expiresAt ? new Date(listingData.expiresAt) : undefined,
    }).returning();

    return NextResponse.json({
      success: true,
      listing: newListing[0],
      message: "Listing created successfully",
    });

  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}