CREATE TABLE "buyer_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"alertType" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"actionRequired" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"metricType" text NOT NULL,
	"value" numeric(15, 2),
	"period" text NOT NULL,
	"date" timestamp NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_exchange_rate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fromCurrency" text NOT NULL,
	"toCurrency" text NOT NULL,
	"rate" numeric(10, 6) NOT NULL,
	"source" text NOT NULL,
	"effectiveDate" timestamp NOT NULL,
	"expiryDate" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"buyerId" text NOT NULL,
	"sellerId" text NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"heldAmount" numeric(10, 2) NOT NULL,
	"releasedAmount" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'holding' NOT NULL,
	"releaseConditions" jsonb,
	"autoReleaseDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid,
	"userId" text,
	"alertType" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"resolvedBy" text,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installmentPlanId" uuid NOT NULL,
	"paymentId" uuid,
	"installmentNumber" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"dueDate" timestamp NOT NULL,
	"paidDate" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"lateFee" numeric(10, 2) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"numberOfInstallments" integer NOT NULL,
	"installmentAmount" numeric(10, 2) NOT NULL,
	"frequency" text NOT NULL,
	"interestRate" numeric(5, 2) DEFAULT '0',
	"status" text DEFAULT 'active' NOT NULL,
	"nextPaymentDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investor_portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"totalValue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"invoiceNumber" text NOT NULL,
	"buyerId" text NOT NULL,
	"sellerId" text NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"taxAmount" numeric(10, 2) DEFAULT '0',
	"discountAmount" numeric(10, 2) DEFAULT '0',
	"totalAmount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issueDate" timestamp NOT NULL,
	"dueDate" timestamp,
	"paidDate" timestamp,
	"notes" text,
	"paymentTerms" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_invoiceNumber_unique" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE "payment_compliance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid,
	"regulationType" text NOT NULL,
	"complianceStatus" text NOT NULL,
	"checkDate" timestamp NOT NULL,
	"details" jsonb,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateway" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"apiKey" text,
	"apiSecret" text,
	"webhookSecret" text,
	"baseUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"supportedCurrencies" jsonb,
	"configuration" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"installmentPlanId" uuid,
	"scheduledDate" timestamp NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"paymentId" uuid,
	"reminderSent" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"gatewayTransactionId" text,
	"gatewayResponse" jsonb,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gatewayId" uuid NOT NULL,
	"paymentId" uuid,
	"eventType" text NOT NULL,
	"webhookId" text,
	"payload" jsonb NOT NULL,
	"signature" text,
	"processed" boolean DEFAULT false NOT NULL,
	"processedAt" timestamp,
	"retryCount" integer DEFAULT 0,
	"lastRetryAt" timestamp,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_holding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolioId" uuid NOT NULL,
	"serviceId" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"purchasePrice" numeric(10, 2) NOT NULL,
	"currentValue" numeric(10, 2),
	"purchaseDate" timestamp NOT NULL,
	"lastUpdated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid NOT NULL,
	"orderId" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"gatewayRefundId" text,
	"processedAt" timestamp,
	"notes" text,
	"requestedBy" text NOT NULL,
	"approvedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"serviceId" uuid NOT NULL,
	"orderId" uuid,
	"rating" integer NOT NULL,
	"reviewText" text,
	"isVerified" boolean DEFAULT false NOT NULL,
	"helpfulVotes" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "gatewayId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "gatewayTransactionId" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "processedAt" timestamp;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "failureReason" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "ipAddress" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "userAgent" text;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "gatewayId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "accountHolderName" text;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "expiryDate" text;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "cvv" text;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "phoneNumber" text;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "bankName" text;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "isVerified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_method" ADD COLUMN "verificationToken" text;--> statement-breakpoint
ALTER TABLE "buyer_alert" ADD CONSTRAINT "buyer_alert_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_analytics" ADD CONSTRAINT "buyer_analytics_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_account" ADD CONSTRAINT "escrow_account_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_account" ADD CONSTRAINT "escrow_account_buyerId_user_id_fk" FOREIGN KEY ("buyerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_account" ADD CONSTRAINT "escrow_account_sellerId_user_id_fk" FOREIGN KEY ("sellerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alert" ADD CONSTRAINT "fraud_alert_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alert" ADD CONSTRAINT "fraud_alert_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alert" ADD CONSTRAINT "fraud_alert_resolvedBy_user_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_payment" ADD CONSTRAINT "installment_payment_installmentPlanId_installment_plan_id_fk" FOREIGN KEY ("installmentPlanId") REFERENCES "public"."installment_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_payment" ADD CONSTRAINT "installment_payment_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plan" ADD CONSTRAINT "installment_plan_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_portfolio" ADD CONSTRAINT "investor_portfolio_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_buyerId_user_id_fk" FOREIGN KEY ("buyerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_sellerId_user_id_fk" FOREIGN KEY ("sellerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_compliance" ADD CONSTRAINT "payment_compliance_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_compliance" ADD CONSTRAINT "payment_compliance_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedule" ADD CONSTRAINT "payment_schedule_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedule" ADD CONSTRAINT "payment_schedule_installmentPlanId_installment_plan_id_fk" FOREIGN KEY ("installmentPlanId") REFERENCES "public"."installment_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedule" ADD CONSTRAINT "payment_schedule_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook" ADD CONSTRAINT "payment_webhook_gatewayId_payment_gateway_id_fk" FOREIGN KEY ("gatewayId") REFERENCES "public"."payment_gateway"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook" ADD CONSTRAINT "payment_webhook_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holding" ADD CONSTRAINT "portfolio_holding_portfolioId_investor_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."investor_portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holding" ADD CONSTRAINT "portfolio_holding_serviceId_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_requestedBy_user_id_fk" FOREIGN KEY ("requestedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_approvedBy_user_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_review" ADD CONSTRAINT "service_review_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_review" ADD CONSTRAINT "service_review_serviceId_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_review" ADD CONSTRAINT "service_review_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_gatewayId_payment_gateway_id_fk" FOREIGN KEY ("gatewayId") REFERENCES "public"."payment_gateway"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_gatewayId_payment_gateway_id_fk" FOREIGN KEY ("gatewayId") REFERENCES "public"."payment_gateway"("id") ON DELETE no action ON UPDATE no action;