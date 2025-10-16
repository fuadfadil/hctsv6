import { db } from "./db";
import { escrowAccount, installmentPlan, installmentPayment, currencyExchangeRate, paymentSchedule, invoice, payment, fraudAlert } from "./schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Escrow Management System
export class EscrowManager {
  static async createEscrowAccount(orderId: string, buyerId: string, sellerId: string, totalAmount: number, currency: string): Promise<string> {
    const [escrow] = await db
      .insert(escrowAccount)
      .values({
        orderId,
        buyerId,
        sellerId,
        totalAmount: totalAmount.toString(),
        currency,
        heldAmount: totalAmount.toString(),
        status: 'holding',
        autoReleaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();

    return escrow.id;
  }

  static async releaseEscrowFunds(escrowId: string, amount: number, reason: string): Promise<boolean> {
    const escrow = await db
      .select()
      .from(escrowAccount)
      .where(eq(escrowAccount.id, escrowId))
      .limit(1);

    if (!escrow.length) return false;

    const currentHeld = parseFloat(escrow[0].heldAmount);
    const currentReleased = parseFloat(escrow[0].releasedAmount || '0');

    if (amount > currentHeld) return false;

    const newHeld = currentHeld - amount;
    const newReleased = currentReleased + amount;

    await db
      .update(escrowAccount)
      .set({
        heldAmount: newHeld.toString(),
        releasedAmount: newReleased.toString(),
        status: newHeld === 0 ? 'released' : 'holding',
        updatedAt: new Date(),
      })
      .where(eq(escrowAccount.id, escrowId));

    return true;
  }

  static async checkEscrowStatus(escrowId: string) {
    const escrow = await db
      .select()
      .from(escrowAccount)
      .where(eq(escrowAccount.id, escrowId))
      .limit(1);

    if (!escrow.length) return null;

    const escrowData = escrow[0];
    const now = new Date();
    const autoReleaseDate = escrowData.autoReleaseDate;

    // Auto-release if date has passed and funds are still held
    if (autoReleaseDate && now >= autoReleaseDate && parseFloat(escrowData.heldAmount) > 0) {
      await this.releaseEscrowFunds(escrowId, parseFloat(escrowData.heldAmount), 'Auto-release after holding period');
    }

    return escrowData;
  }
}

// Installment Payment System
export class InstallmentManager {
  static async createInstallmentPlan(
    orderId: string,
    totalAmount: number,
    currency: string,
    numberOfInstallments: number,
    frequency: 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    interestRate: number = 0
  ): Promise<string> {
    const installmentAmount = totalAmount / numberOfInstallments;
    const totalWithInterest = totalAmount * (1 + interestRate / 100);

    const [plan] = await db
      .insert(installmentPlan)
      .values({
        orderId,
        totalAmount: totalAmount.toString(),
        currency,
        numberOfInstallments,
        installmentAmount: installmentAmount.toString(),
        frequency,
        interestRate: interestRate.toString(),
        nextPaymentDate: this.calculateNextPaymentDate(new Date(), frequency),
      })
      .returning();

    // Create payment schedule
    await this.createPaymentSchedule(plan.id, totalWithInterest, currency, numberOfInstallments, frequency);

    return plan.id;
  }

  static async processInstallmentPayment(planId: string, paymentId: string): Promise<boolean> {
    const plan = await db
      .select()
      .from(installmentPlan)
      .where(eq(installmentPlan.id, planId))
      .limit(1);

    if (!plan.length) return false;

    const planData = plan[0];

    // Find next unpaid installment
    const nextInstallment = await db
      .select()
      .from(installmentPayment)
      .where(
        and(
          eq(installmentPayment.installmentPlanId, planId),
          eq(installmentPayment.status, 'pending')
        )
      )
      .orderBy(installmentPayment.installmentNumber)
      .limit(1);

    if (!nextInstallment.length) return false;

    // Update installment payment
    await db
      .update(installmentPayment)
      .set({
        paymentId,
        paidDate: new Date(),
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(installmentPayment.id, nextInstallment[0].id));

    // Check if plan is complete
    const remainingInstallments = await db
      .select({ count: installmentPayment.id })
      .from(installmentPayment)
      .where(
        and(
          eq(installmentPayment.installmentPlanId, planId),
          eq(installmentPayment.status, 'pending')
        )
      );

    if (remainingInstallments.length === 0) {
      await db
        .update(installmentPlan)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(installmentPlan.id, planId));
    } else {
      // Update next payment date
      const nextPaymentDate = this.calculateNextPaymentDate(new Date(), planData.frequency);
      await db
        .update(installmentPlan)
        .set({
          nextPaymentDate,
          updatedAt: new Date(),
        })
        .where(eq(installmentPlan.id, planId));
    }

    return true;
  }

  private static calculateNextPaymentDate(fromDate: Date, frequency: string): Date {
    const date = new Date(fromDate);

    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
    }

    return date;
  }

  private static async createPaymentSchedule(
    planId: string,
    totalAmount: number,
    currency: string,
    numberOfInstallments: number,
    frequency: string
  ): Promise<void> {
    const installmentAmount = totalAmount / numberOfInstallments;
    let currentDate = new Date();

    for (let i = 1; i <= numberOfInstallments; i++) {
      await db.insert(installmentPayment).values({
        installmentPlanId: planId,
        installmentNumber: i,
        amount: installmentAmount.toString(),
        currency,
        dueDate: currentDate,
        status: i === 1 ? 'pending' : 'pending', // First payment is immediately due
      });

      await db.insert(paymentSchedule).values({
        orderId: '', // Will be set when order is created
        installmentPlanId: planId,
        scheduledDate: currentDate,
        amount: installmentAmount.toString(),
        currency,
        status: i === 1 ? 'scheduled' : 'scheduled',
      });

      currentDate = this.calculateNextPaymentDate(currentDate, frequency);
    }
  }
}

// Currency Exchange System
export class CurrencyExchangeManager {
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;

    const rate = await db
      .select()
      .from(currencyExchangeRate)
      .where(
        and(
          eq(currencyExchangeRate.fromCurrency, fromCurrency),
          eq(currencyExchangeRate.toCurrency, toCurrency),
          eq(currencyExchangeRate.isActive, true),
          gte(currencyExchangeRate.effectiveDate, new Date()),
          lte(currencyExchangeRate.expiryDate, new Date())
        )
      )
      .orderBy(currencyExchangeRate.effectiveDate)
      .limit(1);

    return rate.length > 0 ? parseFloat(rate[0].rate) : null;
  }

  static async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number | null> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return rate ? amount * rate : null;
  }

  static async updateExchangeRates(rates: Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    source: string;
  }>): Promise<void> {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    for (const rateData of rates) {
      await db
        .update(currencyExchangeRate)
        .set({
          isActive: false,
          updatedAt: now,
        })
        .where(
          and(
            eq(currencyExchangeRate.fromCurrency, rateData.fromCurrency),
            eq(currencyExchangeRate.toCurrency, rateData.toCurrency),
            eq(currencyExchangeRate.isActive, true)
          )
        );

      await db.insert(currencyExchangeRate).values({
        fromCurrency: rateData.fromCurrency,
        toCurrency: rateData.toCurrency,
        rate: rateData.rate.toString(),
        source: rateData.source,
        effectiveDate: now,
        expiryDate,
      });
    }
  }

  static getLibyanExchangeRates(): Array<{fromCurrency: string, toCurrency: string, rate: number, source: string}> {
    // Libyan Central Bank reference rates (simplified)
    return [
      { fromCurrency: 'USD', toCurrency: 'LYD', rate: 4.85, source: 'central_bank_ly' },
      { fromCurrency: 'EUR', toCurrency: 'LYD', rate: 5.25, source: 'central_bank_ly' },
      { fromCurrency: 'LYD', toCurrency: 'USD', rate: 0.206, source: 'central_bank_ly' },
      { fromCurrency: 'LYD', toCurrency: 'EUR', rate: 0.190, source: 'central_bank_ly' },
    ];
  }
}

// Invoice Generation System
export class InvoiceManager {
  static async generateInvoice(
    orderId: string,
    buyerId: string,
    sellerId: string,
    subtotal: number,
    taxAmount: number = 0,
    discountAmount: number = 0,
    currency: string = 'LYD'
  ): Promise<string> {
    const totalAmount = subtotal + taxAmount - discountAmount;
    const invoiceNumber = this.generateInvoiceNumber();

    const [invoiceRecord] = await db
      .insert(invoice)
      .values({
        orderId,
        invoiceNumber,
        buyerId,
        sellerId,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        discountAmount: discountAmount.toString(),
        totalAmount: totalAmount.toString(),
        currency,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();

    return invoiceRecord.id;
  }

  static async markInvoiceAsPaid(invoiceId: string, paymentId: string): Promise<boolean> {
    const result = await db
      .update(invoice)
      .set({
        status: 'paid',
        paidDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, invoiceId));

    return true; // Simplified for now
  }

  static async getInvoiceDetails(invoiceId: string) {
    const invoiceData = await db
      .select()
      .from(invoice)
      .where(eq(invoice.id, invoiceId))
      .limit(1);

    return invoiceData.length > 0 ? invoiceData[0] : null;
  }

  private static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `INV-${year}${month}-${random}`;
  }
}

// Payment Scheduling System
export class PaymentScheduler {
  static async schedulePayment(
    orderId: string,
    amount: number,
    currency: string,
    scheduledDate: Date,
    installmentPlanId?: string
  ): Promise<string> {
    const [schedule] = await db
      .insert(paymentSchedule)
      .values({
        orderId,
        installmentPlanId,
        scheduledDate,
        amount: amount.toString(),
        currency,
      })
      .returning();

    return schedule.id;
  }

  static async getDuePayments(): Promise<any[]> {
    const now = new Date();

    return await db
      .select()
      .from(paymentSchedule)
      .where(
        and(
          eq(paymentSchedule.status, 'scheduled'),
          lte(paymentSchedule.scheduledDate, now)
        )
      );
  }

  static async processScheduledPayment(scheduleId: string, paymentId: string): Promise<boolean> {
    const result = await db
      .update(paymentSchedule)
      .set({
        status: 'completed',
        paymentId,
        updatedAt: new Date(),
      })
      .where(eq(paymentSchedule.id, scheduleId));

    return true; // Simplified for now
  }

  static async sendPaymentReminders(): Promise<void> {
    const reminderDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    const duePayments = await db
      .select()
      .from(paymentSchedule)
      .where(
        and(
          eq(paymentSchedule.status, 'scheduled'),
          lte(paymentSchedule.scheduledDate, reminderDate),
          eq(paymentSchedule.reminderSent, false)
        )
      );

    // In a real implementation, you would send email/SMS reminders here
    for (const payment of duePayments) {
      // Send reminder notification
      console.log(`Sending payment reminder for schedule ${payment.id}`);

      // Mark reminder as sent
      await db
        .update(paymentSchedule)
        .set({
          reminderSent: true,
          updatedAt: new Date(),
        })
        .where(eq(paymentSchedule.id, payment.id));
    }
  }
}

// Fraud Detection System
export class FraudDetectionManager {
  static async analyzePaymentRisk(paymentData: {
    amount: number;
    currency: string;
    paymentMethod: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ riskScore: number; flags: string[] }> {
    const flags: string[] = [];

    // Amount-based checks
    if (paymentData.amount > 10000) {
      flags.push('high_amount');
    }

    // Velocity checks - simplified for now
    const recentPayments = [];

    if (recentPayments.length > 10) {
      flags.push('high_velocity');
    }

    // IP-based checks - simplified for now
    const paymentsFromIP = [];

    if (paymentsFromIP.length > 5) {
      flags.push('suspicious_ip');
    }

    // Calculate risk score based on flags
    let riskScore = 0;
    flags.forEach(flag => {
      switch (flag) {
        case 'high_amount':
          riskScore += 30;
          break;
        case 'high_velocity':
          riskScore += 25;
          break;
        case 'suspicious_ip':
          riskScore += 20;
          break;
      }
    });

    return { riskScore: Math.min(100, riskScore), flags };
  }

  static async flagSuspiciousPayment(paymentId: string, reason: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    await db.insert(fraudAlert).values({
      paymentId,
      alertType: 'suspicious_payment',
      severity,
      description: reason,
    });
  }
}