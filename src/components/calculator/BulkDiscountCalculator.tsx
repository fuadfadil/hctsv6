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
import { Loader2, Package, Calculator, Plus, Trash2 } from "lucide-react";

interface BulkService {
  id: string;
  serviceName: string;
  serviceDescription: string;
  icd11Code: string;
  quantity: number;
  basePrice?: number;
}

interface BulkResult {
  results: Array<{
    id: string;
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
  }>;
  summary: {
    totalServices: number;
    totalValue: number;
    totalHealthUnits: number;
    averageDiscount: number;
    currency: string;
  };
}

export function BulkDiscountCalculator() {
  const [services, setServices] = useState<BulkService[]>([
    { id: '1', serviceName: '', serviceDescription: '', icd11Code: '', quantity: 1 }
  ]);
  const [globalSettings, setGlobalSettings] = useState({
    currency: 'LYD',
    region: 'Libya',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState("");

  const addService = () => {
    const newId = (services.length + 1).toString();
    setServices(prev => [...prev, {
      id: newId,
      serviceName: '',
      serviceDescription: '',
      icd11Code: '',
      quantity: 1
    }]);
  };

  const removeService = (id: string) => {
    if (services.length > 1) {
      setServices(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateService = (id: string, field: keyof BulkService, value: any) => {
    setServices(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate services
    const validServices = services.filter(s => s.serviceName.trim());
    if (validServices.length === 0) {
      setError("At least one service with a name is required");
      setLoading(false);
      return;
    }

    try {
      const bulkData = {
        services: validServices.map(s => ({
          id: s.id,
          serviceName: s.serviceName,
          serviceDescription: s.serviceDescription,
          icd11Code: s.icd11Code,
          quantity: s.quantity,
          basePrice: s.basePrice,
          currency: globalSettings.currency,
          region: globalSettings.region,
        }))
      };

      const response = await fetch("/api/calculator/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bulkData),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate bulk pricing");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getDiscountTier = (count: number): { percentage: number; description: string } => {
    if (count >= 50) return { percentage: 25, description: "Enterprise (50+ services)" };
    if (count >= 20) return { percentage: 15, description: "Large (20-49 services)" };
    if (count >= 10) return { percentage: 10, description: "Medium (10-19 services)" };
    if (count >= 5) return { percentage: 5, description: "Small (5-9 services)" };
    return { percentage: 0, description: "Individual (1-4 services)" };
  };

  const discountTier = getDiscountTier(services.filter(s => s.serviceName.trim()).length);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Pricing Calculator
          </CardTitle>
          <CardDescription>
            Calculate pricing for multiple healthcare services with volume discounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Global Settings */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="globalCurrency">Currency</Label>
              <Select
                value={globalSettings.currency}
                onValueChange={(value) => setGlobalSettings(prev => ({ ...prev, currency: value }))}
              >
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
              <Label htmlFor="globalRegion">Region</Label>
              <Select
                value={globalSettings.region}
                onValueChange={(value) => setGlobalSettings(prev => ({ ...prev, region: value }))}
              >
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

          {/* Discount Preview */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Volume Discount Preview</h4>
                <p className="text-sm text-muted-foreground">
                  {services.filter(s => s.serviceName.trim()).length} services → {discountTier.percentage}% discount
                </p>
              </div>
              <Badge variant="secondary">{discountTier.description}</Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Services */}
            <div className="space-y-4">
              {services.map((service, index) => (
                <Card key={service.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Service {index + 1}</h4>
                      {services.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Service Name *</Label>
                        <Input
                          value={service.serviceName}
                          onChange={(e) => updateService(service.id, 'serviceName', e.target.value)}
                          placeholder="e.g., General Consultation"
                          required
                        />
                      </div>

                      <div>
                        <Label>ICD-11 Code (Optional)</Label>
                        <Input
                          value={service.icd11Code}
                          onChange={(e) => updateService(service.id, 'icd11Code', e.target.value)}
                          placeholder="e.g., BA00"
                        />
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={service.quantity}
                          onChange={(e) => updateService(service.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div>
                        <Label>Base Price (Optional)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={service.basePrice || ''}
                          onChange={(e) => updateService(service.id, 'basePrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="Auto-calculated if empty"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Description (Optional)</Label>
                        <Textarea
                          value={service.serviceDescription}
                          onChange={(e) => updateService(service.id, 'serviceDescription', e.target.value)}
                          placeholder="Service description..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={addService}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>

              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Bulk Pricing
                  </>
                )}
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Pricing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.summary.totalServices}
                </div>
                <div className="text-sm text-muted-foreground">Services</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.summary.totalValue.toFixed(2)} {result.summary.currency}
                </div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {result.summary.totalHealthUnits.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Health Units</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {result.summary.averageDiscount.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Discount</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Service Breakdown</h4>
              {result.results.map((serviceResult) => (
                <Card key={serviceResult.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium">{serviceResult.id}</h5>
                        <p className="text-sm text-muted-foreground">
                          Final: {serviceResult.finalPrice.toFixed(2)} {serviceResult.currency}
                          ({serviceResult.discountPercentage}% discount)
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {serviceResult.healthUnits.toFixed(2)} HU
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}