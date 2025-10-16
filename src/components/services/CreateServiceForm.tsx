"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ICD11Selector } from '@/components/calculator/ICD11Selector';
import { PricingCalculator } from '@/lib/pricing-calculator';
import { Loader2, Search, Calculator, AlertCircle } from 'lucide-react';

interface CreateServiceFormProps {
  onSuccess: () => void;
}

interface ICD11Category {
  id: string;
  code: string;
  title: string;
  description?: string;
}

export function CreateServiceForm({ onSuccess }: CreateServiceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icd11Code: '',
    basePrice: '',
    unit: 'visit',
    quantity: 1,
    pricePerUnit: '',
    currency: 'LYD',
    minOrderQuantity: 1,
    maxOrderQuantity: '',
    isActive: true,
    createListing: true,
    expiresAt: '',
  });

  const [selectedICD11, setSelectedICD11] = useState<ICD11Category | null>(null);
  const [pricingSuggestion, setPricingSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear pricing suggestion when relevant fields change
    if (['name', 'icd11Code', 'quantity'].includes(field)) {
      setPricingSuggestion(null);
    }
  };

  const handleICD11Select = (code: string) => {
    setFormData(prev => ({ ...prev, icd11Code: code }));
    setPricingSuggestion(null);
    // Fetch category details if needed
    if (code) {
      // This would be handled by the ICD11Selector component
    } else {
      setSelectedICD11(null);
    }
  };

  const calculatePricing = async () => {
    if (!formData.name) {
      setError('Service name is required for pricing calculation');
      return;
    }

    setCalculatingPrice(true);
    setError('');

    try {
      const result = await PricingCalculator.calculatePricing({
        serviceName: formData.name,
        serviceDescription: formData.description,
        icd11Code: formData.icd11Code,
        quantity: formData.quantity,
        currency: formData.currency,
        region: 'Libya',
      });

      setPricingSuggestion(result);

      // Auto-fill pricing fields
      if (!formData.basePrice) {
        setFormData(prev => ({
          ...prev,
          basePrice: result.finalPrice.toString(),
          pricePerUnit: result.finalPrice.toString(),
        }));
      }
    } catch (error) {
      console.error('Pricing calculation error:', error);
      setError('Failed to calculate pricing. Please try again.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        maxOrderQuantity: formData.maxOrderQuantity ? parseInt(formData.maxOrderQuantity) : undefined,
        expiresAt: formData.expiresAt || undefined,
      };

      const response = await fetch('/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create service');
      }
    } catch (error) {
      console.error('Service creation error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the core details of your service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., General Consultation"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your service in detail..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visit">Per Visit</SelectItem>
                  <SelectItem value="hour">Per Hour</SelectItem>
                  <SelectItem value="procedure">Per Procedure</SelectItem>
                  <SelectItem value="day">Per Day</SelectItem>
                  <SelectItem value="week">Per Week</SelectItem>
                  <SelectItem value="month">Per Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ICD-11 Classification */}
        <Card>
          <CardHeader>
            <CardTitle>ICD-11 Classification</CardTitle>
            <CardDescription>Classify your service using ICD-11 codes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ICD11Selector
              selectedCode={formData.icd11Code}
              onCodeSelect={handleICD11Select}
            />

            {selectedICD11 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{selectedICD11.code}</Badge>
                  <span className="font-medium">{selectedICD11.title}</span>
                </div>
                {selectedICD11.description && (
                  <p className="text-sm text-muted-foreground">{selectedICD11.description}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pricing Information</CardTitle>
              <CardDescription>Set pricing and availability for your service</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={calculatePricing}
              disabled={calculatingPrice || !formData.name}
            >
              {calculatingPrice ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Calculate Price
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricingSuggestion && (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>AI Suggested Price:</strong> {pricingSuggestion.aiSuggestedPrice.toFixed(2)} {formData.currency}</p>
                  <p><strong>Market Average:</strong> {pricingSuggestion.marketAveragePrice.toFixed(2)} {formData.currency}</p>
                  <p><strong>Final Price:</strong> {pricingSuggestion.finalPrice.toFixed(2)} {formData.currency}</p>
                  <p className="text-sm text-muted-foreground">{pricingSuggestion.reasoning}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="basePrice">Base Price ({formData.currency})</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => handleInputChange('basePrice', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="pricePerUnit">Price Per Unit ({formData.currency}) *</Label>
              <Input
                id="pricePerUnit"
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => handleInputChange('pricePerUnit', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
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
          </div>
        </CardContent>
      </Card>

      {/* Availability Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Settings</CardTitle>
          <CardDescription>Configure quantity and ordering options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Available Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <Label htmlFor="minOrderQuantity">Minimum Order Quantity</Label>
              <Input
                id="minOrderQuantity"
                type="number"
                min="1"
                value={formData.minOrderQuantity}
                onChange={(e) => handleInputChange('minOrderQuantity', parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="maxOrderQuantity">Maximum Order Quantity</Label>
              <Input
                id="maxOrderQuantity"
                type="number"
                min="1"
                value={formData.maxOrderQuantity}
                onChange={(e) => handleInputChange('maxOrderQuantity', e.target.value)}
                placeholder="No limit"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expiresAt">Expiration Date</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => handleInputChange('expiresAt', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Listing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Listing</CardTitle>
          <CardDescription>Options for marketplace visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createListing"
              checked={formData.createListing}
              onCheckedChange={(checked) => handleInputChange('createListing', checked)}
            />
            <Label htmlFor="createListing">Create marketplace listing immediately</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Service is active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Service...
            </>
          ) : (
            'Create Service'
          )}
        </Button>
      </div>
    </form>
  );
}