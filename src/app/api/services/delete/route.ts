import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, listing, companyUser, auditLog, orderItem } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const deleteServiceSchema = z.object({
  serviceId: z.string(),
  forceDelete: z.boolean().default(false), // Force delete even if there are active orders
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const forceDelete = searchParams.get('forceDelete') === 'true';

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID required" }, { status: 400 });
    }

    // Check if user has permission to delete services
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied. Only healthcare providers can delete services." }, { status: 403 });
    }

    // Only admins can delete services
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions. Only admins and managers can delete services." }, { status: 403 });
    }

    const { companyId } = companyUserRecord[0];

    // Check if service exists and belongs to the company
    const serviceRecord = await db
      .select({
        service: service,
        listing: listing,
      })
      .from(service)
      .leftJoin(listing, and(
        eq(listing.serviceId, service.id),
        eq(listing.companyId, companyId)
      ))
      .where(eq(service.id, serviceId))
      .limit(1);

    if (!serviceRecord.length) {
      return NextResponse.json({ error: "Service not found or access denied" }, { status: 404 });
    }

    // Check for active orders if not force deleting
    if (!forceDelete && serviceRecord[0].listing) {
      const activeOrders = await db
        .select()
        .from(orderItem)
        .where(eq(orderItem.listingId, serviceRecord[0].listing.id))
        .limit(1);

      if (activeOrders.length > 0) {
        return NextResponse.json({
          error: "Cannot delete service with active orders. Use forceDelete=true to override.",
          hasActiveOrders: true
        }, { status: 409 });
      }
    }

    // Get current values for audit logging
    const currentService = serviceRecord[0].service;
    const currentListing = serviceRecord[0].listing;

    // Soft delete: deactivate instead of hard delete
    await db
      .update(service)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(service.id, serviceId));

    // Deactivate listing if it exists
    if (currentListing) {
      await db
        .update(listing)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, currentListing.id));
    }

    // Log the deletion
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'delete',
      entityType: 'service',
      entityId: serviceId,
      oldValues: {
        service: currentService,
        listing: currentListing,
      },
      newValues: {
        service: { ...currentService, isActive: false },
        listing: currentListing ? { ...currentListing, isActive: false } : null,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "Service deactivated successfully",
      serviceId,
    });

  } catch (error) {
    console.error("Service deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}