import Stripe from "stripe";

let _stripe;
export function stripe() {
  _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export function checkoutEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}
