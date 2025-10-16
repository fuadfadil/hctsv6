import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | HCTS",
  description: "Help Center for Healthcare Trading System (HCTS)",
};

export default function HelpCenter() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Help Center</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <p className="mb-4">
              Welcome to the Healthcare Trading System (HCTS)! This guide will help you get started with our platform.
            </p>

            <h3 className="text-xl font-medium mb-2">Account Registration</h3>
            <ol className="list-decimal pl-6 mb-4">
              <li>Visit our registration page and select your company type</li>
              <li>Provide your company details and contact information</li>
              <li>Upload required documents and licenses</li>
              <li>Complete bank account verification</li>
              <li>Wait for admin approval before accessing the platform</li>
            </ol>

            <h3 className="text-xl font-medium mb-2">Navigation</h3>
            <ul className="list-disc pl-6">
              <li><strong>Dashboard:</strong> Overview of your account and recent activity</li>
              <li><strong>Marketplace:</strong> Browse and purchase healthcare services</li>
              <li><strong>Calculator:</strong> Calculate pricing for bulk purchases</li>
              <li><strong>Profile:</strong> Manage your company information and settings</li>
              <li><strong>Purchase:</strong> View your order history and manage purchases</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Marketplace</h2>

            <h3 className="text-xl font-medium mb-2">Browsing Services</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Use filters to narrow down services by category, price, or specialty</li>
              <li>View detailed service descriptions and provider information</li>
              <li>Check availability and delivery terms</li>
              <li>Read reviews and ratings from other buyers</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Making Purchases</h3>
            <ol className="list-decimal pl-6 mb-4">
              <li>Add services to your cart</li>
              <li>Review your order and apply any bulk discounts</li>
              <li>Complete payment through our secure gateway</li>
              <li>Receive order confirmation and tracking information</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Pricing Calculator</h2>
            <p className="mb-4">
              Our pricing calculator helps you determine the best value for bulk purchases.
            </p>

            <h3 className="text-xl font-medium mb-2">How to Use</h3>
            <ol className="list-decimal pl-6 mb-4">
              <li>Select the service category and type</li>
              <li>Enter the quantity you need</li>
              <li>Choose any additional options or customizations</li>
              <li>Review pricing tiers and bulk discounts</li>
              <li>Save calculations for future reference</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Compliance & Documentation</h2>

            <h3 className="text-xl font-medium mb-2">Required Documents</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Business license or registration certificate</li>
              <li>Healthcare facility accreditation</li>
              <li>Professional licenses for key personnel</li>
              <li>Insurance certificates</li>
              <li>Tax identification documents</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Regulatory Compliance</h3>
            <p>
              All users must maintain compliance with applicable healthcare regulations including HIPAA,
              FDA requirements, and state licensing laws. Regular audits may be conducted to ensure compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Payments & Billing</h2>

            <h3 className="text-xl font-medium mb-2">Payment Methods</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Credit/Debit Cards</li>
              <li>Bank Transfers</li>
              <li>Digital Wallets</li>
              <li>Platform Credits (for approved accounts)</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Billing Inquiries</h3>
            <p>
              For billing questions or disputes, contact our support team within 30 days of the transaction.
              Include your order number and detailed explanation of the issue.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Technical Support</h2>

            <h3 className="text-xl font-medium mb-2">Common Issues</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Login Problems:</strong> Clear browser cache and cookies, try incognito mode</li>
              <li><strong>Upload Errors:</strong> Check file size limits and supported formats</li>
              <li><strong>Payment Failures:</strong> Verify payment details and try alternative methods</li>
              <li><strong>Slow Performance:</strong> Use a modern browser and check internet connection</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">System Requirements</h3>
            <ul className="list-disc pl-6">
              <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
              <li>Stable internet connection</li>
              <li>JavaScript enabled</li>
              <li>Cookies enabled</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Support</h2>
            <p className="mb-4">
              If you can't find the answer you're looking for, our support team is here to help.
            </p>

            <div className="bg-muted p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-4">Support Hours</h3>
              <p className="mb-2"><strong>Email:</strong> support@hcts.com</p>
              <p className="mb-2"><strong>Phone:</strong> +1 (555) 123-4567</p>
              <p className="mb-2"><strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST</p>
              <p><strong>Response Time:</strong> Within 24 hours for email inquiries</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">How long does registration approval take?</h3>
                <p>Registration approval typically takes 2-3 business days. You'll receive an email notification once approved.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Can I cancel an order after payment?</h3>
                <p>Cancellation policies vary by service provider. Contact the seller directly or our support team for assistance.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">How do bulk discounts work?</h3>
                <p>Bulk discounts are automatically applied based on quantity thresholds. Use our pricing calculator to see potential savings.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Is my data secure?</h3>
                <p>Yes, we use industry-standard encryption and security measures to protect your data. Review our Privacy Policy for details.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}