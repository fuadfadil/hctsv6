CREATE TABLE "bulk_discount_tier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serviceId" uuid,
	"icd11CategoryId" uuid,
	"minQuantity" integer NOT NULL,
	"maxQuantity" integer,
	"discountPercentage" numeric(5, 2) NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_pricing_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cacheKey" text NOT NULL,
	"data" jsonb NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cached_pricing_data_cacheKey_unique" UNIQUE("cacheKey")
);
--> statement-breakpoint
CREATE TABLE "market_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serviceId" uuid,
	"icd11Code" text,
	"region" text NOT NULL,
	"currency" text NOT NULL,
	"averagePrice" numeric(10, 2),
	"minPrice" numeric(10, 2),
	"maxPrice" numeric(10, 2),
	"medianPrice" numeric(10, 2),
	"priceTrend" text,
	"trendPercentage" numeric(5, 2),
	"dataPoints" integer DEFAULT 0 NOT NULL,
	"lastUpdated" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculationId" uuid,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"oldData" jsonb,
	"newData" jsonb,
	"ipAddress" text,
	"userAgent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_calculation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"serviceId" uuid,
	"icd11Code" text,
	"serviceName" text NOT NULL,
	"serviceDescription" text,
	"basePrice" numeric(10, 2),
	"quantity" integer DEFAULT 1 NOT NULL,
	"currency" text DEFAULT 'LYD' NOT NULL,
	"healthUnits" numeric(10, 4),
	"aiSuggestedPrice" numeric(10, 2),
	"marketAveragePrice" numeric(10, 2),
	"complexityScore" numeric(3, 2),
	"discountPercentage" numeric(5, 2) DEFAULT '0',
	"finalPrice" numeric(10, 2),
	"calculationData" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bulk_discount_tier" ADD CONSTRAINT "bulk_discount_tier_serviceId_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_discount_tier" ADD CONSTRAINT "bulk_discount_tier_icd11CategoryId_icd11_category_id_fk" FOREIGN KEY ("icd11CategoryId") REFERENCES "public"."icd11_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_serviceId_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_audit_log" ADD CONSTRAINT "pricing_audit_log_calculationId_pricing_calculation_id_fk" FOREIGN KEY ("calculationId") REFERENCES "public"."pricing_calculation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_audit_log" ADD CONSTRAINT "pricing_audit_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculation" ADD CONSTRAINT "pricing_calculation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculation" ADD CONSTRAINT "pricing_calculation_serviceId_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;