// Centralized pricing configuration and utilities

export const PRICING_CONFIG = {
  PRICE_INCREMENT: 0.5,
  MIN_PRICE: 0.5,
  MAX_PRICE: 9.5,
  MAX_PAYOUT: 10.0,
};

// Round price to nearest valid increment
export const roundToValidPrice = (price) => {
  const { PRICE_INCREMENT, MIN_PRICE, MAX_PRICE } = PRICING_CONFIG;
  const rounded = Math.round(price / PRICE_INCREMENT) * PRICE_INCREMENT;
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, rounded));
};

// Calculate market prices based on yesShare, rounded to valid increments
export const calculateMarketPrices = (yesShare) => {
  const { MAX_PAYOUT } = PRICING_CONFIG;

  const rawYesPrice = (yesShare * MAX_PAYOUT) / 100;
  const rawNoPrice = ((100 - yesShare) * MAX_PAYOUT) / 100;

  const yesPrice = roundToValidPrice(rawYesPrice);
  const noPrice = roundToValidPrice(rawNoPrice);

  return {
    yes: yesPrice,
    no: noPrice,
  };
};

// Increment price by configured amount
export const incrementPrice = (currentPrice) => {
  const { PRICE_INCREMENT, MAX_PRICE } = PRICING_CONFIG;
  const newPrice = currentPrice + PRICE_INCREMENT;
  return Math.min(MAX_PRICE, roundToValidPrice(newPrice));
};

// Decrement price by configured amount
export const decrementPrice = (currentPrice) => {
  const { PRICE_INCREMENT, MIN_PRICE } = PRICING_CONFIG;
  const newPrice = currentPrice - PRICE_INCREMENT;
  return Math.max(MIN_PRICE, roundToValidPrice(newPrice));
};

// Validate if price is within allowed bounds
export const isValidPrice = (price) => {
  const { MIN_PRICE, MAX_PRICE } = PRICING_CONFIG;
  return price >= MIN_PRICE && price <= MAX_PRICE;
};

// Format price for display (ensures consistent formatting)
export const formatPrice = (price) => {
  return price.toFixed(1);
};
