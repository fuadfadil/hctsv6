'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, Star, MapPin } from 'lucide-react';

interface CompanyAnalyticsData {
  revenueAnalytics: any[];
  servicePerformance: any[];
  customerAnalytics: any[];
  utilization: any;
  geographicDistribution: any[];
  paymentPerformance: any;
  customerSatisfaction: any;
  growthTrends: any[];
  metadata: any;
}

interface CompanyAnalyticsProps {
  companyId?: string;
}

export default function CompanyAnalytics({ companyId }: CompanyAnalyticsProps) {
  const [data, setData] = useState<CompanyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange, companyId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        ...(companyId && { companyId }),
        ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString() })
      });

      const response = await fetch(`/api/analytics/company?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch company analytics:', error);
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
          <h1 className="text-3xl font-bold">Company Analytics</h1>
          <p className="text-muted-foreground">Performance insights for your healthcare services</p>
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
              ${data.utilization.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.utilization.activeListings || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {data.utilization.totalListings || 0} total listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.customerSatisfaction.averageRating?.toFixed(1) || '0'}/5
            </div>
            <p className="text-xs text-muted-foreground">
              {data.customerSatisfaction.totalReviews || 0} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.utilization.completedOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {data.utilization.totalOrders || 0} total orders
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.revenueAnalytics.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.totalRevenue?.toLocaleString()}</p>
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

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Performance</CardTitle>
              <CardDescription>Top performing healthcare services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.servicePerformance.map((service, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{service.serviceName}</p>
                        <Badge variant="outline">{service.category}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${service.totalRevenue?.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.totalSold} units sold
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{service.orderCount} orders</span>
                      <span>Avg: ${service.averagePrice?.toFixed(2)}</span>
                      {service.averageRating && (
                        <span className="flex items-center">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {service.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Most valuable customers by spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.customerAnalytics.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{customer.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.totalOrders} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${customer.totalSpent?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg: ${customer.averageOrderValue?.toFixed(2)}
                      </p>
                      {customer.averageRating && (
                        <p className="text-sm text-muted-foreground flex items-center justify-end">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {customer.averageRating.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Customer distribution by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.geographicDistribution.map((region, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{region.region || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {region.customerCount} customers
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${region.totalRevenue?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {region.orderCount} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Fulfillment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completed Orders</span>
                      <span>{data.utilization.completedOrders || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${data.utilization.totalOrders ?
                            (data.utilization.completedOrders / data.utilization.totalOrders) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium">{data.utilization.pendingOrders || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cancelled</p>
                      <p className="font-medium">{data.utilization.cancelledOrders || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Successful Payments</span>
                      <span>{data.paymentPerformance.successfulPayments || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${data.paymentPerformance.totalPayments ?
                            (data.paymentPerformance.successfulPayments / data.paymentPerformance.totalPayments) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Failed</p>
                      <p className="font-medium">{data.paymentPerformance.failedPayments || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium">{data.paymentPerformance.pendingPayments || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Satisfaction Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    5 Stars
                  </span>
                  <span className="font-medium">{data.customerSatisfaction.fiveStarReviews || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    4 Stars
                  </span>
                  <span className="font-medium">{data.customerSatisfaction.fourStarReviews || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    3 Stars
                  </span>
                  <span className="font-medium">{data.customerSatisfaction.threeStarReviews || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    2 Stars
                  </span>
                  <span className="font-medium">{data.customerSatisfaction.twoStarReviews || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                    1 Star
                  </span>
                  <span className="font-medium">{data.customerSatisfaction.oneStarReviews || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}