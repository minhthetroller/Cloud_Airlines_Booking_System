import { NextResponse } from "next/server"
import { Resend } from "resend"

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: Request) {
  try {
    const { email, token, baseUrl } = await request.json()

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token are required" }, { status: 400 })
    }

    // Use the provided baseUrl or fall back to the environment variable
    const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://www.cloud-airlines.space/"

    // Create the verification URL with the correct base URL and include email parameter
    // Make sure the URL doesn't have double slashes
    const verificationUrl = `${appUrl.replace(/\/$/, "")}/register/set-password?token=${token}&email=${encodeURIComponent(email)}`

    // Create a simple HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Welcome to Cloud Airline</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8f5f2;
              color: #3a4f5c;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
            }
            .content {
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
              padding: 40px;
            }
            .button {
              background-color: #8a7a4e;
              border-radius: 4px;
              color: #ffffff;
              display: inline-block;
              font-size: 16px;
              font-weight: 600;
              padding: 15px 30px;
              text-decoration: none;
              text-align: center;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              color: #8898aa;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://www.cloud-airlines.space/logo.png" alt="Cloud Airline" width="180" />
            </div>
            <div class="content">
              <h1 style="color: #0f2d3c; font-size: 24px; text-align: center;">Welcome to COSMILE</h1>
              <p>Dear valued member,</p>
              <p>Thank you for joining the premium frequent flyer program of Cloud Airline. We're excited to have you on board!</p>
              <p>To complete your registration and secure your account, please set your password by clicking the button below.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button" style="color: #ffffff;">Set Your Password</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
              <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>If you didn't request this email, there's nothing to worry about - you can safely ignore it.</p>
              <hr style="border: none; border-top: 1px solid #dfe1e4; margin: 30px 0;" />
              <p style="font-size: 14px; color: #666;">This link will expire in 24 hours for security reasons.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Cloud Airline. All rights reserved.</p>
              <p>
                <a href="https://www.cloud-airlines.space/privacy" style="color: #8898aa;">Privacy Policy</a> •
                <a href="https://www.cloud-airlines.space/terms" style="color: #8898aa;">Terms of Service</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send the email using Resend with the HTML content
    const { data, error } = await resend.emails.send({
      from: "Cloud Airline <noreply@cloud-airlines.space>",
      to: email,
      subject: "Welcome to COSMILE - Verify Your Email",
      html: htmlContent,
    })

    if (error) {
      console.error("Resend API error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
