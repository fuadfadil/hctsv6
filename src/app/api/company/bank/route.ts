import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankDetails, companyUser, auditLog } from "@/lib/schema";
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

    // Check if user has permission to view bank details
    const companyUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    // Only admins and managers can view bank details
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
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
        updatedAt: bankDetails.updatedAt,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const bankData = bankDetailsSchema.parse(body);

    // Check if user has permission to update bank details
    const companyUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, bankData.companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    // Only admins can update bank details
    if (companyUserRecord[0].role !== 'admin') {
      return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
    }

    // Get current bank details for audit logging
    const currentBankDetails = await db
      .select()
      .from(bankDetails)
      .where(eq(bankDetails.companyId, bankData.companyId))
      .limit(1);

    // Check if bank details already exist
    if (currentBankDetails.length) {
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

    // Log the change
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'update',
      entityType: 'bank_details',
      entityId: bankData.companyId,
      oldValues: currentBankDetails[0] || null,
      newValues: bankData,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "Bank details updated successfully",
    });

  } catch (error) {
    console.error("Bank details update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}