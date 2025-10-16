"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Shield, AlertTriangle, Calendar } from "lucide-react";

interface License {
  id: string;
  licenseNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  licenseType: string;
  status: string;
  isVerified: boolean;
  fileName?: string;
}

interface LicenseManagementProps {
  companyId: string;
}

export function LicenseManagement({ companyId }: LicenseManagementProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newLicense, setNewLicense] = useState({
    licenseNumber: "",
    issuingAuthority: "",
    issueDate: "",
    expiryDate: "",
    licenseType: "General",
    status: "active",
  });

  useEffect(() => {
    fetchLicenses();
  }, [companyId]);

  const fetchLicenses = async () => {
    try {
      const response = await fetch(`/api/company/licenses?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch licenses");
      }
      const data = await response.json();
      setLicenses(data.licenses || []);
      setExpiringLicenses(data.expiringLicenses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/company/licenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          ...newLicense,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add license");
      }

      setSuccess("License added successfully");
      setIsDialogOpen(false);
      setNewLicense({
        licenseNumber: "",
        issuingAuthority: "",
        issueDate: "",
        expiryDate: "",
        licenseType: "General",
        status: "active",
      });
      fetchLicenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string, expiryDate?: string) => {
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      if (expiry <= now) {
        return "bg-red-100 text-red-800";
      } else if (expiry <= thirtyDaysFromNow) {
        return "bg-yellow-100 text-yellow-800";
      }
    }

    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "suspended":
        return "bg-orange-100 text-orange-800";
      case "revoked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (license: License) => {
    if (license.expiryDate) {
      const expiry = new Date(license.expiryDate);
      const now = new Date();
      if (expiry <= now) return "Expired";
    }
    return license.status.charAt(0).toUpperCase() + license.status.slice(1);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading licenses...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expiring Licenses Alert */}
      {expiringLicenses.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{expiringLicenses.length} license(s) expiring soon:</strong>{" "}
            {expiringLicenses.map(license => license.licenseNumber).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Success/Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Licenses List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Healthcare Licenses
              </CardTitle>
              <CardDescription>
                Manage your healthcare licenses and certifications
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add License
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New License</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new healthcare license or certification.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddLicense} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={newLicense.licenseNumber}
                        onChange={(e) => setNewLicense(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                      <Input
                        id="issuingAuthority"
                        value={newLicense.issuingAuthority}
                        onChange={(e) => setNewLicense(prev => ({ ...prev, issuingAuthority: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="licenseType">License Type</Label>
                      <Input
                        id="licenseType"
                        value={newLicense.licenseType}
                        onChange={(e) => setNewLicense(prev => ({ ...prev, licenseType: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="issueDate">Issue Date</Label>
                      <Input
                        id="issueDate"
                        type="date"
                        value={newLicense.issueDate}
                        onChange={(e) => setNewLicense(prev => ({ ...prev, issueDate: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={newLicense.expiryDate}
                        onChange={(e) => setNewLicense(prev => ({ ...prev, expiryDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        "Add License"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No licenses found</h3>
              <p className="text-muted-foreground mb-4">
                Add your healthcare licenses and certifications to maintain compliance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {licenses.map((license) => (
                <div key={license.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{license.licenseNumber}</h4>
                      <Badge className={getStatusColor(license.status, license.expiryDate)}>
                        {getStatusText(license)}
                      </Badge>
                      {license.isVerified && (
                        <Badge variant="outline" className="text-green-600">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {license.issuingAuthority} • {license.licenseType}
                    </p>
                    {license.expiryDate && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires: {new Date(license.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Issued: {license.issueDate ? new Date(license.issueDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}