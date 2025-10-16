import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payment, order } from "@/lib/schema";
import { paymentGatewayManager } from "@/lib/payment-gateway";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    // Get payment record with order info
    const paymentRecord = await db
      .select({
        payment: payment,
        order: order,
      })
      .from(payment)
      .innerJoin(order, eq(payment.orderId, order.id))
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (!paymentRecord.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const { payment: paymentData, order: orderData } = paymentRecord[0];

    // If payment is already completed or failed, return cached status
    if (paymentData.status === 'completed' || paymentData.status === 'failed' || paymentData.status === 'cancelled') {
      return NextResponse.json({
        paymentId,
        status: paymentData.status,
        transactionId: paymentData.transactionId,
        gatewayTransactionId: paymentData.gatewayTransactionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        processedAt: paymentData.processedAt,
        failureReason: paymentData.failureReason,
        order: {
          id: orderData.id,
          status: orderData.status,
          totalAmount: orderData.totalAmount,
          currency: orderData.currency,
        },
      });
    }

    // Check real-time status with gateway
    const gateway = paymentGatewayManager.getGateway(paymentData.gatewayId);
    if (!gateway) {
      return NextResponse.json({ error: "Payment gateway not available" }, { status: 400 });
    }

    const statusResult = await gateway.checkPaymentStatus(paymentData.transactionId!);

    // Update payment status if it changed
    if (statusResult.status !== paymentData.status) {
      await db
        .update(payment)
        .set({
          status: statusResult.status,
          processedAt: statusResult.processedAt,
          gatewayTransactionId: statusResult.gatewayTransactionId,
          failureReason: statusResult.failureReason,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      // Update order status if payment completed
      if (statusResult.status === 'completed') {
        await db
          .update(order)
          .set({
            status: 'confirmed',
            updatedAt: new Date(),
          })
          .where(eq(order.id, paymentData.orderId));
      }
    }

    return NextResponse.json({
      paymentId,
      status: statusResult.status,
      transactionId: paymentData.transactionId,
      gatewayTransactionId: statusResult.gatewayTransactionId,
      amount: statusResult.amount,
      currency: statusResult.currency,
      processedAt: statusResult.processedAt,
      failureReason: statusResult.failureReason,
      order: {
        id: orderData.id,
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        currency: orderData.currency,
      },
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}