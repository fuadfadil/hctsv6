import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companyUser, user, role, userRole, auditLog } from "@/lib/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const addUserSchema = z.object({
  companyId: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'manager', 'employee']),
});

const updateUserRoleSchema = z.object({
  companyId: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'manager', 'employee']),
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

    // Check if user has permission to view company users
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

    const companyUsers = await db
      .select({
        id: companyUser.id,
        userId: companyUser.userId,
        role: companyUser.role,
        isPrimaryContact: companyUser.isPrimaryContact,
        isActive: companyUser.isActive,
        joinedAt: companyUser.joinedAt,
        leftAt: companyUser.leftAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        },
      })
      .from(companyUser)
      .innerJoin(user, eq(companyUser.userId, user.id))
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.isActive, true)
      ));

    return NextResponse.json({ users: companyUsers });

  } catch (error) {
    console.error("Error fetching company users:", error);
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
    const { companyId, userId, role } = addUserSchema.parse(body);

    // Check if current user has admin permissions
    const currentUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!currentUserRecord.length || currentUserRecord[0].role !== 'admin') {
      return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
    }

    // Check if user is already in the company
    const existingUser = await db
      .select()
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, userId)
      ))
      .limit(1);

    if (existingUser.length) {
      if (existingUser[0].isActive) {
        return NextResponse.json({ error: "User already in company" }, { status: 400 });
      } else {
        // Reactivate user
        await db
          .update(companyUser)
          .set({
            role,
            isActive: true,
            leftAt: null,
          })
          .where(eq(companyUser.id, existingUser[0].id));
      }
    } else {
      // Add new user
      await db.insert(companyUser).values({
        companyId,
        userId,
        role,
        isActive: true,
      });
    }

    // Log the action
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'create',
      entityType: 'company_user',
      entityId: `${companyId}:${userId}`,
      newValues: { role },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "User added to company successfully",
    });

  } catch (error) {
    console.error("Add user to company error:", error);
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
    const { companyId, userId, role } = updateUserRoleSchema.parse(body);

    // Check if current user has admin permissions
    const currentUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!currentUserRecord.length || currentUserRecord[0].role !== 'admin') {
      return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
    }

    // Get current role for audit logging
    const targetUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, userId),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!targetUserRecord.length) {
      return NextResponse.json({ error: "User not found in company" }, { status: 404 });
    }

    // Update user role
    await db
      .update(companyUser)
      .set({ role })
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, userId)
      ));

    // Log the change
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'update',
      entityType: 'company_user',
      entityId: `${companyId}:${userId}`,
      oldValues: { role: targetUserRecord[0].role },
      newValues: { role },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "User role updated successfully",
    });

  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const userId = searchParams.get('userId');

  if (!companyId || !userId) {
    return NextResponse.json({ error: "Company ID and User ID required" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user has admin permissions
    const currentUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!currentUserRecord.length || currentUserRecord[0].role !== 'admin') {
      return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
    }

    // Cannot remove yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself from company" }, { status: 400 });
    }

    // Soft delete user from company
    await db
      .update(companyUser)
      .set({
        isActive: false,
        leftAt: new Date(),
      })
      .where(and(
        eq(companyUser.companyId, companyId),
        eq(companyUser.userId, userId)
      ));

    // Log the action
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'delete',
      entityType: 'company_user',
      entityId: `${companyId}:${userId}`,
      oldValues: { isActive: true },
      newValues: { isActive: false },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "User removed from company successfully",
    });

  } catch (error) {
    console.error("Remove user from company error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}