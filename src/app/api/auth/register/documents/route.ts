import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { document, registrationStep, company, companyType } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const documentUploadSchema = z.object({
  companyId: z.string(),
  documentType: z.enum(['license', 'certificate', 'id', 'bank_statement', 'insurance_policy', 'compliance_report']),
  fileName: z.string(),
  fileData: z.string(), // Base64 encoded file
  mimeType: z.string(),
  expiresAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, documentType, fileName, fileData, mimeType, expiresAt } = documentUploadSchema.parse(body);

    // Check if user has permission
    const companyRecord = await db
      .select()
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!companyRecord.length) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(fileData, 'base64');
    const fileSize = fileBuffer.length;

    // Validate file size (max 10MB)
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'documents', companyId);
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = fileName.split('.').pop() || 'file';
    const uniqueFileName = `${documentType}_${timestamp}.${extension}`;
    const filePath = join(uploadsDir, uniqueFileName);

    // Save file to disk
    await writeFile(filePath, fileBuffer);

    // Store document record in database
    const documentRecord = await db
      .insert(document)
      .values({
        companyId,
        userId: session.user.id,
        documentType,
        fileName: uniqueFileName,
        filePath: filePath,
        fileSize,
        mimeType,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      .returning({ id: document.id });

    // Check if all required documents are uploaded
    const requiredDocuments = await getRequiredDocuments(companyRecord[0].typeId);
    const uploadedDocuments = await db
      .select({ documentType: document.documentType })
      .from(document)
      .where(eq(document.companyId, companyId));

    const uploadedTypes = uploadedDocuments.map(doc => doc.documentType);
    const missingDocuments = requiredDocuments.filter(doc => !uploadedTypes.includes(doc));

    // If all required documents are uploaded, mark step as complete
    if (missingDocuments.length === 0) {
      await db.insert(registrationStep).values({
        companyId,
        stepName: 'documents',
        isCompleted: true,
        completedAt: new Date(),
        data: { uploadedDocuments: uploadedTypes },
      });
    }

    return NextResponse.json({
      success: true,
      documentId: documentRecord[0].id,
      fileName: uniqueFileName,
      missingDocuments,
    });

  } catch (error) {
    console.error("Document upload error:", error);
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
    const documents = await db
      .select({
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        isVerified: document.isVerified,
        expiresAt: document.expiresAt,
        createdAt: document.createdAt,
      })
      .from(document)
      .where(eq(document.companyId, companyId));

    return NextResponse.json({ documents });

  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getRequiredDocuments(typeId: string): Promise<string[]> {
  // This would be configurable based on company type and regulations
  // For now, return basic requirements
  const baseDocuments = ['id'];

  // Add type-specific requirements
  const typeRecord = await db
    .select({ name: companyType.name })
    .from(companyType)
    .where(eq(companyType.id, typeId))
    .limit(1);

  if (!typeRecord.length) return baseDocuments;

  const typeName = typeRecord[0].name;

  switch (typeName) {
    case 'healthcare_provider':
      return [...baseDocuments, 'license', 'certificate', 'insurance_policy'];
    case 'insurance_company':
      return [...baseDocuments, 'license', 'compliance_report', 'bank_statement'];
    case 'investor':
      return [...baseDocuments, 'bank_statement'];
    default:
      return baseDocuments;
  }
}