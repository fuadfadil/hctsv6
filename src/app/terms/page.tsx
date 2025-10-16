import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | HCTS",
  description: "Terms of Service for Healthcare Trading System (HCTS)",
};

export default function TermsOfService() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the Healthcare Trading System ("HCTS", "we", "our", or "us"),
              you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              HCTS is a healthcare trading platform that connects healthcare providers with pharmaceutical
              companies for the secure and compliant trading of medical supplies and services. Our platform
              includes marketplace functionality, pricing calculators, analytics tools, and compliance management.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Eligibility</h2>
            <p className="mb-4">
              To use our services, you must:
            </p>
            <ul className="list-disc pl-6">
              <li>Be at least 18 years old</li>
              <li>Be a licensed healthcare provider or pharmaceutical company</li>
              <li>Have all necessary regulatory approvals and licenses</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain compliance with all applicable healthcare regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Account Registration and Security</h2>
            <p className="mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information remains current and accurate</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Platform Usage Guidelines</h2>
            <h3 className="text-xl font-medium mb-2">Permitted Use</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Legitimate healthcare trading and procurement activities</li>
              <li>Compliance with all applicable laws and regulations</li>
              <li>Professional and respectful communication with other users</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Prohibited Activities</h3>
            <ul className="list-disc pl-6">
              <li>Violating healthcare regulations or laws</li>
              <li>Posting false or misleading information</li>
              <li>Engaging in fraudulent or deceptive practices</li>
              <li>Interfering with platform security or functionality</li>
              <li>Using the platform for non-healthcare purposes</li>
              <li>Sharing account credentials or access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Compliance and Regulatory Requirements</h2>
            <p>
              Users must comply with all applicable healthcare regulations, including but not limited to:
            </p>
            <ul className="list-disc pl-6">
              <li>HIPAA and patient privacy requirements</li>
              <li>FDA regulations for medical devices and pharmaceuticals</li>
              <li>State and federal licensing requirements</li>
              <li>Anti-kickback and fraud prevention laws</li>
              <li>International trade regulations where applicable</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Transactions and Payments</h2>
            <p className="mb-4">
              All transactions conducted through HCTS are subject to:
            </p>
            <ul className="list-disc pl-6">
              <li>Our payment processing terms and conditions</li>
              <li>Compliance with financial regulations</li>
              <li>Platform transaction fees as disclosed</li>
              <li>Dispute resolution procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p>
              The HCTS platform, including all content, features, and functionality, is owned by us
              and is protected by copyright, trademark, and other intellectual property laws.
              You may not reproduce, distribute, or create derivative works without our express permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs
              your use of the platform, to understand our practices regarding the collection and use
              of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimers and Limitations</h2>
            <p className="mb-4">
              THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES,
              EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
            </p>
            <p>
              We do not guarantee uninterrupted service or error-free operation. Healthcare decisions
              and transactions are made at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL HCTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
              OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.
              Our total liability shall not exceed the amount paid by you for platform access in the
              preceding 12 months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless HCTS, its officers, directors, employees,
              and agents from any claims, damages, losses, or expenses arising from your use of
              the platform or violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the platform immediately,
              without prior notice, for any reason, including breach of these terms. Upon termination,
              your right to use the platform will cease immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of
              [Jurisdiction], without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Dispute Resolution</h2>
            <p>
              Any disputes arising from these terms or your use of the platform shall be resolved
              through binding arbitration in accordance with the rules of [Arbitration Organization].
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of
              material changes via email or platform notification. Continued use constitutes acceptance
              of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">17. Severability</h2>
            <p>
              If any provision of these terms is found to be unenforceable, the remaining provisions
              will remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">18. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4">
              <p>Email: legal@hcts.com</p>
              <p>Phone: +1 (555) 123-4567</p>
              <p>Address: Healthcare District, Medical City</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}