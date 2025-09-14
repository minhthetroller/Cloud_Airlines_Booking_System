import { NextRequest, NextResponse } from "next/server";
import { createPaymentIntent } from "@/app/actions/stripe";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Use the action function which now creates a checkout session for card-only payments
    const result = await createPaymentIntent(formData);

    return NextResponse.json({
      client_secret: result.client_secret,
      url: result.url,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}