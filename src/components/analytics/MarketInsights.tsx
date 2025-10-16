'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, BarChart3, Target, Zap, Globe } from 'lucide-react';

interface MarketInsightsData {
  priceTrends: any[];
  servicePopularity: any[];
  regionalAnalysis: any[];
  forecastingData: any[];
  healthUnitTrends: any[];
  pricePredictions: any[];
  competitiveAnalysis: any[];
  metadata: any;
}

export default function MarketInsights() {
  const [data, setData] = useState<MarketInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [categoryId, setCategoryId] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  useEffect(() => {
    fetchMarketInsights();
  }, [period, categoryId, region, dateRange]);

  const fetchMarketInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        ...(categoryId && { categoryId }),
        ...(region && { region }),
        ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString() })
      });

      const response = await fetch(`/api/analytics/market?${params}`);
      if (response.ok) {
        const insightsData = await response.json();
        setData(insightsData);
      }
    } catch (error) {
      console.error('Failed to fetch market insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading market insights...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64">Failed to load market insights</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Insights</h1>
          <p className="text-muted-foreground">Healthcare market trends, forecasting, and competitive analysis</p>
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
          <Button variant="outline" onClick={() => {
            setCategoryId('');
            setRegion('');
            setDateRange(undefined);
          }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Key Market Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+15.3%</div>
            <p className="text-xs text-muted-foreground">
              YoY healthcare trading volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Stability</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.4%</div>
            <p className="text-xs text-muted-foreground">
              Services with stable pricing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Competition</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.competitiveAnalysis.length}</div>
            <p className="text-xs text-muted-foreground">
              Active competitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Predictions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pricePredictions.length}</div>
            <p className="text-xs text-muted-foreground">
              Services with price forecasts
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
          <TabsTrigger value="popularity">Service Popularity</TabsTrigger>
          <TabsTrigger value="regional">Regional Analysis</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="competition">Competition</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Trends by Category</CardTitle>
              <CardDescription>Healthcare service pricing trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.priceTrends.slice(0, 10).map((trend, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{trend.category}</p>
                        <p className="text-sm text-muted-foreground">{trend.period}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${trend.averagePrice?.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          Range: ${trend.minPrice?.toFixed(2)} - ${trend.maxPrice?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{trend.transactionCount} transactions</span>
                      <span>{trend.volume} units</span>
                      {trend.medianPrice && (
                        <span>Median: ${trend.medianPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popularity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Popularity & Demand</CardTitle>
              <CardDescription>Most demanded healthcare services and growth indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.servicePopularity.slice(0, 15).map((service, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{service.serviceName}</p>
                        <Badge variant="outline">{service.category}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${service.totalRevenue?.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.totalOrders} orders
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-muted-foreground">
                        {service.uniqueBuyers} unique buyers
                      </span>
                      {service.averageRating && (
                        <span className="text-muted-foreground">
                          Rating: {service.averageRating.toFixed(1)}/5
                        </span>
                      )}
                      {service.growthRate && (
                        <span className={`flex items-center ${service.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {service.growthRate > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(service.growthRate).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Market Analysis</CardTitle>
              <CardDescription>Healthcare trading activity by geographic region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.regionalAnalysis.map((region, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{region.region || 'Global'}</p>
                        <p className="text-sm text-muted-foreground">
                          {region.uniqueBuyers} buyers, {region.uniqueSellers} sellers
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${region.totalRevenue?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {region.totalOrders} orders
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Avg: ${region.averageOrderValue?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Forecasting</CardTitle>
                <CardDescription>Predicted market trends and growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.forecastingData.slice(0, 6).map((forecast, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium">{forecast.period}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-medium">${forecast.totalRevenue?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Orders</p>
                          <p className="font-medium">{forecast.totalOrders}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Price Predictions</CardTitle>
                <CardDescription>Machine learning-powered price forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.pricePredictions.slice(0, 8).map((prediction, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium">{prediction.serviceName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Current</p>
                          <p className="font-medium">${prediction.currentAveragePrice?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Predicted</p>
                          <p className={`font-medium ${prediction.predictedPrice > prediction.currentAveragePrice ? 'text-green-600' : 'text-red-600'}`}>
                            ${prediction.predictedPrice?.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant={prediction.trend === 'increasing' ? 'default' : prediction.trend === 'decreasing' ? 'destructive' : 'secondary'}>
                          {prediction.trend}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {(prediction.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitive Analysis</CardTitle>
              <CardDescription>Market share and competitive positioning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.competitiveAnalysis.map((competitor, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{competitor.companyName}</p>
                        <p className="text-sm text-muted-foreground">
                          {competitor.serviceCount} services offered
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{competitor.marketShare?.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">market share</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-medium">${competitor.averagePrice?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Customers</p>
                        <p className="font-medium">{competitor.customerCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rating</p>
                        <p className="font-medium">{competitor.rating?.toFixed(1)}/5</p>
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