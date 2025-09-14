export function formatAmountForDisplay(
  amount: number,
  currency: string,
): string {
  let numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  });
  return numberFormat.format(amount);
}

export function formatAmountForStripe(
  amount: number,
  currency: string,
): number {
  let numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  });
  const parts = numberFormat.formatToParts(amount);
  let zeroDecimalCurrency: boolean = true;
  for (let part of parts) {
    if (part.type === "decimal") {
      zeroDecimalCurrency = false;
    }
  }
  return zeroDecimalCurrency ? amount : Math.round(amount * 100);
}

// VND to USD conversion (approximate rate: 1 USD = 25,000 VND)
export function convertVNDtoUSD(amountVND: number): number {
  const exchangeRate = 25000; // Approximate rate, in production this should be fetched from a live API
  return Math.round((amountVND / exchangeRate) * 100) / 100; // Round to 2 decimal places
}

// Convert VND to USD and format for Stripe (in cents)
export function formatVNDForStripe(amountVND: number): number {
  const amountUSD = convertVNDtoUSD(amountVND);
  return Math.round(amountUSD * 100); // Convert to cents for Stripe
}

// Updated function to handle VND amounts properly
export function formatAmountForStripeFromVND(amountVND: number): number {
  return formatVNDForStripe(amountVND);
}

// Format VND amount for display
export function formatVNDForDisplay(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
}
