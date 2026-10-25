/**
 * Centralized form and profile validation utilities
 * Enforces strict validation across Customer, Staff, Artisan Worker, Delivery Personnel, Carrier Partner, and Admin profiles.
 */

/**
 * Validates a person's full name.
 * Strictly forbids numbers/digits. Letters, spaces, dots, hyphens, and apostrophes are allowed.
 */
export const validateName = (name: string): string | null => {
  if (!name || !name.trim()) {
    return 'Full name is required.';
  }
  const clean = name.trim();
  if (clean.length < 2) {
    return 'Name must be at least 2 characters long.';
  }
  if (/\d/.test(clean)) {
    return 'Numbers are not permitted in names. Please use letters only.';
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(clean)) {
    return 'Name must contain letters, spaces, dots, and hyphens only.';
  }
  const letterCount = clean.replace(/[^a-zA-Z]/g, '').length;
  if (letterCount < 2) {
    return 'Name must contain at least 2 alphabetical letters.';
  }
  return null;
};
/**
 * Extracts clean 10-digit Indian mobile number from any input.
 * Strips non-digits and leading +91, 91, or 0.
 */
export const extract10DigitPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

/**
 * Validates Indian 10-digit mobile numbers (excluding country code +91).
 * Must be exactly 10 digits and start with 6, 7, 8, or 9.
 */
export const validatePhoneNumber = (phone: string, required: boolean = true): string | null => {
  if (!phone || !phone.trim()) {
    return required ? 'Please enter a 10-digit mobile number.' : null;
  }

  const digits = extract10DigitPhone(phone);

  if (digits.length === 0) {
    return required ? 'Please enter a 10-digit mobile number.' : null;
  }

  if (digits.length !== 10) {
    return 'Please enter a valid 10-digit mobile number.';
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(digits)) {
    return 'Mobile number must start with 6, 7, 8, or 9.';
  }

  // Rejects all identical repeating digits like 0000000000, 1111111111
  if (/^(\d)\1{9}$/.test(digits)) {
    return 'Please enter a valid active 10-digit mobile number.';
  }

  // Rejects sequential dummy pattern
  if (digits === '1234567890') {
    return 'Please enter a valid active 10-digit mobile number.';
  }

  return null;
};

/**
 * Validates 6-digit Indian PIN Code.
 */
export const validatePincode = (pincode: string): string | null => {
  if (!pincode || !pincode.trim()) {
    return 'PIN Code is required.';
  }
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) {
    return 'PIN Code must be a valid 6-digit postal code (e.g. 686001).';
  }
  return null;
};

/**
 * Normalizes phone number into standard canonical string (e.g. +91 97782 37180).
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return String(phone).trim();
};
