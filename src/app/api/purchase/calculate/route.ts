import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCart, insuranceCartItem, bulkDiscountTier, listing, service, companyUser } from "@/lib/schema";
import { eq, and, desc, gte, lte, or, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

// Calculate bulk discounts for cart items
async function calculateBulkDiscounts(cartItems: any[]) {
  const updatedItems = [];

  for (const item of cartItems) {
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
      const unitPrice = parseFloat(item.unitPrice);
      const totalPrice = unitPrice * quantity;
      const discountAmount = (totalPrice * discountPercentage / 100).toFixed(2);
      const finalPrice = (totalPrice - parseFloat(discountAmount)).toFixed(2);

      updatedItems.push({
        ...item,
        discountPercentage: bestDiscount.discountPercentage,
        discountAmount,
        finalPrice,
      });
    } else {
      updatedItems.push({
        ...item,
        discountPercentage: "0",
        discountAmount: "0",
        finalPrice: item.totalPrice,
      });
    }
  }

  return updatedItems;
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

    // Get cart
    const cart = await db
      .select()
      .from(insuranceCart)
      .where(and(
        eq(insuranceCart.companyId, companyId),
        eq(insuranceCart.userId, session.user.id)
      ))
      .limit(1);

    if (!cart.length) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    // Get cart items with service and category info
    const cartItems = await db
      .select({
        id: insuranceCartItem.id,
        listingId: insuranceCartItem.listingId,
        quantity: insuranceCartItem.quantity,
        unitPrice: insuranceCartItem.unitPrice,
        totalPrice: insuranceCartItem.totalPrice,
        serviceId: service.id,
        categoryId: service.icd11CategoryId,
      })
      .from(insuranceCartItem)
      .innerJoin(listing, eq(insuranceCartItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .where(eq(insuranceCartItem.cartId, cart[0].id));

    if (!cartItems.length) {
      return NextResponse.json({
        cart: {
          items: [],
          subtotal: 0,
          discountTotal: 0,
          finalTotal: 0,
          currency: "HU",
        },
      });
    }

    // Calculate bulk discounts
    const itemsWithDiscounts = await calculateBulkDiscounts(cartItems);

    // Update cart items with calculated discounts
    for (const item of itemsWithDiscounts) {
      await db
        .update(insuranceCartItem)
        .set({
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          finalPrice: item.finalPrice,
          updatedAt: new Date(),
        })
        .where(eq(insuranceCartItem.id, item.id));
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const discountTotal = itemsWithDiscounts.reduce((sum, item) => sum + parseFloat(item.discountAmount), 0);
    const finalTotal = itemsWithDiscounts.reduce((sum, item) => sum + parseFloat(item.finalPrice), 0);

    // Get detailed cart items for response
    const detailedCartItems = await db
      .select({
        id: insuranceCartItem.id,
        listingId: insuranceCartItem.listingId,
        quantity: insuranceCartItem.quantity,
        unitPrice: insuranceCartItem.unitPrice,
        totalPrice: insuranceCartItem.totalPrice,
        discountPercentage: insuranceCartItem.discountPercentage,
        discountAmount: insuranceCartItem.discountAmount,
        finalPrice: insuranceCartItem.finalPrice,
        service: {
          name: service.name,
          description: service.description,
          unit: service.unit,
        },
        listing: {
          quantity: listing.quantity,
          minOrderQuantity: listing.minOrderQuantity,
          maxOrderQuantity: listing.maxOrderQuantity,
        },
      })
      .from(insuranceCartItem)
      .innerJoin(listing, eq(insuranceCartItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .where(eq(insuranceCartItem.cartId, cart[0].id));

    return NextResponse.json({
      cart: {
        id: cart[0].id,
        items: detailedCartItems,
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        finalTotal: finalTotal.toFixed(2),
        currency: "HU",
        bulkDiscountApplied: discountTotal > 0,
      },
    });

  } catch (error) {
    console.error("Error calculating cart totals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}