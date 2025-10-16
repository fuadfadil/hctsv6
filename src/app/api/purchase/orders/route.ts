import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceOrder, insuranceOrderItem, listing, service, company, companyUser } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "orderDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where conditions
    const whereConditions = [eq(insuranceOrder.companyId, companyId)];

    if (status) {
      whereConditions.push(eq(insuranceOrder.status, status));
    }

    // Get orders
    const orders = await db
      .select({
        id: insuranceOrder.id,
        totalAmount: insuranceOrder.totalAmount,
        currency: insuranceOrder.currency,
        status: insuranceOrder.status,
        orderDate: insuranceOrder.orderDate,
        deliveryDate: insuranceOrder.deliveryDate,
        notes: insuranceOrder.notes,
        bulkDiscountApplied: insuranceOrder.bulkDiscountApplied,
        totalDiscount: insuranceOrder.totalDiscount,
        createdAt: insuranceOrder.createdAt,
      })
      .from(insuranceOrder)
      .where(and(...whereConditions))
      .orderBy(sortOrder === "desc" ? desc(insuranceOrder.orderDate) : asc(insuranceOrder.orderDate))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select()
      .from(insuranceOrder)
      .where(and(...whereConditions));

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select({
            id: insuranceOrderItem.id,
            quantity: insuranceOrderItem.quantity,
            unitPrice: insuranceOrderItem.unitPrice,
            totalPrice: insuranceOrderItem.totalPrice,
            discountPercentage: insuranceOrderItem.discountPercentage,
            discountAmount: insuranceOrderItem.discountAmount,
            finalPrice: insuranceOrderItem.finalPrice,
            service: {
              name: service.name,
              description: service.description,
              unit: service.unit,
            },
            company: {
              name: company.name,
            },
          })
          .from(insuranceOrderItem)
          .innerJoin(listing, eq(insuranceOrderItem.listingId, listing.id))
          .innerJoin(service, eq(listing.serviceId, service.id))
          .innerJoin(company, eq(listing.companyId, company.id))
          .where(eq(insuranceOrderItem.orderId, order.id));

        return {
          ...order,
          items,
          itemCount: items.length,
        };
      })
    );

    return NextResponse.json({
      orders: ordersWithItems,
      pagination: {
        total: totalCount.length,
        limit,
        offset,
        hasMore: offset + limit < totalCount.length,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await getInsuranceCompanyId(session.user.id);
    if (!companyId) {
      return NextResponse.json({ error: "Insurance company access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    // Verify order belongs to company
    const order = await db
      .select()
      .from(insuranceOrder)
      .where(and(
        eq(insuranceOrder.id, orderId),
        eq(insuranceOrder.companyId, companyId)
      ))
      .limit(1);

    if (!order.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await db
      .update(insuranceOrder)
      .set(updateData)
      .where(eq(insuranceOrder.id, orderId));

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
    });

  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}