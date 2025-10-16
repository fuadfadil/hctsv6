import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { company, companyType, companyUser, auditLog } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const profileUpdateSchema = z.object({
  companyId: z.string(),
  name: z.string().optional(),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  specificData: z.any().optional(),
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

    // Check if user has permission to view this company
    const companyUserRecord = await db
      .select()
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

    const companyRecord = await db
      .select({
        id: company.id,
        name: company.name,
        typeId: company.typeId,
        registrationNumber: company.registrationNumber,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        registrationStatus: company.registrationStatus,
        specificData: company.specificData,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const typeRecord = await db
      .select({ name: companyType.name, description: companyType.description })
      .from(companyType)
      .where(eq(companyType.id, companyRecord[0].typeId))
      .limit(1);

    return NextResponse.json({
      company: {
        ...companyRecord[0],
        type: typeRecord[0] || null,
      },
    });

  } catch (error) {
    console.error("Error fetching company profile:", error);
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
    const { companyId, ...updateData } = profileUpdateSchema.parse(body);

    // Check if user has permission to edit this company
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

    // Only admins and managers can edit company profile
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get current company data for audit logging
    const currentCompany = await db
      .select()
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!currentCompany.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Update company profile
    await db
      .update(company)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(company.id, companyId));

    // Log the change
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'update',
      entityType: 'company',
      entityId: companyId,
      oldValues: currentCompany[0],
      newValues: updateData,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "Company profile updated successfully",
    });

  } catch (error) {
    console.error("Company profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}