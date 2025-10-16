import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankDetails, registrationStep, companyUser } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const bankDetailsSchema = z.object({
  companyId: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  accountHolderName: z.string(),
  currency: z.string().default("USD"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const bankData = bankDetailsSchema.parse(body);

    // Check if user has permission
    const companyUserRecord = await db
      .select()
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, bankData.companyId),
        eq(companyUser.userId, session.user.id)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    // Check if bank details already exist
    const existingBankDetails = await db
      .select()
      .from(bankDetails)
      .where(eq(bankDetails.companyId, bankData.companyId))
      .limit(1);

    if (existingBankDetails.length) {
      // Update existing
      await db
        .update(bankDetails)
        .set({
          ...bankData,
          isVerified: false, // Reset verification status
          updatedAt: new Date(),
        })
        .where(eq(bankDetails.companyId, bankData.companyId));
    } else {
      // Create new
      await db.insert(bankDetails).values({
        ...bankData,
        isVerified: false,
      });
    }

    // Record registration step completion
    await db.insert(registrationStep).values({
      companyId: bankData.companyId,
      stepName: 'bank_details',
      isCompleted: true,
      completedAt: new Date(),
      data: bankData,
    });

    return NextResponse.json({
      success: true,
      message: "Bank details saved successfully",
    });

  } catch (error) {
    console.error("Bank details save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: "Company ID required" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission
    const companyUserRecord = await db
      .select()
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, session.user.id)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    const bankDetailsRecord = await db
      .select({
        id: bankDetails.id,
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        routingNumber: bankDetails.routingNumber,
        swiftCode: bankDetails.swiftCode,
        accountHolderName: bankDetails.accountHolderName,
        currency: bankDetails.currency,
        isVerified: bankDetails.isVerified,
        createdAt: bankDetails.createdAt,
      })
      .from(bankDetails)
      .where(eq(bankDetails.companyId, companyId))
      .limit(1);

    if (!bankDetailsRecord.length) {
      return NextResponse.json({ bankDetails: null });
    }

    return NextResponse.json({ bankDetails: bankDetailsRecord[0] });

  } catch (error) {
    console.error("Error fetching bank details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}