import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { company, companyUser, auditLog, companyType } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const specialtyUpdateSchema = z.object({
  companyId: z.string(),
  specialties: z.array(z.string()),
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

    // Check if user has permission to view specialties
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

    // Get company type and specific data
    const companyRecord = await db
      .select({
        typeId: company.typeId,
        specificData: company.specificData,
      })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const specificData = companyRecord[0].specificData as any || {};
    const specialties = specificData.specialties || [];

    // Get available specialties based on company type
    const typeRecord = await db
      .select({ name: companyType.name })
      .from(companyType)
      .where(eq(companyType.id, companyRecord[0].typeId))
      .limit(1);

    let availableSpecialties: string[] = [];
    if (typeRecord.length) {
      switch (typeRecord[0].name) {
        case 'healthcare_provider':
          availableSpecialties = [
            'Cardiology', 'Dermatology', 'Emergency Medicine', 'Family Medicine',
            'Internal Medicine', 'Neurology', 'Obstetrics & Gynecology', 'Oncology',
            'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery',
            'Urology', 'Ophthalmology', 'Dentistry', 'Physical Therapy'
          ];
          break;
        case 'insurance_company':
          availableSpecialties = [
            'Health Insurance', 'Life Insurance', 'Property Insurance',
            'Casualty Insurance', 'Workers Compensation', 'Auto Insurance',
            'Home Insurance', 'Business Insurance', 'Travel Insurance'
          ];
          break;
        case 'investor':
          availableSpecialties = [
            'Venture Capital', 'Private Equity', 'Angel Investing',
            'Real Estate Investment', 'Healthcare Investment', 'Tech Investment',
            'Sustainable Investing', 'Impact Investing'
          ];
          break;
        default:
          availableSpecialties = [];
      }
    }

    return NextResponse.json({
      specialties,
      availableSpecialties,
      companyType: typeRecord[0]?.name || 'unknown',
    });

  } catch (error) {
    console.error("Error fetching company specialties:", error);
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
    const { companyId, specialties } = specialtyUpdateSchema.parse(body);

    // Check if user has permission to update specialties
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

    // Only admins and managers can update specialties
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get current company specific data
    const companyRecord = await db
      .select({ specificData: company.specificData })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const currentSpecificData = companyRecord[0].specificData as any || {};
    const oldSpecialties = currentSpecificData.specialties || [];

    const updatedSpecificData = {
      ...currentSpecificData,
      specialties,
    };

    // Update company specific data
    await db
      .update(company)
      .set({
        specificData: updatedSpecificData,
        updatedAt: new Date(),
      })
      .where(eq(company.id, companyId));

    // Log the change
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'update',
      entityType: 'specialties',
      entityId: companyId,
      oldValues: { specialties: oldSpecialties },
      newValues: { specialties },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "Specialties updated successfully",
    });

  } catch (error) {
    console.error("Specialties update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}