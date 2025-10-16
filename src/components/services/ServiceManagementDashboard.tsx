"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { CreateServiceForm } from './CreateServiceForm';
// import { EditServiceForm } from './EditServiceForm';
// import { ServiceAnalytics } from './ServiceAnalytics';
// import { BulkActions } from './BulkActions';
// import { ServiceStatusManager } from './ServiceStatusManager';

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: string;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  icd11Category?: {
    id: string;
    code: string;
    title: string;
  };
  listing: {
    id: string;
    quantity: number;
    pricePerUnit: string;
    currency: string;
    minOrderQuantity: number;
    maxOrderQuantity: number | null;
    isActive: boolean;
    expiresAt: string | null;
  };
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalServices: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export function ServiceManagementDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const fetchServices = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        status: statusFilter,
        search: searchTerm,
      });

      const response = await fetch(`/api/services/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/services/analytics?period=30d');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.summary);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchAnalytics();
    setLoading(false);
  }, [currentPage, statusFilter, searchTerm]);

  const handleServiceCreated = () => {
    setShowCreateForm(false);
    fetchServices();
    fetchAnalytics();
  };

  const handleServiceUpdated = () => {
    setEditingService(null);
    fetchServices();
    fetchAnalytics();
  };

  const handleBulkAction = async (action: string, data?: any) => {
    try {
      const response = await fetch('/api/services/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: selectedServices,
          action,
          data,
        }),
      });

      if (response.ok) {
        setSelectedServices([]);
        fetchServices();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await fetch(`/api/services/delete?serviceId=${serviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchServices();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">Manage your healthcare services and monitor performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAnalytics(true)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Service
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRevenue.toFixed(2)} LYD</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageOrderValue.toFixed(2)} LYD</div>
              <p className="text-xs text-muted-foreground">Per order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Services</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalServices}</div>
              <p className="text-xs text-muted-foreground">Total services</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Manage and monitor your service listings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {selectedServices.length > 0 && (
              <Button variant="outline" onClick={() => setShowBulkActions(true)}>
                Bulk Actions ({selectedServices.length})
              </Button>
            )}
          </div>

          {/* Services Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedServices.length === services.length && services.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedServices(services.map(s => s.id));
                        } else {
                          setSelectedServices([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>ICD-11 Code</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedServices([...selectedServices, service.id]);
                          } else {
                            setSelectedServices(selectedServices.filter(id => id !== service.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">{service.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.icd11Category ? (
                        <Badge variant="outline">
                          {service.icd11Category.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.listing.pricePerUnit} {service.listing.currency}</div>
                        <div className="text-sm text-muted-foreground">per {service.unit}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.listing.quantity}</div>
                        <div className="text-sm text-muted-foreground">
                          Min: {service.listing.minOrderQuantity}
                          {service.listing.maxOrderQuantity && `, Max: ${service.listing.maxOrderQuantity}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.isActive && service.listing.isActive ? "default" : "secondary"}>
                        {service.isActive && service.listing.isActive ? (
                          <><CheckCircle className="w-3 h-3 mr-1" />Active</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(service.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ServiceStatusManager
                        service={service}
                        onUpdate={fetchServices}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Service Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Service</DialogTitle>
            <DialogDescription>
              Add a new healthcare service to your marketplace listings.
            </DialogDescription>
          </DialogHeader>
          <CreateServiceForm onSuccess={handleServiceCreated} />
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update service details and marketplace listing.
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <EditServiceForm
              service={editingService}
              onSuccess={handleServiceUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Analytics</DialogTitle>
            <DialogDescription>
              Detailed performance metrics and insights for your services.
            </DialogDescription>
          </DialogHeader>
          <ServiceAnalytics />
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActions} onOpenChange={setShowBulkActions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedServices.length} selected services.
            </DialogDescription>
          </DialogHeader>
          <BulkActions
            selectedServices={selectedServices}
            onAction={handleBulkAction}
            onClose={() => setShowBulkActions(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}