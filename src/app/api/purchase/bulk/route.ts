import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCart, insuranceCartItem, listing, service, company, companyUser, bulkDiscountTier } from "@/lib/schema";
import { eq, and, desc, gte, lte, or, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const bulkPurchaseSchema = z.object({
  items: z.array(z.object({
    listingId: z.string(),
    quantity: z.number().min(1),
  })),
});

// Helper function to check if user belongs to insurance company
async function getInsuranceCompanyId(userId: string): Promise<string | null> {
  const companyUserRecord = await db
    .select({
      companyId: companyUser.companyId,
    })
    .from(companyUser)
    .where(and(
      eq(companyUser.userId, userId),
      eq(companyUser.isActive, true)
    ))
    .limit(1);

  return companyUserRecord.length ? companyUserRecord[0].companyId : null;
}

// Calculate bulk discounts for multiple items
async function calculateBulkDiscounts(items: any[]) {
  const discountedItems = [];

  for (const item of items) {
    const quantity = item.quantity;

    // Find applicable bulk discount tiers
    const discountTiers = await db
      .select()
      .from(bulkDiscountTier)
      .where(and(
        or(
          eq(bulkDiscountTier.serviceId, item.serviceId),
          eq(bulkDiscountTier.icd11CategoryId, item.categoryId)
        ),
        gte(bulkDiscountTier.minQuantity, quantity),
        or(
          lte(bulkDiscountTier.maxQuantity, quantity),
          isNull(bulkDiscountTier.maxQuantity)
        ),
        eq(bulkDiscountTier.isActive, true)
      ))
      .orderBy(desc(bulkDiscountTier.discountPercentage));

    const bestDiscount = discountTiers.length > 0 ? discountTiers[0] : null;

    if (bestDiscount) {
      const discountPercentage = parseFloat(bestDiscount.discountPercentage);
      const unitPrice = parseFloat(item.pricePerUnit);
      const totalPrice = unitPrice * quantity;
      const discountAmount = (totalPrice * discountPercentage / 100).toFixed(2);
      const finalPrice = (totalPrice - parseFloat(discountAmount)).toFixed(2);

      discountedItems.push({
        ...item,
        discountPercentage: bestDiscount.discountPercentage,
        discountAmount,
        finalPrice,
        discountTier: bestDiscount,
      });
    } else {
      const totalPrice = (parseFloat(item.pricePerUnit) * quantity).toFixed(2);
      discountedItems.push({
        ...item,
        discountPercentage: "0",
        discountAmount: "0",
        finalPrice: totalPrice,
        discountTier: null,
      });
    }
  }

  return discountedItems;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await getInsuranceCompanyId(session.user.id);
    if (!companyId) {
      return NextResponse.json({ error: "Insurance company access required" }, { status: 403 });
    }

    const body = await request.json();
    const { items } = bulkPurchaseSchema.parse(body);

    if (!items.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Get listing details for all items
    const listingIds = items.map(item => item.listingId);
    const listings = await db
      .select({
        id: listing.id,
        serviceId: listing.serviceId,
        pricePerUnit: listing.pricePerUnit,
        quantity: listing.quantity,
        minOrderQuantity: listing.minOrderQuantity,
        maxOrderQuantity: listing.maxOrderQuantity,
        service: {
          id: service.id,
          name: service.name,
          icd11CategoryId: service.icd11CategoryId,
        },
        company: {
          name: company.name,
        },
      })
      .from(listing)
      .innerJoin(service, eq(listing.serviceId, service.id))
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(and(
        eq(listing.isActive, true),
        ...listingIds.map(id => eq(listing.id, id))
      ));

    // Validate all listings exist
    if (listings.length !== items.length) {
      return NextResponse.json({ error: "One or more listings not found" }, { status: 404 });
    }

    // Create items array with listing details
    const itemsWithDetails = items.map(item => {
      const listing = listings.find(l => l.id === item.listingId)!;
      return {
        ...item,
        ...listing,
        serviceId: listing.service.id,
        categoryId: listing.service.icd11CategoryId,
      };
    });

    // Validate quantities
    for (const item of itemsWithDetails) {
      if (item.quantity < item.minOrderQuantity) {
        return NextResponse.json({
          error: `Minimum order quantity for ${item.service.name} is ${item.minOrderQuantity}`
        }, { status: 400 });
      }

      if (item.maxOrderQuantity && item.quantity > item.maxOrderQuantity) {
        return NextResponse.json({
          error: `Maximum order quantity for ${item.service.name} is ${item.maxOrderQuantity}`
        }, { status: 400 });
      }

      if (item.quantity > item.quantity) {
        return NextResponse.json({
          error: `Only ${item.quantity} units available for ${item.service.name}`
        }, { status: 400 });
      }
    }

    // Calculate bulk discounts
    const itemsWithDiscounts = await calculateBulkDiscounts(itemsWithDetails);

    // Calculate totals
    const subtotal = itemsWithDiscounts.reduce((sum, item) => sum + parseFloat(item.pricePerUnit) * item.quantity, 0);
    const discountTotal = itemsWithDiscounts.reduce((sum, item) => sum + parseFloat(item.discountAmount), 0);
    const finalTotal = itemsWithDiscounts.reduce((sum, item) => sum + parseFloat(item.finalPrice), 0);

    // Get or create cart
    const cart = await db
      .select()
      .from(insuranceCart)
      .where(and(
        eq(insuranceCart.companyId, companyId),
        eq(insuranceCart.userId, session.user.id)
      ))
      .limit(1);

    let cartId: string;

    if (!cart.length) {
      const newCart = await db.insert(insuranceCart).values({
        companyId: companyId,
        userId: session.user.id,
      }).returning();
      cartId = newCart[0].id;
    } else {
      cartId = cart[0].id;
    }

    // Clear existing cart items
    await db
      .delete(insuranceCartItem)
      .where(eq(insuranceCartItem.cartId, cartId));

    // Add new items to cart
    for (const item of itemsWithDiscounts) {
      await db.insert(insuranceCartItem).values({
        cartId: cartId,
        listingId: item.listingId,
        quantity: item.quantity,
        unitPrice: item.pricePerUnit,
        totalPrice: (parseFloat(item.pricePerUnit) * item.quantity).toFixed(2),
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        finalPrice: item.finalPrice,
      });
    }

    // Update cart timestamp
    await db
      .update(insuranceCart)
      .set({ updatedAt: new Date() })
      .where(eq(insuranceCart.id, cartId));

    return NextResponse.json({
      success: true,
      cart: {
        id: cartId,
        items: itemsWithDiscounts.map(item => ({
          listingId: item.listingId,
          serviceName: item.service.name,
          companyName: item.company.name,
          quantity: item.quantity,
          unitPrice: item.pricePerUnit,
          totalPrice: (parseFloat(item.pricePerUnit) * item.quantity).toFixed(2),
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          finalPrice: item.finalPrice,
        })),
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        finalTotal: finalTotal.toFixed(2),
        currency: "HU",
        bulkDiscountApplied: discountTotal > 0,
      },
      message: "Bulk purchase items added to cart successfully",
    });

  } catch (error) {
    console.error("Error processing bulk purchase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}