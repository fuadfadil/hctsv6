import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payment, paymentWebhook, paymentTransaction, order, paymentGateway } from "@/lib/schema";
import { paymentGatewayManager } from "@/lib/payment-gateway";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gatewayId = searchParams.get('gateway');

    if (!gatewayId) {
      return NextResponse.json({ error: "Gateway ID required" }, { status: 400 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-signature');

    // Get gateway config
    const gatewayConfigs = await db
      .select()
      .from(paymentGateway)
      .where(eq(paymentGateway.id, gatewayId))
      .limit(1);

    if (!gatewayConfigs.length) {
      return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
    }

    const gatewayConfig = gatewayConfigs[0];

    // Verify webhook signature if configured
    if (gatewayConfig.webhookSecret && signature) {
      // Implement signature verification based on gateway
      // This would vary by gateway provider
    }

    // Parse webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      payload = { raw: body };
    }

    // Store webhook for processing
    const [webhookRecord] = await db
      .insert(paymentWebhook)
      .values({
        gatewayId,
        eventType: payload.event_type || payload.type || 'unknown',
        payload,
        signature: signature || undefined,
      })
      .returning();

    // Process webhook based on event type
    const eventType = payload.event_type || payload.type;

    switch (eventType) {
      case 'payment.succeeded':
      case 'payment.completed':
        await handlePaymentSuccess(payload, gatewayId);
        break;

      case 'payment.failed':
        await handlePaymentFailure(payload, gatewayId);
        break;

      case 'payment.refunded':
        await handlePaymentRefund(payload, gatewayId);
        break;

      case 'payment.cancelled':
        await handlePaymentCancellation(payload, gatewayId);
        break;

      default:
        // Log unknown event types for monitoring
        console.log(`Unknown webhook event: ${eventType}`);
    }

    // Mark webhook as processed
    await db
      .update(paymentWebhook)
      .set({
        processed: true,
        processedAt: new Date(),
      })
      .where(eq(paymentWebhook.id, webhookRecord.id));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(payload: any, gatewayId: string) {
  const transactionId = payload.transaction_id || payload.id;

  // Find payment by gateway transaction ID
  const paymentRecord = await db
    .select()
    .from(payment)
    .where(eq(payment.gatewayTransactionId, transactionId))
    .limit(1);

  if (!paymentRecord.length) {
    console.error(`Payment not found for transaction: ${transactionId}`);
    return;
  }

  const paymentData = paymentRecord[0];

  // Update payment status
  await db
    .update(payment)
    .set({
      status: 'completed',
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payment.id, paymentData.id));

  // Create transaction record
  await db.insert(paymentTransaction).values({
    paymentId: paymentData.id,
    type: 'charge',
    amount: paymentData.amount,
    currency: paymentData.currency,
    status: 'completed',
    gatewayTransactionId: transactionId,
    gatewayResponse: payload,
    processedAt: new Date(),
  });

  // Update order status
  await db
    .update(order)
    .set({
      status: 'confirmed',
      updatedAt: new Date(),
    })
    .where(eq(order.id, paymentData.orderId));
}

async function handlePaymentFailure(payload: any, gatewayId: string) {
  const transactionId = payload.transaction_id || payload.id;

  const paymentRecord = await db
    .select()
    .from(payment)
    .where(eq(payment.gatewayTransactionId, transactionId))
    .limit(1);

  if (!paymentRecord.length) {
    console.error(`Payment not found for transaction: ${transactionId}`);
    return;
  }

  const paymentData = paymentRecord[0];

  await db
    .update(payment)
    .set({
      status: 'failed',
      failureReason: payload.failure_reason || payload.error || 'Payment failed',
      updatedAt: new Date(),
    })
    .where(eq(payment.id, paymentData.id));

  await db.insert(paymentTransaction).values({
    paymentId: paymentData.id,
    type: 'charge',
    amount: paymentData.amount,
    currency: paymentData.currency,
    status: 'failed',
    gatewayTransactionId: transactionId,
    gatewayResponse: payload,
    processedAt: new Date(),
  });
}

async function handlePaymentRefund(payload: any, gatewayId: string) {
  const transactionId = payload.transaction_id || payload.id;

  const paymentRecord = await db
    .select()
    .from(payment)
    .where(eq(payment.gatewayTransactionId, transactionId))
    .limit(1);

  if (!paymentRecord.length) {
    console.error(`Payment not found for transaction: ${transactionId}`);
    return;
  }

  const paymentData = paymentRecord[0];

  await db
    .update(payment)
    .set({
      status: 'refunded',
      updatedAt: new Date(),
    })
    .where(eq(payment.id, paymentData.id));

  await db.insert(paymentTransaction).values({
    paymentId: paymentData.id,
    type: 'refund',
    amount: payload.amount || paymentData.amount,
    currency: paymentData.currency,
    status: 'completed',
    gatewayTransactionId: transactionId,
    gatewayResponse: payload,
    processedAt: new Date(),
  });
}

async function handlePaymentCancellation(payload: any, gatewayId: string) {
  const transactionId = payload.transaction_id || payload.id;

  const paymentRecord = await db
    .select()
    .from(payment)
    .where(eq(payment.gatewayTransactionId, transactionId))
    .limit(1);

  if (!paymentRecord.length) {
    console.error(`Payment not found for transaction: ${transactionId}`);
    return;
  }

  const paymentData = paymentRecord[0];

  await db
    .update(payment)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(payment.id, paymentData.id));
}