import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, sql, count, sum } from 'drizzle-orm';
import {
  complianceRecord,
  fraudAlert,
  paymentCompliance,
  auditLog,
  document,
  company,
  user,
  payment,
  order
} from '@/lib/schema';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const regulationType = searchParams.get('regulationType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = undefined;
    if (startDate && endDate) {
      dateFilter = and(
        gte(complianceRecord.createdAt, new Date(startDate)),
        lte(complianceRecord.createdAt, new Date(endDate))
      );
    }

    // Overall Compliance Status
    const complianceOverview = await db
      .select({
        totalRecords: count(complianceRecord.id),
        compliantRecords: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)`,
        nonCompliantRecords: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'non_compliant' then 1 end)`,
        pendingReviews: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'pending_review' then 1 end)`,
        complianceRate: sql<number>`(count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)::decimal / count(*)) * 100`
      })
      .from(complianceRecord)
      .where(and(
        ...(companyId ? [eq(complianceRecord.companyId, companyId)] : []),
        ...(regulationType ? [eq(complianceRecord.regulationType, regulationType)] : []),
        ...(dateFilter ? [dateFilter] : [])
      ));

    // Compliance by Regulation Type
    const complianceByRegulation = await db
      .select({
        regulationType: complianceRecord.regulationType,
        totalRecords: count(complianceRecord.id),
        compliant: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)`,
        nonCompliant: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'non_compliant' then 1 end)`,
        pending: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'pending_review' then 1 end)`,
        complianceRate: sql<number>`(count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)::decimal / count(*)) * 100`
      })
      .from(complianceRecord)
      .where(and(
        ...(companyId ? [eq(complianceRecord.companyId, companyId)] : []),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(complianceRecord.regulationType)
      .orderBy(desc(sql`(count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)::decimal / count(*)) * 100`));

    // Risk Analysis and Fraud Detection
    const riskAnalysis = await db
      .select({
        totalAlerts: count(fraudAlert.id),
        highSeverityAlerts: sql<number>`count(case when ${fraudAlert.severity} = 'high' then 1 end)`,
        criticalAlerts: sql<number>`count(case when ${fraudAlert.severity} = 'critical' then 1 end)`,
        resolvedAlerts: sql<number>`count(case when ${fraudAlert.status} = 'resolved' then 1 end)`,
        openAlerts: sql<number>`count(case when ${fraudAlert.status} = 'open' then 1 end)`,
        alertTypes: sql<string>`array_agg(distinct ${fraudAlert.alertType})`
      })
      .from(fraudAlert)
      .where(and(
        ...(companyId ? [eq(fraudAlert.userId, companyId)] : []),
        ...(dateFilter ? [and(
          gte(fraudAlert.createdAt, new Date(startDate!)),
          lte(fraudAlert.createdAt, new Date(endDate!))
        )] : [])
      ));

    // Payment Compliance
    const paymentComplianceMetrics = await db
      .select({
        totalPayments: count(paymentCompliance.id),
        compliantPayments: sql<number>`count(case when ${paymentCompliance.complianceStatus} = 'compliant' then 1 end)`,
        nonCompliantPayments: sql<number>`count(case when ${paymentCompliance.complianceStatus} = 'non_compliant' then 1 end)`,
        pendingReviews: sql<number>`count(case when ${paymentCompliance.complianceStatus} = 'pending_review' then 1 end)`,
        regulations: sql<string>`array_agg(distinct ${paymentCompliance.regulationType})`
      })
      .from(paymentCompliance)
      .innerJoin(payment, eq(paymentCompliance.paymentId, payment.id))
      .innerJoin(order, eq(payment.orderId, order.id))
      .where(and(
        ...(companyId ? [eq(order.sellerId, companyId)] : []),
        ...(dateFilter ? [and(
          gte(paymentCompliance.checkDate, new Date(startDate!)),
          lte(paymentCompliance.checkDate, new Date(endDate!))
        )] : [])
      ));

    // Document Compliance
    const documentCompliance = await db
      .select({
        totalDocuments: count(document.id),
        verifiedDocuments: sql<number>`count(case when ${document.isVerified} = true then 1 end)`,
        pendingVerification: sql<number>`count(case when ${document.isVerified} = false then 1 end)`,
        expiredDocuments: sql<number>`count(case when ${document.expiresAt} < now() then 1 end)`,
        expiringSoon: sql<number>`count(case when ${document.expiresAt} between now() and now() + interval '30 days' then 1 end)`,
        documentTypes: sql<string>`array_agg(distinct ${document.documentType})`
      })
      .from(document)
      .where(and(
        ...(companyId ? [eq(document.companyId, companyId)] : []),
        ...(dateFilter ? [and(
          gte(document.createdAt, new Date(startDate!)),
          lte(document.createdAt, new Date(endDate!))
        )] : [])
      ));

    // Audit Trail Summary
    const auditSummary = await db
      .select({
        totalActions: count(auditLog.id),
        actionsByType: sql<string>`json_object_agg(${auditLog.action}, count(*))`,
        recentActivities: sql<string>`count(case when ${auditLog.timestamp} >= now() - interval '7 days' then 1 end)`,
        uniqueUsers: sql<number>`count(distinct ${auditLog.userId})`
      })
      .from(auditLog)
      .where(and(
        ...(companyId ? [eq(auditLog.userId, companyId)] : []),
        ...(dateFilter ? [and(
          gte(auditLog.timestamp, new Date(startDate!)),
          lte(auditLog.timestamp, new Date(endDate!))
        )] : [])
      ));

    // Compliance Trends Over Time
    const complianceTrends = await db
      .select({
        period: sql<string>`date_trunc('month', ${complianceRecord.createdAt})`,
        totalChecks: count(complianceRecord.id),
        compliant: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)`,
        nonCompliant: sql<number>`count(case when ${complianceRecord.complianceStatus} = 'non_compliant' then 1 end)`,
        complianceRate: sql<number>`(count(case when ${complianceRecord.complianceStatus} = 'compliant' then 1 end)::decimal / count(*)) * 100`
      })
      .from(complianceRecord)
      .where(and(
        ...(companyId ? [eq(complianceRecord.companyId, companyId)] : []),
        ...(regulationType ? [eq(complianceRecord.regulationType, regulationType)] : []),
        ...(dateFilter ? [dateFilter] : [])
      ))
      .groupBy(sql`date_trunc('month', ${complianceRecord.createdAt})`)
      .orderBy(desc(sql`date_trunc('month', ${complianceRecord.createdAt})`))
      .limit(12);

    // Regulatory Deadlines and Requirements
    const regulatoryDeadlines = await db
      .select({
        regulationType: complianceRecord.regulationType,
        nextReviewDate: sql<string>`min(${complianceRecord.expiresAt})`,
        overdueReviews: sql<number>`count(case when ${complianceRecord.expiresAt} < now() then 1 end)`,
        upcomingReviews: sql<number>`count(case when ${complianceRecord.expiresAt} between now() and now() + interval '30 days' then 1 end)`
      })
      .from(complianceRecord)
      .where(and(
        ...(companyId ? [eq(complianceRecord.companyId, companyId)] : []),
        ...(regulationType ? [eq(complianceRecord.regulationType, regulationType)] : []),
        sql`${complianceRecord.expiresAt} is not null`
      ))
      .groupBy(complianceRecord.regulationType);

    // Data Privacy and Security Metrics
    const dataSecurityMetrics = await db
      .select({
        totalDataAccess: count(auditLog.id),
        unauthorizedAccess: sql<number>`count(case when ${auditLog.action} = 'unauthorized_access' then 1 end)`,
        dataExports: sql<number>`count(case when ${auditLog.action} = 'data_export' then 1 end)`,
        securityIncidents: sql<number>`count(case when ${auditLog.action} = 'security_incident' then 1 end)`,
        lastSecurityReview: sql<string>`max(${complianceRecord.reviewedAt})`
      })
      .from(auditLog)
      .leftJoin(complianceRecord, and(
        eq(auditLog.userId, complianceRecord.userId),
        eq(complianceRecord.regulationType, 'GDPR')
      ))
      .where(and(
        ...(companyId ? [eq(auditLog.userId, companyId)] : []),
        ...(dateFilter ? [and(
          gte(auditLog.timestamp, new Date(startDate!)),
          lte(auditLog.timestamp, new Date(endDate!))
        )] : [])
      ));

    return NextResponse.json({
      complianceOverview: complianceOverview[0],
      complianceByRegulation,
      riskAnalysis: riskAnalysis[0],
      paymentCompliance: paymentComplianceMetrics[0],
      documentCompliance: documentCompliance[0],
      auditSummary: auditSummary[0],
      complianceTrends,
      regulatoryDeadlines,
      dataSecurityMetrics: dataSecurityMetrics[0],
      metadata: {
        companyId,
        regulationType,
        startDate,
        endDate,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Compliance analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance analytics' },
      { status: 500 }
    );
  }
}