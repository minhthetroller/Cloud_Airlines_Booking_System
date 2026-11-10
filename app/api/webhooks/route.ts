import type { Stripe } from "stripe";

import { NextResponse } from "next/server";
import axios from "axios"

import { stripe } from "@/lib/stripe";
import { expireStaleBookings, getBookingDetails } from "@/lib/server/bookings";
import { closePayment, completePayment } from "@/lib/server/payments";

// Function to send confirmation email
async function sendConfirmationEmail(bookingId: number) {
  try {
    const details = await getBookingDetails(bookingId);

    if (!details || details.tickets.length === 0) {
      console.error("No tickets found for booking:", bookingId);
      return;
    }

    if (!details.contactEmail) {
      console.error("No contact email found for booking:", bookingId);
      return;
    }

    console.log("Sending confirmation email to:", details.contactEmail);

    // Call the send-ticket-confirmation API
    const response = await axios.post(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-ticket-confirmation`, {
      email: details.contactEmail,
      booking: details.booking,
      tickets: details.tickets,
    })

    console.log(`✅ Confirmation email sent successfully to ${details.contactEmail} for booking ${bookingId}`)
    console.log(`Email API response:`, response.data);
  } catch (err: any) {
    console.error("Error in sendConfirmationEmail:", err)
    if (err.response) {
      console.error("Error sending confirmation email:", err.response.data?.error);
    }
  }
}

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await (await req.blob()).text(),
      req.headers.get("stripe-signature") as string,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    // On error, log and return the error message.
    if (!(err instanceof Error)) console.log(err);
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 },
    );
  }

  // Successfully constructed event.
  console.log("✅ Success:", event.id);

  const permittedEvents: string[] = [
    "checkout.session.completed",
    "checkout.session.expired",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
  ];

  if (permittedEvents.includes(event.type)) {
    let data;

    try {
      switch (event.type) {
        case "checkout.session.completed":
          data = event.data.object as Stripe.Checkout.Session;
          console.log(`💰 CheckoutSession status: ${data.payment_status}`);

          // Handle successful payment
          if (data.payment_status === "paid") {
            const paymentId = Number(data.metadata?.paymentId);

            if (paymentId) {
              // Payment, booking, tickets and points are updated in one transaction
              const result = await completePayment(paymentId, (data.payment_intent as string) ?? null);

              if (result.alreadyProcessed) {
                console.log(`⚠️ Payment ${paymentId} already processed, skipping`);
                return NextResponse.json({ message: "Already processed" }, { status: 200 });
              }

              if (result.confirmed) {
                await sendConfirmationEmail(result.bookingId);
              }

              console.log(`✅ Payment completed for booking ${result.bookingId}`);
            }
          }
          break;
        case "checkout.session.expired":
          data = event.data.object as Stripe.Checkout.Session;
          if (data.metadata?.paymentId && data.metadata?.bookingId) {
            await closePayment(Number(data.metadata.paymentId), Number(data.metadata.bookingId), "Expired");
            // Frees the seats of bookings whose payment window is over
            await expireStaleBookings();
          }
          break;
        case "payment_intent.payment_failed":
          data = event.data.object as Stripe.PaymentIntent;
          console.log(`❌ Payment failed: ${data.last_payment_error?.message}`);
          break;
        case "payment_intent.succeeded":
          data = event.data.object as Stripe.PaymentIntent;
          console.log(`💰 PaymentIntent status: ${data.status}`);
          break;
        default:
          throw new Error(`Unhandled event: ${event.type}`);
      }
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { message: "Webhook handler failed" },
        { status: 500 },
      );
    }
  }
  // Return a response to acknowledge receipt of the event.
  return NextResponse.json({ message: "Received" }, { status: 200 });
}
