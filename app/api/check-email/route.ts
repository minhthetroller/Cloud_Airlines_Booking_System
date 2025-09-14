import { NextResponse } from "next/server"
import supabaseClient from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("Checking email:", email)

    // Check if email exists in users table - using emailaddress column
    const { data, error } = await supabaseClient
      .from("users")
      .select("username")
      .eq("username", email.toLowerCase())
      .maybeSingle()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error occurred" }, { status: 500 })
    }

    // If data exists, email is already registered
    const exists = !!data

    console.log("Email exists:", exists)

    return NextResponse.json({ exists })
  } catch (error: any) {
    console.error("Error checking email:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
