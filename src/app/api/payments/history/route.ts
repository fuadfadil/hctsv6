import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payment, paymentTransaction, refund, order, paymentMethod, paymentGateway } from "@/lib/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    // Get orders for the user
    const userOrders = await db
      .select({ id: order.id })
      .from(order)
      .where(eq(order.buyerId, session.user.id));

    const orderIds = userOrders.map(o => o.id);

    if (orderIds.length === 0) {
      return NextResponse.json({
        payments: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
        },
      });
    }

    whereConditions.push(payment.orderId.in(orderIds));

    if (status) {
      whereConditions.push(eq(payment.status, status));
    }

    if (startDate) {
      whereConditions.push(gte(payment.createdAt, new Date(startDate)));
    }

    if (endDate) {
      whereConditions.push(lte(payment.createdAt, new Date(endDate)));
    }

    if (minAmount) {
      whereConditions.push(gte(payment.amount, minAmount));
    }

    if (maxAmount) {
      whereConditions.push(lte(payment.amount, maxAmount));
    }

    // Get total count
    const totalResult = await db
      .select({ count: payment.id })
      .from(payment)
      .where(and(...whereConditions));

    const total = totalResult.length;

    // Get payments with related data
    const payments = await db
      .select({
        payment: payment,
        order: {
          id: order.id,
          totalAmount: order.totalAmount,
          currency: order.currency,
          status: order.status,
          orderDate: order.orderDate,
        },
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          provider: paymentMethod.provider,
        },
        gateway: {
          id: paymentGateway.id,
          name: paymentGateway.name,
          provider: paymentGateway.provider,
        },
      })
      .from(payment)
      .innerJoin(order, eq(payment.orderId, order.id))
      .innerJoin(paymentMethod, eq(payment.paymentMethodId, paymentMethod.id))
      .innerJoin(paymentGateway, eq(payment.gatewayId, paymentGateway.id))
      .where(and(...whereConditions))
      .orderBy(desc(payment.createdAt))
      .limit(limit)
      .offset(offset);

    // Get transaction history for each payment
    const paymentIds = payments.map(p => p.payment.id);
    const transactions = await db
      .select()
      .from(paymentTransaction)
      .where(paymentTransaction.paymentId.in(paymentIds))
      .orderBy(desc(paymentTransaction.createdAt));

    // Get refunds for each payment
    const refunds = await db
      .select()
      .from(refund)
      .where(refund.paymentId.in(paymentIds))
      .orderBy(desc(refund.createdAt));

    // Group transactions and refunds by payment ID
    const transactionsByPayment = transactions.reduce((acc, tx) => {
      if (!acc[tx.paymentId]) acc[tx.paymentId] = [];
      acc[tx.paymentId].push(tx);
      return acc;
    }, {} as Record<string, typeof transactions>);

    const refundsByPayment = refunds.reduce((acc, r) => {
      if (!acc[r.paymentId]) acc[r.paymentId] = [];
      acc[r.paymentId].push(r);
      return acc;
    }, {} as Record<string, typeof refunds>);

    // Format response
    const formattedPayments = payments.map(p => ({
      id: p.payment.id,
      orderId: p.payment.orderId,
      amount: p.payment.amount,
      currency: p.payment.currency,
      status: p.payment.status,
      transactionId: p.payment.transactionId,
      gatewayTransactionId: p.payment.gatewayTransactionId,
      paymentDate: p.payment.paymentDate,
      processedAt: p.payment.processedAt,
      failureReason: p.payment.failureReason,
      notes: p.payment.notes,
      createdAt: p.payment.createdAt,
      order: p.order,
      paymentMethod: p.paymentMethod,
      gateway: p.gateway,
      transactions: transactionsByPayment[p.payment.id] || [],
      refunds: refundsByPayment[p.payment.id] || [],
    }));

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error("Payment history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}