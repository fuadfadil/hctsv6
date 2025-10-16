# API Reference

## Overview

The Healthcare Trading Platform API provides comprehensive RESTful endpoints for managing healthcare service trading operations. The API supports authentication, marketplace operations, payment processing, analytics, and administrative functions.

## Authentication

### Authentication Methods
- **Bearer Token**: JWT-based authentication via Authorization header
- **Session-based**: Cookie-based session management
- **API Keys**: For server-to-server integrations

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
Content-Type: application/json
```

## Core API Endpoints

### User Registration & Authentication

#### POST /api/auth/register/company
Register a new company with initial details.

**Request Body:**
```json
{
  "step": "company_type",
  "data": {
    "type": "healthcare_provider",
    "companyName": "Example Hospital"
  }
}
```

**Response:**
```json
{
  "success": true,
  "companyId": "company_123",
  "step": "company_type"
}
```

#### POST /api/auth/register/complete
Complete the registration process.

**Request Body:**
```json
{
  "companyId": "company_123"
}
```

**Response:**
```json
{
  "success": true,
  "companyId": "company_123",
  "status": "approved",
  "message": "Registration completed successfully"
}
```

### Company Profile Management

#### GET /api/company/profile?companyId={id}
Retrieve company profile information.

**Response:**
```json
{
  "company": {
    "id": "company_123",
    "name": "Example Hospital",
    "type": {
      "name": "healthcare_provider",
      "description": "Hospitals, clinics, and medical service providers"
    },
    "registrationStatus": "approved",
    "specificData": {}
  }
}
```

#### PUT /api/company/profile
Update company profile information.

**Request Body:**
```json
{
  "companyId": "company_123",
  "name": "Updated Hospital Name",
  "address": "123 Medical St, City, Country"
}
```

### Marketplace Operations

#### GET /api/marketplace/services
Retrieve available healthcare services.

**Query Parameters:**
- `categoryId`: Filter by ICD-11 category
- `search`: Search term
- `priceMin`: Minimum price filter
- `priceMax`: Maximum price filter
- `sortBy`: Sort field (name, price, rating)
- `sortOrder`: Sort order (asc, desc)
- `page`: Page number
- `limit`: Results per page

**Response:**
```json
{
  "services": [
    {
      "id": "service_123",
      "name": "Cardiology Consultation",
      "description": "Comprehensive heart health assessment",
      "basePrice": 150.00,
      "unit": "consultation",
      "category": {
        "code": "BA00",
        "title": "Diseases of the circulatory system"
      },
      "listingCount": 5,
      "minPrice": 120.00,
      "maxPrice": 200.00
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### GET /api/marketplace/categories
Retrieve service categories.

**Response:**
```json
{
  "categories": [
    {
      "id": "category_123",
      "code": "BA00",
      "title": "Diseases of the circulatory system",
      "description": "Heart and blood vessel conditions",
      "serviceCount": 25,
      "listingCount": 150
    }
  ]
}
```

### Pricing Calculator

#### POST /api/calculator/price
Calculate optimal pricing for services.

**Request Body:**
```json
{
  "serviceName": "Cardiology Consultation",
  "serviceDescription": "Heart health assessment",
  "icd11Code": "BA00",
  "quantity": 1,
  "basePrice": 150.00,
  "currency": "LYD",
  "region": "Libya"
}
```

**Response:**
```json
{
  "basePrice": 150.00,
  "aiSuggestedPrice": 165.00,
  "marketAveragePrice": 155.00,
  "complexityScore": 2.5,
  "discountPercentage": 0,
  "finalPrice": 165.00,
  "healthUnits": 165,
  "currency": "LYD",
  "reasoning": "AI analysis based on market data and service complexity",
  "marketInsights": [
    "High demand in cardiology services",
    "Competitive pricing in the region"
  ]
}
```

#### GET /api/calculator/icd11?query={search}
Search ICD-11 classification codes.

**Response:**
```json
{
  "codes": [
    {
      "code": "BA00",
      "title": "Diseases of the circulatory system",
      "description": "Heart and blood vessel conditions",
      "complexityScore": 2.5
    }
  ]
}
```

### Payment Processing

#### POST /api/payments/initiate
Initiate a payment transaction.

**Request Body:**
```json
{
  "orderId": "order_123",
  "paymentMethodId": "method_456",
  "metadata": {
    "description": "Healthcare service purchase"
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "payment_789",
  "transactionId": "txn_101112",
  "redirectUrl": "https://payment.gateway.com/pay/123",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### POST /api/payments/refund
Process a refund.

**Request Body:**
```json
{
  "paymentId": "payment_789",
  "amount": 165.00,
  "reason": "Service not delivered",
  "notes": "Customer requested cancellation"
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "refund_131415",
  "gatewayRefundId": "gw_ref_161718",
  "status": "completed"
}
```

### Analytics & Reporting

#### GET /api/analytics/dashboard
Retrieve real-time dashboard analytics.

**Query Parameters:**
- `companyId`: Filter by company
- `realtime`: Enable real-time updates (true/false)

**Response:**
```json
{
  "kpis": {
    "totalRevenue": 125000.00,
    "totalOrders": 850,
    "activeListings": 120,
    "totalUsers": 2500,
    "conversionRate": 68.5
  },
  "alerts": [
    {
      "alertId": "alert_123",
      "type": "revenue_drop",
      "title": "Revenue Decrease",
      "message": "Revenue decreased by 15% this week",
      "severity": "medium",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "liveTransactions": [
    {
      "orderId": "order_123",
      "buyerName": "John Doe",
      "sellerName": "City Hospital",
      "amount": 250.00,
      "currency": "LYD",
      "status": "completed",
      "timestamp": "2024-01-15T10:25:00Z"
    }
  ]
}
```

#### GET /api/analytics/export
Export analytics data.

**Query Parameters:**
- `type`: Export format (csv, excel, pdf)
- `dataType`: Data type (orders, analytics, compliance, market)
- `companyId`: Company filter
- `startDate`: Start date filter
- `endDate`: End date filter

### Buyer Operations

#### GET /api/buyer/dashboard
Retrieve buyer dashboard data.

**Response:**
```json
{
  "userType": "insurance",
  "metrics": {
    "totalOrders": 45,
    "totalSpent": 12500.00,
    "pendingOrders": 3,
    "completedOrders": 42,
    "averageRating": 4.2,
    "totalReviews": 38
  },
  "recentOrders": [
    {
      "id": "order_123",
      "totalAmount": 350.00,
      "currency": "LYD",
      "status": "delivered",
      "orderDate": "2024-01-15T09:00:00Z",
      "deliveryDate": "2024-01-16T14:30:00Z"
    }
  ]
}
```

#### GET /api/buyer/analytics
Retrieve buyer performance analytics.

**Query Parameters:**
- `period`: Time period (daily, weekly, monthly)
- `startDate`: Start date
- `endDate`: End date

**Response:**
```json
{
  "analytics": [
    {
      "metricType": "spending",
      "value": 12500.00,
      "period": "monthly",
      "date": "2024-01-01"
    }
  ],
  "utilization": {
    "totalPurchased": 45,
    "totalSpent": 12500.00,
    "orderCount": 45
  },
  "roi": {
    "averageRating": 4.2,
    "reviewCount": 38
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific_field_name",
    "reason": "validation_reason"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

### Rate Limits
- **Authenticated Requests**: 1000 requests per hour
- **Anonymous Requests**: 100 requests per hour
- **Payment Operations**: 50 requests per hour
- **Analytics Exports**: 10 requests per hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Webhooks

### Webhook Events
- `payment.succeeded`: Payment completed successfully
- `payment.failed`: Payment failed
- `payment.refunded`: Refund processed
- `order.created`: New order placed
- `order.delivered`: Order fulfilled
- `user.registered`: New user registration

### Webhook Payload
```json
{
  "event": "payment.succeeded",
  "data": {
    "paymentId": "payment_123",
    "orderId": "order_456",
    "amount": 250.00,
    "currency": "LYD",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "webhookId": "wh_789"
}
```

## SDKs & Libraries

### JavaScript SDK
```javascript
import { HealthcareTradingAPI } from 'healthcare-trading-sdk';

const api = new HealthcareTradingAPI({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.healthcaretrading.com'
});

// Get services
const services = await api.marketplace.getServices({
  categoryId: 'cardiology',
  limit: 20
});

// Calculate pricing
const pricing = await api.calculator.getPricing({
  serviceName: 'Cardiology Consultation',
  icd11Code: 'BA00',
  quantity: 1
});
```

### Python SDK
```python
from healthcare_trading import APIClient

client = APIClient(api_key='your_api_key')

# Get company analytics
analytics = client.analytics.get_company_analytics(
    company_id='company_123',
    period='monthly'
)

# Create service listing
listing = client.marketplace.create_listing({
    'serviceId': 'service_123',
    'pricePerUnit': 150.00,
    'quantity': 100
})
```

## Data Models

### Common Data Types
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: string;
  name: string;
  typeId: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  registrationStatus: 'pending' | 'approved' | 'rejected' | 'under_review';
  specificData: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  icd11CategoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Versioning

### API Versioning
- **Current Version**: v1
- **Version Header**: `Accept: application/vnd.healthcaretrading.v1+json`
- **Deprecation Policy**: 12 months notice for breaking changes

### Backward Compatibility
- Non-breaking changes are deployed immediately
- Breaking changes require version bumps
- Legacy versions supported for 24 months

## Support

### Documentation
- **API Reference**: Complete endpoint documentation
- **Guides**: Integration tutorials and best practices
- **SDK Documentation**: Language-specific implementation guides

### Support Channels
- **Email**: api-support@healthcaretrading.com
- **Developer Portal**: https://developers.healthcaretrading.com
- **Community Forum**: https://community.healthcaretrading.com
- **Status Page**: https://status.healthcaretrading.com

### Service Level Agreement
- **Uptime**: 99.9% availability
- **Response Time**: <200ms for API calls
- **Support Response**: <4 hours for critical issues
- **Incident Resolution**: <24 hours for production issues