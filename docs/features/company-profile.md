# Company Profile Management

## Overview

The Company Profile Management system provides comprehensive tools for healthcare companies to manage their organizational information, compliance documentation, user roles, and operational details. It supports different company types (healthcare providers, insurance companies, investors) with specialized features for each.

## Key Components

### Profile Dashboard
- **Company Overview**: Basic company information, registration status, and contact details
- **Status Monitoring**: Real-time registration status with approval workflow tracking
- **Quick Stats**: Key metrics including company type, registration number, and last update date

### User Management
- **Role-Based Access**: Admin, manager, and employee roles with granular permissions
- **User Invitations**: Add new team members with appropriate role assignments
- **Access Control**: Company-specific user permissions and activity tracking

### License & Compliance Management
- **License Tracking**: Medical licenses, certifications, and regulatory approvals
- **Expiration Alerts**: Automated notifications for expiring licenses
- **Compliance Monitoring**: Status tracking and renewal management

### Specialty Management
- **Healthcare Specialties**: Cardiology, neurology, pediatrics, etc.
- **Insurance Types**: Health, life, property, casualty insurance categories
- **Investment Focus**: Venture capital, private equity, real estate investment areas

### Banking Information
- **Secure Storage**: Encrypted bank account details for transactions
- **Verification Process**: Bank account validation and compliance checks
- **Payment Integration**: Integration with payment gateways for seamless transactions

### Document Management
- **File Upload**: Secure document storage with type validation
- **Version Control**: Document history and change tracking
- **Access Permissions**: Role-based document access and sharing

## User Flows

### Profile Setup and Management
1. **Initial Profile Creation**
   - Company details entered during registration
   - Basic information including name, address, contact details
   - Company type-specific fields populated

2. **Profile Updates**
   - Authorized users (admins/managers) can modify company information
   - Changes logged in audit trail for compliance
   - Real-time validation and error handling

3. **User Management**
   - Company admins can invite new team members
   - Role assignment based on organizational hierarchy
   - User activation and deactivation workflows

### Compliance Management
1. **License Addition**
   - Upload license documents with metadata
   - Set expiration dates and renewal reminders
   - Verification status tracking

2. **Specialty Configuration**
   - Select relevant specialties based on company type
   - Dynamic specialty lists for different healthcare sectors
   - Specialty-based service offerings

3. **Document Organization**
   - Categorize documents by type (licenses, certificates, compliance reports)
   - Secure file storage with access controls
   - Document expiration and renewal tracking

## Technical Details

### Database Tables
- `company`: Core company information and settings
- `companyUser`: User-company relationships and roles
- `document`: File storage and metadata
- `bankDetails`: Encrypted banking information
- `auditLog`: Change tracking and compliance logging
- `companyType`: Company type definitions and configurations

### API Endpoints
- `GET /api/company/profile`: Retrieve company profile information
- `PUT /api/company/profile`: Update company profile details
- `GET /api/company/users`: List company users and roles
- `POST /api/company/users`: Add users to company
- `PUT /api/company/users`: Update user roles
- `DELETE /api/company/users`: Remove users from company
- `GET /api/company/documents`: List company documents
- `POST /api/company/documents`: Upload new documents
- `DELETE /api/company/documents`: Remove documents
- `GET /api/company/bank`: Retrieve bank details
- `PUT /api/company/bank`: Update bank information
- `GET /api/company/licenses`: List company licenses
- `POST /api/company/licenses`: Add new licenses
- `PUT /api/company/licenses`: Update license information
- `GET /api/company/specialties`: Get company specialties
- `PUT /api/company/specialties`: Update specialty selections

### Security Considerations
- **Role-Based Permissions**: Granular access control for sensitive operations
- **Audit Logging**: All profile changes tracked for compliance and security
- **Data Encryption**: Sensitive information encrypted at rest and in transit
- **File Security**: Secure file upload with size limits and type validation
- **Session Validation**: User authentication required for all operations

### Integrations
- **File Storage**: Secure cloud storage for document management
- **Email Service**: Notifications for license expirations and user invitations
- **Payment Systems**: Bank account verification and transaction processing
- **Regulatory APIs**: License validation and compliance checking

## Configuration

### Environment Variables
```env
# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,doc,docx
UPLOAD_PATH=./uploads/documents

# Security Settings
ENCRYPTION_KEY=your_encryption_key
SESSION_TIMEOUT=3600000

# Notification Settings
LICENSE_EXPIRY_WARNING_DAYS=30
EMAIL_FROM=noreply@company.com

# Database Settings
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

### Database Schema
```sql
-- Company profile with flexible specific data
CREATE TABLE company (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  typeId TEXT NOT NULL,
  registrationNumber TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  registrationStatus TEXT DEFAULT 'pending',
  specificData JSONB,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- User-company relationships
CREATE TABLE companyUser (
  id SERIAL PRIMARY KEY,
  companyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT NOT NULL,
  isPrimaryContact BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  joinedAt TIMESTAMP DEFAULT NOW(),
  leftAt TIMESTAMP,
  UNIQUE(companyId, userId)
);
```

## Troubleshooting

### Common Issues

**Permission Denied Errors**
- Verify user has appropriate role (admin/manager)
- Check company membership status
- Ensure session is valid and not expired

**File Upload Failures**
- Check file size limits (max 10MB)
- Verify supported file types
- Ensure upload directory permissions

**License Expiration Notifications**
- Verify email service configuration
- Check license expiry date calculations
- Confirm notification templates are available

**Bank Details Access**
- Ensure user has admin role for banking information
- Verify bank details exist for the company
- Check encryption/decryption key configuration

### Error Codes
- `INSUFFICIENT_PERMISSIONS`: User lacks required role for operation
- `COMPANY_NOT_FOUND`: Specified company does not exist
- `DOCUMENT_TOO_LARGE`: File exceeds size limits
- `INVALID_FILE_TYPE`: File type not supported
- `LICENSE_EXPIRED`: Attempting to use expired license
- `BANK_VERIFICATION_FAILED`: Bank details could not be verified