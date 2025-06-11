
// Security validation utilities
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size must be less than 5MB' };
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return { isValid: false, error: 'Invalid file extension' };
  }

  return { isValid: true };
};

export const validateProductData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate name
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Product name is required');
  } else if (data.name.length > 100) {
    errors.push('Product name must be less than 100 characters');
  }

  // Validate quantity
  if (data.quantity !== undefined) {
    const quantity = Number(data.quantity);
    if (isNaN(quantity) || quantity < 0 || quantity > 9999) {
      errors.push('Quantity must be a number between 0 and 9999');
    }
  }

  // Validate amount
  if (data.amount !== undefined) {
    const amount = Number(data.amount);
    if (isNaN(amount) || amount < 0 || amount > 999999) {
      errors.push('Amount must be a number between 0 and 999999');
    }
  }

  // Validate expiry date
  if (data.expiry_date) {
    const expiryDate = new Date(data.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid expiry date');
    } else if (expiryDate < today) {
      errors.push('Expiry date cannot be in the past');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters and trim whitespace
  return input
    .replace(/[<>\"']/g, '') // Remove HTML/SQL injection characters
    .trim()
    .substring(0, 1000); // Limit length
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { isValid: errors.length === 0, errors };
};
