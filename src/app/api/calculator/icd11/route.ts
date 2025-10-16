import { NextRequest, NextResponse } from "next/server";
import { ICD11API } from "@/lib/icd11";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const code = searchParams.get('code');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (code) {
      // Get specific ICD-11 category by code
      const category = await ICD11API.getCategoryByCode(code);
      if (!category) {
        return NextResponse.json({ error: "ICD-11 code not found" }, { status: 404 });
      }

      return NextResponse.json({
        category,
        complexityScore: ICD11API.getComplexityScore(code),
        serviceCategory: ICD11API.getServiceCategory(code),
      });
    }

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required for search" }, { status: 400 });
    }

    // Search ICD-11 codes
    const results = await ICD11API.searchCodes(query, limit);

    return NextResponse.json({
      results: results.map(result => ({
        ...result,
        complexityScore: ICD11API.getComplexityScore(result.code),
        serviceCategory: ICD11API.getServiceCategory(result.code),
      })),
      total: results.length,
    });

  } catch (error) {
    console.error("ICD-11 API error:", error);
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
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "ICD-11 code is required" }, { status: 400 });
    }

    // Validate ICD-11 code
    const isValid = await ICD11API.validateCode(code);

    return NextResponse.json({
      code,
      isValid,
      ...(isValid && {
        complexityScore: ICD11API.getComplexityScore(code),
        serviceCategory: ICD11API.getServiceCategory(code),
      }),
    });

  } catch (error) {
    console.error("ICD-11 validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}