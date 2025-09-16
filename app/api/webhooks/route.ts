import type { Stripe } from "stripe";

import { NextResponse } from "next/server";
import supabaseClient from "@/lib/supabase/supabaseClient"
import axios from "axios"

import { stripe } from "@/lib/stripe";

// Function to send confirmation email
async function sendConfirmationEmail(bookingId: string, contactEmail: string) {
  try {
    console.log("Sending confirmation email to:", contactEmail);

    // Get booking details
    const { data: bookingData, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("bookingid", bookingId)
      .single();

    if (bookingError) {
      console.error("Error fetching booking details:", bookingError);
      return;
    }

    // Get ticket details
    const { data: ticketsData, error: ticketsError } = await supabaseClient
      .from("tickets")
      .select(`
        *,
        flights(*),
        passengers(*),
        seats(*)
      `)
      .eq("bookingid", bookingId);

    if (ticketsError) {
      console.error("Error fetching ticket details:", ticketsError);
      return;
    }

    if (!ticketsData || ticketsData.length === 0) {
      console.error("No tickets found for booking:", bookingId);
      return;
    }

    // Call the send-ticket-confirmation API
    const response = await axios.post(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-ticket-confirmation`, {
      email: contactEmail,
      booking: bookingData,
      tickets: ticketsData,
    })

    const result = response.data
    console.log(`✅ Confirmation email sent successfully to ${contactEmail} for booking ${bookingId}`)
    console.log(`Email API response:`, result);
    
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
            const bookingId = data.metadata?.bookingId;
            const paymentId = data.metadata?.paymentId;
            const transactionId = data.payment_intent as string;
            
            if (bookingId && paymentId) {
              try {
                // First check if this transaction has already been processed (idempotency check)
                const { data: existingPayment, error: checkError } = await supabaseClient
                  .from("payments")
                  .select("paymentstatus, transactionid")
                  .eq("paymentid", paymentId)
                  .single();

                if (checkError) {
                  console.error("Error checking existing payment:", checkError);
                  return NextResponse.json({ message: "Payment check failed" }, { status: 500 });
                }

                // If payment is already completed or has this transaction ID, skip processing
                if (existingPayment.paymentstatus === "Completed" || 
                    existingPayment.transactionid === transactionId) {
                  console.log(`⚠️ Payment ${paymentId} already processed, skipping`);
                  return NextResponse.json({ message: "Already processed" }, { status: 200 });
                }

                // Update payment record to completed
                const { error: paymentError } = await supabaseClient
                  .from("payments")
                  .update({
                    paymentmethod: "Credit Card",
                    paymentstatus: "Completed",
                    transactionid: transactionId,
                  })
                  .eq("paymentid", paymentId);

                if (paymentError) {
                  console.error("Error updating payment:", paymentError);
                  return NextResponse.json({ message: "Payment update failed" }, { status: 500 });
                }

                // Update booking status to Confirmed
                const { error: bookingStatusError } = await supabaseClient
                  .from("bookings")
                  .update({
                    bookingstatus: "Confirmed",
                  })
                  .eq("bookingid", bookingId);

                if (bookingStatusError) {
                  console.error("Error updating booking status:", bookingStatusError);
                  return NextResponse.json({ message: "Booking status update failed" }, { status: 500 });
                }

                // Get booking details for email and points
                const { data: bookingData, error: bookingError } = await supabaseClient
                  .from("bookings")
                  .select("contactemail, userid")
                  .eq("bookingid", bookingId)
                  .single();

                if (bookingError) {
                  console.error("Error fetching booking data:", bookingError);
                } else {
                  // Add points to user if applicable
                  if (bookingData?.userid) {
                    // Calculate points (500,000 VND = 1 point)
                    const amount = data.amount_total || 0;
                    const pointsToAdd = Math.floor((amount * 25000) / 500000); // Convert from USD cents to VND, then to points
                    
                    if (pointsToAdd > 0) {
                      const { data: userData, error: userError } = await supabaseClient
                        .from("users")
                        .select("pointsavailable")
                        .eq("userid", bookingData.userid)
                        .single();

                      if (!userError && userData) {
                        const newPoints = (userData.pointsavailable || 0) + pointsToAdd;
                        await supabaseClient
                          .from("users")
                          .update({ pointsavailable: newPoints })
                          .eq("userid", bookingData.userid);
                        
                        console.log(`✅ Added ${pointsToAdd} points to user ${bookingData.userid}`);
                      }
                    }
                  }

                  // Send confirmation email
                  if (bookingData?.contactemail) {
                    await sendConfirmationEmail(bookingId, bookingData.contactemail);
                  }
                }

                console.log(`✅ Payment completed for booking ${bookingId}`);
              } catch (error) {
                console.error("Error processing payment completion:", error);
                return NextResponse.json({ message: "Payment processing failed" }, { status: 500 });
              }
            }
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