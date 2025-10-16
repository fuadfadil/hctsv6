"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceListingCard } from "./ServiceListingCard";
import { ServiceFilters } from "./ServiceFilters";
import { ShoppingCart } from "./ShoppingCart";
import { BulkPurchaseForm } from "./BulkPurchaseForm";
import { OrderConfirmation } from "./OrderConfirmation";
import { Loader2, Search, ShoppingCart as CartIcon, Package } from "lucide-react";

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
  packageId?: string;
  quantity: number;
  pricePerUnit: string;
  currency: string;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  service: {
    name: string;
    description: string;
    unit: string;
  };
  category?: {
    code: string;
    title: string;
  };
  company: {
    name: string;
    type: string;
  };
}

export function MarketplaceDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeTab, setActiveTab] = useState("browse");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [searchQuery, selectedCategory, priceRange, sortBy, sortOrder]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        categoryId: selectedCategory,
        priceMin: priceRange.min,
        priceMax: priceRange.max,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/marketplace/services?${params}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (listingId: string, quantity: number) => {
    try {
      const response = await fetch("/api/marketplace/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity }),
      });

      if (response.ok) {
        // Refresh cart
        fetchCart();
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/marketplace/cart");
      if (response.ok) {
        const data = await response.json();
        setCartItems(data.cart.items || []);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filters: {
    category?: string;
    priceMin?: string;
    priceMax?: string;
    specialty?: string;
    location?: string;
    companyType?: string;
  }) => {
    setSelectedCategory(filters.category || "");
    setPriceRange({ min: filters.priceMin || "", max: filters.priceMax || "" });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Healthcare Marketplace</h1>
          <p className="text-muted-foreground">
            Browse and purchase healthcare services with health units
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowCart(true)}
            className="relative"
          >
            <CartIcon className="h-4 w-4 mr-2" />
            Cart
            {cartItems.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {cartItems.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Browse Services</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Purchase</TabsTrigger>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="flex gap-6">
            <div className="w-80 flex-shrink-0">
              <ServiceFilters onFilterChange={handleFilterChange} />
            </div>

            <div className="flex-1">
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
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="basePrice">Price</SelectItem>
                    <SelectItem value="createdAt">Date</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
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
                  {services.map((service) => (
                    <ServiceListingCard
                      key={service.id}
                      service={service}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}

              {services.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No services found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Service Categories</CardTitle>
              <CardDescription>
                Browse services by medical categories and ICD-11 classifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Categories component will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <BulkPurchaseForm />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
              <CardDescription>
                View and manage your healthcare service orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Orders component will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCart && (
        <ShoppingCart
          items={cartItems}
          onClose={() => setShowCart(false)}
          onUpdateCart={fetchCart}
        />
      )}
    </div>
  );
}