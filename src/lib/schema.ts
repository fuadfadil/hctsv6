import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified"),
  image: text("image"),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: timestamp("dateOfBirth"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Role-based access control tables
export const role = pgTable("role", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const userRole = pgTable("user_role", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  roleId: uuid("roleId").notNull().references(() => role.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assignedAt").notNull().defaultNow(),
  assignedBy: text("assignedBy").references(() => user.id),
});

// Company management tables
export const companyType = pgTable("company_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const company = pgTable("company", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  typeId: uuid("typeId").notNull().references(() => companyType.id),
  registrationNumber: text("registrationNumber").unique(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  registrationStatus: text("registrationStatus").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'under_review'
  specificData: jsonb("specificData"), // For type-specific fields like licenses, coverage, focus areas
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const companyUser = pgTable("company_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // e.g., 'admin', 'manager', 'employee'
  isPrimaryContact: boolean("isPrimaryContact").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  leftAt: timestamp("leftAt"),
});

// Healthcare services catalog tables
export const icd11Category = pgTable("icd11_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  parentId: uuid("parentId"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const service = pgTable("service", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  icd11CategoryId: uuid("icd11CategoryId"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }),
  unit: text("unit").notNull(), // e.g., 'per visit', 'per hour', 'per procedure'
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const servicePackage = pgTable("service_package", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  services: jsonb("services").notNull(), // Array of service IDs with quantities
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Trading system tables
export const healthUnitRate = pgTable("health_unit_rate", {
  id: uuid("id").primaryKey().defaultRandom(),
  currency: text("currency").notNull(), // e.g., 'USD', 'EUR'
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(),
  effectiveDate: timestamp("effectiveDate").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const listing = pgTable("listing", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id),
  serviceId: uuid("serviceId").notNull().references(() => service.id),
  packageId: uuid("packageId").references(() => servicePackage.id),
  quantity: integer("quantity").notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  minOrderQuantity: integer("minOrderQuantity").notNull().default(1),
  maxOrderQuantity: integer("maxOrderQuantity"),
  isActive: boolean("isActive").notNull().default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const order = pgTable("order", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: text("buyerId").notNull().references(() => user.id),
  sellerId: text("sellerId").notNull().references(() => user.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  orderDate: timestamp("orderDate").notNull().defaultNow(),
  deliveryDate: timestamp("deliveryDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const orderItem = pgTable("order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => order.id, { onDelete: "cascade" }),
  listingId: uuid("listingId").notNull().references(() => listing.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Payment system tables
export const paymentGateway = pgTable("payment_gateway", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // 'Libyan Mobile Money', 'Libyan Bank Transfer', 'Libyan Card Payment'
  provider: text("provider").notNull(), // 'libyana_mobile', 'libyana_bank', 'libyana_card', 'custom'
  type: text("type").notNull(), // 'mobile_money', 'bank_transfer', 'card', 'wallet'
  apiKey: text("apiKey"), // Encrypted
  apiSecret: text("apiSecret"), // Encrypted
  webhookSecret: text("webhookSecret"), // Encrypted
  baseUrl: text("baseUrl"),
  isActive: boolean("isActive").notNull().default(true),
  supportedCurrencies: jsonb("supportedCurrencies"), // ['LYD', 'USD', 'EUR']
  configuration: jsonb("configuration"), // Gateway-specific settings
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const paymentMethod = pgTable("payment_method", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  gatewayId: uuid("gatewayId").notNull().references(() => paymentGateway.id),
  type: text("type").notNull(), // 'credit_card', 'bank_transfer', 'mobile_money', etc.
  provider: text("provider").notNull(), // 'libyana_mobile', 'libyana_bank', 'libyana_card'
  accountNumber: text("accountNumber"), // Masked or tokenized
  accountHolderName: text("accountHolderName"),
  expiryDate: text("expiryDate"), // For cards, encrypted
  cvv: text("cvv"), // For cards, encrypted (temporary storage only)
  phoneNumber: text("phoneNumber"), // For mobile money
  bankName: text("bankName"), // For bank transfers
  isDefault: boolean("isDefault").notNull().default(false),
  isVerified: boolean("isVerified").notNull().default(false),
  verificationToken: text("verificationToken"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => order.id),
  paymentMethodId: uuid("paymentMethodId").notNull().references(() => paymentMethod.id),
  gatewayId: uuid("gatewayId").notNull().references(() => paymentGateway.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
  transactionId: text("transactionId"),
  gatewayTransactionId: text("gatewayTransactionId"),
  paymentDate: timestamp("paymentDate"),
  processedAt: timestamp("processedAt"),
  failureReason: text("failureReason"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // Additional gateway-specific data
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const paymentTransaction = pgTable("payment_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("paymentId").notNull().references(() => payment.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'charge', 'refund', 'void', 'capture'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  gatewayTransactionId: text("gatewayTransactionId"),
  gatewayResponse: jsonb("gatewayResponse"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const refund = pgTable("refund", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("paymentId").notNull().references(() => payment.id),
  orderId: uuid("orderId").notNull().references(() => order.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  reason: text("reason").notNull(), // 'customer_request', 'duplicate', 'fraudulent', 'service_issue'
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  gatewayRefundId: text("gatewayRefundId"),
  processedAt: timestamp("processedAt"),
  notes: text("notes"),
  requestedBy: text("requestedBy").notNull().references(() => user.id),
  approvedBy: text("approvedBy").references(() => user.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const escrowAccount = pgTable("escrow_account", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => order.id),
  buyerId: text("buyerId").notNull().references(() => user.id),
  sellerId: text("sellerId").notNull().references(() => user.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  heldAmount: decimal("heldAmount", { precision: 10, scale: 2 }).notNull(),
  releasedAmount: decimal("releasedAmount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("holding"), // 'holding', 'releasing', 'released', 'disputed'
  releaseConditions: jsonb("releaseConditions"), // Service completion criteria
  autoReleaseDate: timestamp("autoReleaseDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const installmentPlan = pgTable("installment_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => order.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  numberOfInstallments: integer("numberOfInstallments").notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 10, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // 'weekly', 'monthly', 'quarterly'
  interestRate: decimal("interestRate", { precision: 5, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled', 'defaulted'
  nextPaymentDate: timestamp("nextPaymentDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const installmentPayment = pgTable("installment_payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  installmentPlanId: uuid("installmentPlanId").notNull().references(() => installmentPlan.id, { onDelete: "cascade" }),
  paymentId: uuid("paymentId").references(() => payment.id),
  installmentNumber: integer("installmentNumber").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'overdue', 'missed'
  lateFee: decimal("lateFee", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const currencyExchangeRate = pgTable("currency_exchange_rate", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromCurrency: text("fromCurrency").notNull(),
  toCurrency: text("toCurrency").notNull(),
  rate: decimal("rate", { precision: 10, scale: 6 }).notNull(),
  source: text("source").notNull(), // 'central_bank_ly', 'ecb', 'custom'
  effectiveDate: timestamp("effectiveDate").notNull(),
  expiryDate: timestamp("expiryDate"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const paymentWebhook = pgTable("payment_webhook", {
  id: uuid("id").primaryKey().defaultRandom(),
  gatewayId: uuid("gatewayId").notNull().references(() => paymentGateway.id),
  paymentId: uuid("paymentId").references(() => payment.id),
  eventType: text("eventType").notNull(), // 'payment.succeeded', 'payment.failed', 'refund.completed'
  webhookId: text("webhookId"),
  payload: jsonb("payload").notNull(),
  signature: text("signature"),
  processed: boolean("processed").notNull().default(false),
  processedAt: timestamp("processedAt"),
  retryCount: integer("retryCount").default(0),
  lastRetryAt: timestamp("lastRetryAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const fraudAlert = pgTable("fraud_alert", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("paymentId").references(() => payment.id),
  userId: text("userId").references(() => user.id),
  alertType: text("alertType").notNull(), // 'suspicious_amount', 'unusual_location', 'velocity_check', 'blacklist_match'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  status: text("status").notNull().default("open"), // 'open', 'investigating', 'resolved', 'dismissed'
  resolvedBy: text("resolvedBy").references(() => user.id),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const paymentCompliance = pgTable("payment_compliance", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("paymentId").references(() => payment.id),
  regulationType: text("regulationType").notNull(), // 'PCI_DSS', 'Libyan_Financial_Regulations', 'AML'
  complianceStatus: text("complianceStatus").notNull(), // 'compliant', 'non_compliant', 'pending_review'
  checkDate: timestamp("checkDate").notNull(),
  details: jsonb("details"),
  reviewedBy: text("reviewedBy").references(() => user.id),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => order.id),
  invoiceNumber: text("invoiceNumber").notNull().unique(),
  buyerId: text("buyerId").notNull().references(() => user.id),
  sellerId: text("sellerId").notNull().references(() => user.id),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("draft"), // 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  issueDate: timestamp("issueDate").notNull(),
  dueDate: timestamp("dueDate"),
  paidDate: timestamp("paidDate"),
  notes: text("notes"),
  paymentTerms: text("paymentTerms"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const paymentSchedule = pgTable("payment_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => order.id),
  installmentPlanId: uuid("installmentPlanId").references(() => installmentPlan.id),
  scheduledDate: timestamp("scheduledDate").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'processing', 'completed', 'failed', 'cancelled'
  paymentId: uuid("paymentId").references(() => payment.id),
  reminderSent: boolean("reminderSent").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Analytics and reporting tables
export const report = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'sales', 'user_activity', 'financial', etc.
  parameters: jsonb("parameters"),
  generatedBy: text("generatedBy").notNull().references(() => user.id),
  generatedAt: timestamp("generatedAt").notNull().defaultNow(),
  data: jsonb("data"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const analyticsEvent = pgTable("analytics_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => user.id),
  eventType: text("eventType").notNull(), // 'page_view', 'order_placed', 'login', etc.
  eventData: jsonb("eventData"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  sessionId: text("sessionId"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const dashboardMetric = pgTable("dashboard_metric", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  unit: text("unit"),
  category: text("category").notNull(), // 'revenue', 'users', 'orders', etc.
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly'
  date: timestamp("date").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Audit and compliance tables
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => user.id),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'login', etc.
  entityType: text("entityType").notNull(), // 'user', 'order', 'payment', etc.
  entityId: text("entityId"),
  oldValues: jsonb("oldValues"),
  newValues: jsonb("newValues"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const complianceRecord = pgTable("compliance_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").references(() => user.id),
  companyId: uuid("companyId").references(() => company.id),
  regulationType: text("regulationType").notNull(), // 'GDPR', 'HIPAA', 'SOX', etc.
  complianceStatus: text("complianceStatus").notNull(), // 'compliant', 'non_compliant', 'pending_review'
  details: jsonb("details"),
  reviewedBy: text("reviewedBy").references(() => user.id),
  reviewedAt: timestamp("reviewedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const dataRetentionPolicy = pgTable("data_retention_policy", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  entityType: text("entityType").notNull(), // 'user_data', 'audit_logs', 'reports', etc.
  retentionPeriod: integer("retentionPeriod").notNull(), // in days
  retentionUnit: text("retentionUnit").notNull().default("days"), // 'days', 'months', 'years'
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Registration-specific tables
export const bankDetails = pgTable("bank_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  bankName: text("bankName").notNull(),
  accountNumber: text("accountNumber").notNull(),
  routingNumber: text("routingNumber"),
  swiftCode: text("swiftCode"),
  accountHolderName: text("accountHolderName").notNull(),
  currency: text("currency").notNull().default("USD"),
  isVerified: boolean("isVerified").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const document = pgTable("document", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => user.id),
  documentType: text("documentType").notNull(), // 'license', 'certificate', 'id', 'bank_statement', etc.
  fileName: text("fileName").notNull(),
  filePath: text("filePath").notNull(),
  fileSize: integer("fileSize").notNull(),
  mimeType: text("mimeType").notNull(),
  isVerified: boolean("isVerified").notNull().default(false),
  verifiedBy: text("verifiedBy").references(() => user.id),
  verifiedAt: timestamp("verifiedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const registrationStep = pgTable("registration_step", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  stepName: text("stepName").notNull(), // 'company_type', 'company_details', 'specific_form', 'user_details', 'bank_details', 'documents', 'complete'
  isCompleted: boolean("isCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  data: jsonb("data"), // Store step-specific data
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const approvalWorkflow = pgTable("approval_workflow", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  currentStep: text("currentStep").notNull(), // 'initial_review', 'compliance_check', 'management_approval', 'final_approval'
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'requires_changes'
  assignedTo: text("assignedTo").references(() => user.id),
  notes: text("notes"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Pricing Calculator Tables
export const pricingCalculation = pgTable("pricing_calculation", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id),
  serviceId: uuid("serviceId").references(() => service.id),
  icd11Code: text("icd11Code"),
  serviceName: text("serviceName").notNull(),
  serviceDescription: text("serviceDescription"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }),
  quantity: integer("quantity").notNull().default(1),
  currency: text("currency").notNull().default("LYD"),
  healthUnits: decimal("healthUnits", { precision: 10, scale: 4 }),
  aiSuggestedPrice: decimal("aiSuggestedPrice", { precision: 10, scale: 2 }),
  marketAveragePrice: decimal("marketAveragePrice", { precision: 10, scale: 2 }),
  complexityScore: decimal("complexityScore", { precision: 3, scale: 2 }),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).default("0"),
  finalPrice: decimal("finalPrice", { precision: 10, scale: 2 }),
  calculationData: jsonb("calculationData"), // Store detailed calculation parameters
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("serviceId").references(() => service.id),
  icd11Code: text("icd11Code"),
  region: text("region").notNull(),
  currency: text("currency").notNull(),
  averagePrice: decimal("averagePrice", { precision: 10, scale: 2 }),
  minPrice: decimal("minPrice", { precision: 10, scale: 2 }),
  maxPrice: decimal("maxPrice", { precision: 10, scale: 2 }),
  medianPrice: decimal("medianPrice", { precision: 10, scale: 2 }),
  priceTrend: text("priceTrend"), // 'increasing', 'decreasing', 'stable'
  trendPercentage: decimal("trendPercentage", { precision: 5, scale: 2 }),
  dataPoints: integer("dataPoints").notNull().default(0),
  lastUpdated: timestamp("lastUpdated").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const bulkDiscountTier = pgTable("bulk_discount_tier", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("serviceId").references(() => service.id),
  icd11CategoryId: uuid("icd11CategoryId").references(() => icd11Category.id),
  minQuantity: integer("minQuantity").notNull(),
  maxQuantity: integer("maxQuantity"),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const pricingAuditLog = pgTable("pricing_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  calculationId: uuid("calculationId").references(() => pricingCalculation.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id),
  action: text("action").notNull(), // 'calculate', 'save', 'export', 'bulk_calculate'
  oldData: jsonb("oldData"),
  newData: jsonb("newData"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const cachedPricingData = pgTable("cached_pricing_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: text("cacheKey").notNull().unique(),
  data: jsonb("data").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Insurance purchasing system tables
export const insuranceCart = pgTable("insurance_cart", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const insuranceCartItem = pgTable("insurance_cart_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cartId").notNull().references(() => insuranceCart.id, { onDelete: "cascade" }),
  listingId: uuid("listingId").notNull().references(() => listing.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  finalPrice: decimal("finalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const insuranceOrder = pgTable("insurance_order", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'
  orderDate: timestamp("orderDate").notNull().defaultNow(),
  deliveryDate: timestamp("deliveryDate"),
  notes: text("notes"),
  bulkDiscountApplied: boolean("bulkDiscountApplied").notNull().default(false),
  totalDiscount: decimal("totalDiscount", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const insuranceOrderItem = pgTable("insurance_order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => insuranceOrder.id, { onDelete: "cascade" }),
  listingId: uuid("listingId").notNull().references(() => listing.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  finalPrice: decimal("finalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const supplierPreference = pgTable("supplier_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  supplierId: uuid("supplierId").notNull().references(() => company.id),
  preferenceLevel: text("preferenceLevel").notNull(), // 'preferred', 'standard', 'avoid'
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const budgetLimit = pgTable("budget_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("companyId").notNull().references(() => company.id, { onDelete: "cascade" }),
  categoryId: uuid("categoryId").references(() => icd11Category.id),
  monthlyLimit: decimal("monthlyLimit", { precision: 10, scale: 2 }).notNull(),
  currentSpent: decimal("currentSpent", { precision: 10, scale: 2 }).default("0"),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Buyer dashboard tables
export const serviceReview = pgTable("service_review", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  serviceId: uuid("serviceId").notNull().references(() => service.id),
  orderId: uuid("orderId").references(() => order.id),
  rating: integer("rating").notNull(), // 1-5 stars
  reviewText: text("reviewText"),
  isVerified: boolean("isVerified").notNull().default(false), // Verified purchase
  helpfulVotes: integer("helpfulVotes").default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const investorPortfolio = pgTable("investor_portfolio", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  totalValue: decimal("totalValue", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const portfolioHolding = pgTable("portfolio_holding", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolioId").notNull().references(() => investorPortfolio.id, { onDelete: "cascade" }),
  serviceId: uuid("serviceId").notNull().references(() => service.id),
  quantity: integer("quantity").notNull(),
  purchasePrice: decimal("purchasePrice", { precision: 10, scale: 2 }).notNull(),
  currentValue: decimal("currentValue", { precision: 10, scale: 2 }),
  purchaseDate: timestamp("purchaseDate").notNull(),
  lastUpdated: timestamp("lastUpdated").notNull().defaultNow(),
});

export const buyerAnalytics = pgTable("buyer_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  metricType: text("metricType").notNull(), // 'utilization_rate', 'roi', 'cost_savings', etc.
  value: decimal("value", { precision: 15, scale: 2 }),
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly'
  date: timestamp("date").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const buyerAlert = pgTable("buyer_alert", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  alertType: text("alertType").notNull(), // 'service_expiration', 'low_utilization', 'price_change'
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high'
  isRead: boolean("isRead").notNull().default(false),
  actionRequired: boolean("actionRequired").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
