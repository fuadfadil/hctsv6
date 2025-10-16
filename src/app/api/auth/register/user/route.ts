import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, companyUser, registrationStep } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const userRegistrationSchema = z.object({
  companyId: z.string(),
  userData: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, userData } = userRegistrationSchema.parse(body);

    // Check if company exists and user has permission
    const companyRecord = await db
      .select()
      .from(companyUser)
      .where(eq(companyUser.companyId, companyId))
      .where(eq(companyUser.userId, session.user.id))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    // Create or update user
    let userId = session.user.id;

    // Update user details if provided
    if (userData.name || userData.phone || userData.address || userData.dateOfBirth) {
      await db
        .update(user)
        .set({
          name: userData.name,
          phone: userData.phone,
          address: userData.address,
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : undefined,
        })
        .where(eq(user.id, userId));
    }

    // Mark user as primary contact if not already set
    const existingPrimary = await db
      .select()
      .from(companyUser)
      .where(eq(companyUser.companyId, companyId))
      .where(eq(companyUser.isPrimaryContact, true))
      .limit(1);

    if (!existingPrimary.length) {
      await db
        .update(companyUser)
        .set({ isPrimaryContact: true })
        .where(eq(companyUser.companyId, companyId))
        .where(eq(companyUser.userId, userId))
        .limit(1);
    }

    // Record registration step completion
    await db.insert(registrationStep).values({
      companyId,
      stepName: 'user_details',
      isCompleted: true,
      completedAt: new Date(),
      data: userData,
    });

    return NextResponse.json({
      success: true,
      userId,
      companyId,
    });

  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}