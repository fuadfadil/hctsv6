'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, TrendingDown, BarChart3, PieChart, Calendar, DollarSign, Users, Target } from 'lucide-react';

interface AnalyticsData {
  analytics: Array<{
    metricType: string;
    value: number;
    period: string;
    date: string;
  }>;
  utilization: {
    totalPurchased: number;
    totalSpent: number;
    orderCount: number;
  };
  roi: {
    averageRating: number;
    reviewCount: number;
  };
  spendingTrends: Array<{
    month: string;
    totalSpent: number;
    orderCount: number;
  }>;
  providerPerformance: Array<{
    providerName: string;
    totalSpent: number;
    orderCount: number;
    averageRating: number;
    onTimeDelivery: number;
  }>;
}

export default function PerformanceAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [period, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period });

      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/buyer/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <div className="h-4 w-4" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Track service utilization, ROI, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Utilization</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.utilization.totalPurchased}</div>
            <p className="text-xs text-muted-foreground">
              Total services purchased
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.utilization.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.roi.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              From {data.roi.reviewCount} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Frequency</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.utilization.orderCount}</div>
            <p className="text-xs text-muted-foreground">
              Total orders placed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Spending Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
            <CardDescription>Monthly spending and order patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.spendingTrends.slice(0, 6).map((trend, index) => (
                <div key={trend.month} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{trend.month}</p>
                    <p className="text-sm text-muted-foreground">
                      {trend.orderCount} orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${trend.totalSpent.toLocaleString()}</p>
                    {index > 0 && (
                      <div className={`flex items-center text-sm ${getTrendColor(trend.totalSpent, data.spendingTrends[index - 1].totalSpent)}`}>
                        {getTrendIcon(trend.totalSpent, data.spendingTrends[index - 1].totalSpent)}
                        <span className="ml-1">
                          {((trend.totalSpent - data.spendingTrends[index - 1].totalSpent) / data.spendingTrends[index - 1].totalSpent * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Provider Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
            <CardDescription>Performance metrics by healthcare provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.providerPerformance.slice(0, 5).map((provider) => (
                <div key={provider.providerName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{provider.providerName}</p>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${provider.totalSpent.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {provider.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Rating</p>
                      <p className="font-medium">{provider.averageRating.toFixed(1)} ⭐</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">On-time Delivery</p>
                      <p className="font-medium">{provider.onTimeDelivery.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
          <CardDescription>Comprehensive performance metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.analytics.map((metric, index) => (
              <div key={`${metric.metricType}-${metric.date}`} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium capitalize">
                      {metric.metricType.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {metric.period} • {new Date(metric.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
                    {index > 0 && data.analytics[index - 1] && (
                      <div className={`flex items-center text-sm ${getTrendColor(metric.value, data.analytics[index - 1].value)}`}>
                        {getTrendIcon(metric.value, data.analytics[index - 1].value)}
                        <span className="ml-1">
                          {data.analytics[index - 1].value !== 0
                            ? ((metric.value - data.analytics[index - 1].value) / data.analytics[index - 1].value * 100).toFixed(1)
                            : '0.0'
                          }%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ROI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>ROI Analysis</CardTitle>
          <CardDescription>Return on investment for healthcare services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {data.roi.averageRating >= 4 ? 'High' : data.roi.averageRating >= 3 ? 'Medium' : 'Low'}
              </div>
              <p className="text-sm text-muted-foreground">Satisfaction Level</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                ${data.utilization.orderCount > 0 ? (data.utilization.totalSpent / data.utilization.orderCount).toFixed(0) : '0'}
              </div>
              <p className="text-sm text-muted-foreground">Avg. Order Value</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {data.utilization.totalPurchased > 0 ? (data.utilization.totalSpent / data.utilization.totalPurchased).toFixed(2) : '0.00'}
              </div>
              <p className="text-sm text-muted-foreground">Cost per Service</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}