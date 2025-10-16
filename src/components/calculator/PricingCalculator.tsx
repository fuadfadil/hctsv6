"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calculator, TrendingUp, DollarSign, Activity } from "lucide-react";
import { ICD11Selector } from "./ICD11Selector";
import { PriceSuggestions } from "./PriceSuggestions";
import { MarketInsights } from "./MarketInsights";

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
  calculationId: string;
}

export function PricingCalculator() {
  const [formData, setFormData] = useState({
    serviceName: "",
    serviceDescription: "",
    icd11Code: "",
    quantity: 1,
    basePrice: "",
    currency: "LYD",
    region: "Libya",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/calculator/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity.toString()),
          basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate pricing");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleICD11Select = (code: string) => {
    setFormData(prev => ({ ...prev, icd11Code: code }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Healthcare Service Pricing Calculator
          </CardTitle>
          <CardDescription>
            Calculate optimal pricing for healthcare services using AI and market data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceName: e.target.value }))}
                    placeholder="e.g., General Consultation"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="serviceDescription">Service Description</Label>
                  <Textarea
                    id="serviceDescription"
                    value={formData.serviceDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceDescription: e.target.value }))}
                    placeholder="Describe the healthcare service..."
                    rows={3}
                  />
                </div>

                <ICD11Selector
                  selectedCode={formData.icd11Code}
                  onCodeSelect={handleICD11Select}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="basePrice">Base Price (Optional)</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                      placeholder="Auto-calculated if empty"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LYD">LYD (Libyan Dinar)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Libya">Libya</SelectItem>
                        <SelectItem value="Tunisia">Tunisia</SelectItem>
                        <SelectItem value="Egypt">Egypt</SelectItem>
                        <SelectItem value="Algeria">Algeria</SelectItem>
                        <SelectItem value="Morocco">Morocco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {result && (
                  <PriceSuggestions
                    result={result}
                    onAcceptPrice={(price) => {
                      setFormData(prev => ({ ...prev, basePrice: price.toString() }));
                    }}
                  />
                )}

                <MarketInsights
                  serviceName={formData.serviceName}
                  icd11Code={formData.icd11Code}
                  region={formData.region}
                  currency={formData.currency}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Pricing
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pricing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.finalPrice.toFixed(2)} {result.currency}
                </div>
                <div className="text-sm text-muted-foreground">Final Price</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.healthUnits.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Health Units</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {result.discountPercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Discount Applied</div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">AI Reasoning</h4>
                <p className="text-sm text-muted-foreground">{result.reasoning}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Market Insights</h4>
                <div className="flex flex-wrap gap-2">
                  {result.marketInsights.map((insight, index) => (
                    <Badge key={index} variant="secondary">
                      {insight}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}