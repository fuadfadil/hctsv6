'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, XCircle, FileText, Clock } from 'lucide-react';

interface ComplianceReportsData {
  complianceOverview: any;
  complianceByRegulation: any[];
  riskAnalysis: any;
  paymentCompliance: any;
  documentCompliance: any;
  auditSummary: any;
  complianceTrends: any[];
  regulatoryDeadlines: any[];
  dataSecurityMetrics: any;
  metadata: any;
}

interface ComplianceReportsProps {
  companyId?: string;
}

export default function ComplianceReports({ companyId }: ComplianceReportsProps) {
  const [data, setData] = useState<ComplianceReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regulationType, setRegulationType] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  useEffect(() => {
    fetchComplianceReports();
  }, [companyId, regulationType, dateRange]);

  const fetchComplianceReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(companyId && { companyId }),
        ...(regulationType && { regulationType }),
        ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString() })
      });

      const response = await fetch(`/api/analytics/compliance?${params}`);
      if (response.ok) {
        const reportsData = await response.json();
        setData(reportsData);
      }
    } catch (error) {
      console.error('Failed to fetch compliance reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading compliance reports...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64">Failed to load compliance reports</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Reports</h1>
          <p className="text-muted-foreground">Regulatory compliance monitoring and risk assessment</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={regulationType} onValueChange={setRegulationType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Regulations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Regulations</SelectItem>
              <SelectItem value="GDPR">GDPR</SelectItem>
              <SelectItem value="HIPAA">HIPAA</SelectItem>
              <SelectItem value="PCI_DSS">PCI DSS</SelectItem>
              <SelectItem value="Libyan_Financial_Regulations">Libyan Financial Regulations</SelectItem>
              <SelectItem value="SOX">SOX</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            setRegulationType('');
            setDateRange(undefined);
          }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.riskAnalysis.criticalAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Risk Alert:</strong> {data.riskAnalysis.criticalAlerts} critical compliance issues require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Compliance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.complianceOverview.complianceRate?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.complianceOverview.compliantRecords} of {data.complianceOverview.totalRecords} compliant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.riskAnalysis.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {data.riskAnalysis.criticalAlerts} critical, {data.riskAnalysis.highSeverityAlerts} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.documentCompliance.verifiedDocuments || 0}/{data.documentCompliance.totalDocuments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.documentCompliance.expiredDocuments || 0} expired documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.auditSummary.totalActions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.auditSummary.recentActivities || 0} recent activities
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regulations">By Regulation</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>Overall compliance health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Compliant</span>
                    </div>
                    <span className="font-medium">{data.complianceOverview.compliantRecords}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span>Non-Compliant</span>
                    </div>
                    <span className="font-medium">{data.complianceOverview.nonCompliantRecords}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                      <span>Pending Review</span>
                    </div>
                    <span className="font-medium">{data.complianceOverview.pendingReviews}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Compliance</CardTitle>
                <CardDescription>Financial transaction compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Compliant Payments</span>
                    <span className="font-medium">{data.paymentCompliance.compliantPayments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Non-Compliant</span>
                    <span className="font-medium">{data.paymentCompliance.nonCompliantPayments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending Reviews</span>
                    <span className="font-medium">{data.paymentCompliance.pendingReviews || 0}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Supported Regulations</p>
                    <div className="flex flex-wrap gap-1">
                      {data.paymentCompliance.regulations?.map((reg: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {reg.replace('_', ' ')}
                        </Badge>
                      )) || []}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regulations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance by Regulation</CardTitle>
              <CardDescription>Detailed compliance status for each regulatory framework</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.complianceByRegulation.map((regulation, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{regulation.regulationType.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {regulation.totalRecords} total records
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{regulation.complianceRate?.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">compliance rate</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-green-600 font-medium">{regulation.compliant}</p>
                        <p className="text-muted-foreground">Compliant</p>
                      </div>
                      <div className="text-center">
                        <p className="text-red-600 font-medium">{regulation.nonCompliant}</p>
                        <p className="text-muted-foreground">Non-Compliant</p>
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-600 font-medium">{regulation.pending}</p>
                        <p className="text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Analysis & Fraud Detection</CardTitle>
              <CardDescription>Security threats and compliance risks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{data.riskAnalysis.criticalAlerts}</p>
                    <p className="text-sm text-muted-foreground">Critical</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{data.riskAnalysis.highSeverityAlerts}</p>
                    <p className="text-sm text-muted-foreground">High</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{data.riskAnalysis.totalAlerts - data.riskAnalysis.criticalAlerts - data.riskAnalysis.highSeverityAlerts}</p>
                    <p className="text-sm text-muted-foreground">Medium</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{data.riskAnalysis.resolvedAlerts}</p>
                    <p className="text-sm text-muted-foreground">Resolved</p>
                  </div>
                </div>

                {data.riskAnalysis.alertTypes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Alert Types</p>
                    <div className="flex flex-wrap gap-2">
                      {data.riskAnalysis.alertTypes.map((alertType: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {alertType.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Compliance</CardTitle>
              <CardDescription>Document verification and expiry tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{data.documentCompliance.verifiedDocuments}</p>
                    <p className="text-sm text-muted-foreground">Verified</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{data.documentCompliance.pendingVerification}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{data.documentCompliance.expiredDocuments}</p>
                    <p className="text-sm text-muted-foreground">Expired</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{data.documentCompliance.expiringSoon}</p>
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  </div>
                </div>

                {data.documentCompliance.documentTypes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Document Types</p>
                    <div className="flex flex-wrap gap-2">
                      {data.documentCompliance.documentTypes.map((docType: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {docType.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>Compliance performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.complianceTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{trend.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {trend.totalChecks} compliance checks
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{trend.complianceRate?.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">
                        {trend.compliant} compliant, {trend.nonCompliant} non-compliant
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regulatory Deadlines</CardTitle>
              <CardDescription>Upcoming compliance requirements and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.regulatoryDeadlines.map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{deadline.regulationType.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Next review: {deadline.nextReviewDate ? new Date(deadline.nextReviewDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4 text-sm">
                        {deadline.overdueReviews > 0 && (
                          <Badge variant="destructive">
                            {deadline.overdueReviews} overdue
                          </Badge>
                        )}
                        {deadline.upcomingReviews > 0 && (
                          <Badge variant="secondary">
                            {deadline.upcomingReviews} upcoming
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}