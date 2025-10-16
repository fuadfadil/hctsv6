"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, History, Package, Calendar, DollarSign, Eye } from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  discountPercentage: string;
  discountAmount: string;
  finalPrice: string;
  service: {
    name: string;
    description: string;
    unit: string;
  };
  company: {
    name: string;
  };
}

interface Order {
  id: string;
  totalAmount: string;
  currency: string;
  status: string;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  bulkDiscountApplied: boolean;
  totalDiscount: string;
  createdAt: string;
  items: OrderItem[];
  itemCount: number;
}

interface PurchaseHistoryProps {}

export function PurchaseHistory({}: PurchaseHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        limit: "10",
        offset: ((currentPage - 1) * 10).toString(),
      });

      const response = await fetch(`/api/purchase/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "processing":
        return "default";
      case "confirmed":
        return "default";
      case "shipped":
        return "outline";
      case "delivered":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Purchase History
          </CardTitle>
          <CardDescription>
            View and manage your healthcare service purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Orders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchOrders}>
              Refresh
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                You haven't placed any orders yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">Order #{order.id.slice(-8)}</h3>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                          {order.bulkDiscountApplied && (
                            <Badge variant="secondary">Bulk Discount</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.orderDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.itemCount} items
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {order.totalAmount} {order.currency}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>

                    {order.notes && (
                      <p className="text-sm text-muted-foreground mb-4">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-sm">
                      <div className="text-muted-foreground">
                        {order.deliveryDate && (
                          <span>Expected delivery: {formatDate(order.deliveryDate)}</span>
                        )}
                      </div>
                      <div className="text-right">
                        {parseFloat(order.totalDiscount) > 0 && (
                          <p className="text-green-600">
                            Saved: {order.totalDiscount} {order.currency}
                          </p>
                        )}
                        <p className="font-semibold">
                          Total: {order.totalAmount} {order.currency}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Details - #{selectedOrder.id.slice(-8)}</CardTitle>
            <CardDescription>
              Complete information about your order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedOrder.itemCount}</p>
                  <p className="text-sm text-muted-foreground">Items</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedOrder.totalAmount}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.currency}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold capitalize">{selectedOrder.status}</p>
                  <p className="text-sm text-muted-foreground">Status</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{formatDate(selectedOrder.orderDate)}</p>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-semibold">{item.service.name}</h5>
                          <p className="text-sm text-muted-foreground mb-1">
                            {item.service.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {item.company.name}
                          </p>
                          <p className="text-sm mt-1">
                            Quantity: {item.quantity} {item.service.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{item.finalPrice} {selectedOrder.currency}</p>
                          {parseFloat(item.discountAmount) > 0 && (
                            <div className="text-xs text-green-600">
                              <p>Original: {item.totalPrice} {selectedOrder.currency}</p>
                              <p>Discount: -{item.discountAmount} {selectedOrder.currency} ({item.discountPercentage}%)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Order Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{(parseFloat(selectedOrder.totalAmount) + parseFloat(selectedOrder.totalDiscount)).toFixed(2)} {selectedOrder.currency}</span>
                </div>
                {parseFloat(selectedOrder.totalDiscount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Discounts:</span>
                    <span>-{selectedOrder.totalDiscount} {selectedOrder.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Final Total:</span>
                  <span>{selectedOrder.totalAmount} {selectedOrder.currency}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}