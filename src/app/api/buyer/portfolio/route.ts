import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { investorPortfolio, portfolioHolding, service, company, companyType, companyUser } from '@/lib/schema';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createPortfolioSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

const addHoldingSchema = z.object({
  portfolioId: z.string(),
  serviceId: z.string(),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user is an investor
    const userCompany = await db
      .select({
        companyType: companyType.name
      })
      .from(company)
      .innerJoin(companyType, eq(company.typeId, companyType.id))
      .innerJoin(companyUser, and(
        eq(companyUser.companyId, company.id),
        eq(companyUser.userId, userId)
      ))
      .limit(1);

    if (userCompany[0]?.companyType !== 'investor') {
      return NextResponse.json({ error: 'Access denied - investor only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('id');

    if (portfolioId) {
      // Get specific portfolio with holdings
      const portfolio = await db
        .select({
          id: investorPortfolio.id,
          name: investorPortfolio.name,
          description: investorPortfolio.description,
          totalValue: investorPortfolio.totalValue,
          currency: investorPortfolio.currency,
          createdAt: investorPortfolio.createdAt
        })
        .from(investorPortfolio)
        .where(and(
          eq(investorPortfolio.id, portfolioId),
          eq(investorPortfolio.userId, userId),
          eq(investorPortfolio.isActive, true)
        ))
        .limit(1);

      if (!portfolio.length) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }

      // Get holdings
      const holdings = await db
        .select({
          id: portfolioHolding.id,
          serviceId: portfolioHolding.serviceId,
          serviceName: service.name,
          quantity: portfolioHolding.quantity,
          purchasePrice: portfolioHolding.purchasePrice,
          currentValue: portfolioHolding.currentValue,
          purchaseDate: portfolioHolding.purchaseDate,
          lastUpdated: portfolioHolding.lastUpdated,
          companyName: company.name
        })
        .from(portfolioHolding)
        .innerJoin(service, eq(portfolioHolding.serviceId, service.id))
        .innerJoin(company, eq(service.id, company.id)) // Assuming service has companyId, adjust if needed
        .where(eq(portfolioHolding.portfolioId, portfolioId))
        .orderBy(desc(portfolioHolding.purchaseDate));

      return NextResponse.json({
        portfolio: portfolio[0],
        holdings
      });
    }

    // Get all portfolios
    const portfolios = await db
      .select({
        id: investorPortfolio.id,
        name: investorPortfolio.name,
        description: investorPortfolio.description,
        totalValue: investorPortfolio.totalValue,
        currency: investorPortfolio.currency,
        createdAt: investorPortfolio.createdAt,
        holdingCount: sql<number>`count(${portfolioHolding.id})`
      })
      .from(investorPortfolio)
      .leftJoin(portfolioHolding, eq(investorPortfolio.id, portfolioHolding.portfolioId))
      .where(and(
        eq(investorPortfolio.userId, userId),
        eq(investorPortfolio.isActive, true)
      ))
      .groupBy(investorPortfolio.id)
      .orderBy(desc(investorPortfolio.createdAt));

    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error('Buyer portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, description } = createPortfolioSchema.parse(body);

    // Check if user is an investor
    const userCompany = await db
      .select({
        companyType: companyType.name
      })
      .from(company)
      .innerJoin(companyType, eq(company.typeId, companyType.id))
      .innerJoin(companyUser, and(
        eq(companyUser.companyId, company.id),
        eq(companyUser.userId, userId)
      ))
      .limit(1);

    if (userCompany[0]?.companyType !== 'investor') {
      return NextResponse.json({ error: 'Access denied - investor only' }, { status: 403 });
    }

    // Create portfolio
    const newPortfolio = await db
      .insert(investorPortfolio)
      .values({
        userId,
        name,
        description,
      })
      .returning();

    return NextResponse.json({
      success: true,
      portfolio: newPortfolio[0]
    });
  } catch (error) {
    console.error('Create portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { portfolioId, serviceId, quantity, purchasePrice } = addHoldingSchema.parse(body);

    // Verify portfolio ownership
    const portfolio = await db
      .select()
      .from(investorPortfolio)
      .where(and(
        eq(investorPortfolio.id, portfolioId),
        eq(investorPortfolio.userId, userId),
        eq(investorPortfolio.isActive, true)
      ))
      .limit(1);

    if (!portfolio.length) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Add holding
    const newHolding = await db
      .insert(portfolioHolding)
      .values({
        portfolioId,
        serviceId,
        quantity,
        purchasePrice,
        currentValue: purchasePrice, // Initial value
      })
      .returning();

    // Update portfolio total value
    await updatePortfolioValue(portfolioId);

    return NextResponse.json({
      success: true,
      holding: newHolding[0]
    });
  } catch (error) {
    console.error('Add holding error:', error);
    return NextResponse.json(
      { error: 'Failed to add holding' },
      { status: 500 }
    );
  }
}

async function updatePortfolioValue(portfolioId: string) {
  const totalValue = await db
    .select({
      total: sql<number>`sum(${portfolioHolding.currentValue} * ${portfolioHolding.quantity})`
    })
    .from(portfolioHolding)
    .where(eq(portfolioHolding.portfolioId, portfolioId));

  await db
    .update(investorPortfolio)
    .set({
      totalValue: (totalValue[0]?.total || 0).toString(),
      updatedAt: new Date()
    })
    .where(eq(investorPortfolio.id, portfolioId));
}