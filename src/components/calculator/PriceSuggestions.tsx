"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Target, CheckCircle } from "lucide-react";

interface PricingResult {
  basePrice: number;
  aiSuggestedPrice: number;
  marketAveragePrice: number;
  complexityScore: number;
  discountPercentage: number;
  finalPrice: number;
  healthUnits: number;
  currency: string;
  reasoning: string;
  marketInsights: string[];
}

interface PriceSuggestionsProps {
  result: PricingResult;
  onAcceptPrice: (price: number) => void;
}

export function PriceSuggestions({ result, onAcceptPrice }: PriceSuggestionsProps) {
  const suggestions = [
    {
      label: "AI Recommended",
      price: result.aiSuggestedPrice,
      description: "Optimized for market competitiveness",
      icon: Target,
      variant: "default" as const,
    },
    {
      label: "Market Average",
      price: result.marketAveragePrice,
      description: "Current market standard",
      icon: TrendingUp,
      variant: "secondary" as const,
    },
    {
      label: "Base Price",
      price: result.basePrice,
      description: "Calculated base rate",
      icon: DollarSign,
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Price Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          const isSelected = Math.abs(result.finalPrice - suggestion.price) < 0.01;

          return (
            <div
              key={suggestion.label}
              className={`p-4 border rounded-lg transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{suggestion.label}</span>
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {suggestion.price.toFixed(2)} {result.currency}
                  </div>
                  <Button
                    variant={suggestion.variant}
                    size="sm"
                    onClick={() => onAcceptPrice(suggestion.price)}
                    className="mt-2"
                  >
                    Use This Price
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Complexity Score</span>
            <Badge variant={result.complexityScore >= 3 ? "destructive" : result.complexityScore >= 2 ? "default" : "secondary"}>
              {result.complexityScore}/4
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Higher complexity scores indicate more specialized or intensive services
          </p>
        </div>
      </CardContent>
    </Card>
  );
}