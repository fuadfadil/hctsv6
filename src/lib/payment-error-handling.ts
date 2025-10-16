import { db } from "./db";
import { payment, paymentTransaction, auditLog } from "./schema";
import { eq } from "drizzle-orm";
import { PaymentSecurity } from "./payment-security";

// Payment Error Types
export enum PaymentErrorType {
  VALIDATION_ERROR = 'validation_error',
  GATEWAY_ERROR = 'gateway_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  FRAUD_DETECTED = 'fraud_detected',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  CARD_DECLINED = 'card_declined',
  EXPIRED_CARD = 'expired_card',
  INVALID_CARD = 'invalid_card',
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  CURRENCY_MISMATCH = 'currency_mismatch',
  AMOUNT_TOO_HIGH = 'amount_too_high',
  AMOUNT_TOO_LOW = 'amount_too_low',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SYSTEM_ERROR = 'system_error',
}

// Payment Error Class
export class PaymentError extends Error {
  public readonly type: PaymentErrorType;
  public readonly code: string;
  public readonly details: any;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    type: PaymentErrorType,
    message: string,
    code: string = '',
    details: any = {},
    retryable: boolean = false,
    userMessage: string = ''
  ) {
    super(message);
    this.name = 'PaymentError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.userMessage = userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    const messages = {
      [PaymentErrorType.VALIDATION_ERROR]: 'Please check your payment information and try again.',
      [PaymentErrorType.GATEWAY_ERROR]: 'Payment service temporarily unavailable. Please try again later.',
      [PaymentErrorType.NETWORK_ERROR]: 'Network connection issue. Please check your connection and try again.',
      [PaymentErrorType.TIMEOUT_ERROR]: 'Payment request timed out. Please try again.',
      [PaymentErrorType.FRAUD_DETECTED]: 'Payment flagged for security review. Please contact support.',
      [PaymentErrorType.INSUFFICIENT_FUNDS]: 'Insufficient funds. Please check your account balance.',
      [PaymentErrorType.CARD_DECLINED]: 'Card was declined. Please try a different card or contact your bank.',
      [PaymentErrorType.EXPIRED_CARD]: 'Card has expired. Please use a different card.',
      [PaymentErrorType.INVALID_CARD]: 'Invalid card details. Please check and try again.',
      [PaymentErrorType.DUPLICATE_TRANSACTION]: 'Duplicate transaction detected.',
      [PaymentErrorType.CURRENCY_MISMATCH]: 'Currency mismatch. Please try again.',
      [PaymentErrorType.AMOUNT_TOO_HIGH]: 'Payment amount exceeds allowed limit.',
      [PaymentErrorType.AMOUNT_TOO_LOW]: 'Payment amount below minimum required.',
      [PaymentErrorType.COMPLIANCE_VIOLATION]: 'Payment violates compliance rules.',
      [PaymentErrorType.SYSTEM_ERROR]: 'System error occurred. Please try again later.',
    };

    return messages[this.type] || 'An error occurred during payment processing.';
  }
}

// Error Handler Class
export class PaymentErrorHandler {
  static async handlePaymentError(
    error: Error,
    context: {
      paymentId?: string;
      orderId?: string;
      gatewayId?: string;
      userId?: string;
      amount?: number;
      currency?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<PaymentError> {
    let paymentError: PaymentError;

    // Convert unknown errors to PaymentError
    if (error instanceof PaymentError) {
      paymentError = error;
    } else {
      // Analyze error and categorize
      paymentError = this.categorizeError(error);
    }

    // Log the error
    await this.logPaymentError(paymentError, context);

    // Update payment status if applicable
    if (context.paymentId) {
      await this.updatePaymentStatus(context.paymentId, paymentError);
    }

    // Send notifications if critical
    if (this.isCriticalError(paymentError)) {
      await this.sendErrorNotification(paymentError, context);
    }

    // Create audit log
    await PaymentSecurity.createAuditLog(
      'payment_error',
      {
        errorType: paymentError.type,
        errorMessage: paymentError.message,
        context,
      },
      context.userId,
      context.ipAddress
    );

    return paymentError;
  }

  private static categorizeError(error: Error): PaymentError {
    const message = error.message.toLowerCase();

    // Network and timeout errors
    if (message.includes('timeout') || message.includes('network') || message.includes('connection')) {
      return new PaymentError(
        PaymentErrorType.TIMEOUT_ERROR,
        error.message,
        'TIMEOUT',
        { originalError: error },
        true
      );
    }

    // Gateway errors
    if (message.includes('gateway') || message.includes('api') || message.includes('service unavailable')) {
      return new PaymentError(
        PaymentErrorType.GATEWAY_ERROR,
        error.message,
        'GATEWAY_ERROR',
        { originalError: error },
        true
      );
    }

    // Card-related errors
    if (message.includes('declined') || message.includes('decline')) {
      return new PaymentError(
        PaymentErrorType.CARD_DECLINED,
        error.message,
        'CARD_DECLINED',
        { originalError: error },
        false
      );
    }

    if (message.includes('expired')) {
      return new PaymentError(
        PaymentErrorType.EXPIRED_CARD,
        error.message,
        'EXPIRED_CARD',
        { originalError: error },
        false
      );
    }

    if (message.includes('invalid') && message.includes('card')) {
      return new PaymentError(
        PaymentErrorType.INVALID_CARD,
        error.message,
        'INVALID_CARD',
        { originalError: error },
        false
      );
    }

    if (message.includes('insufficient') || message.includes('funds')) {
      return new PaymentError(
        PaymentErrorType.INSUFFICIENT_FUNDS,
        error.message,
        'INSUFFICIENT_FUNDS',
        { originalError: error },
        false
      );
    }

    // Fraud detection
    if (message.includes('fraud') || message.includes('suspicious')) {
      return new PaymentError(
        PaymentErrorType.FRAUD_DETECTED,
        error.message,
        'FRAUD_DETECTED',
        { originalError: error },
        false
      );
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        error.message,
        'VALIDATION_ERROR',
        { originalError: error },
        false
      );
    }

    // Default to system error
    return new PaymentError(
      PaymentErrorType.SYSTEM_ERROR,
      error.message,
      'SYSTEM_ERROR',
      { originalError: error },
      true
    );
  }

  private static async logPaymentError(error: PaymentError, context: any): Promise<void> {
    try {
      // Log to database
      await db.insert(auditLog).values({
        userId: context.userId,
        action: 'payment_error',
        entityType: 'payment',
        entityId: context.paymentId,
        oldValues: null,
        newValues: {
          errorType: error.type,
          errorMessage: error.message,
          errorCode: error.code,
          context,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date(),
      });

      // Log to console for development
      console.error('Payment Error:', {
        type: error.type,
        message: error.message,
        code: error.code,
        context,
        stack: error.stack,
      });

    } catch (logError) {
      console.error('Failed to log payment error:', logError);
    }
  }

  private static async updatePaymentStatus(paymentId: string, error: PaymentError): Promise<void> {
    try {
      const status = error.retryable ? 'pending' : 'failed';

      await db
        .update(payment)
        .set({
          status,
          failureReason: error.message,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      // Create transaction record for failed payment
      if (!error.retryable) {
        await db.insert(paymentTransaction).values({
          paymentId,
          type: 'charge',
          amount: '0', // Will be updated with actual amount
          currency: 'LYD', // Will be updated with actual currency
          status: 'failed',
          processedAt: new Date(),
        });
      }

    } catch (updateError) {
      console.error('Failed to update payment status:', updateError);
    }
  }

  private static isCriticalError(error: PaymentError): boolean {
    const criticalTypes = [
      PaymentErrorType.FRAUD_DETECTED,
      PaymentErrorType.SYSTEM_ERROR,
      PaymentErrorType.COMPLIANCE_VIOLATION,
    ];

    return criticalTypes.includes(error.type);
  }

  private static async sendErrorNotification(error: PaymentError, context: any): Promise<void> {
    try {
      // In a real implementation, this would send emails/SMS to admins
      console.log('Critical payment error notification:', {
        type: error.type,
        message: error.message,
        context,
      });

      // TODO: Implement actual notification system
      // await sendEmail({
      //   to: 'admin@example.com',
      //   subject: `Critical Payment Error: ${error.type}`,
      //   body: `Payment error occurred: ${error.message}`,
      // });

    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }

  static async retryPayment(paymentId: string, maxRetries: number = 3): Promise<{ success: boolean; error?: PaymentError }> {
    try {
      const paymentRecord = await db
        .select()
        .from(payment)
        .where(eq(payment.id, paymentId))
        .limit(1);

      if (!paymentRecord.length) {
        return { success: false, error: new PaymentError(PaymentErrorType.VALIDATION_ERROR, 'Payment not found') };
      }

      const paymentData = paymentRecord[0];

      // Check retry count
      const metadata = paymentData.metadata as any || {};
      const retryCount = metadata.retryCount || 0;
      if (retryCount >= maxRetries) {
        return {
          success: false,
          error: new PaymentError(PaymentErrorType.SYSTEM_ERROR, 'Maximum retry attempts exceeded')
        };
      }

      // Update retry count
      await db
        .update(payment)
        .set({
          status: 'pending',
          metadata: { ...metadata, retryCount: retryCount + 1 },
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      // TODO: Implement actual retry logic with payment gateway

      return { success: true };

    } catch (error) {
      const paymentError = error instanceof PaymentError ? error :
        new PaymentError(PaymentErrorType.SYSTEM_ERROR, 'Retry failed');

      return { success: false, error: paymentError };
    }
  }

  static getErrorRecoverySuggestions(error: PaymentError): string[] {
    const suggestions: Record<PaymentErrorType, string[]> = {
      [PaymentErrorType.VALIDATION_ERROR]: [
        'Check all payment fields are filled correctly',
        'Verify card details or payment information',
        'Ensure amounts are within allowed limits',
      ],
      [PaymentErrorType.CARD_DECLINED]: [
        'Try a different payment card',
        'Contact your bank to check for restrictions',
        'Verify sufficient funds are available',
      ],
      [PaymentErrorType.EXPIRED_CARD]: [
        'Use a different payment card',
        'Update your card information',
      ],
      [PaymentErrorType.INSUFFICIENT_FUNDS]: [
        'Check account balance',
        'Use a different payment method',
        'Contact your bank for assistance',
      ],
      [PaymentErrorType.TIMEOUT_ERROR]: [
        'Check your internet connection',
        'Try again in a few moments',
        'Use a different device if possible',
      ],
      [PaymentErrorType.GATEWAY_ERROR]: [
        'Try again in a few minutes',
        'Contact support if the problem persists',
      ],
      [PaymentErrorType.FRAUD_DETECTED]: [
        'Contact customer support for assistance',
        'Additional verification may be required',
      ],
      [PaymentErrorType.NETWORK_ERROR]: [
        'Check your internet connection',
        'Try switching networks',
        'Disable VPN if active',
      ],
      [PaymentErrorType.DUPLICATE_TRANSACTION]: [
        'Check if payment already processed',
        'Contact support if you see unexpected charges',
      ],
      [PaymentErrorType.AMOUNT_TOO_HIGH]: [
        'Reduce the payment amount',
        'Split into multiple payments',
        'Contact support for higher limits',
      ],
      [PaymentErrorType.AMOUNT_TOO_LOW]: [
        'Increase the payment amount to meet minimum',
        'Add additional items or services',
      ],
      [PaymentErrorType.COMPLIANCE_VIOLATION]: [
        'Contact support for compliance assistance',
        'Additional documentation may be required',
      ],
      [PaymentErrorType.SYSTEM_ERROR]: [
        'Try again later',
        'Contact support if the problem persists',
        'Check system status page',
      ],
      [PaymentErrorType.CURRENCY_MISMATCH]: [
        'Verify currency selection',
        'Contact support for currency exchange assistance',
      ],
      [PaymentErrorType.INVALID_CARD]: [
        'Double-check card number and details',
        'Try entering card information again',
        'Use a different card',
      ],
    };

    return suggestions[error.type] || ['Contact customer support for assistance'];
  }
}

// Error Boundary for Payment Components
export class PaymentErrorBoundary {
  private static errorCounts = new Map<string, { count: number; lastError: Date }>();

  static shouldBlockPayment(userId: string, errorType: PaymentErrorType): boolean {
    const key = `${userId}:${errorType}`;
    const record = this.errorCounts.get(key);

    if (!record) return false;

    // Block if too many errors in short time
    const now = new Date();
    const timeDiff = now.getTime() - record.lastError.getTime();
    const maxErrors = 5;
    const timeWindow = 60 * 60 * 1000; // 1 hour

    if (timeDiff < timeWindow && record.count >= maxErrors) {
      return true;
    }

    return false;
  }

  static recordError(userId: string, errorType: PaymentErrorType): void {
    const key = `${userId}:${errorType}`;
    const record = this.errorCounts.get(key);

    if (record) {
      record.count++;
      record.lastError = new Date();
    } else {
      this.errorCounts.set(key, { count: 1, lastError: new Date() });
    }
  }

  static clearErrorRecord(userId: string, errorType: PaymentErrorType): void {
    const key = `${userId}:${errorType}`;
    this.errorCounts.delete(key);
  }
}