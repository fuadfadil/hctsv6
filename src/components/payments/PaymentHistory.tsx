"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, History, Eye, Download, Filter, Calendar, DollarSign, CreditCard } from "lucide-react";

interface PaymentRecord {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  status: string;
  transactionId: string;
  gatewayTransactionId?: string;
  paymentDate?: string;
  processedAt?: string;
  failureReason?: string;
  notes?: string;
  createdAt: string;
  order: {
    id: string;
    totalAmount: string;
    currency: string;
    status: string;
    orderDate: string;
  };
  paymentMethod: {
    id: string;
    type: string;
    provider: string;
  };
  gateway: {
    id: string;
    name: string;
    provider: string;
  };
  transactions: Array<{
    id: string;
    type: string;
    amount: string;
    currency: string;
    status: string;
    processedAt?: string;
  }>;
  refunds: Array<{
    id: string;
    amount: string;
    currency: string;
    reason: string;
    status: string;
    processedAt?: string;
  }>;
}

interface PaymentHistoryProps {
  limit?: number;
  showFilters?: boolean;
  showExport?: boolean;
}

export function PaymentHistory({ limit = 20, showFilters = true, showExport = true }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [currentPage, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        ),
      });

      const response = await fetch(`/api/payments/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      case "processing":
        return "outline";
      case "cancelled":
        return "secondary";
      case "refunded":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: string, currency: string) => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  const getPaymentMethodDisplay = (method: PaymentRecord['paymentMethod']) => {
    const providerNames: Record<string, string> = {
      'libyana_mobile': 'Mobile Money',
      'libyana_bank': 'Bank Transfer',
      'libyana_card': 'Card Payment',
    };

    return providerNames[method.provider] || method.provider;
  };

  const exportToCSV = () => {
    const headers = [
      'Payment ID',
      'Order ID',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Transaction ID',
      'Created Date',
      'Processed Date'
    ];

    const csvData = payments.map(payment => [
      payment.id,
      payment.orderId,
      payment.amount,
      payment.currency,
      payment.status,
      getPaymentMethodDisplay(payment.paymentMethod),
      payment.transactionId,
      formatDate(payment.createdAt),
      payment.processedAt ? formatDate(payment.processedAt) : '',
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && payments.length === 0) {
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                View and manage your payment transactions
              </CardDescription>
            </div>
            {showExport && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />

                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />

                <Input
                  type="number"
                  placeholder="Min Amount"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                />

                <Input
                  type="number"
                  placeholder="Max Amount"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Payments Table */}
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                You haven't made any payments yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        {payment.id.slice(-8)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {payment.orderId.slice(-8)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodDisplay(payment.paymentMethod)}
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payment Details</DialogTitle>
                              <DialogDescription>
                                Complete information about payment #{payment.id.slice(-8)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Payment Summary */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-medium">Amount</span>
                                  </div>
                                  <p className="text-2xl font-bold">
                                    {formatCurrency(payment.amount, payment.currency)}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    <span className="font-medium">Status</span>
                                  </div>
                                  <Badge variant={getStatusBadgeVariant(payment.status)} className="text-lg px-3 py-1">
                                    {payment.status}
                                  </Badge>
                                </div>
                              </div>

                              {/* Payment Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-semibold mb-2">Payment Information</h4>
                                  <div className="space-y-1">
                                    <div><strong>Payment ID:</strong> {payment.id}</div>
                                    <div><strong>Transaction ID:</strong> {payment.transactionId}</div>
                                    {payment.gatewayTransactionId && (
                                      <div><strong>Gateway ID:</strong> {payment.gatewayTransactionId}</div>
                                    )}
                                    <div><strong>Method:</strong> {getPaymentMethodDisplay(payment.paymentMethod)}</div>
                                    <div><strong>Gateway:</strong> {payment.gateway.name}</div>
                                    <div><strong>Created:</strong> {formatDate(payment.createdAt)}</div>
                                    {payment.processedAt && (
                                      <div><strong>Processed:</strong> {formatDate(payment.processedAt)}</div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Order Information</h4>
                                  <div className="space-y-1">
                                    <div><strong>Order ID:</strong> {payment.order.id}</div>
                                    <div><strong>Order Status:</strong> {payment.order.status}</div>
                                    <div><strong>Order Total:</strong> {formatCurrency(payment.order.totalAmount, payment.order.currency)}</div>
                                    <div><strong>Order Date:</strong> {formatDate(payment.order.orderDate)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Transactions */}
                              {payment.transactions.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">Transaction History</h4>
                                  <div className="space-y-2">
                                    {payment.transactions.map((tx) => (
                                      <div key={tx.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                        <div>
                                          <span className="font-medium capitalize">{tx.type}</span>
                                          <span className="text-sm text-muted-foreground ml-2">
                                            {formatCurrency(tx.amount, tx.currency)}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                                            {tx.status}
                                          </Badge>
                                          {tx.processedAt && (
                                            <div className="text-xs text-muted-foreground">
                                              {formatDate(tx.processedAt)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Refunds */}
                              {payment.refunds.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">Refunds</h4>
                                  <div className="space-y-2">
                                    {payment.refunds.map((refund) => (
                                      <div key={refund.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                                        <div>
                                          <span className="font-medium">Refund</span>
                                          <span className="text-sm text-muted-foreground ml-2">
                                            {formatCurrency(refund.amount, refund.currency)}
                                          </span>
                                          <div className="text-xs text-muted-foreground">
                                            Reason: {refund.reason}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <Badge variant={refund.status === 'completed' ? 'destructive' : 'secondary'}>
                                            {refund.status}
                                          </Badge>
                                          {refund.processedAt && (
                                            <div className="text-xs text-muted-foreground">
                                              {formatDate(refund.processedAt)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {payment.notes && (
                                <div>
                                  <h4 className="font-semibold mb-2">Notes</h4>
                                  <p className="text-sm text-muted-foreground">{payment.notes}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
    </div>
  );
}