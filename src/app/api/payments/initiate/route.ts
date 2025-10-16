import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payment, paymentMethod, order } from "@/lib/schema";
import { paymentGatewayManager } from "@/lib/payment-gateway";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, paymentMethodId, metadata } = await request.json();

    if (!orderId || !paymentMethodId) {
      return NextResponse.json(
        { error: "Order ID and payment method ID are required" },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user
    const orderRecord = await db
      .select()
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.buyerId, session.user.id)))
      .limit(1);

    if (!orderRecord.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify payment method exists and belongs to user
    const paymentMethodRecord = await db
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.id, paymentMethodId), eq(paymentMethod.userId, session.user.id)))
      .limit(1);

    if (!paymentMethodRecord.length) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    const method = paymentMethodRecord[0];
    const orderData = orderRecord[0];

    // Check if payment already exists
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.orderId, orderId))
      .limit(1);

    if (existingPayment.length) {
      return NextResponse.json(
        { error: "Payment already initiated for this order" },
        { status: 400 }
      );
    }

    // Get payment gateway
    const gateway = paymentGatewayManager.getGateway(method.gatewayId);
    if (!gateway) {
      return NextResponse.json({ error: "Payment gateway not available" }, { status: 400 });
    }

    // Create payment record
    const [paymentRecord] = await db
      .insert(payment)
      .values({
        orderId,
        paymentMethodId,
        gatewayId: method.gatewayId,
        amount: orderData.totalAmount,
        currency: orderData.currency,
        status: "pending",
        metadata,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      })
      .returning();

    // Initiate payment with gateway
    const initiationResult = await gateway.initiatePayment({
      amount: parseFloat(orderData.totalAmount),
      currency: orderData.currency,
      orderId: orderData.id,
      paymentMethodId: method.id,
      customerInfo: {
        name: session.user.name || "Customer",
        email: session.user.email || "",
        phone: method.phoneNumber || undefined,
      },
      metadata,
    });

    if (!initiationResult.success) {
      // Update payment status to failed
      await db
        .update(payment)
        .set({
          status: "failed",
          failureReason: initiationResult.error,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      return NextResponse.json(
        { error: initiationResult.error || "Payment initiation failed" },
        { status: 400 }
      );
    }

    // Update payment with gateway transaction ID
    await db
      .update(payment)
      .set({
        transactionId: initiationResult.transactionId,
        gatewayTransactionId: initiationResult.gatewayTransactionId,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentRecord.id));

    return NextResponse.json({
      success: true,
      paymentId: paymentRecord.id,
      transactionId: initiationResult.transactionId,
      redirectUrl: initiationResult.redirectUrl,
      qrCode: initiationResult.qrCode,
    });

  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}