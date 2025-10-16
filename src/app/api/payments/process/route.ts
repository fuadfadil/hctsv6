import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payment, paymentTransaction, order } from "@/lib/schema";
import { paymentGatewayManager } from "@/lib/payment-gateway";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId, gatewayData } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    // Get payment record
    const paymentRecord = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (!paymentRecord.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paymentData = paymentRecord[0];

    // Check if payment is already completed
    if (paymentData.status === 'completed') {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 });
    }

    // Get payment gateway
    const gateway = paymentGatewayManager.getGateway(paymentData.gatewayId);
    if (!gateway) {
      return NextResponse.json({ error: "Payment gateway not available" }, { status: 400 });
    }

    // Process payment with gateway
    const processResult = await gateway.processPayment({
      paymentId: paymentData.id,
      transactionId: paymentData.transactionId!,
      gatewayData,
    });

    // Create transaction record
    await db.insert(paymentTransaction).values({
      paymentId: paymentData.id,
      type: 'charge',
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: processResult.success ? 'completed' : 'failed',
      gatewayTransactionId: processResult.gatewayTransactionId,
      gatewayResponse: processResult.gatewayResponse,
      processedAt: new Date(),
    });

    if (processResult.success) {
      // Update payment status
      await db
        .update(payment)
        .set({
          status: 'completed',
          processedAt: new Date(),
          gatewayTransactionId: processResult.gatewayTransactionId,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      // Update order status
      await db
        .update(order)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(order.id, paymentData.orderId));

      return NextResponse.json({
        success: true,
        paymentId,
        status: 'completed',
        transactionId: processResult.gatewayTransactionId,
      });
    } else {
      // Update payment status to failed
      await db
        .update(payment)
        .set({
          status: 'failed',
          failureReason: processResult.error,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      return NextResponse.json(
        { error: processResult.error || "Payment processing failed" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}