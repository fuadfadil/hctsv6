import { NextRequest, NextResponse } from "next/server";
import { PricingCalculator, PricingInputSchema } from "@/lib/pricing-calculator";
import { db } from "@/lib/db";
import { pricingCalculation, pricingAuditLog } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { z } from "zod";

const BulkPricingInputSchema = z.object({
  services: z.array(PricingInputSchema.extend({ id: z.string() })),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { services } = BulkPricingInputSchema.parse(body);

    if (services.length === 0) {
      return NextResponse.json({ error: "At least one service is required" }, { status: 400 });
    }

    if (services.length > 100) {
      return NextResponse.json({ error: "Maximum 100 services allowed per bulk calculation" }, { status: 400 });
    }

    // Calculate bulk pricing
    const results = await PricingCalculator.calculateBulkPricing(services);

    // Store calculations in database
    const calculations = [];
    for (const result of results) {
      const service = services.find(s => s.id === result.id);
      if (!service) continue;

      const [calculation] = await db
        .insert(pricingCalculation)
        .values({
          userId: session.user.id,
          serviceId: null,
          icd11Code: service.icd11Code,
          serviceName: service.serviceName,
          serviceDescription: service.serviceDescription,
          basePrice: result.basePrice.toString(),
          quantity: service.quantity,
          currency: result.currency,
          healthUnits: result.healthUnits.toString(),
          aiSuggestedPrice: result.aiSuggestedPrice.toString(),
          marketAveragePrice: result.marketAveragePrice.toString(),
          complexityScore: result.complexityScore.toString(),
          discountPercentage: result.discountPercentage.toString(),
          finalPrice: result.finalPrice.toString(),
          calculationData: {
            input: service,
            result,
            bulkCalculation: true,
            timestamp: new Date().toISOString(),
          },
        })
        .returning({ id: pricingCalculation.id });

      calculations.push({
        ...result,
        calculationId: calculation.id,
      });
    }

    // Log bulk audit event
    await db.insert(pricingAuditLog).values({
      userId: session.user.id,
      action: 'bulk_calculate',
      newData: {
        serviceCount: services.length,
        totalValue: results.reduce((sum, r) => sum + r.finalPrice, 0),
        calculations: calculations.map(c => c.calculationId),
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    // Calculate summary
    const summary = {
      totalServices: results.length,
      totalValue: results.reduce((sum, r) => sum + r.finalPrice, 0),
      totalHealthUnits: results.reduce((sum, r) => sum + r.healthUnits, 0),
      averageDiscount: results.reduce((sum, r) => sum + r.discountPercentage, 0) / results.length,
      currency: results[0]?.currency || 'LYD',
    };

    return NextResponse.json({
      results: calculations,
      summary,
    });

  } catch (error) {
    console.error("Bulk pricing calculation error:", error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: "Invalid input data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}