import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { company, companyType, registrationStep, approvalWorkflow } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const companyRegistrationSchema = z.object({
  step: z.enum(['company_type', 'company_details', 'specific_form', 'user_details', 'bank_details', 'documents']),
  companyId: z.string().optional(),
  data: z.any(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, companyId, data } = companyRegistrationSchema.parse(body);

    let currentCompanyId = companyId;

    // Handle different registration steps
    switch (step) {
      case 'company_type':
        // Create initial company record with type
        const companyTypeRecord = await db
          .select()
          .from(companyType)
          .where(eq(companyType.name, data.type as string))
          .limit(1);

        if (!companyTypeRecord.length) {
          return NextResponse.json({ error: "Invalid company type" }, { status: 400 });
        }

        const newCompany = await db
          .insert(company)
          .values({
            name: (data.companyName as string) || 'Temporary Name',
            typeId: companyTypeRecord[0].id,
            registrationStatus: 'pending',
          })
          .returning({ id: company.id });

        currentCompanyId = newCompany[0].id;

        // Create initial registration step
        await db.insert(registrationStep).values({
          companyId: currentCompanyId,
          stepName: 'company_type',
          isCompleted: true,
          completedAt: new Date(),
          data,
        });

        // Initialize approval workflow for regulated entities
        if (['healthcare_provider', 'insurance_company'].includes(data.type as string)) {
          await db.insert(approvalWorkflow).values({
            companyId: currentCompanyId,
            currentStep: 'initial_review',
            status: 'pending',
          });
        }

        break;

      case 'company_details':
        if (!currentCompanyId) {
          return NextResponse.json({ error: "Company ID required" }, { status: 400 });
        }

        await db
          .update(company)
          .set({
            name: data.name as string,
            registrationNumber: data.registrationNumber as string,
            address: data.address as string,
            phone: data.phone as string,
            email: data.email as string,
            website: data.website as string,
          })
          .where(eq(company.id, currentCompanyId));

        await db.insert(registrationStep).values({
          companyId: currentCompanyId,
          stepName: 'company_details',
          isCompleted: true,
          completedAt: new Date(),
          data,
        });

        break;

      case 'specific_form':
        if (!currentCompanyId) {
          return NextResponse.json({ error: "Company ID required" }, { status: 400 });
        }

        // Get company type to determine specific fields
        const companyRecord = await db
          .select({ typeId: company.typeId })
          .from(company)
          .where(eq(company.id, currentCompanyId))
          .limit(1);

        if (!companyRecord.length) {
          return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        const typeRecord = await db
          .select({ name: companyType.name })
          .from(companyType)
          .where(eq(companyType.id, companyRecord[0].typeId))
          .limit(1);

        // Store type-specific data
        const specificData = {
          type: typeRecord[0].name,
          ...data,
        };

        await db
          .update(company)
          .set({ specificData })
          .where(eq(company.id, currentCompanyId));

        await db.insert(registrationStep).values({
          companyId: currentCompanyId,
          stepName: 'specific_form',
          isCompleted: true,
          completedAt: new Date(),
          data,
        });

        break;

      case 'user_details':
      case 'bank_details':
      case 'documents':
        // These will be handled by separate endpoints
        return NextResponse.json({ error: "Use dedicated endpoints for this step" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      companyId: currentCompanyId,
      step,
    });

  } catch (error) {
    console.error("Company registration error:", error);
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
    // Get company registration progress
    const steps = await db
      .select()
      .from(registrationStep)
      .where(eq(registrationStep.companyId, companyId));

    const companyRecord = await db
      .select()
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      company: companyRecord[0],
      steps: steps.map(step => ({
        stepName: step.stepName,
        isCompleted: step.isCompleted,
        completedAt: step.completedAt,
      })),
    });

  } catch (error) {
    console.error("Error fetching registration progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}