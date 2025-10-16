'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Download, Calendar, BarChart3, TrendingUp, Plus } from 'lucide-react';

interface ReportData {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  data?: any;
}

export default function CustomReports() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  // Form state
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('json');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/buyer/reports');
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      const data = await response.json();
      setReports(data.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!reportType || !startDate || !endDate) return;

    try {
      setGenerating(true);
      const response = await fetch('/api/buyer/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          startDate,
          endDate,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();
      setShowGenerateDialog(false);
      resetForm();
      fetchReports(); // Refresh the list

      // Auto-download if format is not JSON
      if (format !== 'json') {
        downloadReport(result.report.id, format);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string, format: string) => {
    try {
      const response = await fetch(`/api/buyer/reports?id=${reportId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const report = await response.json();

      // Convert to requested format and download
      let content = '';
      let mimeType = '';
      let filename = `report-${reportId}`;

      switch (format) {
        case 'csv':
          content = convertToCSV(report.data);
          mimeType = 'text/csv';
          filename += '.csv';
          break;
        case 'pdf':
          // For PDF, we'd need a library like jsPDF
          // For now, just download as JSON
          content = JSON.stringify(report.data, null, 2);
          mimeType = 'application/pdf';
          filename += '.pdf';
          break;
        default:
          content = JSON.stringify(report.data, null, 2);
          mimeType = 'application/json';
          filename += '.json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download report');
    }
  };

  const convertToCSV = (data: any): string => {
    if (!data || typeof data !== 'object') return '';

    const flattenObject = (obj: any, prefix = ''): any => {
      let flattened: any = {};
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
        } else {
          flattened[`${prefix}${key}`] = Array.isArray(obj[key]) ? obj[key].join('; ') : obj[key];
        }
      }
      return flattened;
    };

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);

    return [headers.join(','), values.join(',')].join('\n');
  };

  const resetForm = () => {
    setReportType('');
    setStartDate('');
    setEndDate('');
    setFormat('json');
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'utilization': return 'Service Utilization';
      case 'spending': return 'Spending Analysis';
      case 'performance': return 'Provider Performance';
      case 'roi': return 'ROI Analysis';
      default: return type;
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'utilization': return <BarChart3 className="h-5 w-5" />;
      case 'spending': return <TrendingUp className="h-5 w-5" />;
      case 'performance': return <FileText className="h-5 w-5" />;
      case 'roi': return <BarChart3 className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-500">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground">
            Generate and export detailed reports for compliance and analysis
          </p>
        </div>
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate Custom Report</DialogTitle>
              <DialogDescription>
                Create detailed reports for analysis and compliance requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utilization">Service Utilization</SelectItem>
                    <SelectItem value="spending">Spending Analysis</SelectItem>
                    <SelectItem value="performance">Provider Performance</SelectItem>
                    <SelectItem value="roi">ROI Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="format">Export Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(false)}
                  disabled={generating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateReport}
                  disabled={generating || !reportType || !startDate || !endDate}
                >
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Templates */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Utilization Report</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Track service usage and utilization rates
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setReportType('utilization');
                setShowGenerateDialog(true);
              }}
            >
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Spending Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Analyze spending patterns and trends
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setReportType('spending');
                setShowGenerateDialog(true);
              }}
            >
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Performance Report</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Provider performance and quality metrics
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setReportType('performance');
                setShowGenerateDialog(true);
              }}
            >
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">ROI Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Return on investment for services
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setReportType('roi');
                setShowGenerateDialog(true);
              }}
            >
              Generate
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generated Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>
            Your previously generated reports and exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getReportIcon(report.type)}
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getReportTypeLabel(report.type)} • Generated {new Date(report.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadReport(report.id, 'json')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadReport(report.id, 'csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No reports generated yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first custom report to get started with detailed analytics.
                </p>
                <Button onClick={() => setShowGenerateDialog(true)}>
                  Generate First Report
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}