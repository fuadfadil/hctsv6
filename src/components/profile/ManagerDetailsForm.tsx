"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, User } from "lucide-react";

interface ManagerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  position: string;
  experience: string;
}

interface ManagerDetailsFormProps {
  companyId: string;
}

export function ManagerDetailsForm({ companyId }: ManagerDetailsFormProps) {
  const [manager, setManager] = useState<ManagerDetails>({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    position: "",
    experience: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchManagerDetails();
  }, [companyId]);

  const fetchManagerDetails = async () => {
    try {
      const response = await fetch(`/api/company/profile?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch manager details");
      }
      const data = await response.json();

      // Extract manager details from specificData
      const specificData = data.company.specificData || {};
      const managerData = specificData.manager || {};

      setManager({
        name: managerData.name || "",
        email: managerData.email || "",
        phone: managerData.phone || "",
        address: managerData.address || "",
        dateOfBirth: managerData.dateOfBirth || "",
        position: managerData.position || "",
        experience: managerData.experience || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/company/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          specificData: {
            manager,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save manager details");
      }

      setSuccess("Manager details saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ManagerDetails, value: string) => {
    setManager(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading manager details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Manager Details
        </CardTitle>
        <CardDescription>
          Update the primary contact and manager information for your company
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={manager.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter manager's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={manager.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="manager@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={manager.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={manager.dateOfBirth}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position/Title</Label>
              <Input
                id="position"
                value={manager.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                placeholder="CEO, Director, Manager, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={manager.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter complete address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Professional Experience</Label>
            <Textarea
              id="experience"
              value={manager.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              placeholder="Describe relevant experience, qualifications, and background"
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}