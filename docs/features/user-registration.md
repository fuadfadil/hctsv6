# User Registration & Authentication

## Overview

The User Registration & Authentication system provides a comprehensive multi-step registration process for healthcare trading platform users. It supports different company types (healthcare providers, insurance companies, investors) with role-based access control and document verification workflows.

## Key Components

### Registration Steps
- **Company Type Selection**: Choose from healthcare provider, insurance company, or investor
- **Company Details**: Basic company information and contact details
- **Type-Specific Forms**: Specialized fields based on company type
- **User Details**: Personal information for company representatives
- **Bank Details**: Financial information for transactions
- **Document Upload**: Required licenses, certificates, and compliance documents

### Authentication System
- **Better Auth Integration**: Secure authentication with email/password and social login
- **Email Verification**: Mandatory email verification for new accounts
- **Session Management**: JWT-based session handling with secure cookies
- **Password Reset**: Secure password recovery workflow

### Role-Based Access Control
- **Healthcare Provider**: Access to service posting and marketplace features
- **Insurance Company**: Access to coverage verification and claims processing
- **Investor**: Access to investment opportunities and portfolio management
- **Admin/Compliance**: Platform administration and regulatory oversight

## User Flows

### New User Registration Flow
1. **Account Creation**
   - User provides email and password
   - Email verification sent automatically
   - Account created with unverified status

2. **Company Type Selection**
   - User selects company type from predefined options
   - System validates selection and creates initial company record
   - Approval workflow initialized for regulated entities

3. **Company Details Submission**
   - Basic company information collected
   - Address, phone, email, and website details
   - Registration number and legal information

4. **Type-Specific Information**
   - Healthcare providers: Medical licenses and specialties
   - Insurance companies: Coverage types and regulatory approvals
   - Investors: Investment focus and accreditation status

5. **Bank Details Setup**
   - Bank account information for transactions
   - Routing numbers and SWIFT codes
   - Account verification process

6. **Document Verification**
   - Upload required documents based on company type
   - Automatic verification for standard documents
   - Manual review for regulated entities

7. **Approval Process**
   - Automated approval for basic company types
   - Multi-step approval for healthcare/insurance companies
   - Compliance officer review and final approval

### Authentication Flow
1. **Login**
   - Email/password authentication
   - Social login options (Google)
   - Two-factor authentication for sensitive operations

2. **Session Management**
   - Secure session creation and validation
   - Automatic session refresh
   - Logout and session cleanup

## Technical Details

### Database Tables
- `user`: User account information
- `company`: Company details and registration status
- `companyType`: Available company type definitions
- `companyUser`: User-company relationships
- `registrationStep`: Registration progress tracking
- `approvalWorkflow`: Approval process management
- `document`: Uploaded document storage
- `bankDetails`: Banking information
- `role`: User role definitions
- `userRole`: User-role assignments

### API Endpoints
- `POST /api/auth/register/company`: Company registration steps
- `POST /api/auth/register/complete`: Finalize registration
- `POST /api/auth/register/documents`: Document upload
- `POST /api/auth/register/bank`: Bank details submission
- `POST /api/auth/register/approve`: Approval workflow management
- `GET /api/auth/get-session`: Session validation

### Security Considerations
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Input Validation**: Comprehensive validation using Zod schemas
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logging**: All registration actions logged for compliance
- **Document Security**: Secure file upload with size and type restrictions

### Integrations
- **Email Service**: Automated email notifications for verification and approvals
- **File Storage**: Secure document storage with access controls
- **Payment Gateway**: Bank account verification integration
- **Regulatory APIs**: License and certification validation

## Configuration

### Environment Variables
```env
# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png

# Approval Workflow
AUTO_APPROVE_BASIC_TYPES=true
COMPLIANCE_REVIEW_REQUIRED=true
```

### Database Schema
```sql
-- User table with authentication fields
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  emailVerified TIMESTAMP,
  image TEXT,
  phone TEXT,
  address TEXT,
  dateOfBirth DATE,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Company registration tracking
CREATE TABLE registrationStep (
  id SERIAL PRIMARY KEY,
  companyId TEXT NOT NULL,
  stepName TEXT NOT NULL,
  isCompleted BOOLEAN DEFAULT false,
  completedAt TIMESTAMP,
  data JSONB,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Common Issues

**Email Verification Not Received**
- Check spam/junk folder
- Verify email address is correct
- Contact support for manual verification

**Document Upload Failures**
- Ensure file size under 10MB limit
- Check supported file types (PDF, JPG, PNG)
- Verify internet connection stability

**Approval Process Delays**
- Regulated companies require manual review
- Check approval workflow status
- Contact compliance team for status updates

**Authentication Errors**
- Clear browser cache and cookies
- Try different browser or incognito mode
- Reset password if login issues persist

### Error Codes
- `INVALID_COMPANY_TYPE`: Selected company type not supported
- `MISSING_REQUIRED_DOCUMENTS`: Required documents not uploaded
- `APPROVAL_PENDING`: Registration awaiting approval
- `DOCUMENT_VERIFICATION_FAILED`: Uploaded documents rejected
- `BANK_VERIFICATION_FAILED`: Bank details could not be verified