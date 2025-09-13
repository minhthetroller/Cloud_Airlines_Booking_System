import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const amount = Number(formData.get("amount")) || 1000; // Default amount in cents

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      metadata: {
        bookingId: formData.get("bookingId") as string || "",
        paymentId: formData.get("paymentId") as string || "",
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}