// Card brand detection utility functions

export interface CardBrand {
  name: string;
  icon: string;
  pattern: RegExp;
  length?: number[];
  cvvLength?: number[];
}

export const cardBrands: CardBrand[] = [
  {
    name: "Visa",
    icon: "/visa-logo-generic.png",
    pattern: /^4[0-9]{0,15}$/,
    length: [13, 16, 19],
    cvvLength: [3],
  },
  {
    name: "Mastercard",
    icon: "/mastercard-logo.png",
    pattern: /^(5[1-5][0-9]{0,14}|2[2-7][0-9]{0,14})$/,
    length: [16],
    cvvLength: [3],
  },
  {
    name: "American Express",
    icon: "/amex-logo.png",
    pattern: /^3[47][0-9]{0,13}$/,
    length: [15],
    cvvLength: [4],
  },
  {
    name: "JCB",
    icon: "/generic-construction-logo.png", // Using the available logo
    pattern: /^35[0-9]{0,14}$/,
    length: [16],
    cvvLength: [3],
  },
];

export function detectCardBrand(cardNumber: string): CardBrand | null {
  // Remove spaces and non-digits
  const cleanNumber = cardNumber.replace(/\D/g, "");
  
  for (const brand of cardBrands) {
    if (brand.pattern.test(cleanNumber)) {
      return brand;
    }
  }
  
  return null;
}

export function validateCardNumber(cardNumber: string): boolean {
  // Remove spaces and non-digits
  const cleanNumber = cardNumber.replace(/\D/g, "");
  
  // Basic length check
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  // Luhn algorithm check
  return luhnCheck(cleanNumber);
}

function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;
  
  // Loop through values starting from the right
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

export function validateExpiryDate(expiryDate: string): boolean {
  // Format should be MM/YY
  const match = expiryDate.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  
  const [, month, year] = match;
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Check month range
  if (monthNum < 1 || monthNum > 12) return false;
  
  // Check if expiry date is in the future
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
  const currentMonth = currentDate.getMonth() + 1;
  
  if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
    return false;
  }
  
  return true;
}

export function validateCVV(cvv: string, cardBrand?: CardBrand | null): boolean {
  const cleanCVV = cvv.replace(/\D/g, "");
  
  if (!cardBrand) {
    // Generic validation - CVV should be 3 or 4 digits
    return /^\d{3,4}$/.test(cleanCVV);
  }
  
  // Brand-specific validation
  if (cardBrand.cvvLength) {
    return cardBrand.cvvLength.includes(cleanCVV.length);
  }
  
  return /^\d{3,4}$/.test(cleanCVV);
}