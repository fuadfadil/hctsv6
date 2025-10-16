import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { icd11Category, service, listing } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await db
      .select({
        id: icd11Category.id,
        code: icd11Category.code,
        title: icd11Category.title,
        description: icd11Category.description,
        parentId: icd11Category.parentId,
        serviceCount: sql<number>`count(distinct ${service.id})`,
        listingCount: sql<number>`count(distinct ${listing.id})`,
      })
      .from(icd11Category)
      .leftJoin(service, and(
        eq(service.icd11CategoryId, icd11Category.id),
        eq(service.isActive, true)
      ))
      .leftJoin(listing, and(
        eq(listing.serviceId, service.id),
        eq(listing.isActive, true)
      ))
      .where(eq(icd11Category.isActive, true))
      .groupBy(icd11Category.id)
      .orderBy(icd11Category.code);

    // Build hierarchical structure
    const categoryMap = new Map<string, { id: string; code: string; title: string; description?: string; serviceCount: number; listingCount: number; children: any[] }>();
    const rootCategories: { id: string; code: string; title: string; description?: string; serviceCount: number; listingCount: number; children: any[] }[] = [];

    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, description: category.description || undefined, children: [] });
    });

    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          const child = categoryMap.get(category.id);
          if (child) {
            parent.children.push(child);
          }
        }
      } else {
        const root = categoryMap.get(category.id);
        if (root) {
          rootCategories.push(root);
        }
      }
    });

    return NextResponse.json({ categories: rootCategories });

  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}