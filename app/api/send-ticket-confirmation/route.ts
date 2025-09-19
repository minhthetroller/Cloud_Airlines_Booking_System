import { NextResponse } from "next/server"
import resend from "@/lib/resend/resend"

export async function POST(request: Request) {
  try {
    const { email, booking, tickets } = await request.json()

    if (!email || !booking || !tickets) {
      return NextResponse.json({ error: "Email, booking, and tickets are required" }, { status: 400 })
    }

    // Validate email format
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      console.error("Invalid email format:", email)
      return NextResponse.json({ error: `Invalid email format: ${email || "undefined"}` }, { status: 400 })
    }

    console.log("Sending confirmation email to:", email)

    // Format flight details for email
    const flightDetails = tickets.map((ticket: any) => {
      const flight = ticket.flights || {}
      const passenger = ticket.passengers || {}
      const seat = ticket.seats || {}

      return {
        flightNumber: flight.flightnumber || "Unknown",
        departure: flight.departureairport || "Unknown",
        arrival: flight.arrivalairport || "Unknown",
        departureTime: flight.departuretime ? new Date(flight.departuretime).toLocaleString() : "Unknown",
        ticketNumber: ticket.ticketnumber || "Unknown",
        seatNumber: seat.seatnumber || `Seat ID: ${ticket.seatid || "Unknown"}`,
        passengerName: `${passenger.firstname || ""} ${passenger.lastname || ""}`.trim() || "Passenger",
      }
    })

    // Create a simple HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Your Booking Confirmation - Cloud Airlines</title>
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
            .ticket {
              border: 1px solid #dfe1e4;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
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
              <img src="https://www.cloud-airlines.space/logo.png" alt="Cloud Airlines" width="180" />
            </div>
            <div class="content">
              <h1 style="color: #0f2d3c; font-size: 24px; text-align: center;">Booking Confirmation</h1>
              <p>Dear valued customer,</p>
              <p>Thank you for booking with Cloud Airlines. Your booking has been confirmed and your payment has been processed successfully.</p>
              
              <div style="background-color: #f8f5f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Booking Reference:</strong> ${booking.bookingreference}</p>
                <p style="margin: 8px 0 0;"><strong>Total Amount:</strong> ${new Intl.NumberFormat("vi-VN").format(booking.totalprice)} VND</p>
              </div>
              
              <h2 style="color: #0f2d3c; font-size: 18px;">Flight Details</h2>
              
              ${flightDetails
                .map(
                  (flight: any) => `
                <div class="ticket">
                  <h3 style="margin-top: 0;">${flight.departure} to ${flight.arrival}</h3>
                  <p><strong>Flight Number:</strong> ${flight.flightNumber}</p>
                  <p><strong>Departure Time:</strong> ${flight.departureTime}</p>
                  <p><strong>Passenger:</strong> ${flight.passengerName}</p>
                  <p><strong>Ticket Number:</strong> ${flight.ticketNumber}</p>
                  <p><strong>Seat:</strong> ${flight.seatNumber}</p>
                </div>
              `,
                )
                .join("")}
              
              <p>You can view your booking details and manage your reservation by logging into your account on our website.</p>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our customer service team.</p>
              
              <p>We look forward to welcoming you on board!</p>
              
              <p>Best regards,<br>Cloud Airlines Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Cloud Airlines. All rights reserved.</p>
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
      subject: `Your Booking Confirmation - ${booking.bookingreference || "Booking"}`,
      html: htmlContent,
    })

    if (error) {
      console.error("Resend API error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Email sent successfully to:", email)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
