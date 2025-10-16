import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCart, insuranceCartItem, insuranceOrder, insuranceOrderItem, listing, service, company, companyUser, auditLog } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const checkoutSchema = z.object({
  paymentMethodId: z.string().optional(),
  notes: z.string().optional(),
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
    const { paymentMethodId, notes } = checkoutSchema.parse(body);

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

    // Get cart items
    const cartItems = await db
      .select({
        id: insuranceCartItem.id,
        listingId: insuranceCartItem.listingId,
        quantity: insuranceCartItem.quantity,
        unitPrice: insuranceCartItem.unitPrice,
        totalPrice: insuranceCartItem.totalPrice,
        discountPercentage: insuranceCartItem.discountPercentage,
        discountAmount: insuranceCartItem.discountAmount,
        finalPrice: insuranceCartItem.finalPrice,
        serviceId: service.id,
        supplierId: listing.companyId,
      })
      .from(insuranceCartItem)
      .innerJoin(listing, eq(insuranceCartItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .where(eq(insuranceCartItem.cartId, cart[0].id));

    if (!cartItems.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Validate stock availability
    for (const item of cartItems) {
      const listingRecord = await db
        .select({ quantity: listing.quantity })
        .from(listing)
        .where(eq(listing.id, item.listingId))
        .limit(1);

      if (!listingRecord.length || listingRecord[0].quantity < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for one or more items`
        }, { status: 400 });
      }
    }

    // Calculate totals
    const totalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.finalPrice), 0);
    const totalDiscount = cartItems.reduce((sum, item) => sum + parseFloat(item.discountAmount || "0"), 0);

    // Create order
    const order = await db.insert(insuranceOrder).values({
      companyId: companyId,
      userId: session.user.id,
      totalAmount: totalAmount.toFixed(2),
      currency: "HU",
      status: "pending",
      notes: notes || null,
      bulkDiscountApplied: totalDiscount > 0,
      totalDiscount: totalDiscount.toFixed(2),
    }).returning();

    const orderId = order[0].id;

    // Create order items and update stock
    for (const item of cartItems) {
      // Create order item
      await db.insert(insuranceOrderItem).values({
        orderId: orderId,
        listingId: item.listingId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        finalPrice: item.finalPrice,
      });

      // Update listing stock
      const currentListing = await db
        .select({ quantity: listing.quantity })
        .from(listing)
        .where(eq(listing.id, item.listingId))
        .limit(1);

      if (currentListing.length) {
        await db
          .update(listing)
          .set({
            quantity: currentListing[0].quantity - item.quantity,
            updatedAt: new Date(),
          })
          .where(eq(listing.id, item.listingId));
      }
    }

    // Clear cart
    await db
      .delete(insuranceCartItem)
      .where(eq(insuranceCartItem.cartId, cart[0].id));

    await db
      .delete(insuranceCart)
      .where(eq(insuranceCart.id, cart[0].id));

    // Log audit event
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "create",
      entityType: "insurance_order",
      entityId: orderId,
      newValues: {
        totalAmount: totalAmount.toFixed(2),
        currency: "HU",
        status: "pending",
        itemCount: cartItems.length,
      },
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        totalAmount: totalAmount.toFixed(2),
        currency: "HU",
        status: "pending",
        itemCount: cartItems.length,
        createdAt: order[0].createdAt,
      },
      message: "Order placed successfully",
    });

  } catch (error) {
    console.error("Error during checkout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}