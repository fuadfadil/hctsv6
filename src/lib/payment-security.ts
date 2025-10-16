import crypto from 'crypto';

// PCI DSS Compliance and Security Utilities
export class PaymentSecurity {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  // Generate encryption key for sensitive data
  static generateEncryptionKey(): Buffer {
    return crypto.randomBytes(this.KEY_LENGTH);
  }

  // Encrypt sensitive payment data (card numbers, etc.)
  static encryptSensitiveData(data: string, key?: Buffer): string {
    const encryptionKey = key || this.generateEncryptionKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipher(this.ALGORITHM, encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // Decrypt sensitive payment data
  static decryptSensitiveData(encryptedData: string, key: Buffer): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(this.ALGORITHM, key);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Tokenize payment method data
  static tokenizePaymentData(data: any): string {
    const tokenData = {
      ...data,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const jsonData = JSON.stringify(tokenData);
    return this.encryptSensitiveData(jsonData);
  }

  // Detokenize payment method data
  static detokenizePaymentData(token: string, key: Buffer): any {
    try {
      const decrypted = this.decryptSensitiveData(token, key);
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Invalid payment token');
    }
  }

  // Generate secure payment reference
  static generatePaymentReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  // Validate card number using Luhn algorithm
  static validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  // Mask sensitive card data
  static maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;

    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);

    return `${masked}${lastFour}`;
  }

  // Validate Libyan mobile number
  static validateLibyanMobileNumber(phoneNumber: string): boolean {
    // Libyan mobile numbers start with +218 and are followed by 9 digits
    const libyanMobileRegex = /^\+218[9][1-5]\d{7}$/;
    return libyanMobileRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  // Generate fraud detection score
  static calculateFraudScore(paymentData: {
    amount: number;
    currency: string;
    paymentMethod: string;
    userHistory: any[];
    ipAddress: string;
    userAgent: string;
  }): number {
    let score = 0;

    // Amount-based scoring
    if (paymentData.amount > 10000) score += 30; // High amount
    else if (paymentData.amount > 5000) score += 20;
    else if (paymentData.amount > 1000) score += 10;

    // Payment method scoring
    if (paymentData.paymentMethod === 'bank_transfer') score -= 20; // Lower risk
    if (paymentData.paymentMethod === 'mobile_money') score -= 10;

    // User history scoring
    const recentPayments = paymentData.userHistory.filter(p =>
      new Date(p.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentPayments.length > 5) score += 25; // High frequency
    else if (recentPayments.length > 2) score += 15;

    // IP-based scoring (simplified)
    // In production, you'd check against known fraud databases
    if (this.isSuspiciousIP(paymentData.ipAddress)) score += 40;

    // User agent consistency
    if (this.isInconsistentUserAgent(paymentData.userAgent, paymentData.userHistory)) {
      score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  private static isSuspiciousIP(ipAddress: string): boolean {
    // Simplified check - in production, use threat intelligence services
    const suspiciousRanges = [
      '10.0.0.0/8',    // Private network
      '172.16.0.0/12', // Private network
      '192.168.0.0/16', // Private network
    ];

    // This is a basic implementation - use proper IP range checking
    return suspiciousRanges.some(range => ipAddress.startsWith(range.split('/')[0]));
  }

  private static isInconsistentUserAgent(userAgent: string, history: any[]): boolean {
    if (history.length === 0) return false;

    const recentUserAgents = history
      .slice(-5)
      .map(h => h.userAgent)
      .filter(ua => ua);

    if (recentUserAgents.length === 0) return false;

    // Check if current user agent differs significantly from recent ones
    const currentBrowser = this.extractBrowserInfo(userAgent);
    const recentBrowsers = recentUserAgents.map(ua => this.extractBrowserInfo(ua));

    return !recentBrowsers.some(browser =>
      browser.name === currentBrowser.name &&
      Math.abs(browser.version - currentBrowser.version) <= 2
    );
  }

  private static extractBrowserInfo(userAgent: string): { name: string; version: number } {
    // Simplified browser detection
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/(\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+)/ },
      { name: 'Edge', regex: /Edg\/(\d+)/ },
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      if (match) {
        return { name: browser.name, version: parseInt(match[1], 10) };
      }
    }

    return { name: 'Unknown', version: 0 };
  }

  // Generate secure webhook signature
  static generateWebhookSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  // Verify webhook signature
  static verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Libyan financial compliance checks
  static checkLibyanCompliance(paymentData: {
    amount: number;
    currency: string;
    paymentMethod: string;
    userLocation: string;
    merchantType: string;
  }): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];

    // Currency restrictions
    if (!['LYD', 'USD', 'EUR'].includes(paymentData.currency)) {
      issues.push('Currency not supported in Libya');
    }

    // Amount limits for different payment methods
    if (paymentData.paymentMethod === 'mobile_money' && paymentData.amount > 5000) {
      issues.push('Mobile money transactions limited to 5000 LYD');
    }

    // Location-based restrictions
    if (paymentData.userLocation && !this.isValidLibyanLocation(paymentData.userLocation)) {
      issues.push('Payment location restrictions apply');
    }

    // Merchant type restrictions
    if (['gambling', 'weapons', 'restricted'].includes(paymentData.merchantType)) {
      issues.push('Merchant type not permitted under Libyan regulations');
    }

    return {
      compliant: issues.length === 0,
      issues,
    };
  }

  private static isValidLibyanLocation(location: string): boolean {
    // Simplified location validation
    // In production, use proper geolocation services
    const libyanCities = [
      'Tripoli', 'Benghazi', 'Misrata', 'Zawiya', 'Sabha',
      'Ajdabiya', 'Al-Bayda', 'Al-Marj', 'Tobruk', 'Derna'
    ];

    return libyanCities.some(city =>
      location.toLowerCase().includes(city.toLowerCase())
    );
  }

  // Audit logging for financial transactions
  static createAuditLog(action: string, details: any, userId?: string, ipAddress?: string): any {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      userId,
      ipAddress,
      details,
      checksum: crypto.createHash('sha256').update(JSON.stringify(details)).digest('hex'),
    };
  }
}

// Rate limiting for payment endpoints
export class PaymentRateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(identifier: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }

  static getRemainingAttempts(identifier: string, maxAttempts: number = 10): number {
    const record = this.attempts.get(identifier);
    if (!record) return maxAttempts;

    return Math.max(0, maxAttempts - record.count);
  }
}