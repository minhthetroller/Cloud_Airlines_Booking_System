import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key, not anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email, registrationData } = await request.json()

    if (!email || !registrationData) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    // Generate a random UUID for the password (user will set their actual password later)
    const tempPassword = crypto.randomUUID()

    // Create user in Supabase Auth using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: false, // We'll handle email confirmation ourselves
    })

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: `Error creating auth user: ${authError.message}` }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 400 })
    }

    // Create customer record linked to the auth user using regular client
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: customerResult, error: customerError } = await supabaseClient
      .from("customers")
      .insert([
        {
          user_id: authData.user.id,
          pronoun: registrationData.title,
          firstname: registrationData.firstName,
          lastname: registrationData.lastName,
          email: registrationData.email,
          dateofbirth: registrationData.dateOfBirth?.split('T')[0],
          gender: registrationData.gender,
          nationality: registrationData.nationality,
          identitycardnumber: registrationData.identityCardNumber,
          phonenumber: registrationData.phoneNumber,
          country: registrationData.country,
          city: registrationData.city,
          addressline: registrationData.addressLine,
          passportnumber: registrationData.passportNumber,
          passportexpiry: registrationData.passportExpiry,
          contactname: `${registrationData.firstName} ${registrationData.lastName}`,
          contactemail: registrationData.email,
          contactphone: registrationData.phoneNumber,
          points_available: 0,
        },
      ])
      .select()
      .single()

    if (customerError) {
      console.error("Customer error:", customerError)
      return NextResponse.json({ error: `Error creating customer: ${customerError.message}` }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id,
      customerId: customerResult.user_id 
    })

  } catch (error: any) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}