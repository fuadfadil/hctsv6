// Email utility functions for verification and notifications
// This is a placeholder - integrate with your preferred email service (SendGrid, AWS SES, etc.)

export async function sendVerificationEmail(to: string, subject: string, html: string) {
  // Placeholder implementation
  // Replace with actual email service integration
  console.log(`Sending email to ${to}: ${subject}`);

  // Example with a service like SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to,
    from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
    subject,
    html,
  };

  await sgMail.send(msg);
  */

  // For now, just log the email
  console.log('Email content:', html);
}

export async function sendCompanyRegistrationNotification(
  companyEmail: string,
  companyName: string,
  status: string
) {
  const subject = `Company Registration ${status === 'approved' ? 'Approved' : 'Under Review'}`;
  const html = `
    <h2>Company Registration Update</h2>
    <p>Dear ${companyName} team,</p>
    <p>Your company registration has been ${status === 'approved' ? 'approved' : 'submitted for review'}.</p>
    ${status === 'approved'
      ? '<p>You can now access all platform features.</p>'
      : '<p>We will review your application and get back to you within 2-3 business days.</p>'
    }
    <p>Best regards,<br>The Platform Team</p>
  `;

  await sendVerificationEmail(companyEmail, subject, html);
}

export async function sendApprovalRequiredNotification(
  adminEmail: string,
  companyName: string,
  companyId: string
) {
  const subject = `New Company Registration Requires Approval`;
  const html = `
    <h2>Approval Required</h2>
    <p>A new company registration requires your approval:</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Company ID:</strong> ${companyId}</p>
    <p>Please review the application in the admin dashboard.</p>
    <p>Best regards,<br>The Platform Team</p>
  `;

  await sendVerificationEmail(adminEmail, subject, html);
}