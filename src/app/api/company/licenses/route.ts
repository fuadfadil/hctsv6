import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { document, companyUser, auditLog, company, companyType } from "@/lib/schema";
import { eq, and, lte } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const licenseUpdateSchema = z.object({
  companyId: z.string(),
  licenseNumber: z.string(),
  issuingAuthority: z.string(),
  issueDate: z.string(),
  expiryDate: z.string(),
  licenseType: z.string(),
  status: z.enum(['active', 'expired', 'suspended', 'revoked']).default('active'),
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

    // Check if user has permission to view licenses
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

    // Get company type to determine license requirements
    const companyRecord = await db
      .select({ typeId: company.typeId })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get licenses from documents table
    const licenses = await db
      .select({
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        isVerified: document.isVerified,
        expiresAt: document.expiresAt,
        createdAt: document.createdAt,
        specificData: company.specificData,
      })
      .from(document)
      .innerJoin(company, eq(document.companyId, company.id))
      .where(and(
        eq(document.companyId, companyId),
        eq(document.documentType, 'license')
      ));

    // Parse license data from specificData or document metadata
    const licenseData = licenses.map(license => {
      const specificData = license.specificData as any;
      return {
        id: license.id,
        licenseNumber: specificData?.licenses?.[0]?.licenseNumber || 'N/A',
        issuingAuthority: specificData?.licenses?.[0]?.issuingAuthority || 'N/A',
        issueDate: specificData?.licenses?.[0]?.issueDate || null,
        expiryDate: license.expiresAt,
        licenseType: specificData?.licenses?.[0]?.licenseType || 'General',
        status: license.isVerified ? 'active' : 'pending',
        isVerified: license.isVerified,
        fileName: license.fileName,
      };
    });

    // Check for expiring licenses (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLicenses = licenseData.filter(license =>
      license.expiryDate && new Date(license.expiryDate) <= thirtyDaysFromNow
    );

    return NextResponse.json({
      licenses: licenseData,
      expiringLicenses,
    });

  } catch (error) {
    console.error("Error fetching company licenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const licenseData = licenseUpdateSchema.parse(body);

    // Check if user has permission to update licenses
    const companyUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, licenseData.companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    // Only admins and managers can update licenses
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get current company specific data
    const companyRecord = await db
      .select({ specificData: company.specificData })
      .from(company)
      .where(eq(company.id, licenseData.companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const currentSpecificData = companyRecord[0].specificData as any || {};
    const currentLicenses = currentSpecificData.licenses || [];

    // Add new license to specific data
    const updatedLicenses = [...currentLicenses, {
      ...licenseData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }];

    const updatedSpecificData = {
      ...currentSpecificData,
      licenses: updatedLicenses,
    };

    // Update company specific data
    await db
      .update(company)
      .set({
        specificData: updatedSpecificData,
        updatedAt: new Date(),
      })
      .where(eq(company.id, licenseData.companyId));

    // Log the change
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'create',
      entityType: 'license',
      entityId: `${licenseData.companyId}:${licenseData.licenseNumber}`,
      newValues: licenseData,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    // Check if license expires soon and send notification
    const expiryDate = new Date(licenseData.expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiryDate <= thirtyDaysFromNow) {
      // Send email notification (implementation depends on email service)
      try {
        await sendVerificationEmail(
          session.user.email,
          'License Expiring Soon',
          `
            <h2>License Expiration Notice</h2>
            <p>Your license ${licenseData.licenseNumber} is expiring on ${expiryDate.toDateString()}.</p>
            <p>Please renew your license to maintain compliance.</p>
          `
        );
      } catch (emailError) {
        console.error("Failed to send license expiry notification:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "License added successfully",
    });

  } catch (error) {
    console.error("License update error:", error);
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
    const { companyId, licenseId, ...licenseData } = body;

    if (!companyId || !licenseId) {
      return NextResponse.json({ error: "Company ID and License ID required" }, { status: 400 });
    }

    // Check if user has permission to update licenses
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

    // Only admins and managers can update licenses
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
    const currentLicenses = currentSpecificData.licenses || [];

    // Find and update the license
    const licenseIndex = currentLicenses.findIndex((license: any) => license.id === licenseId);
    if (licenseIndex === -1) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const oldLicense = currentLicenses[licenseIndex];
    const updatedLicense = { ...oldLicense, ...licenseData };

    currentLicenses[licenseIndex] = updatedLicense;

    const updatedSpecificData = {
      ...currentSpecificData,
      licenses: currentLicenses,
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
      entityType: 'license',
      entityId: `${companyId}:${licenseId}`,
      oldValues: oldLicense,
      newValues: updatedLicense,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "License updated successfully",
    });

  } catch (error) {
    console.error("License update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}