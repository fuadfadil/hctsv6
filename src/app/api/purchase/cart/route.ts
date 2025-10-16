import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCart, insuranceCartItem, listing, service, company, companyUser } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const addToCartSchema = z.object({
  listingId: z.string(),
  quantity: z.number().min(1),
});

const updateCartItemSchema = z.object({
  cartItemId: z.string(),
  quantity: z.number().min(0),
});

// Helper function to check if user belongs to insurance company
async function getInsuranceCompanyId(userId: string): Promise<string | null> {
  const companyUserRecord = await db
    .select({
      companyId: companyUser.companyId,
      companyType: company.typeId,
    })
    .from(companyUser)
    .innerJoin(company, eq(companyUser.companyId, company.id))
    .where(and(
      eq(companyUser.userId, userId),
      eq(companyUser.isActive, true)
    ))
    .limit(1);

  if (!companyUserRecord.length) return null;

  // Check if company is insurance type (assuming insurance type has specific ID)
  // For now, we'll allow all companies but this can be restricted later
  return companyUserRecord[0].companyId;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await getInsuranceCompanyId(session.user.id);
    if (!companyId) {
      return NextResponse.json({ error: "Insurance company access required" }, { status: 403 });
    }

    // Get cart for the company
    const cart = await db
      .select()
      .from(insuranceCart)
      .where(and(
        eq(insuranceCart.companyId, companyId),
        eq(insuranceCart.userId, session.user.id)
      ))
      .orderBy(desc(insuranceCart.updatedAt))
      .limit(1);

    if (!cart.length) {
      return NextResponse.json({ cart: { items: [], total: 0, discountTotal: 0, finalTotal: 0 } });
    }

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
        service: {
          name: service.name,
          description: service.description,
          unit: service.unit,
        },
        company: {
          name: company.name,
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
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(eq(insuranceCartItem.cartId, cart[0].id));

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || '0'), 0);
    const discountTotal = cartItems.reduce((sum, item) => sum + parseFloat(item.discountAmount || '0'), 0);
    const finalTotal = cartItems.reduce((sum, item) => sum + parseFloat(item.finalPrice || '0'), 0);

    return NextResponse.json({
      cart: {
        id: cart[0].id,
        items: cartItems,
        total: total.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        finalTotal: finalTotal.toFixed(2),
        currency: "HU", // Health Units
      },
    });

  } catch (error) {
    console.error("Error fetching cart:", error);
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

    const companyId = await getInsuranceCompanyId(session.user.id);
    if (!companyId) {
      return NextResponse.json({ error: "Insurance company access required" }, { status: 403 });
    }

    const body = await request.json();
    const { listingId, quantity } = addToCartSchema.parse(body);

    // Verify listing exists and is active
    const listingRecord = await db
      .select({
        id: listing.id,
        pricePerUnit: listing.pricePerUnit,
        currency: listing.currency,
        quantity: listing.quantity,
        minOrderQuantity: listing.minOrderQuantity,
        maxOrderQuantity: listing.maxOrderQuantity,
        companyId: listing.companyId,
      })
      .from(listing)
      .where(and(
        eq(listing.id, listingId),
        eq(listing.isActive, true)
      ))
      .limit(1);

    if (!listingRecord.length) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const listingData = listingRecord[0];

    // Validate quantity
    if (quantity < listingData.minOrderQuantity) {
      return NextResponse.json({
        error: `Minimum order quantity is ${listingData.minOrderQuantity}`
      }, { status: 400 });
    }

    if (listingData.maxOrderQuantity && quantity > listingData.maxOrderQuantity) {
      return NextResponse.json({
        error: `Maximum order quantity is ${listingData.maxOrderQuantity}`
      }, { status: 400 });
    }

    if (quantity > listingData.quantity) {
      return NextResponse.json({
        error: `Only ${listingData.quantity} units available`
      }, { status: 400 });
    }

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

    // Check if item already in cart
    const existingItem = await db
      .select()
      .from(insuranceCartItem)
      .where(and(
        eq(insuranceCartItem.cartId, cartId),
        eq(insuranceCartItem.listingId, listingId)
      ))
      .limit(1);

    const unitPrice = parseFloat(listingData.pricePerUnit);
    const totalPrice = (unitPrice * quantity).toFixed(2);
    // For now, no discount calculation - will be handled by calculate endpoint
    const discountPercentage = "0";
    const discountAmount = "0";
    const finalPrice = totalPrice;

    if (existingItem.length) {
      // Update existing item
      await db
        .update(insuranceCartItem)
        .set({
          quantity: quantity,
          totalPrice: totalPrice,
          finalPrice: finalPrice,
          updatedAt: new Date(),
        })
        .where(eq(insuranceCartItem.id, existingItem[0].id));
    } else {
      // Add new item
      await db.insert(insuranceCartItem).values({
        cartId: cartId,
        listingId: listingId,
        quantity: quantity,
        unitPrice: listingData.pricePerUnit,
        totalPrice: totalPrice,
        discountPercentage: discountPercentage,
        discountAmount: discountAmount,
        finalPrice: finalPrice,
      });
    }

    // Update cart timestamp
    await db
      .update(insuranceCart)
      .set({ updatedAt: new Date() })
      .where(eq(insuranceCart.id, cartId));

    return NextResponse.json({
      success: true,
      message: "Item added to cart successfully",
    });

  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { cartItemId, quantity } = updateCartItemSchema.parse(body);

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

    if (quantity === 0) {
      // Remove item from cart
      await db
        .delete(insuranceCartItem)
        .where(and(
          eq(insuranceCartItem.id, cartItemId),
          eq(insuranceCartItem.cartId, cart[0].id)
        ));
    } else {
      // Update quantity
      const cartItemRecord = await db
        .select({
          unitPrice: insuranceCartItem.unitPrice,
        })
        .from(insuranceCartItem)
        .where(and(
          eq(insuranceCartItem.id, cartItemId),
          eq(insuranceCartItem.cartId, cart[0].id)
        ))
        .limit(1);

      if (!cartItemRecord.length) {
        return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
      }

      const unitPrice = parseFloat(cartItemRecord[0].unitPrice);
      const totalPrice = (unitPrice * quantity).toFixed(2);
      // Recalculate discounts if needed
      const finalPrice = totalPrice; // Will be updated by calculate endpoint

      await db
        .update(insuranceCartItem)
        .set({
          quantity: quantity,
          totalPrice: totalPrice,
          finalPrice: finalPrice,
          updatedAt: new Date(),
        })
        .where(eq(insuranceCartItem.id, cartItemId));
    }

    // Update cart timestamp
    await db
      .update(insuranceCart)
      .set({ updatedAt: new Date() })
      .where(eq(insuranceCart.id, cart[0].id));

    return NextResponse.json({
      success: true,
      message: "Cart updated successfully",
    });

  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await getInsuranceCompanyId(session.user.id);
    if (!companyId) {
      return NextResponse.json({ error: "Insurance company access required" }, { status: 403 });
    }

    // Clear entire cart
    const cart = await db
      .select()
      .from(insuranceCart)
      .where(and(
        eq(insuranceCart.companyId, companyId),
        eq(insuranceCart.userId, session.user.id)
      ))
      .limit(1);

    if (cart.length) {
      await db
        .delete(insuranceCartItem)
        .where(eq(insuranceCartItem.cartId, cart[0].id));

      await db
        .delete(insuranceCart)
        .where(eq(insuranceCart.id, cart[0].id));
    }

    return NextResponse.json({
      success: true,
      message: "Cart cleared successfully",
    });

  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}