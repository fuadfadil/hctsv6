"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

interface MarketInsightsProps {
  serviceName: string;
  icd11Code: string;
  region: string;
  currency: string;
}

interface MarketData {
  marketStats: Array<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    medianPrice: number;
    dataPoints: number;
  }>;
  trends: Array<{
    date: string;
    averagePrice: number;
    dataPoints: number;
  }>;
  trend: string;
  trendPercentage: number;
  competitiveAnalysis: {
    marketPosition: string;
    priceRange: string;
    recommendedRange: {
      min: number;
      max: number;
    };
  } | null;
  insights: string[];
}

export function MarketInsights({ serviceName, icd11Code, region, currency }: MarketInsightsProps) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (serviceName || icd11Code) {
      fetchMarketData();
    }
  }, [serviceName, icd11Code, region, currency]);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        region,
        currency,
      });

      if (icd11Code) params.set('icd11Code', icd11Code);

      const response = await fetch(`/api/calculator/market?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
      }
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!serviceName && !icd11Code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enter a service name or ICD-11 code to see market insights
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading market data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No market data available for this service
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (marketData.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (marketData.trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Market Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {marketData.marketStats.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">
                {marketData.marketStats[0].averagePrice.toFixed(2)} {currency}
              </div>
              <div className="text-sm text-muted-foreground">Average Price</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {marketData.marketStats[0].dataPoints}
              </div>
              <div className="text-sm text-muted-foreground">Data Points</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {marketData.trend === 'increasing' ? '+' : marketData.trend === 'decreasing' ? '-' : ''}
            {Math.abs(marketData.trendPercentage).toFixed(1)}% trend
          </span>
          <Badge variant="outline">{marketData.trend}</Badge>
        </div>

        {marketData.competitiveAnalysis && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Market Position</span>
              <Badge variant={
                marketData.competitiveAnalysis.marketPosition === 'high' ? 'destructive' :
                marketData.competitiveAnalysis.marketPosition === 'low' ? 'secondary' : 'default'
              }>
                {marketData.competitiveAnalysis.marketPosition}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Price Range: {marketData.competitiveAnalysis.priceRange}
            </div>
            <div className="text-sm text-muted-foreground">
              Recommended: {marketData.competitiveAnalysis.recommendedRange.min.toFixed(2)} - {marketData.competitiveAnalysis.recommendedRange.max.toFixed(2)} {currency}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Key Insights</h4>
          <div className="space-y-1">
            {marketData.insights.map((insight, index) => (
              <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                {insight}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}