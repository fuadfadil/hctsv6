import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, listing, service, company, payment, auditLog } from "@/lib/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createOrderSchema = z.object({
  items: z.array(z.object({
    listingId: z.string(),
    quantity: z.number().min(1),
  })),
  notes: z.string().optional(),
});

const bulkOrderSchema = z.object({
  listingId: z.string(),
  quantity: z.number().min(1),
  discountPercentage: z.number().min(0).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereConditions = [
      or(
        eq(order.buyerId, session.user.id),
        eq(order.sellerId, session.user.id)
      )!
    ];

    if (status) {
      whereConditions.push(eq(order.status, status));
    }

    const orders = await db
      .select({
        id: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        totalAmount: order.totalAmount,
        currency: order.currency,
        status: order.status,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        notes: order.notes,
        createdAt: order.createdAt,
        itemCount: sql<number>`count(${orderItem.id})`,
        buyerCompany: {
          name: company.name,
        },
        sellerCompany: {
          name: company.name,
        },
      })
      .from(order)
      .leftJoin(orderItem, eq(orderItem.orderId, order.id))
      .leftJoin(company, eq(order.buyerId, company.id))
      .leftJoin(company, eq(order.sellerId, company.id))
      .where(and(...whereConditions))
      .groupBy(order.id, company.name)
      .orderBy(desc(order.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const totalCount = await db
      .select({ count: sql<number>`count(distinct ${order.id})` })
      .from(order)
      .where(and(...whereConditions));

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
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
    const { items, notes } = createOrderSchema.parse(body);

    if (!items.length) {
      return NextResponse.json({ error: "Order must contain at least one item" }, { status: 400 });
    }

    // Validate all items and calculate total
    let totalAmount = 0;
    let currency = "";
    const orderItems = [];

    for (const item of items) {
      const listingRecord = await db
        .select({
          id: listing.id,
          pricePerUnit: listing.pricePerUnit,
          currency: listing.currency,
          quantity: listing.quantity,
          minOrderQuantity: listing.minOrderQuantity,
          maxOrderQuantity: listing.maxOrderQuantity,
          companyId: listing.companyId,
          serviceId: listing.serviceId,
        })
        .from(listing)
        .where(and(
          eq(listing.id, item.listingId),
          eq(listing.isActive, true)
        ))
        .limit(1);

      if (!listingRecord.length) {
        return NextResponse.json({ error: `Listing ${item.listingId} not found` }, { status: 404 });
      }

      const listingData = listingRecord[0];

      // Validate quantity
      if (item.quantity < listingData.minOrderQuantity) {
        return NextResponse.json({
          error: `Minimum order quantity for listing ${item.listingId} is ${listingData.minOrderQuantity}`
        }, { status: 400 });
      }

      if (listingData.maxOrderQuantity && item.quantity > listingData.maxOrderQuantity) {
        return NextResponse.json({
          error: `Maximum order quantity for listing ${item.listingId} is ${listingData.maxOrderQuantity}`
        }, { status: 400 });
      }

      if (item.quantity > listingData.quantity) {
        return NextResponse.json({
          error: `Only ${listingData.quantity} units available for listing ${item.listingId}`
        }, { status: 400 });
      }

      if (!currency) {
        currency = listingData.currency;
      } else if (currency !== listingData.currency) {
        return NextResponse.json({ error: "All items must have the same currency" }, { status: 400 });
      }

      const unitPrice = parseFloat(listingData.pricePerUnit);
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        listingId: item.listingId,
        quantity: item.quantity,
        unitPrice: listingData.pricePerUnit,
        totalPrice: itemTotal.toFixed(2),
        sellerId: listingData.companyId,
      });
    }

    // Create order
    const newOrder = await db.insert(order).values({
      buyerId: session.user.id,
      sellerId: orderItems[0].sellerId, // Use first seller (will be updated for multi-seller orders)
      totalAmount: totalAmount.toFixed(2),
      currency: currency,
      status: "pending",
      notes: notes,
    }).returning();

    // Create order items
    for (const item of orderItems) {
      await db.insert(orderItem).values({
        orderId: newOrder[0].id,
        listingId: item.listingId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    // Log the order creation
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'create',
      entityType: 'order',
      entityId: newOrder[0].id,
      newValues: { totalAmount: totalAmount.toFixed(2), currency, itemCount: items.length },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      order: newOrder[0],
      message: "Order created successfully",
    });

  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Bulk order endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, quantity, discountPercentage } = bulkOrderSchema.parse(body);

    // Verify listing exists
    const listingRecord = await db
      .select({
        id: listing.id,
        pricePerUnit: listing.pricePerUnit,
        currency: listing.currency,
        quantity: listing.quantity,
        minOrderQuantity: listing.minOrderQuantity,
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
    if (quantity > listingData.quantity) {
      return NextResponse.json({
        error: `Only ${listingData.quantity} units available`
      }, { status: 400 });
    }

    // Calculate discounted price
    let unitPrice = parseFloat(listingData.pricePerUnit);
    if (discountPercentage && discountPercentage > 0) {
      unitPrice = unitPrice * (1 - discountPercentage / 100);
    }

    const totalAmount = unitPrice * quantity;

    // Create bulk order
    const newOrder = await db.insert(order).values({
      buyerId: session.user.id,
      sellerId: listingData.companyId,
      totalAmount: totalAmount.toFixed(2),
      currency: listingData.currency,
      status: "confirmed", // Bulk orders are auto-confirmed
      notes: `Bulk order with ${discountPercentage || 0}% discount`,
    }).returning();

    // Create order item
    await db.insert(orderItem).values({
      orderId: newOrder[0].id,
      listingId: listingId,
      quantity: quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: totalAmount.toFixed(2),
    });

    // Update listing quantity
    await db
      .update(listing)
      .set({
        quantity: listingData.quantity - quantity,
        updatedAt: new Date(),
      })
      .where(eq(listing.id, listingId));

    // Log the bulk order
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'create',
      entityType: 'order',
      entityId: newOrder[0].id,
      newValues: {
        type: 'bulk',
        quantity,
        discountPercentage: discountPercentage || 0,
        totalAmount: totalAmount.toFixed(2)
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      order: newOrder[0],
      message: "Bulk order placed successfully",
    });

  } catch (error) {
    console.error("Error creating bulk order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}