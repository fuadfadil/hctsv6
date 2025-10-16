# Marketplace System

## Overview

The Marketplace System provides a comprehensive platform for healthcare companies to list, discover, and purchase healthcare services using health units as currency. It supports ICD-11 classification system integration, advanced filtering, shopping cart functionality, and bulk purchasing capabilities.

## Key Components

### Service Listings
- **ICD-11 Integration**: Services categorized using World Health Organization's ICD-11 classification system
- **Dynamic Pricing**: Price per unit with minimum/maximum order quantities
- **Availability Tracking**: Real-time inventory management and stock levels
- **Expiration Management**: Time-limited listings with automatic expiration

### Advanced Search & Filtering
- **Multi-Criteria Search**: Search by service name, description, ICD-11 codes, and provider information
- **Hierarchical Categories**: ICD-11 category tree with service and listing counts
- **Price Range Filtering**: Filter by health unit price ranges
- **Geographic Filtering**: Location-based service discovery
- **Provider Type Filtering**: Filter by healthcare provider types

### Shopping Cart & Checkout
- **Persistent Cart**: Session-based cart persistence across browser sessions
- **Quantity Management**: Real-time quantity updates with validation
- **Bulk Operations**: Add multiple items, update quantities, remove items
- **Order Preview**: Cart summary with total calculations

### Bulk Purchasing
- **Volume Discounts**: Automated discount calculations for large orders
- **Bulk Order Forms**: Specialized forms for high-volume purchases
- **Order Splitting**: Automatic order distribution across multiple providers

## User Flows

### Service Provider Listing Flow
1. **Service Creation**
   - Select service from ICD-11 catalog or create custom service
   - Set pricing parameters (base price, minimum orders, availability)
   - Configure listing details (description, expiration, special terms)

2. **Listing Management**
   - Monitor listing performance and view statistics
   - Update pricing and availability in real-time
   - Manage expiration dates and renewal notifications

3. **Order Fulfillment**
   - Receive and review incoming orders
   - Confirm availability and processing timelines
   - Update order status and provide tracking information

### Buyer Purchasing Flow
1. **Service Discovery**
   - Browse services by category or use advanced search
   - Apply filters for price, location, provider type, and specialty
   - View detailed service information and provider credentials

2. **Cart Management**
   - Add services to cart with quantity selection
   - Review cart contents and adjust quantities
   - Remove items or save cart for later

3. **Checkout Process**
   - Review order summary and total health unit cost
   - Confirm order details and submit for processing
   - Receive order confirmation and tracking information

### Bulk Purchase Flow
1. **Bulk Order Creation**
   - Select multiple services for bulk purchasing
   - Specify quantities for each service type
   - Apply bulk discount calculations

2. **Order Optimization**
   - System suggests optimal provider combinations
   - Volume discount previews and cost comparisons
   - Order splitting recommendations

## Technical Details

### Database Tables
- `service`: Master service catalog with ICD-11 classifications
- `listing`: Individual service listings with pricing and availability
- `order`: Purchase orders and transaction records
- `orderItem`: Individual items within orders
- `icd11Category`: ICD-11 classification hierarchy
- `cart`: Shopping cart persistence

### API Endpoints
- `GET /api/marketplace/services`: List services with filtering and pagination
- `GET /api/marketplace/categories`: Retrieve ICD-11 category hierarchy
- `GET /api/marketplace/listings`: Get detailed listings for specific services
- `POST /api/marketplace/listings`: Create new service listings
- `GET /api/marketplace/search`: Advanced search with multiple criteria
- `GET /api/marketplace/cart`: Retrieve shopping cart contents
- `POST /api/marketplace/cart`: Add items to cart
- `PUT /api/marketplace/cart`: Update cart item quantities
- `POST /api/marketplace/orders`: Create orders from cart

### Search & Filtering Logic
```typescript
// Advanced filtering implementation
const whereConditions = [eq(service.isActive, true)];

if (categoryId) {
  whereConditions.push(eq(service.icd11CategoryId, categoryId));
}

if (search) {
  whereConditions.push(
    or(
      like(service.name, `%${search}%`),
      like(service.description, `%${search}%`)
    )
  );
}

if (priceMin) {
  whereConditions.push(sql`${service.basePrice} >= ${priceMin}`);
}
```

### Cart Management
- **Session Persistence**: Cart items stored in database with user session linkage
- **Quantity Validation**: Real-time validation against listing constraints
- **Price Calculation**: Dynamic total calculation with currency conversion
- **Expiration Handling**: Automatic cart cleanup for expired listings

### ICD-11 Integration
- **Hierarchical Categories**: Support for ICD-11's multi-level classification
- **Search Optimization**: Indexed search across category codes and titles
- **Dynamic Loading**: Lazy loading of category subtrees for performance

## Configuration

### Environment Variables
```env
# Marketplace Settings
MAX_LISTING_DURATION=90
DEFAULT_CURRENCY=LYD
BULK_DISCOUNT_THRESHOLD=1000

# Search Configuration
SEARCH_RESULT_LIMIT=50
CATEGORY_CACHE_TTL=3600

# Cart Settings
CART_EXPIRY_HOURS=24
MAX_CART_ITEMS=100
```

### Database Schema
```sql
-- Service catalog with ICD-11 integration
CREATE TABLE service (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  basePrice DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  icd11CategoryId TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Individual service listings
CREATE TABLE listing (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  serviceId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  pricePerUnit DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'LYD',
  minOrderQuantity INTEGER DEFAULT 1,
  maxOrderQuantity INTEGER,
  expiresAt TIMESTAMP,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Common Issues

**Search Results Not Loading**
- Check ICD-11 category data integrity
- Verify database indexes on search fields
- Review API rate limiting and timeout settings

**Cart Items Disappearing**
- Check session persistence configuration
- Verify cart cleanup job timing
- Review database connection stability

**Pricing Calculation Errors**
- Validate decimal precision in database columns
- Check currency conversion rates
- Review bulk discount calculation logic

**Category Tree Not Displaying**
- Verify ICD-11 data import completeness
- Check hierarchical relationship integrity
- Review frontend tree rendering logic

### Performance Optimization
- **Database Indexing**: Composite indexes on frequently queried columns
- **Caching Strategy**: Redis caching for category hierarchies and search results
- **Pagination**: Cursor-based pagination for large result sets
- **Lazy Loading**: On-demand loading of detailed listing information

### Error Codes
- `INVALID_ICD11_CODE`: ICD-11 code format validation failed
- `LISTING_EXPIRED`: Attempted to purchase expired listing
- `INSUFFICIENT_STOCK`: Requested quantity exceeds available stock
- `INVALID_PRICE_RANGE`: Price filter parameters out of acceptable range
- `CART_FULL`: Maximum cart items limit reached