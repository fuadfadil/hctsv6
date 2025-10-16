"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, Plus, Trash2, ShoppingCart } from "lucide-react";

interface BulkItem {
  listingId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: string;
  discountAmount: string;
  finalPrice: string;
}

interface BulkDiscountCalculatorProps {
  onCartUpdate: () => void;
}

export function BulkDiscountCalculator({ onCartUpdate }: BulkDiscountCalculatorProps) {
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    listingId: "",
    quantity: 1,
  });
  const [calculating, setCalculating] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [results, setResults] = useState<{
    subtotal: string;
    discountTotal: string;
    finalTotal: string;
    currency: string;
    bulkDiscountApplied: boolean;
  } | null>(null);

  const addItem = () => {
    if (!currentItem.listingId || currentItem.quantity < 1) return;

    // For demo purposes, we'll create a mock item
    // In a real implementation, you'd fetch the actual service details
    const mockItem: BulkItem = {
      listingId: currentItem.listingId,
      serviceName: `Service ${currentItem.listingId}`,
      quantity: currentItem.quantity,
      unitPrice: 10.00, // Mock price
      discountPercentage: "0",
      discountAmount: "0",
      finalPrice: (10.00 * currentItem.quantity).toFixed(2),
    };

    setBulkItems([...bulkItems, mockItem]);
    setCurrentItem({ listingId: "", quantity: 1 });
  };

  const removeItem = (index: number) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
    setResults(null);
  };

  const calculateBulkDiscounts = async () => {
    if (!bulkItems.length) return;

    setCalculating(true);
    try {
      const items = bulkItems.map(item => ({
        listingId: item.listingId,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/purchase/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults({
          subtotal: data.cart.subtotal,
          discountTotal: data.cart.discountTotal,
          finalTotal: data.cart.finalTotal,
          currency: data.cart.currency,
          bulkDiscountApplied: data.cart.bulkDiscountApplied,
        });

        // Update the items with calculated discounts
        const updatedItems = bulkItems.map((item, index) => ({
          ...item,
          discountPercentage: data.cart.items[index].discountPercentage,
          discountAmount: data.cart.items[index].discountAmount,
          finalPrice: data.cart.items[index].finalPrice,
        }));
        setBulkItems(updatedItems);
      }
    } catch (error) {
      console.error("Error calculating bulk discounts:", error);
    } finally {
      setCalculating(false);
    }
  };

  const addBulkToCart = async () => {
    if (!bulkItems.length) return;

    setAddingToCart(true);
    try {
      const items = bulkItems.map(item => ({
        listingId: item.listingId,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/purchase/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        onCartUpdate();
        setBulkItems([]);
        setResults(null);
        alert("Bulk items added to cart successfully!");
      }
    } catch (error) {
      console.error("Error adding bulk to cart:", error);
      alert("Error adding items to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const subtotal = bulkItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Bulk Discount Calculator
          </CardTitle>
          <CardDescription>
            Calculate volume discounts for large healthcare service purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add Item Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="listingId">Service/Listing ID</Label>
                <Input
                  id="listingId"
                  placeholder="Enter listing ID"
                  value={currentItem.listingId}
                  onChange={(e) => setCurrentItem({ ...currentItem, listingId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            {bulkItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Items to Calculate</h3>
                <div className="space-y-3">
                  {bulkItems.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.serviceName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} • Unit Price: {item.unitPrice.toFixed(2)} HU
                          </p>
                          {results && (
                            <div className="mt-2 text-sm">
                              {parseFloat(item.discountAmount) > 0 ? (
                                <div className="text-green-600">
                                  <p>Discount: {item.discountPercentage}% (-{item.discountAmount} HU)</p>
                                  <p className="font-semibold">Final Price: {item.finalPrice} HU</p>
                                </div>
                              ) : (
                                <p>Total: {item.finalPrice} HU</p>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Calculate Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={calculateBulkDiscounts}
                    disabled={calculating}
                    size="lg"
                  >
                    {calculating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    Calculate Bulk Discounts
                  </Button>
                </div>

                {/* Results Summary */}
                {results && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-4">Bulk Discount Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{results.subtotal} {results.currency}</span>
                        </div>
                        {parseFloat(results.discountTotal) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Total Discounts:</span>
                            <span>-{results.discountTotal} {results.currency}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Final Total:</span>
                          <span>{results.finalTotal} {results.currency}</span>
                        </div>
                        {results.bulkDiscountApplied && (
                          <Badge className="mt-2">Bulk Discount Applied</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add to Cart Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={addBulkToCart}
                    disabled={addingToCart || !results}
                    size="lg"
                    className="px-8"
                  >
                    {addingToCart ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Add Bulk Order to Cart
                  </Button>
                </div>
              </div>
            )}

            {bulkItems.length === 0 && (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items added yet</h3>
                <p className="text-muted-foreground">
                  Add healthcare services above to calculate bulk discounts.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}