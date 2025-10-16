"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Calculator, Percent, ShoppingCart } from "lucide-react";

interface Listing {
  id: string;
  serviceId: string;
  quantity: number;
  pricePerUnit: string;
  currency: string;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  service: {
    name: string;
    description: string;
    unit: string;
  };
  company: {
    name: string;
  };
}

export function BulkPurchaseForm() {
  const [selectedListing, setSelectedListing] = useState("");
  const [quantity, setQuantity] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/marketplace/listings");
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBulkPrice = () => {
    if (!selectedListing || !quantity) return null;

    const listing = listings.find(l => l.id === selectedListing);
    if (!listing) return null;

    const qty = parseInt(quantity);
    const basePrice = parseFloat(listing.pricePerUnit);
    const discount = parseFloat(discountPercentage) || 0;

    const subtotal = basePrice * qty;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2),
      unitPrice: (total / qty).toFixed(2),
    };
  };

  const handleBulkPurchase = async () => {
    if (!selectedListing || !quantity) return;

    try {
      setCalculating(true);
      const response = await fetch("/api/marketplace/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedListing,
          quantity: parseInt(quantity),
          discountPercentage: parseFloat(discountPercentage) || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert("Bulk order placed successfully!");
        // Reset form
        setSelectedListing("");
        setQuantity("");
        setDiscountPercentage("");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error placing bulk order:", error);
      alert("An error occurred while placing the order");
    } finally {
      setCalculating(false);
    }
  };

  const selectedListingData = listings.find(l => l.id === selectedListing);
  const calculation = calculateBulkPrice();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Purchase
          </CardTitle>
          <CardDescription>
            Purchase large quantities of healthcare services with volume discounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button onClick={fetchListings} disabled={loading}>
              {loading ? "Loading..." : "Load Available Listings"}
            </Button>
          </div>

          {listings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="listing">Select Service</Label>
                  <Select value={selectedListing} onValueChange={setSelectedListing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {listings.map((listing) => (
                        <SelectItem key={listing.id} value={listing.id}>
                          {listing.service.name} - {listing.pricePerUnit} HU ({listing.quantity} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min={selectedListingData?.minOrderQuantity || 1}
                    max={selectedListingData?.maxOrderQuantity || selectedListingData?.quantity}
                  />
                  {selectedListingData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Min: {selectedListingData.minOrderQuantity}, Max: {selectedListingData.maxOrderQuantity || selectedListingData.quantity}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="discount">Discount Percentage (Optional)</Label>
                  <Input
                    id="discount"
                    type="number"
                    placeholder="0"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Volume discount percentage (negotiated with provider)
                  </p>
                </div>

                <Button
                  onClick={handleBulkPurchase}
                  disabled={!selectedListing || !quantity || calculating}
                  className="w-full"
                >
                  {calculating ? (
                    <>
                      <Calculator className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Place Bulk Order
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                {selectedListingData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Service Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span className="font-semibold">{selectedListingData.service.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Provider:</span>
                        <span>{selectedListingData.company.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Price:</span>
                        <span>{selectedListingData.pricePerUnit} HU per {selectedListingData.service.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <Badge variant="outline">{selectedListingData.quantity} {selectedListingData.service.unit}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {calculation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Price Calculation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{calculation.subtotal} HU</span>
                      </div>
                      {parseFloat(discountPercentage) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({discountPercentage}%):</span>
                          <span>-{calculation.discountAmount} HU</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span>{calculation.total} HU</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Effective Unit Price:</span>
                        <span>{calculation.unitPrice} HU per {selectedListingData?.service.unit}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {listings.length === 0 && !loading && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                Click "Load Available Listings" to view services available for bulk purchase.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}