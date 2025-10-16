import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { paymentGateway, payment, paymentMethod, paymentTransaction, refund, escrowAccount, installmentPlan, installmentPayment, currencyExchangeRate, paymentWebhook, fraudAlert, paymentCompliance, invoice, paymentSchedule } from "./schema";

// Base Payment Gateway Interface
export interface PaymentGatewayConfig {
  id: string;
  name: string;
  provider: string;
  type: 'mobile_money' | 'bank_transfer' | 'card' | 'wallet';
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  baseUrl?: string;
  supportedCurrencies: string[];
  configuration: Record<string, any>;
}

export interface PaymentInitiationRequest {
  amount: number;
  currency: string;
  orderId: string;
  paymentMethodId: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentInitiationResponse {
  success: boolean;
  transactionId?: string;
  gatewayTransactionId?: string;
  redirectUrl?: string;
  qrCode?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionId: string;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  processedAt?: Date;
  failureReason?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  gatewayRefundId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Libyan Mobile Money Gateway Implementation
export class LibyanMobileMoneyGateway {
  private config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      // Simulate Libyan Mobile Money API call
      const response = await this.callMobileMoneyAPI('/payments/initiate', {
        amount: request.amount,
        currency: request.currency,
        phoneNumber: request.customerInfo.phone,
        description: `Payment for order ${request.orderId}`,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook/${this.config.id}`,
      });

      return {
        success: true,
        transactionId: response.transactionId,
        gatewayTransactionId: response.gatewayTransactionId,
        qrCode: response.qrCode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await this.callMobileMoneyAPI(`/payments/${transactionId}/status`);

      return {
        status: this.mapStatus(response.status),
        transactionId,
        gatewayTransactionId: response.gatewayTransactionId,
        amount: response.amount,
        currency: response.currency,
        processedAt: response.processedAt ? new Date(response.processedAt) : undefined,
      };
    } catch (error) {
      return {
        status: 'failed',
        transactionId,
        amount: 0,
        currency: 'LYD',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const response = await this.callMobileMoneyAPI('/refunds/initiate', {
        originalTransactionId: request.paymentId,
        amount: request.amount,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: response.refundId,
        gatewayRefundId: response.gatewayRefundId,
        status: 'pending',
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async callMobileMoneyAPI(endpoint: string, data?: any) {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    if (this.config.apiSecret) {
      headers['X-API-Secret'] = this.config.apiSecret;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Mobile Money API error: ${response.statusText}`);
    }

    return response.json();
  }

  private mapStatus(status: string): PaymentStatusResponse['status'] {
    const statusMap: Record<string, PaymentStatusResponse['status']> = {
      'INITIATED': 'pending',
      'PROCESSING': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded',
    };
    return statusMap[status] || 'pending';
  }
}

// Libyan Bank Transfer Gateway Implementation
export class LibyanBankTransferGateway {
  private config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      // Generate bank transfer instructions
      const bankDetails = this.config.configuration.bankDetails;
      const reference = `ORDER-${request.orderId}-${Date.now()}`;

      return {
        success: true,
        transactionId: reference,
        gatewayTransactionId: reference,
        redirectUrl: `/payment/bank-transfer?reference=${reference}&amount=${request.amount}&currency=${request.currency}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // For bank transfers, status is checked via reconciliation process
    // This would typically be updated via webhook or manual reconciliation
    const paymentRecord = await db
      .select()
      .from(payment)
      .where(eq(payment.transactionId, transactionId))
      .limit(1);

    if (paymentRecord.length === 0) {
      return {
        status: 'pending',
        transactionId,
        amount: 0,
        currency: 'LYD',
      };
    }

    return {
      status: paymentRecord[0].status as PaymentStatusResponse['status'],
      transactionId,
      gatewayTransactionId: paymentRecord[0].gatewayTransactionId || undefined,
      amount: parseFloat(paymentRecord[0].amount),
      currency: paymentRecord[0].currency,
      processedAt: paymentRecord[0].processedAt || undefined,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    // Bank transfer refunds are processed manually
    return {
      success: true,
      refundId: `REFUND-${Date.now()}`,
      status: 'pending',
    };
  }
}

// Libyan Card Payment Gateway Implementation
export class LibyanCardPaymentGateway {
  private config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      const response = await this.callCardAPI('/payments/initiate', {
        amount: request.amount,
        currency: request.currency,
        orderId: request.orderId,
        customer: {
          name: request.customerInfo.name,
          email: request.customerInfo.email,
        },
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook/${this.config.id}`,
      });

      return {
        success: true,
        transactionId: response.transactionId,
        gatewayTransactionId: response.gatewayTransactionId,
        redirectUrl: response.redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await this.callCardAPI(`/payments/${transactionId}/status`);

      return {
        status: this.mapStatus(response.status),
        transactionId,
        gatewayTransactionId: response.gatewayTransactionId,
        amount: response.amount,
        currency: response.currency,
        processedAt: response.processedAt ? new Date(response.processedAt) : undefined,
      };
    } catch (error) {
      return {
        status: 'failed',
        transactionId,
        amount: 0,
        currency: 'LYD',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const response = await this.callCardAPI('/refunds/initiate', {
        originalTransactionId: request.paymentId,
        amount: request.amount,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: response.refundId,
        gatewayRefundId: response.gatewayRefundId,
        status: 'pending',
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async callCardAPI(endpoint: string, data?: any) {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Merchant-ID': this.config.configuration.merchantId,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Card Payment API error: ${response.statusText}`);
    }

    return response.json();
  }

  private mapStatus(status: string): PaymentStatusResponse['status'] {
    const statusMap: Record<string, PaymentStatusResponse['status']> = {
      'initiated': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };
    return statusMap[status] || 'pending';
  }
}

// Unified Payment Gateway Manager
export class PaymentGatewayManager {
  private gateways: Map<string, any> = new Map();

  constructor() {
    this.initializeGateways();
  }

  private async initializeGateways() {
    const gatewayConfigs = await db.select().from(paymentGateway).where(eq(paymentGateway.isActive, true));

    for (const config of gatewayConfigs) {
      let gateway: any;

      switch (config.provider) {
        case 'libyana_mobile':
          gateway = new LibyanMobileMoneyGateway(config as PaymentGatewayConfig);
          break;
        case 'libyana_bank':
          gateway = new LibyanBankTransferGateway(config as PaymentGatewayConfig);
          break;
        case 'libyana_card':
          gateway = new LibyanCardPaymentGateway(config as PaymentGatewayConfig);
          break;
        default:
          console.warn(`Unknown payment gateway provider: ${config.provider}`);
          continue;
      }

      this.gateways.set(config.id, gateway);
    }
  }

  getGateway(gatewayId: string) {
    return this.gateways.get(gatewayId);
  }

  async getAvailableGateways(currency: string = 'LYD') {
    const gateways = await db
      .select()
      .from(paymentGateway)
      .where(
        and(
          eq(paymentGateway.isActive, true),
          // Check if currency is supported
        )
      );

    return gateways.filter(gateway => {
      const currencies = gateway.supportedCurrencies as string[] | undefined;
      return currencies?.includes(currency) || currencies?.includes('LYD');
    });
  }
}

// Export singleton instance
export const paymentGatewayManager = new PaymentGatewayManager();