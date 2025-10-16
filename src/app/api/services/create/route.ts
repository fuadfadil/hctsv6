import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, listing, companyUser, auditLog, icd11Category } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ICD11API } from "@/lib/icd11";
import { PricingCalculator } from "@/lib/pricing-calculator";

const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  icd11Code: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.number().min(1).default(1),
  pricePerUnit: z.number().min(0, "Price per unit is required"),
  currency: z.string().default("LYD"),
  minOrderQuantity: z.number().min(1).default(1),
  maxOrderQuantity: z.number().optional(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().optional(),
  // Marketplace listing fields
  createListing: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createServiceSchema.parse(body);

    // Check if user has permission to create services (only healthcare providers)
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied. Only healthcare providers can create services." }, { status: 403 });
    }

    const { companyId } = companyUserRecord[0];

    // Validate ICD-11 code if provided
    let icd11CategoryId = null;
    if (validatedData.icd11Code) {
      const isValidCode = await ICD11API.validateCode(validatedData.icd11Code);
      if (!isValidCode) {
        return NextResponse.json({ error: "Invalid ICD-11 code" }, { status: 400 });
      }

      // Check if ICD-11 category exists in our database, create if not
      let category = await db
        .select()
        .from(icd11Category)
        .where(eq(icd11Category.code, validatedData.icd11Code))
        .limit(1);

      if (!category.length) {
        const icd11Data = await ICD11API.getCategoryByCode(validatedData.icd11Code);
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

    // Calculate pricing using the pricing calculator if basePrice not provided
    let finalBasePrice = validatedData.basePrice;
    if (!finalBasePrice) {
      try {
        const pricingResult = await PricingCalculator.calculatePricing({
          serviceName: validatedData.name,
          serviceDescription: validatedData.description,
          icd11Code: validatedData.icd11Code,
          quantity: validatedData.quantity,
          currency: validatedData.currency,
          region: 'Libya', // Default region
        });
        finalBasePrice = pricingResult.finalPrice;
      } catch (error) {
        console.error("Pricing calculation error:", error);
        return NextResponse.json({ error: "Failed to calculate pricing" }, { status: 500 });
      }
    }

    // Create the service
    const [newService] = await db.insert(service).values({
      name: validatedData.name,
      description: validatedData.description || null,
      icd11CategoryId: icd11CategoryId || null,
      basePrice: finalBasePrice?.toString() || null,
      unit: validatedData.unit,
      isActive: validatedData.isActive,
    }).returning();

    // Create marketplace listing if requested
    let newListing = null;
    if (validatedData.createListing) {
      [newListing] = await db.insert(listing).values({
        companyId,
        serviceId: newService.id,
        quantity: validatedData.quantity,
        pricePerUnit: validatedData.pricePerUnit.toString(),
        currency: validatedData.currency,
        minOrderQuantity: validatedData.minOrderQuantity,
        maxOrderQuantity: validatedData.maxOrderQuantity || null,
        isActive: validatedData.isActive,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      }).returning();
    }

    // Log the creation
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'create',
      entityType: 'service',
      entityId: newService.id,
      newValues: {
        ...validatedData,
        icd11CategoryId,
        basePrice: finalBasePrice,
        listing: newListing ? { id: newListing.id } : null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      service: newService,
      listing: newListing,
      message: "Service created successfully",
    });

  } catch (error) {
    console.error("Service creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}