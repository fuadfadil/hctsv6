"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Plus, Package, Building } from "lucide-react";

interface ServiceOffer {
  id: string;
  serviceId: string;
  service: {
    name: string;
    description: string;
    unit: string;
    category?: {
      code: string;
      title: string;
    };
  };
  company: {
    name: string;
  };
  listing: {
    id: string;
    quantity: number;
    pricePerUnit: string;
    currency: string;
    minOrderQuantity: number;
    maxOrderQuantity?: number;
    expiresAt?: string;
  };
}

interface ServiceOffersDisplayProps {
  onCartUpdate: () => void;
}

export function ServiceOffersDisplay({ onCartUpdate }: ServiceOffersDisplayProps) {
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedOffer, setSelectedOffer] = useState<ServiceOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        categoryId: selectedCategory,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/marketplace/services?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformedOffers = data.services?.map((service: any) => ({
          id: service.id,
          serviceId: service.id,
          service: {
            name: service.name,
            description: service.description,
            unit: service.unit,
            category: service.category,
          },
          company: {
            name: "Healthcare Provider", // This would come from the actual data
          },
          listing: {
            id: `listing-${service.id}`,
            quantity: service.listingCount || 100,
            pricePerUnit: service.basePrice || "10.00",
            currency: "HU",
            minOrderQuantity: 1,
            maxOrderQuantity: 1000,
          },
        })) || [];
        setOffers(transformedOffers);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (offer: ServiceOffer) => {
    setAddingToCart(true);
    try {
      const response = await fetch("/api/purchase/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: offer.listing.id,
          quantity: quantity,
        }),
      });

      if (response.ok) {
        onCartUpdate();
        setSelectedOffer(null);
        setQuantity(1);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("An error occurred while adding to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const openAddToCartDialog = (offer: ServiceOffer) => {
    setSelectedOffer(offer);
    setQuantity(offer.listing.minOrderQuantity);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Service Offers</CardTitle>
          <CardDescription>
            Browse and select healthcare services from verified providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
                <SelectItem value="neurology">Neurology</SelectItem>
                <SelectItem value="orthopedics">Orthopedics</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{offer.service.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {offer.service.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {offer.listing.pricePerUnit} {offer.listing.currency}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        {offer.company.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        {offer.service.unit} • Min: {offer.listing.minOrderQuantity}
                      </div>
                      {offer.service.category && (
                        <Badge variant="outline" className="text-xs">
                          {offer.service.category.title}
                        </Badge>
                      )}
                      <Button
                        onClick={() => openAddToCartDialog(offer)}
                        className="w-full"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && offers.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No service offers found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or check back later.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Cart Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
            <DialogDescription>
              Specify the quantity for {selectedOffer?.service.name}
            </DialogDescription>
          </DialogHeader>

          {selectedOffer && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedOffer.service.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedOffer.service.description}
                </p>
                <div className="flex justify-between text-sm">
                  <span>Price per unit:</span>
                  <span>{selectedOffer.listing.pricePerUnit} {selectedOffer.listing.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available:</span>
                  <span>{selectedOffer.listing.quantity} {selectedOffer.service.unit}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min={selectedOffer.listing.minOrderQuantity}
                  max={selectedOffer.listing.maxOrderQuantity || selectedOffer.listing.quantity}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: {selectedOffer.listing.minOrderQuantity}, Maximum: {selectedOffer.listing.maxOrderQuantity || selectedOffer.listing.quantity}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">
                    {(parseFloat(selectedOffer.listing.pricePerUnit) * quantity).toFixed(2)} {selectedOffer.listing.currency}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSelectedOffer(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleAddToCart(selectedOffer)}
                    disabled={addingToCart}
                  >
                    {addingToCart ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}