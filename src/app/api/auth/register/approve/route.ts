import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { company, approvalWorkflow, userRole, role, user } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sendCompanyRegistrationNotification, sendApprovalRequiredNotification } from "@/lib/email";

const approvalSchema = z.object({
  companyId: z.string(),
  action: z.enum(['approve', 'reject', 'request_changes']),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has approval permissions
    const userRoles = await db
      .select({ roleName: role.name })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, session.user.id));

    const hasApprovalPermission = userRoles.some(role =>
      ['admin', 'compliance_officer', 'regulatory_approver'].includes(role.roleName)
    );

    if (!hasApprovalPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { companyId, action, notes } = approvalSchema.parse(body);

    // Get current approval workflow
    const workflow = await db
      .select()
      .from(approvalWorkflow)
      .where(eq(approvalWorkflow.companyId, companyId))
      .limit(1);

    if (!workflow.length) {
      return NextResponse.json({ error: "No approval workflow found" }, { status: 404 });
    }

    // Get company details
    const companyRecord = await db
      .select()
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyData = companyRecord[0];

    // Update approval workflow
    let newStatus: string;
    let newStep: string;

    switch (action) {
      case 'approve':
        if (workflow[0].currentStep === 'initial_review') {
          newStep = 'compliance_check';
          newStatus = 'pending';
        } else if (workflow[0].currentStep === 'compliance_check') {
          newStep = 'management_approval';
          newStatus = 'pending';
        } else if (workflow[0].currentStep === 'management_approval') {
          newStep = 'final_approval';
          newStatus = 'approved';

          // Update company status
          await db
            .update(company)
            .set({ registrationStatus: 'approved' })
            .where(eq(company.id, companyId));

          // Send approval notification
          await sendCompanyRegistrationNotification(
            companyData.email || '',
            companyData.name,
            'approved'
          );
        } else {
          newStep = workflow[0].currentStep;
          newStatus = 'approved';
        }
        break;

      case 'reject':
        newStep = workflow[0].currentStep;
        newStatus = 'rejected';

        // Update company status
        await db
          .update(company)
          .set({ registrationStatus: 'rejected' })
          .where(eq(company.id, companyId));

        // Send rejection notification
        await sendCompanyRegistrationNotification(
          companyData.email || '',
          companyData.name,
          'rejected'
        );
        break;

      case 'request_changes':
        newStep = workflow[0].currentStep;
        newStatus = 'requires_changes';
        break;
    }

    // Update workflow
    await db
      .update(approvalWorkflow)
      .set({
        currentStep: newStep,
        status: newStatus,
        reviewedAt: new Date(),
        notes,
      })
      .where(eq(approvalWorkflow.companyId, companyId));

    // If approved and more steps needed, notify next approver
    if (action === 'approve' && newStatus === 'pending') {
      // Find next approver based on step
      const nextApproverEmail = await getNextApproverEmail(newStep);
      if (nextApproverEmail) {
        await sendApprovalRequiredNotification(
          nextApproverEmail,
          companyData.name,
          companyId
        );
      }
    }

    return NextResponse.json({
      success: true,
      action,
      newStatus,
      newStep,
    });

  } catch (error) {
    console.error("Approval action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getNextApproverEmail(step: string): Promise<string | null> {
  // This would be configurable - for now return admin email
  // In production, you'd have role-based approver assignments
  const adminUsers = await db
    .select({ email: user.email })
    .from(user)
    .innerJoin(userRole, eq(user.id, userRole.userId))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(role.name, 'admin'))
    .limit(1);

  return adminUsers.length ? adminUsers[0].email : null;
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

    // Check permissions
    const userRoles = await db
      .select({ roleName: role.name })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, session.user.id));

    const hasApprovalPermission = userRoles.some(role =>
      ['admin', 'compliance_officer', 'regulatory_approver'].includes(role.roleName)
    );

    if (!hasApprovalPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const workflow = await db
      .select({
        id: approvalWorkflow.id,
        currentStep: approvalWorkflow.currentStep,
        status: approvalWorkflow.status,
        assignedTo: approvalWorkflow.assignedTo,
        notes: approvalWorkflow.notes,
        reviewedAt: approvalWorkflow.reviewedAt,
        createdAt: approvalWorkflow.createdAt,
      })
      .from(approvalWorkflow)
      .where(eq(approvalWorkflow.companyId, companyId))
      .limit(1);

    if (!workflow.length) {
      return NextResponse.json({ workflow: null });
    }

    return NextResponse.json({ workflow: workflow[0] });

  } catch (error) {
    console.error("Error fetching approval workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}