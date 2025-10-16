import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance | HCTS",
  description: "Compliance information for Healthcare Trading System (HCTS)",
};

export default function Compliance() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Compliance Center</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Regulatory Compliance Overview</h2>
            <p>
              Healthcare Trading System (HCTS) is committed to maintaining the highest standards of regulatory
              compliance in the healthcare industry. This page outlines our compliance framework, certifications,
              and regulatory requirements for all users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Key Regulatory Frameworks</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3">HIPAA Compliance</h3>
                <p className="mb-3">
                  We adhere to HIPAA standards for the protection of protected health information (PHI).
                  All data handling processes include appropriate safeguards and security measures.
                </p>
                <ul className="list-disc pl-6 text-sm">
                  <li>Encrypted data transmission</li>
                  <li>Access controls and audit logs</li>
                  <li>Business Associate Agreements</li>
                  <li>Regular security assessments</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3">FDA Regulations</h3>
                <p className="mb-3">
                  Compliance with FDA requirements for medical devices, pharmaceuticals, and healthcare products.
                </p>
                <ul className="list-disc pl-6 text-sm">
                  <li>Product registration verification</li>
                  <li>Adverse event reporting</li>
                  <li>Quality system requirements</li>
                  <li>Labeling compliance</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3">State Licensing</h3>
                <p className="mb-3">
                  Verification and monitoring of state-specific healthcare licenses and certifications.
                </p>
                <ul className="list-disc pl-6 text-sm">
                  <li>License validation</li>
                  <li>Renewal tracking</li>
                  <li>Jurisdictional compliance</li>
                  <li>Credential verification</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-medium mb-3">Anti-Kickback Laws</h3>
                <p className="mb-3">
                  Strict adherence to federal and state anti-kickback statutes and safe harbors.
                </p>
                <ul className="list-disc pl-6 text-sm">
                  <li>Fair market value pricing</li>
                  <li>Commercial reasonableness</li>
                  <li>Documentation requirements</li>
                  <li>Prohibition of inducements</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Compliance Requirements</h2>

            <h3 className="text-xl font-medium mb-2">Registration Requirements</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Valid business license or registration</li>
              <li>Healthcare facility accreditation (where applicable)</li>
              <li>Professional licenses for key personnel</li>
              <li>Insurance certificates (malpractice, liability)</li>
              <li>Tax identification and certification</li>
              <li>Background checks for authorized users</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Ongoing Compliance Obligations</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Maintain current licenses and certifications</li>
              <li>Report changes in regulatory status</li>
              <li>Complete annual compliance training</li>
              <li>Participate in platform audits</li>
              <li>Adhere to platform usage guidelines</li>
              <li>Report potential compliance violations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Compliance Monitoring</h2>

            <h3 className="text-xl font-medium mb-2">Automated Monitoring</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>License expiration tracking</li>
              <li>Transaction pattern analysis</li>
              <li>Regulatory change notifications</li>
              <li>Automated compliance reporting</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Manual Reviews</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Periodic document verification</li>
              <li>Random audit sampling</li>
              <li>Compliance questionnaire reviews</li>
              <li>Quality assurance checks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Privacy & Security</h2>

            <h3 className="text-xl font-medium mb-2">Data Protection Measures</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>End-to-end encryption for data transmission</li>
              <li>Secure cloud infrastructure with SOC 2 compliance</li>
              <li>Regular security penetration testing</li>
              <li>Multi-factor authentication requirements</li>
              <li>Data backup and disaster recovery procedures</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Privacy Rights</h3>
            <p className="mb-4">
              Users have the right to:
            </p>
            <ul className="list-disc pl-6">
              <li>Access their personal and business data</li>
              <li>Request data corrections or deletions</li>
              <li>Data portability and export</li>
              <li>Withdraw consent for data processing</li>
              <li>Lodge privacy complaints</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Compliance Reporting</h2>

            <h3 className="text-xl font-medium mb-2">Available Reports</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>License and certification status reports</li>
              <li>Transaction compliance summaries</li>
              <li>Audit trail reports</li>
              <li>Regulatory filing assistance</li>
              <li>Compliance gap analysis</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Reporting Schedule</h3>
            <ul className="list-disc pl-6">
              <li>Monthly compliance status updates</li>
              <li>Quarterly comprehensive audits</li>
              <li>Annual regulatory filings</li>
              <li>Ad-hoc reports upon request</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Non-Compliance Consequences</h2>
            <p className="mb-4">
              Failure to maintain compliance may result in:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Temporary suspension of platform access</li>
              <li>Account termination for repeated violations</li>
              <li>Reporting to regulatory authorities</li>
              <li>Legal action for material violations</li>
              <li>Loss of marketplace privileges</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Compliance Resources</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-medium mb-2">Training Materials</h3>
                <ul className="list-disc pl-6">
                  <li>HIPAA Training Modules</li>
                  <li>FDA Compliance Guides</li>
                  <li>Anti-Kickback Statute Overview</li>
                  <li>Platform Usage Guidelines</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Support Contacts</h3>
                <ul className="list-disc pl-6">
                  <li>Compliance Officer: compliance@hcts.com</li>
                  <li>Legal Department: legal@hcts.com</li>
                  <li>Technical Support: support@hcts.com</li>
                  <li>Emergency Hotline: +1 (555) 123-4567</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Certifications & Accreditations</h2>

            <div className="bg-muted p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-4">Current Certifications</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="font-medium">SOC 2 Type II</div>
                  <div className="text-sm text-muted-foreground">Security & Compliance</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">HIPAA Compliant</div>
                  <div className="text-sm text-muted-foreground">Privacy & Security</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">ISO 27001</div>
                  <div className="text-sm text-muted-foreground">Information Security</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="mb-4">
              For compliance-related questions or concerns, please contact our compliance team:
            </p>
            <div className="bg-muted p-6 rounded-lg">
              <p className="mb-2"><strong>Email:</strong> compliance@hcts.com</p>
              <p className="mb-2"><strong>Phone:</strong> +1 (555) 123-4567</p>
              <p className="mb-2"><strong>Address:</strong> Healthcare District, Medical City</p>
              <p><strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}