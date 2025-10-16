import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, listing, service, company } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const addToCartSchema = z.object({
  listingId: z.string(),
  quantity: z.number().min(1),
});

const updateCartItemSchema = z.object({
  orderItemId: z.string(),
  quantity: z.number().min(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending cart order for user
    const cartOrder = await db
      .select()
      .from(order)
      .where(and(
        eq(order.buyerId, session.user.id),
        eq(order.status, "pending")
      ))
      .orderBy(desc(order.createdAt))
      .limit(1);

    if (!cartOrder.length) {
      return NextResponse.json({ cart: { items: [], total: 0 } });
    }

    const cartItems = await db
      .select({
        id: orderItem.id,
        listingId: orderItem.listingId,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        totalPrice: orderItem.totalPrice,
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
      .from(orderItem)
      .innerJoin(listing, eq(orderItem.listingId, listing.id))
      .innerJoin(service, eq(listing.serviceId, service.id))
      .innerJoin(company, eq(listing.companyId, company.id))
      .where(eq(orderItem.orderId, cartOrder[0].id));

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    return NextResponse.json({
      cart: {
        id: cartOrder[0].id,
        items: cartItems,
        total: total.toFixed(2),
        currency: cartOrder[0].currency,
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

    // Get or create cart order
    const cartOrder = await db
      .select()
      .from(order)
      .where(and(
        eq(order.buyerId, session.user.id),
        eq(order.status, "pending")
      ))
      .limit(1);

    let orderId: string;

    if (!cartOrder.length) {
      const newOrder = await db.insert(order).values({
        buyerId: session.user.id,
        sellerId: listingData.companyId, // This will be updated when checking out
        totalAmount: "0",
        currency: listingData.currency,
        status: "pending",
      }).returning();
      orderId = newOrder[0].id;
    } else {
      orderId = cartOrder[0].id;
    }

    // Check if item already in cart
    const existingItem = await db
      .select()
      .from(orderItem)
      .where(and(
        eq(orderItem.orderId, orderId),
        eq(orderItem.listingId, listingId)
      ))
      .limit(1);

    const unitPrice = parseFloat(listingData.pricePerUnit);
    const totalPrice = (unitPrice * quantity).toFixed(2);

    if (existingItem.length) {
      // Update existing item
      await db
        .update(orderItem)
        .set({
          quantity: quantity,
          totalPrice: totalPrice,
          updatedAt: new Date(),
        })
        .where(eq(orderItem.id, existingItem[0].id));
    } else {
      // Add new item
      await db.insert(orderItem).values({
        orderId: orderId,
        listingId: listingId,
        quantity: quantity,
        unitPrice: listingData.pricePerUnit,
        totalPrice: totalPrice,
      });
    }

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

    const body = await request.json();
    const { orderItemId, quantity } = updateCartItemSchema.parse(body);

    // Get cart order
    const cartOrder = await db
      .select()
      .from(order)
      .where(and(
        eq(order.buyerId, session.user.id),
        eq(order.status, "pending")
      ))
      .limit(1);

    if (!cartOrder.length) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (quantity === 0) {
      // Remove item from cart
      await db
        .delete(orderItem)
        .where(and(
          eq(orderItem.id, orderItemId),
          eq(orderItem.orderId, cartOrder[0].id)
        ));
    } else {
      // Update quantity
      const orderItemRecord = await db
        .select({
          unitPrice: orderItem.unitPrice,
        })
        .from(orderItem)
        .where(and(
          eq(orderItem.id, orderItemId),
          eq(orderItem.orderId, cartOrder[0].id)
        ))
        .limit(1);

      if (!orderItemRecord.length) {
        return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
      }

      const unitPrice = parseFloat(orderItemRecord[0].unitPrice);
      const totalPrice = (unitPrice * quantity).toFixed(2);

      await db
        .update(orderItem)
        .set({
          quantity: quantity,
          totalPrice: totalPrice,
          updatedAt: new Date(),
        })
        .where(eq(orderItem.id, orderItemId));
    }

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