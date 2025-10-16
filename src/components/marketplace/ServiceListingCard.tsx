"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Eye, Package } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: string;
  unit: string;
  category?: {
    code: string;
    title: string;
  };
  listingCount: number;
  minPrice?: string;
  maxPrice?: string;
}

interface Listing {
  id: string;
  serviceId: string;
  quantity: number;
  pricePerUnit: string;
  currency: string;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  company: {
    name: string;
    type: string;
  };
}

interface ServiceListingCardProps {
  service: Service;
  onAddToCart: (listingId: string, quantity: number) => void;
}

export function ServiceListingCard({ service, onAddToCart }: ServiceListingCardProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = async () => {
    if (listings.length > 0) return; // Already fetched

    try {
      setLoading(true);
      const response = await fetch(`/api/marketplace/listings?serviceId=${service.id}`);
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

  const handleAddToCart = (listingId: string) => {
    onAddToCart(listingId, selectedQuantity);
    setShowDetails(false);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{service.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {service.description}
            </CardDescription>
          </div>
          {service.category && (
            <Badge variant="secondary" className="text-xs">
              {service.category.code}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Base Price:</span>
            <span className="font-semibold">
              {service.basePrice} HU / {service.unit}
            </span>
          </div>

          {service.minPrice && service.maxPrice && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Market Range:</span>
              <span className="text-sm">
                {service.minPrice} - {service.maxPrice} HU
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Active Listings:</span>
            <Badge variant="outline">{service.listingCount}</Badge>
          </div>

          {service.category && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Category: {service.category.title}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1" onClick={fetchListings}>
              <Eye className="h-4 w-4 mr-2" />
              View Listings
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{service.name} - Available Listings</DialogTitle>
              <DialogDescription>
                {service.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading listings...</div>
              ) : listings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active listings available for this service.
                </div>
              ) : (
                listings.map((listing) => (
                  <Card key={listing.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{listing.company.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {listing.quantity} {service.unit} available
                        </p>
                      </div>
                      <Badge variant="outline">
                        {listing.currency}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="text-xs">Price per Unit</Label>
                        <p className="font-semibold">{listing.pricePerUnit} {listing.currency}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Min Order</Label>
                        <p className="text-sm">{listing.minOrderQuantity} {service.unit}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`quantity-${listing.id}`} className="text-xs">
                          Quantity
                        </Label>
                        <Input
                          id={`quantity-${listing.id}`}
                          type="number"
                          min={listing.minOrderQuantity}
                          max={listing.maxOrderQuantity || listing.quantity}
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                          className="h-8"
                        />
                      </div>
                      <Button
                        onClick={() => handleAddToCart(listing.id)}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}