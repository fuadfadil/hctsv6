'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock
} from 'lucide-react';

interface DashboardData {
  kpis: any;
  alerts: any[];
  liveTransactions: any[];
  performanceTrends: any[];
  systemHealth: any;
  fraudAlerts: any[];
  revenueForecast: any;
  topServices: any[];
  geographicData: any[];
  metadata: any;
}

interface RealTimeDashboardProps {
  companyId?: string;
}

export default function RealTimeDashboard({ companyId }: RealTimeDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      if (realtime) {
        fetchDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [realtime, companyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        realtime: realtime.toString(),
        ...(companyId && { companyId })
      });

      const response = await fetch(`/api/analytics/dashboard?${params}`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64">Failed to load dashboard</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Dashboard</h1>
          <p className="text-muted-foreground">Live platform metrics and performance indicators</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={realtime ? "default" : "secondary"} className="flex items-center">
            <Activity className="h-3 w-3 mr-1" />
            {realtime ? 'Live' : 'Paused'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRealtime(!realtime)}
          >
            {realtime ? 'Pause' : 'Resume'} Updates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>

      {/* Critical Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.slice(0, 3).map((alert, index) => (
            <Alert key={index} className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{alert.title}:</strong> {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.kpis.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +12.5% vs last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +8.2% vs last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +5.1% vs last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Transactions Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Live Transactions
            </CardTitle>
            <CardDescription>Recent trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.liveTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-sm">{transaction.buyerName}</p>
                      <p className="text-xs text-muted-foreground">{transaction.sellerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${transaction.amount?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {data.liveTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent transactions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Trends
            </CardTitle>
            <CardDescription>Hourly performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.performanceTrends.slice(0, 6).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{trend.hour}</p>
                    <p className="text-xs text-muted-foreground">{trend.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${trend.revenue?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: ${trend.averageOrderValue?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Most popular services today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="text-sm font-medium">{service.serviceName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${service.revenue?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{service.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Activity</CardTitle>
            <CardDescription>Trading activity by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.geographicData.slice(0, 5).map((region, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{region.region || 'Unknown'}</span>
                  <div className="text-right">
                    <p className="text-sm font-medium">{region.orders} orders</p>
                    <p className="text-xs text-muted-foreground">${region.revenue?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Forecast</CardTitle>
            <CardDescription>AI-powered predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  ${data.revenueForecast.nextDay?.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Tomorrow</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">
                    ${data.revenueForecast.nextWeek?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Next Week</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    ${data.revenueForecast.nextMonth?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Next Month</p>
                </div>
              </div>
              <div className="text-center">
                <Badge variant="outline">
                  Confidence: {(data.revenueForecast.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Alerts */}
      {data.fraudAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Security Alerts
            </CardTitle>
            <CardDescription>Recent fraud detection alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.fraudAlerts.map((alert, index) => (
                <Alert key={index} className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong className="capitalize">{alert.severity}</strong>: {alert.description}
                    <br />
                    <span className="text-xs">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}