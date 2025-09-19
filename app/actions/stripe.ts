"use server";

import type { Stripe } from "stripe";

import { headers } from "next/headers";

import { CURRENCY } from "@/config";
import { formatAmountForStripeFromVND } from "@/utils/stripe-helpers";
import { stripe } from "@/lib/stripe/stripe";

export async function createPaymentIntent(
  data: FormData,
): Promise<{ client_secret: string | null; url: string | null }> {
  const amountVND = Number(data.get("amount")) || Number(data.get("customDonation"));
  const bookingId = data.get("bookingId") as string;
  const paymentId = data.get("paymentId") as string;
  const userId = data.get("userId") as string;
  const bookingReference = data.get("bookingReference") as string;
  const sessionId = data.get("sessionId") as string;
  const ui_mode = (data.get("uiMode") as Stripe.Checkout.SessionCreateParams.UiMode) || "embedded";

  const headersList = await headers();
  const origin: string = headersList.get("origin") as string;

  const checkoutSession: Stripe.Checkout.Session =
    await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: "Airline Ticket",
              description: `Booking ID: ${bookingId || 'N/A'}`,
            },
            unit_amount: formatAmountForStripeFromVND(amountVND),
          },
        },
      ],
      payment_method_types: ["card"],
      metadata: {
        ...(bookingId && { bookingId }),
        ...(paymentId && { paymentId }),
        ...(userId && { userId }),
        ...(bookingReference && { bookingReference }),
        ...(sessionId && { sessionId }),
      },
      // Use proper success and cancel URLs for hosted checkout
      success_url: `${origin}/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
      cancel_url: `${origin}/payment?payment_status=cancelled`,
      // Set automatic tax calculation if needed
      automatic_tax: { enabled: false },
      // Configure billing address collection
      billing_address_collection: "auto",
      // Set customer creation for future payments (optional)
      customer_creation: "if_required",
      ui_mode,
    });

  return {
    client_secret: checkoutSession.client_secret,
    url: checkoutSession.url,
  };
}