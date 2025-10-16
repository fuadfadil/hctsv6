import { db } from "./db";
import { order, payment, paymentMethod, paymentTransaction, refund } from "./schema";
import { eq, and, inArray, gte } from "drizzle-orm";
import { PaymentSecurity } from "./payment-security";
import { FraudDetectionManager } from "./payment-advanced";

// Payment Order Integration Manager
export class PaymentOrderIntegration {
  static async createOrderWithPayment(orderData: {
    buyerId: string;
    sellerId: string;
    items: Array<{
      listingId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    discountTotal: number;
    finalTotal: number;
    currency: string;
    paymentMethodId: string;
    notes?: string;
  }): Promise<{ orderId: string; paymentId: string }> {
    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Create order
      const [newOrder] = await tx
        .insert(order)
        .values({
          buyerId: orderData.buyerId,
          sellerId: orderData.sellerId,
          totalAmount: orderData.finalTotal.toString(),
          currency: orderData.currency,
          notes: orderData.notes,
        })
        .returning();

      // Create order items (assuming orderItem table exists)
      // This would need to be implemented based on your order item schema

      // Get payment method to get gateway ID
      const paymentMethodData = await tx
        .select()
        .from(paymentMethod)
        .where(eq(paymentMethod.id, orderData.paymentMethodId))
        .limit(1);

      if (!paymentMethodData.length) {
        throw new Error("Payment method not found");
      }

      // Create payment record
      const [newPayment] = await tx
        .insert(payment)
        .values({
          orderId: newOrder.id,
          paymentMethodId: orderData.paymentMethodId,
          gatewayId: paymentMethodData[0].gatewayId,
          amount: orderData.finalTotal.toString(),
          currency: orderData.currency,
          status: 'pending',
        })
        .returning();

      return {
        orderId: newOrder.id,
        paymentId: newPayment.id,
      };
    });

    return result;
  }

  static async processOrderPayment(orderId: string, paymentData: {
    gatewayData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      // Get order and payment details
      const orderData = await db
        .select({
          order: order,
          payment: payment,
          paymentMethod: paymentMethod,
        })
        .from(order)
        .innerJoin(payment, eq(order.id, payment.orderId))
        .innerJoin(paymentMethod, eq(payment.paymentMethodId, paymentMethod.id))
        .where(eq(order.id, orderId))
        .limit(1);

      if (!orderData.length) {
        return { success: false, error: "Order not found" };
      }

      const { order: orderRecord, payment: paymentRecord, paymentMethod: methodRecord } = orderData[0];

      // Fraud detection
      const fraudAnalysis = await FraudDetectionManager.analyzePaymentRisk({
        amount: parseFloat(paymentRecord.amount),
        currency: paymentRecord.currency,
        paymentMethod: methodRecord.type,
        userId: orderRecord.buyerId,
        ipAddress: paymentData.ipAddress || '',
        userAgent: paymentData.userAgent || '',
      });

      if (fraudAnalysis.riskScore > 70) {
        await FraudDetectionManager.flagSuspiciousPayment(
          paymentRecord.id,
          `High fraud risk: ${fraudAnalysis.flags.join(', ')}`,
          'high'
        );
        return { success: false, error: "Payment flagged for security review" };
      }

      // Process payment through gateway
      // This would integrate with your payment gateway manager

      // Update order status
      await db
        .update(order)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(order.id, orderId));

      // Update payment status
      await db
        .update(payment)
        .set({
          status: 'completed',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      return { success: true, paymentId: paymentRecord.id };

    } catch (error) {
      console.error("Order payment processing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment processing failed"
      };
    }
  }

  static async cancelOrderWithRefund(orderId: string, reason: string): Promise<boolean> {
    try {
      const orderData = await db
        .select()
        .from(order)
        .innerJoin(payment, eq(order.id, payment.orderId))
        .where(eq(order.id, orderId))
        .limit(1);

      if (!orderData.length) return false;

      const { order: orderRecord, payment: paymentRecord } = orderData[0];

      // Update order status
      await db
        .update(order)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(order.id, orderId));

      // Process refund if payment was completed
      if (paymentRecord.status === 'completed') {
        // Create refund record
        await db.insert(refund).values({
          paymentId: paymentRecord.id,
          orderId: orderId,
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          reason: 'order_cancelled',
          status: 'pending',
          requestedBy: orderRecord.buyerId,
          notes: reason,
        });

        // Update payment status
        await db
          .update(payment)
          .set({
            status: 'refunded',
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentRecord.id));
      }

      return true;

    } catch (error) {
      console.error("Order cancellation error:", error);
      return false;
    }
  }

  static async getOrderPaymentStatus(orderId: string) {
    const result = await db
      .select({
        order: order,
        payment: payment,
        transactions: paymentTransaction,
      })
      .from(order)
      .leftJoin(payment, eq(order.id, payment.orderId))
      .leftJoin(paymentTransaction, eq(payment.id, paymentTransaction.paymentId))
      .where(eq(order.id, orderId));

    if (!result.length) return null;

    return {
      order: result[0].order,
      payment: result[0].payment,
      transactions: result.filter(r => r.transactions).map(r => r.transactions),
    };
  }

  static async reconcilePayments(): Promise<{
    reconciled: number;
    discrepancies: Array<{ paymentId: string; issue: string }>;
  }> {
    // Get all payments that need reconciliation
    const paymentsToReconcile = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.status, 'completed'),
          // Add date range for reconciliation
        )
      );

    let reconciled = 0;
    const discrepancies: Array<{ paymentId: string; issue: string }> = [];

    for (const paymentRecord of paymentsToReconcile) {
      try {
        // Check with payment gateway for actual status
        // This would integrate with gateway reconciliation APIs

        // For now, assume reconciliation is successful
        reconciled++;

        // Log reconciliation
        await PaymentSecurity.createAuditLog(
          'payment_reconciled',
          { paymentId: paymentRecord.id, amount: paymentRecord.amount },
          undefined,
          undefined
        );

      } catch (error) {
        discrepancies.push({
          paymentId: paymentRecord.id,
          issue: error instanceof Error ? error.message : 'Reconciliation failed',
        });
      }
    }

    return { reconciled, discrepancies };
  }
}

// Payment Analytics and Reporting
export class PaymentAnalytics {
  static async getPaymentMetrics(dateRange?: { start: Date; end: Date }) {
    let whereClause = undefined;
    if (dateRange) {
      whereClause = and(
        gte(payment.createdAt, dateRange.start),
        gte(payment.createdAt, dateRange.end)
      );
    }

    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      totalVolume,
      averagePayment,
    ] = await Promise.all([
      db.select({ count: payment.id }).from(payment).where(whereClause),
      db.select({ count: payment.id }).from(payment).where(whereClause ? and(eq(payment.status, 'completed'), whereClause) : eq(payment.status, 'completed')),
      db.select({ count: payment.id }).from(payment).where(whereClause ? and(eq(payment.status, 'failed'), whereClause) : eq(payment.status, 'failed')),
      db.select({ sum: payment.amount }).from(payment).where(whereClause ? and(eq(payment.status, 'completed'), whereClause) : eq(payment.status, 'completed')),
      db.select({ avg: payment.amount }).from(payment).where(whereClause ? and(eq(payment.status, 'completed'), whereClause) : eq(payment.status, 'completed')),
    ]);

    return {
      totalPayments: totalPayments.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      successRate: totalPayments.length > 0 ? (successfulPayments.length / totalPayments.length) * 100 : 0,
      totalVolume: totalVolume.reduce((sum, p) => sum + parseFloat(p.sum || '0'), 0),
      averagePayment: averagePayment.reduce((sum, p) => sum + parseFloat(p.avg || '0'), 0) / averagePayment.length,
    };
  }

  static async getPaymentMethodUsage() {
    const methodUsage = await db
      .select({
        method: paymentMethod.type,
        count: payment.id,
        volume: payment.amount,
      })
      .from(payment)
      .innerJoin(paymentMethod, eq(payment.paymentMethodId, paymentMethod.id))
      .where(eq(payment.status, 'completed'))
      .groupBy(paymentMethod.type);

    return methodUsage.map(item => ({
      method: item.method,
      transactionCount: item.count,
      totalVolume: parseFloat(item.volume),
    }));
  }

  static async detectPaymentAnomalies() {
    // Detect unusual payment patterns
    const recentPayments = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.status, 'completed'),
          gte(payment.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(payment.createdAt);

    const anomalies: Array<{ paymentId: string; type: string; severity: string }> = [];

    // Simple anomaly detection - payments much larger than average
    const amounts = recentPayments.map(p => parseFloat(p.amount));
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, amount) => sum + Math.pow(amount - average, 2), 0) / amounts.length);

    recentPayments.forEach(payment => {
      const amount = parseFloat(payment.amount);
      if (amount > average + 3 * stdDev) {
        anomalies.push({
          paymentId: payment.id,
          type: 'unusually_large_payment',
          severity: 'medium',
        });
      }
    });

    return anomalies;
  }
}