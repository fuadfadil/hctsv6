'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Building } from 'lucide-react';

interface PortfolioData {
  id: string;
  name: string;
  description: string;
  totalValue: number;
  currency: string;
  createdAt: string;
  holdingCount: number;
}

interface PortfolioDetail {
  portfolio: {
    id: string;
    name: string;
    description: string;
    totalValue: number;
    currency: string;
    createdAt: string;
  };
  holdings: Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    quantity: number;
    purchasePrice: number;
    currentValue: number;
    purchaseDate: string;
    lastUpdated: string;
    companyName: string;
  }>;
}

export default function PortfolioManagement() {
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddHoldingDialog, setShowAddHoldingDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);

  // Form states
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/buyer/portfolio');
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Portfolio management is only available for investor accounts');
        }
        throw new Error('Failed to fetch portfolios');
      }
      const data = await response.json();
      setPortfolios(data.portfolios);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioDetails = async (portfolioId: string) => {
    try {
      const response = await fetch(`/api/buyer/portfolio?id=${portfolioId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio details');
      }
      const data = await response.json();
      setSelectedPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio details');
    }
  };

  const createPortfolio = async () => {
    if (!portfolioName.trim()) return;

    try {
      setCreating(true);
      const response = await fetch('/api/buyer/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: portfolioName.trim(),
          description: portfolioDescription.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portfolio');
      }

      setShowCreateDialog(false);
      resetCreateForm();
      fetchPortfolios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setCreating(false);
    }
  };

  const addHolding = async () => {
    if (!selectedPortfolio || !serviceId || !quantity || !purchasePrice) return;

    try {
      setAddingHolding(true);
      const response = await fetch('/api/buyer/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId: selectedPortfolio.portfolio.id,
          serviceId: serviceId.trim(),
          quantity: parseInt(quantity),
          purchasePrice: parseFloat(purchasePrice),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add holding');
      }

      setShowAddHoldingDialog(false);
      resetHoldingForm();
      fetchPortfolioDetails(selectedPortfolio.portfolio.id);
      fetchPortfolios(); // Refresh portfolio list for updated values
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holding');
    } finally {
      setAddingHolding(false);
    }
  };

  const resetCreateForm = () => {
    setPortfolioName('');
    setPortfolioDescription('');
  };

  const resetHoldingForm = () => {
    setServiceId('');
    setQuantity('');
    setPurchasePrice('');
  };

  const calculatePortfolioMetrics = (holdings: PortfolioDetail['holdings']) => {
    const totalInvested = holdings.reduce((sum, h) => sum + (h.purchasePrice * h.quantity), 0);
    const currentValue = holdings.reduce((sum, h) => sum + (h.currentValue * h.quantity), 0);
    const totalReturn = currentValue - totalInvested;
    const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      totalReturn,
      totalReturnPercentage
    };
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (percentage < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-500">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Management</h1>
          <p className="text-muted-foreground">
            Track and manage your healthcare service investments
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Create a new portfolio to track your healthcare service investments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="portfolioName">Portfolio Name</Label>
                <Input
                  id="portfolioName"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="e.g., Primary Healthcare Investments"
                />
              </div>
              <div>
                <Label htmlFor="portfolioDescription">Description (Optional)</Label>
                <Textarea
                  id="portfolioDescription"
                  value={portfolioDescription}
                  onChange={(e) => setPortfolioDescription(e.target.value)}
                  placeholder="Describe your investment strategy..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createPortfolio}
                  disabled={creating || !portfolioName.trim()}
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Portfolio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios.length}</div>
            <p className="text-xs text-muted-foreground">
              Active portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolios.reduce((sum, p) => sum + p.totalValue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolios.reduce((sum, p) => sum + p.holdingCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Individual investments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolios.length > 0
                ? Math.round(portfolios.reduce((sum, p) => sum + p.totalValue, 0) / portfolios.length).toLocaleString()
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Per portfolio average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolios List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {portfolios.map((portfolio) => (
          <Card key={portfolio.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {portfolio.name}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPortfolioDetails(portfolio.id)}
                >
                  View Details
                </Button>
              </CardTitle>
              <CardDescription>{portfolio.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-medium">
                    {portfolio.currency} {portfolio.totalValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Holdings</span>
                  <span className="font-medium">{portfolio.holdingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {new Date(portfolio.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {portfolios.length === 0 && (
          <div className="col-span-full text-center py-12">
            <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No portfolios yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first portfolio to start tracking healthcare service investments.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create First Portfolio
            </Button>
          </div>
        )}
      </div>

      {/* Portfolio Details Modal */}
      {selectedPortfolio && (
        <Dialog open={!!selectedPortfolio} onOpenChange={() => setSelectedPortfolio(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPortfolio.portfolio.name}</DialogTitle>
              <DialogDescription>
                {selectedPortfolio.portfolio.description || 'Portfolio details and holdings'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Portfolio Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                {(() => {
                  const metrics = calculatePortfolioMetrics(selectedPortfolio.holdings);
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {selectedPortfolio.portfolio.currency} {metrics.totalInvested.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Total Invested</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {selectedPortfolio.portfolio.currency} {metrics.currentValue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Current Value</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${getPerformanceColor(metrics.totalReturn)}`}>
                          {selectedPortfolio.portfolio.currency} {metrics.totalReturn.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Total Return</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold flex items-center justify-center ${getPerformanceColor(metrics.totalReturnPercentage)}`}>
                          {getPerformanceIcon(metrics.totalReturnPercentage)}
                          <span className="ml-1">{metrics.totalReturnPercentage.toFixed(2)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Return %</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Holdings */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Holdings</h3>
                  <Button size="sm" onClick={() => setShowAddHoldingDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holding
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedPortfolio.holdings.map((holding) => (
                    <div key={holding.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{holding.serviceName}</p>
                          <p className="text-sm text-muted-foreground">{holding.companyName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {holding.quantity} units @ {selectedPortfolio.portfolio.currency} {holding.purchasePrice.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purchased {new Date(holding.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {selectedPortfolio.holdings.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No holdings in this portfolio yet.</p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowAddHoldingDialog(true)}
                      >
                        Add First Holding
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Holding Dialog */}
      <Dialog open={showAddHoldingDialog} onOpenChange={setShowAddHoldingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
            <DialogDescription>
              Add a new healthcare service holding to your portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceId">Service ID</Label>
              <Input
                id="serviceId"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="Enter service ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddHoldingDialog(false)}
                disabled={addingHolding}
              >
                Cancel
              </Button>
              <Button
                onClick={addHolding}
                disabled={addingHolding || !serviceId || !quantity || !purchasePrice}
              >
                {addingHolding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Holding
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}