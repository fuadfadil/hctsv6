import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payment, refund, paymentTransaction, order } from "@/lib/schema";
import { paymentGatewayManager } from "@/lib/payment-gateway";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId, amount, reason, notes } = await request.json();

    if (!paymentId || !amount || !reason) {
      return NextResponse.json(
        { error: "Payment ID, amount, and reason are required" },
        { status: 400 }
      );
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

    // Check if payment is completed
    if (paymentData.status !== 'completed') {
      return NextResponse.json(
        { error: "Only completed payments can be refunded" },
        { status: 400 }
      );
    }

    // Check if refund amount is valid
    const refundAmount = parseFloat(amount);
    const paymentAmount = parseFloat(paymentData.amount);

    if (refundAmount <= 0 || refundAmount > paymentAmount) {
      return NextResponse.json(
        { error: "Invalid refund amount" },
        { status: 400 }
      );
    }

    // Check for existing refunds
    const existingRefunds = await db
      .select()
      .from(refund)
      .where(and(eq(refund.paymentId, paymentId), eq(refund.status, 'completed')));

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    if (totalRefunded + refundAmount > paymentAmount) {
      return NextResponse.json(
        { error: "Refund amount exceeds remaining payment amount" },
        { status: 400 }
      );
    }

    // Get payment gateway
    const gateway = paymentGatewayManager.getGateway(paymentData.gatewayId);
    if (!gateway) {
      return NextResponse.json({ error: "Payment gateway not available" }, { status: 400 });
    }

    // Create refund record
    const [refundRecord] = await db
      .insert(refund)
      .values({
        paymentId,
        orderId: paymentData.orderId,
        amount: amount.toString(),
        currency: paymentData.currency,
        reason,
        status: 'pending',
        requestedBy: session.user.id,
        notes,
      })
      .returning();

    // Process refund with gateway
    const refundResult = await gateway.processRefund({
      paymentId,
      amount: refundAmount,
      reason,
      notes,
    });

    if (refundResult.success) {
      // Update refund status
      await db
        .update(refund)
        .set({
          status: 'completed',
          gatewayRefundId: refundResult.gatewayRefundId,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(refund.id, refundRecord.id));

      // Create transaction record
      await db.insert(paymentTransaction).values({
        paymentId,
        type: 'refund',
        amount: amount.toString(),
        currency: paymentData.currency,
        status: 'completed',
        gatewayTransactionId: refundResult.gatewayRefundId,
        processedAt: new Date(),
      });

      // Update payment status if fully refunded
      const newTotalRefunded = totalRefunded + refundAmount;
      if (newTotalRefunded >= paymentAmount) {
        await db
          .update(payment)
          .set({
            status: 'refunded',
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentId));
      }

      return NextResponse.json({
        success: true,
        refundId: refundRecord.id,
        gatewayRefundId: refundResult.gatewayRefundId,
        status: 'completed',
      });
    } else {
      // Update refund status to failed
      await db
        .update(refund)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(refund.id, refundRecord.id));

      return NextResponse.json(
        { error: refundResult.error || "Refund processing failed" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Refund processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Get refunds for payment
    const refunds = await db
      .select()
      .from(refund)
      .where(eq(refund.paymentId, paymentId))
      .orderBy(refund.createdAt);

    return NextResponse.json({ refunds });

  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}