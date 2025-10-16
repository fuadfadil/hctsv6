import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { company, companyUser, companyType, role, userRole, approvalWorkflow, registrationStep } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const completeRegistrationSchema = z.object({
  companyId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId } = completeRegistrationSchema.parse(body);

    // Check if user has permission to complete registration
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

    // Check if all required steps are completed
    const requiredSteps = ['company_type', 'company_details', 'specific_form', 'user_details', 'bank_details', 'documents'];
    const completedSteps = await db
      .select({ stepName: registrationStep.stepName })
      .from(registrationStep)
      .where(and(
        eq(registrationStep.companyId, companyId),
        eq(registrationStep.isCompleted, true)
      ));

    const completedStepNames = completedSteps.map(step => step.stepName);
    const missingSteps = requiredSteps.filter(step => !completedStepNames.includes(step));

    if (missingSteps.length > 0) {
      return NextResponse.json({
        error: "Missing required steps",
        missingSteps
      }, { status: 400 });
    }

    // Get company type to determine roles
    const companyRecord = await db
      .select({ typeId: company.typeId, specificData: company.specificData })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Assign appropriate roles based on company type
    const rolesToAssign = await getRolesForCompanyType(companyRecord[0].typeId);

    for (const roleName of rolesToAssign) {
      const roleRecord = await db
        .select()
        .from(role)
        .where(eq(role.name, roleName))
        .limit(1);

      if (roleRecord.length) {
        // Check if user already has this role
        const existingRole = await db
          .select()
          .from(userRole)
          .where(and(
            eq(userRole.userId, session.user.id),
            eq(userRole.roleId, roleRecord[0].id)
          ))
          .limit(1);

        if (!existingRole.length) {
          await db.insert(userRole).values({
            userId: session.user.id,
            roleId: roleRecord[0].id,
            assignedBy: session.user.id,
          });
        }
      }
    }

    // Update company registration status
    let newStatus = 'approved';

    // For regulated entities, set to under_review
    const specificData = companyRecord[0].specificData as any;
    if (specificData?.type === 'healthcare_provider' || specificData?.type === 'insurance_company') {
      newStatus = 'under_review';

      // Update approval workflow
      await db
        .update(approvalWorkflow)
        .set({
          currentStep: 'compliance_check',
          status: 'pending',
          assignedTo: null, // Assign to compliance team
        })
        .where(eq(approvalWorkflow.companyId, companyId));
    }

    await db
      .update(company)
      .set({
        registrationStatus: newStatus,
      })
      .where(eq(company.id, companyId));

    // Record completion step
    await db.insert(registrationStep).values({
      companyId,
      stepName: 'complete',
      isCompleted: true,
      completedAt: new Date(),
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      companyId,
      status: newStatus,
      message: newStatus === 'approved'
        ? 'Registration completed successfully'
        : 'Registration submitted for review',
    });

  } catch (error) {
    console.error("Complete registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getRolesForCompanyType(typeId: string): Promise<string[]> {
  // This would be configurable, but for now we'll hardcode based on common patterns
  const typeRecord = await db
    .select({ name: companyType.name })
    .from(companyType)
    .where(eq(companyType.id, typeId))
    .limit(1);

  if (!typeRecord.length) return ['company_user'];

  const typeName = typeRecord[0].name;

  switch (typeName) {
    case 'healthcare_provider':
      return ['healthcare_provider', 'company_admin'];
    case 'insurance_company':
      return ['insurance_provider', 'company_admin'];
    case 'investor':
      return ['investor', 'company_admin'];
    default:
      return ['company_user'];
  }
}