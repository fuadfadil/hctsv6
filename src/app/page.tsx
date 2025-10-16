import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stethoscope, Users, BarChart3, Shield, Heart, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                  HCTS
                </h1>
              </div>
              <h2 className="text-3xl font-semibold text-muted-foreground">
                Healthcare Trading System
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Connect healthcare providers with pharmaceutical companies through our secure,
                compliant marketplace for medical supplies and services trading.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/marketplace">Browse Marketplace</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link href="/dashboard">Access Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Why Choose HCTS?</h2>
              <p className="text-xl text-muted-foreground">
                A comprehensive platform designed specifically for healthcare trading
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-8 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Regulatory Compliant</h3>
                <p className="text-muted-foreground">
                  Built with healthcare regulations in mind, ensuring all transactions
                  meet industry standards and compliance requirements.
                </p>
              </div>

              <div className="p-8 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Verified Partners</h3>
                <p className="text-muted-foreground">
                  Connect with verified healthcare providers and pharmaceutical companies
                  through our rigorous verification process.
                </p>
              </div>

              <div className="p-8 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-time Analytics</h3>
                <p className="text-muted-foreground">
                  Comprehensive analytics and reporting tools to track performance,
                  compliance, and market trends in real-time.
                </p>
              </div>

              <div className="p-8 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Patient-Centric Focus</h3>
                <p className="text-muted-foreground">
                  Every feature designed to ensure patient safety and access to quality
                  healthcare products and services.
                </p>
              </div>

              <div className="p-8 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Market Intelligence</h3>
                <p className="text-muted-foreground">
                  Advanced pricing calculators and market insights to help you make
                  informed trading decisions.
                </p>
              </div>

              <div className="p-8 border rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Specialized Tools</h3>
                <p className="text-muted-foreground">
                  Healthcare-specific calculators, compliance tools, and specialized
                  features for medical supply chain management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-bold">Ready to Transform Healthcare Trading?</h2>
            <p className="text-xl text-muted-foreground">
              Join the HCTS platform and connect with verified healthcare partners today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/auth/register/company">Register Your Company</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link href="/calculator">Try Calculator</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
