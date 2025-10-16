import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, listing, companyUser, auditLog, icd11Category } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ICD11API } from "@/lib/icd11";

const updateServiceSchema = z.object({
  serviceId: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icd11Code: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  // Listing updates
  quantity: z.number().min(1).optional(),
  pricePerUnit: z.number().min(0).optional(),
  currency: z.string().optional(),
  minOrderQuantity: z.number().min(1).optional(),
  maxOrderQuantity: z.number().optional(),
  expiresAt: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, ...updateData } = updateServiceSchema.parse(body);

    // Check if user has permission to update services
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied. Only healthcare providers can update services." }, { status: 403 });
    }

    const { companyId } = companyUserRecord[0];

    // Verify the service belongs to the user's company
    const serviceRecord = await db
      .select({
        service: service,
        listing: listing,
      })
      .from(service)
      .leftJoin(listing, and(
        eq(listing.serviceId, service.id),
        eq(listing.companyId, companyId)
      ))
      .where(eq(service.id, serviceId))
      .limit(1);

    if (!serviceRecord.length) {
      return NextResponse.json({ error: "Service not found or access denied" }, { status: 404 });
    }

    // Validate ICD-11 code if provided
    let icd11CategoryId = serviceRecord[0].service.icd11CategoryId;
    if (updateData.icd11Code) {
      const isValidCode = await ICD11API.validateCode(updateData.icd11Code);
      if (!isValidCode) {
        return NextResponse.json({ error: "Invalid ICD-11 code" }, { status: 400 });
      }

      // Check if ICD-11 category exists in our database, create if not
      let category = await db
        .select()
        .from(icd11Category)
        .where(eq(icd11Category.code, updateData.icd11Code))
        .limit(1);

      if (!category.length) {
        const icd11Data = await ICD11API.getCategoryByCode(updateData.icd11Code);
        if (icd11Data) {
          const [newCategory] = await db.insert(icd11Category).values({
            code: icd11Data.code,
            title: icd11Data.title,
            description: icd11Data.description,
            parentId: icd11Data.parentId,
          }).returning();
          icd11CategoryId = newCategory.id;
        }
      } else {
        icd11CategoryId = category[0].id;
      }
    }

    // Get current values for audit logging
    const currentService = serviceRecord[0].service;
    const currentListing = serviceRecord[0].listing;

    // Prepare service updates
    const serviceUpdates: any = {};
    if (updateData.name !== undefined) serviceUpdates.name = updateData.name;
    if (updateData.description !== undefined) serviceUpdates.description = updateData.description;
    if (icd11CategoryId !== undefined) serviceUpdates.icd11CategoryId = icd11CategoryId;
    if (updateData.basePrice !== undefined) serviceUpdates.basePrice = updateData.basePrice.toString();
    if (updateData.unit !== undefined) serviceUpdates.unit = updateData.unit;
    if (updateData.isActive !== undefined) serviceUpdates.isActive = updateData.isActive;
    serviceUpdates.updatedAt = new Date();

    // Update service
    await db
      .update(service)
      .set(serviceUpdates)
      .where(eq(service.id, serviceId));

    // Update listing if it exists and listing fields are provided
    let updatedListing = null;
    if (currentListing && (updateData.quantity || updateData.pricePerUnit || updateData.currency ||
        updateData.minOrderQuantity || updateData.maxOrderQuantity !== undefined || updateData.expiresAt)) {
      const listingUpdates: any = {};
      if (updateData.quantity !== undefined) listingUpdates.quantity = updateData.quantity;
      if (updateData.pricePerUnit !== undefined) listingUpdates.pricePerUnit = updateData.pricePerUnit.toString();
      if (updateData.currency !== undefined) listingUpdates.currency = updateData.currency;
      if (updateData.minOrderQuantity !== undefined) listingUpdates.minOrderQuantity = updateData.minOrderQuantity;
      if (updateData.maxOrderQuantity !== undefined) listingUpdates.maxOrderQuantity = updateData.maxOrderQuantity;
      if (updateData.expiresAt !== undefined) listingUpdates.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
      listingUpdates.updatedAt = new Date();

      [updatedListing] = await db
        .update(listing)
        .set(listingUpdates)
        .where(eq(listing.id, currentListing.id))
        .returning();
    }

    // Log the update
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'update',
      entityType: 'service',
      entityId: serviceId,
      oldValues: {
        service: currentService,
        listing: currentListing,
      },
      newValues: {
        service: serviceUpdates,
        listing: updatedListing,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "Service updated successfully",
      service: { ...currentService, ...serviceUpdates },
      listing: updatedListing,
    });

  } catch (error) {
    console.error("Service update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}