import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { service, listing, companyUser, auditLog } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";

const bulkUpdateSchema = z.object({
  serviceIds: z.array(z.string()).min(1),
  action: z.enum(['activate', 'deactivate', 'delete', 'update_price', 'update_quantity']),
  data: z.any().optional(), // Additional data for specific actions
});

const bulkPriceUpdateSchema = z.object({
  priceAdjustment: z.enum(['fixed', 'percentage']),
  value: z.number(),
  currency: z.string().optional(),
});

const bulkQuantityUpdateSchema = z.object({
  quantityAdjustment: z.enum(['set', 'add', 'subtract']),
  value: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceIds, action, data } = bulkUpdateSchema.parse(body);

    // Check if user has permission to perform bulk operations
    const companyUserRecord = await db
      .select({ companyId: companyUser.companyId, role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied. Only healthcare providers can perform bulk operations." }, { status: 403 });
    }

    // Only admins and managers can perform bulk operations
    if (!['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions. Only admins and managers can perform bulk operations." }, { status: 403 });
    }

    const { companyId } = companyUserRecord[0];

    // Verify all services belong to the user's company
    const servicesCheck = await db
      .select({ id: service.id })
      .from(service)
      .innerJoin(listing, eq(listing.serviceId, service.id))
      .where(and(
        eq(listing.companyId, companyId),
        inArray(service.id, serviceIds)
      ));

    if (servicesCheck.length !== serviceIds.length) {
      return NextResponse.json({ error: "Some services not found or access denied" }, { status: 404 });
    }

    const results = [];
    const errors = [];

    switch (action) {
      case 'activate':
      case 'deactivate':
        const isActive = action === 'activate';
        for (const serviceId of serviceIds) {
          try {
            // Get current values for audit
            const currentService = await db
              .select()
              .from(service)
              .where(eq(service.id, serviceId))
              .limit(1);

            // Update service
            await db
              .update(service)
              .set({
                isActive,
                updatedAt: new Date(),
              })
              .where(eq(service.id, serviceId));

            // Update listing
            await db
              .update(listing)
              .set({
                isActive,
                updatedAt: new Date(),
              })
              .where(and(
                eq(listing.serviceId, serviceId),
                eq(listing.companyId, companyId)
              ));

            // Log the change
            await db.insert(auditLog).values({
              userId: session.user.id,
              action: `bulk_${action}`,
              entityType: 'service',
              entityId: serviceId,
              oldValues: currentService[0],
              newValues: { ...currentService[0], isActive },
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              userAgent: request.headers.get('user-agent'),
            });

            results.push({ serviceId, status: 'success', action });
          } catch (error) {
            console.error(`Error ${action} service ${serviceId}:`, error);
            errors.push({ serviceId, error: `Failed to ${action} service` });
          }
        }
        break;

      case 'delete':
        for (const serviceId of serviceIds) {
          try {
            // Get current values for audit
            const currentService = await db
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

            // Soft delete: deactivate instead of hard delete
            await db
              .update(service)
              .set({
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(service.id, serviceId));

            if (currentService[0].listing) {
              await db
                .update(listing)
                .set({
                  isActive: false,
                  updatedAt: new Date(),
                })
                .where(eq(listing.id, currentService[0].listing.id));
            }

            // Log the deletion
            await db.insert(auditLog).values({
              userId: session.user.id,
              action: 'bulk_delete',
              entityType: 'service',
              entityId: serviceId,
              oldValues: currentService[0],
              newValues: {
                service: { ...currentService[0].service, isActive: false },
                listing: currentService[0].listing ? { ...currentService[0].listing, isActive: false } : null,
              },
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              userAgent: request.headers.get('user-agent'),
            });

            results.push({ serviceId, status: 'success', action: 'delete' });
          } catch (error) {
            console.error(`Error deleting service ${serviceId}:`, error);
            errors.push({ serviceId, error: 'Failed to delete service' });
          }
        }
        break;

      case 'update_price':
        const priceData = bulkPriceUpdateSchema.parse(data);
        for (const serviceId of serviceIds) {
          try {
            // Get current listing
            const currentListing = await db
              .select()
              .from(listing)
              .where(and(
                eq(listing.serviceId, serviceId),
                eq(listing.companyId, companyId)
              ))
              .limit(1);

            if (!currentListing.length) continue;

            const currentPrice = parseFloat(currentListing[0].pricePerUnit);
            let newPrice: number;

            if (priceData.priceAdjustment === 'fixed') {
              newPrice = priceData.value;
            } else {
              newPrice = currentPrice * (1 + priceData.value / 100);
            }

            // Update listing
            await db
              .update(listing)
              .set({
                pricePerUnit: newPrice.toString(),
                currency: priceData.currency || currentListing[0].currency,
                updatedAt: new Date(),
              })
              .where(eq(listing.id, currentListing[0].id));

            // Log the change
            await db.insert(auditLog).values({
              userId: session.user.id,
              action: 'bulk_update_price',
              entityType: 'service',
              entityId: serviceId,
              oldValues: currentListing[0],
              newValues: { ...currentListing[0], pricePerUnit: newPrice.toString() },
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              userAgent: request.headers.get('user-agent'),
            });

            results.push({ serviceId, status: 'success', action: 'update_price', newPrice });
          } catch (error) {
            console.error(`Error updating price for service ${serviceId}:`, error);
            errors.push({ serviceId, error: 'Failed to update price' });
          }
        }
        break;

      case 'update_quantity':
        const quantityData = bulkQuantityUpdateSchema.parse(data);
        for (const serviceId of serviceIds) {
          try {
            // Get current listing
            const currentListing = await db
              .select()
              .from(listing)
              .where(and(
                eq(listing.serviceId, serviceId),
                eq(listing.companyId, companyId)
              ))
              .limit(1);

            if (!currentListing.length) continue;

            const currentQuantity = currentListing[0].quantity;
            let newQuantity: number;

            switch (quantityData.quantityAdjustment) {
              case 'set':
                newQuantity = quantityData.value;
                break;
              case 'add':
                newQuantity = currentQuantity + quantityData.value;
                break;
              case 'subtract':
                newQuantity = Math.max(0, currentQuantity - quantityData.value);
                break;
            }

            // Update listing
            await db
              .update(listing)
              .set({
                quantity: newQuantity,
                updatedAt: new Date(),
              })
              .where(eq(listing.id, currentListing[0].id));

            // Log the change
            await db.insert(auditLog).values({
              userId: session.user.id,
              action: 'bulk_update_quantity',
              entityType: 'service',
              entityId: serviceId,
              oldValues: currentListing[0],
              newValues: { ...currentListing[0], quantity: newQuantity },
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              userAgent: request.headers.get('user-agent'),
            });

            results.push({ serviceId, status: 'success', action: 'update_quantity', newQuantity });
          } catch (error) {
            console.error(`Error updating quantity for service ${serviceId}:`, error);
            errors.push({ serviceId, error: 'Failed to update quantity' });
          }
        }
        break;
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: serviceIds.length,
        successful: results.length,
        failed: errors.length,
      },
    });

  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}