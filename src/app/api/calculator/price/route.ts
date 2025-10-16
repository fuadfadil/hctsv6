import { NextRequest, NextResponse } from "next/server";
import { PricingCalculator, PricingInputSchema } from "@/lib/pricing-calculator";
import { db } from "@/lib/db";
import { pricingCalculation, pricingAuditLog } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedInput = PricingInputSchema.parse(body);

    // Calculate pricing
    const result = await PricingCalculator.calculatePricing(validatedInput);

    // Store calculation in database
    const [calculation] = await db
      .insert(pricingCalculation)
      .values({
        userId: session.user.id,
        serviceId: null, // Will be set if service exists
        icd11Code: validatedInput.icd11Code,
        serviceName: validatedInput.serviceName,
        serviceDescription: validatedInput.serviceDescription,
        basePrice: result.basePrice.toString(),
        quantity: validatedInput.quantity,
        currency: result.currency,
        healthUnits: result.healthUnits.toString(),
        aiSuggestedPrice: result.aiSuggestedPrice.toString(),
        marketAveragePrice: result.marketAveragePrice.toString(),
        complexityScore: result.complexityScore.toString(),
        discountPercentage: result.discountPercentage.toString(),
        finalPrice: result.finalPrice.toString(),
        calculationData: {
          input: validatedInput,
          result,
          timestamp: new Date().toISOString(),
        },
      })
      .returning({ id: pricingCalculation.id });

    // Log audit event
    await db.insert(pricingAuditLog).values({
      calculationId: calculation.id,
      userId: session.user.id,
      action: 'calculate',
      newData: {
        input: validatedInput,
        result,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      ...result,
      calculationId: calculation.id,
    });

  } catch (error) {
    console.error("Pricing calculation error:", error);

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const calculationId = searchParams.get('id');

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!calculationId) {
      return NextResponse.json({ error: "Calculation ID is required" }, { status: 400 });
    }

    // Get calculation from database
    const calculation = await db
      .select()
      .from(pricingCalculation)
      .where(eq(pricingCalculation.id, calculationId))
      .limit(1);

    if (!calculation.length) {
      return NextResponse.json({ error: "Calculation not found" }, { status: 404 });
    }

    const calc = calculation[0];

    // Check if user owns this calculation
    if (calc.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      id: calc.id,
      serviceName: calc.serviceName,
      serviceDescription: calc.serviceDescription,
      icd11Code: calc.icd11Code,
      basePrice: calc.basePrice ? parseFloat(calc.basePrice) : 0,
      quantity: calc.quantity,
      currency: calc.currency,
      healthUnits: calc.healthUnits ? parseFloat(calc.healthUnits) : 0,
      aiSuggestedPrice: calc.aiSuggestedPrice ? parseFloat(calc.aiSuggestedPrice) : 0,
      marketAveragePrice: calc.marketAveragePrice ? parseFloat(calc.marketAveragePrice) : 0,
      complexityScore: calc.complexityScore ? parseFloat(calc.complexityScore) : 0,
      discountPercentage: calc.discountPercentage ? parseFloat(calc.discountPercentage) : 0,
      finalPrice: calc.finalPrice ? parseFloat(calc.finalPrice) : 0,
      calculationData: calc.calculationData,
      createdAt: calc.createdAt,
    });

  } catch (error) {
    console.error("Error fetching calculation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}