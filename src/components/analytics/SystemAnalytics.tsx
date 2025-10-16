'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react';

interface SystemAnalyticsData {
  tradingVolume: any[];
  marketPerformance: any[];
  companyPerformance: any[];
  userActivity: any;
  complianceMetrics: any;
  riskAnalysis: any;
  paymentAnalytics: any;
  geographicAnalysis: any[];
  dashboardMetrics: any[];
  metadata: any;
}

export default function SystemAnalytics() {
  const [data, setData] = useState<SystemAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString() })
      });

      const response = await fetch(`/api/analytics/system?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch system analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64">Failed to load analytics</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Analytics</h1>
          <p className="text-muted-foreground">Platform-wide trading and performance insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {/* Date range picker placeholder - implement when component is available */}
          <Button variant="outline" onClick={() => setDateRange(undefined)}>
            Clear Date Filter
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.tradingVolume[0]?.totalValue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.userActivity.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +8.2% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.tradingVolume[0]?.totalTransactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +15.3% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.riskAnalysis.totalAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.riskAnalysis.criticalAlerts || 0} critical alerts
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trading" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trading">Trading Volume</TabsTrigger>
          <TabsTrigger value="market">Market Performance</TabsTrigger>
          <TabsTrigger value="companies">Company Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Volume Trends</CardTitle>
              <CardDescription>Transaction volume and value over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.tradingVolume.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.totalTransactions} transactions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.totalValue?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg: ${item.averageOrderValue?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Services</CardTitle>
              <CardDescription>Most popular healthcare services by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.marketPerformance.slice(0, 10).map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{service.serviceName}</p>
                      <p className="text-sm text-muted-foreground">{service.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${service.totalRevenue?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.totalListings} listings
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Companies</CardTitle>
              <CardDescription>Leading healthcare service providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.companyPerformance.slice(0, 10).map((company, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{company.companyName}</p>
                      <Badge variant="outline">{company.companyType}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${company.totalRevenue?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.totalOrders} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Compliance Rate</span>
                    <span className="font-medium">{data.complianceMetrics.complianceRate?.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Records</span>
                    <span>{data.complianceMetrics.totalRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compliant</span>
                    <span className="text-green-600">{data.complianceMetrics.compliantRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Non-Compliant</span>
                    <span className="text-red-600">{data.complianceMetrics.nonCompliantRecords}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Alerts</span>
                    <span>{data.riskAnalysis.totalAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical</span>
                    <span className="text-red-600">{data.riskAnalysis.criticalAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High</span>
                    <span className="text-orange-600">{data.riskAnalysis.highSeverityAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolved</span>
                    <span className="text-green-600">{data.riskAnalysis.resolvedAlerts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Market activity by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.geographicAnalysis.map((region, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{region.region || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {region.orderCount} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${region.totalValue?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {region.customerCount} customers
                      </p>
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