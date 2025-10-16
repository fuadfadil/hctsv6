import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { document, companyUser, auditLog, company, companyType } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

const documentUploadSchema = z.object({
  companyId: z.string(),
  documentType: z.enum(['license', 'certificate', 'id', 'bank_statement', 'insurance_policy', 'compliance_report', 'other']),
  fileName: z.string(),
  fileData: z.string(), // Base64 encoded file
  mimeType: z.string(),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
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

    // Check if user has permission to view company documents
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

    const documents = await db
      .select({
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        isVerified: document.isVerified,
        verifiedBy: document.verifiedBy,
        verifiedAt: document.verifiedAt,
        expiresAt: document.expiresAt,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      })
      .from(document)
      .where(eq(document.companyId, companyId))
      .orderBy(document.createdAt);

    return NextResponse.json({ documents });

  } catch (error) {
    console.error("Error fetching company documents:", error);
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
    const { companyId, documentType, fileName, fileData, mimeType, expiresAt, description } = documentUploadSchema.parse(body);

    // Check if user has permission to upload documents
    const companyUserRecord = await db
      .select({ role: companyUser.role })
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

    // Only admins and managers can upload sensitive documents
    if (['license', 'compliance_report'].includes(documentType) &&
        !['admin', 'manager'].includes(companyUserRecord[0].role)) {
      return NextResponse.json({ error: "Insufficient permissions for this document type" }, { status: 403 });
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

    // Log the upload
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'create',
      entityType: 'document',
      entityId: documentRecord[0].id,
      newValues: {
        documentType,
        fileName: uniqueFileName,
        fileSize,
        mimeType,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      documentId: documentRecord[0].id,
      fileName: uniqueFileName,
      message: "Document uploaded successfully",
    });

  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json({ error: "Document ID required" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get document details
    const documentRecord = await db
      .select({
        id: document.id,
        companyId: document.companyId,
        filePath: document.filePath,
        documentType: document.documentType,
      })
      .from(document)
      .where(eq(document.id, documentId))
      .limit(1);

    if (!documentRecord.length) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if user has permission to delete documents
    const companyUserRecord = await db
      .select({ role: companyUser.role })
      .from(companyUser)
      .where(and(
        eq(companyUser.companyId, documentRecord[0].companyId),
        eq(companyUser.userId, session.user.id),
        eq(companyUser.isActive, true)
      ))
      .limit(1);

    if (!companyUserRecord.length) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 });
    }

    // Only admins can delete sensitive documents
    if (['license', 'compliance_report'].includes(documentRecord[0].documentType) &&
        companyUserRecord[0].role !== 'admin') {
      return NextResponse.json({ error: "Admin permissions required to delete this document" }, { status: 403 });
    }

    // Delete file from disk
    try {
      await unlink(documentRecord[0].filePath);
    } catch (error) {
      console.warn("Failed to delete file from disk:", error);
    }

    // Delete document record from database
    await db
      .delete(document)
      .where(eq(document.id, documentId));

    // Log the deletion
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: 'delete',
      entityType: 'document',
      entityId: documentId,
      oldValues: {
        documentType: documentRecord[0].documentType,
        filePath: documentRecord[0].filePath,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });

  } catch (error) {
    console.error("Document deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}