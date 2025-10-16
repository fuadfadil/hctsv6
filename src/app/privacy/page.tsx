import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | HCTS",
  description: "Privacy Policy for Healthcare Trading System (HCTS)",
};

export default function PrivacyPolicy() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Healthcare Trading System ("HCTS", "we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our healthcare trading platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Name, email address, phone number, and contact details</li>
              <li>Company information including registration details, licenses, and certifications</li>
              <li>Banking and payment information for transactions</li>
              <li>Professional qualifications and healthcare-specific credentials</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Platform usage patterns and preferences</li>
              <li>Transaction history and marketplace activity</li>
              <li>Device information and IP addresses</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6">
              <li>To provide and maintain our healthcare trading platform</li>
              <li>To process transactions and manage your account</li>
              <li>To ensure regulatory compliance and verify credentials</li>
              <li>To communicate with you about platform updates and services</li>
              <li>To provide customer support and resolve issues</li>
              <li>To analyze usage patterns and improve our services</li>
              <li>To comply with legal obligations and regulatory requirements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
            </p>
            <ul className="list-disc pl-6">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or regulatory requirements</li>
              <li>To protect the rights, property, or safety of HCTS, our users, or the public</li>
              <li>In connection with a business transfer or merger</li>
              <li>With verified healthcare partners for legitimate trading purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. This includes encryption,
              secure servers, and regular security assessments. However, no method of transmission over the
              internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Healthcare Data Protection</h2>
            <p>
              Given the sensitive nature of healthcare data, we adhere to strict standards including HIPAA
              compliance where applicable, and implement additional safeguards for protected health information
              (PHI) and personally identifiable information (PII) related to healthcare services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Data portability for your information</li>
              <li>Withdraw consent where applicable</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze usage patterns,
              and provide personalized content. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place for such transfers in compliance with applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Data Retention</h2>
            <p>
              We retain your personal information only as long as necessary for the purposes outlined in this
              Privacy Policy, unless a longer retention period is required by law or regulatory requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes
              by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4">
              <p>Email: privacy@hcts.com</p>
              <p>Phone: +1 (555) 123-4567</p>
              <p>Address: Healthcare District, Medical City</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}