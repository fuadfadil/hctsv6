'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Calendar, Settings } from 'lucide-react';

interface ExportOptions {
  exportType: 'csv' | 'excel' | 'pdf';
  dataType: 'orders' | 'analytics' | 'compliance' | 'market';
  companyId?: string;
  startDate?: string;
  endDate?: string;
  schedule?: boolean;
  email?: string;
}

export default function AnalyticsExport() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    exportType: 'csv',
    dataType: 'orders'
  });
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        type: exportOptions.exportType,
        dataType: exportOptions.dataType,
        ...(exportOptions.companyId && { companyId: exportOptions.companyId }),
        ...(exportOptions.startDate && { startDate: exportOptions.startDate }),
        ...(exportOptions.endDate && { endDate: exportOptions.endDate })
      });

      if (scheduled && exportOptions.schedule) {
        // Schedule the export
        const scheduleResponse = await fetch('/api/analytics/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exportType: exportOptions.exportType,
            dataType: exportOptions.dataType,
            companyId: exportOptions.companyId,
            startDate: exportOptions.startDate,
            endDate: exportOptions.endDate,
            schedule: true,
            email: exportOptions.email
          })
        });

        if (scheduleResponse.ok) {
          const result = await scheduleResponse.json();
          alert(`Export scheduled successfully! Schedule ID: ${result.scheduleId}`);
        } else {
          throw new Error('Failed to schedule export');
        }
      } else {
        // Immediate export
        const response = await fetch(`/api/analytics/export?${params}`);

        if (response.ok) {
          if (exportOptions.exportType === 'csv') {
            // Download CSV directly
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } else {
            // For Excel/PDF, handle JSON response
            const data = await response.json();
            // Here you would typically send the data to a service that generates Excel/PDF
            console.log('Export data:', data);
            alert('Export data prepared. In a real implementation, this would generate an Excel/PDF file.');
          }
        } else {
          throw new Error('Export failed');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Export</h1>
          <p className="text-muted-foreground">Export analytics data in various formats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Export Configuration
            </CardTitle>
            <CardDescription>
              Configure your analytics data export settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exportType">Export Format</Label>
                <Select
                  value={exportOptions.exportType}
                  onValueChange={(value: 'csv' | 'excel' | 'pdf') =>
                    setExportOptions(prev => ({ ...prev, exportType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataType">Data Type</Label>
                <Select
                  value={exportOptions.dataType}
                  onValueChange={(value: 'orders' | 'analytics' | 'compliance' | 'market') =>
                    setExportOptions(prev => ({ ...prev, dataType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders">Orders & Transactions</SelectItem>
                    <SelectItem value="analytics">Analytics Data</SelectItem>
                    <SelectItem value="compliance">Compliance Reports</SelectItem>
                    <SelectItem value="market">Market Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Company ID (Optional)</Label>
              <Input
                id="companyId"
                placeholder="Enter company ID for company-specific data"
                value={exportOptions.companyId || ''}
                onChange={(e) => setExportOptions(prev => ({ ...prev, companyId: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={exportOptions.startDate || ''}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={exportOptions.endDate || ''}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="schedule"
                checked={scheduled}
                onCheckedChange={(checked) => setScheduled(checked as boolean)}
              />
              <Label htmlFor="schedule">Schedule this export</Label>
            </div>

            {scheduled && (
              <div className="space-y-2">
                <Label htmlFor="email">Email for notifications</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={exportOptions.email || ''}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Export Summary
            </CardTitle>
            <CardDescription>
              Preview of your export configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Format:</span>
                <span className="text-sm font-medium">{exportOptions.exportType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Data Type:</span>
                <span className="text-sm font-medium">{exportOptions.dataType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Company Filter:</span>
                <span className="text-sm font-medium">
                  {exportOptions.companyId ? exportOptions.companyId : 'All Companies'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date Range:</span>
                <span className="text-sm font-medium">
                  {exportOptions.startDate && exportOptions.endDate
                    ? `${exportOptions.startDate} to ${exportOptions.endDate}`
                    : 'All Time'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Schedule:</span>
                <span className="text-sm font-medium">
                  {scheduled ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                {scheduled
                  ? 'This export will be scheduled and you will receive an email notification when complete.'
                  : 'This export will be processed immediately and downloaded to your device.'
                }
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExport}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : (scheduled ? 'Schedule Export' : 'Export Now')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Recent exports and scheduled reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent exports found</p>
            <p className="text-sm">Your export history will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}