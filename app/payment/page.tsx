"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, CreditCard, Building, ArrowLeft, Clock, Award } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import supabaseClient from "@/lib/supabase/supabaseClient"
import { formatVNDForDisplay } from "@/utils/stripe-helpers"
import axios from "axios"

export default function PaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card")
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60) // 30 minutes in seconds
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [totalPrice, setTotalPrice] = useState<number>(0)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [contactEmail, setContactEmail] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [pointsToAdd, setPointsToAdd] = useState<number>(0)

  // Bank transfer state
  const [bankQrShown, setBankQrShown] = useState(false)

  useEffect(() => {
    // Get booking ID and reference from session storage
    const storedBookingId = sessionStorage.getItem("bookingId")
    const storedBookingReference = sessionStorage.getItem("bookingReference")
    const storedTotalPrice = sessionStorage.getItem("totalPrice")
    const storedPaymentId = sessionStorage.getItem("paymentId")
    const storedContactEmail = sessionStorage.getItem("contactEmail")
    const storedIsLoggedIn = sessionStorage.getItem("isLoggedIn")
    const storedUserId = sessionStorage.getItem("userId")

    if (storedBookingId) setBookingId(storedBookingId)
    if (storedBookingReference) setBookingReference(storedBookingReference)
    if (storedTotalPrice) {
      const price = Number.parseFloat(storedTotalPrice)
      setTotalPrice(price)

      // Calculate points (500,000 VND = 1 point)
      const points = Math.floor(price / 500000)
      setPointsToAdd(points)
    }
    if (storedPaymentId) setPaymentId(storedPaymentId)
    if (storedContactEmail) setContactEmail(storedContactEmail)
    if (storedIsLoggedIn === "true") setIsLoggedIn(true)
    if (storedUserId) setUserId(storedUserId)

    // Check for payment status from URL (when returning from Stripe)
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment_status')
    
    if (paymentStatus === 'cancelled') {
      setError("Payment was cancelled. You can try again.")
      setLoading(false)
      
      // Update payment status to cancelled if we have a payment ID
      const currentPaymentId = paymentId || sessionStorage.getItem("paymentId")
      if (currentPaymentId) {
        const updatePaymentStatus = async () => {
          try {
            await supabaseClient
              .from("payments")
              .update({
                paymentstatus: "Cancelled",
              })
              .eq("paymentid", currentPaymentId)
            
            console.log(`Payment ${currentPaymentId} marked as cancelled`)
          } catch (err) {
            console.error("Error updating payment status:", err)
          }
        }
        
        updatePaymentStatus()
      }
    }

    // Check if we have the required booking information
    if (!storedBookingId) {
      console.error("No booking ID found in session storage")

      // Check if we need to redirect back to confirmation page
      const hasFlightData = sessionStorage.getItem("selectedDepartureFlight")

      if (hasFlightData) {
        // We have flight data but no booking ID, redirect to confirmation page
        setError("Booking information not found. Redirecting to confirmation page...")
        setTimeout(() => {
          router.push("/confirmation")
        }, 2000)
      } else {
        // No flight data either, redirect to home
        setError("No booking information found. Redirecting to home page...")
        setTimeout(() => {
          router.push("/")
        }, 2000)
      }
    }

    setInitialLoading(false)

    // Set up timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          // Handle payment expiration
          handlePaymentExpiration()
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handlePaymentExpiration = async () => {
    setError("Payment session has expired. Please try booking again.")

    // Update payment record to expired if it exists
    const currentPaymentId = paymentId || sessionStorage.getItem("paymentId")
    if (currentPaymentId) {
      try {
        await supabaseClient
          .from("payments")
          .update({
            paymentstatus: "Expired",
          })
          .eq("paymentid", currentPaymentId)
        
        console.log(`Payment ${currentPaymentId} marked as expired`)
      } catch (err) {
        console.error("Error updating payment status:", err)
      }
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (paymentMethod === "card") {
        // Process Stripe payment
        return await handleStripePayment();
      }

      // Original bank transfer logic
      return await handleBankTransferPayment();
    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Payment failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleStripePayment = async () => {
    try {
      // Validate required data before creating payment record
      if (!bookingId) {
        throw new Error("Booking ID is missing. Please go back and try again.");
      }
      
      if (!totalPrice || totalPrice <= 0) {
        throw new Error("Invalid payment amount. Please go back and try again.");
      }

      // First, create payment record in database
      const now = new Date();
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from("payments")
        .insert({
          bookingid: parseInt(bookingId), // Ensure it's an integer
          paymentdatetime: now.toISOString(),
          amount: totalPrice,
          currencycode: "VND",
          paymentmethod: "Credit Card",
          paymentstatus: "Pending",
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment record:", paymentError);
        throw new Error("Failed to create payment record. Please try again.");
      }

      console.log("Payment record created:", paymentData);
      const createdPaymentId = paymentData.paymentid;
      
      // Store payment ID for later use
      setPaymentId(createdPaymentId);
      sessionStorage.setItem("paymentId", createdPaymentId.toString());

      // Create checkout session and redirect to Stripe hosted checkout
      const formData = new FormData();
      formData.append("amount", totalPrice.toString());
      formData.append("bookingId", bookingId);
      formData.append("paymentId", createdPaymentId.toString());
      formData.append("uiMode", "hosted"); // Use hosted checkout

      const response = await axios.post("/api/create-payment-intent", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      if (response.data.url) {
        // Redirect to Stripe Checkout - user will leave this page
        // Don't worry about loading state since we're navigating away
        window.location.href = response.data.url;
        // Return without throwing to prevent setting loading to false
        return;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Stripe payment error:", error);
      throw error;
    }
  }

  const handleBankTransferPayment = async () => {
    // Bank transfer logic - for now just simulate completion
    // In production, this would integrate with actual bank transfer API
    
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For bank transfer, we'll handle completion differently
    // This is a placeholder - you'd implement actual bank transfer flow
    alert("Bank transfer functionality would be implemented here");
    
    // For now, redirect to ticket confirmation
    router.push("/ticket-confirmation");
  }

  const handleGenerateQr = () => {
    setBankQrShown(true)
  }

  // Format time left
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f2d3c] pb-20 text-white">
      {/* Full width progress bar */}
      <div className="w-full bg-[#1a3a4a] py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between w-full">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                1
              </div>
              <span className="text-xs text-white mt-1">Passenger</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="text-xs text-white mt-1">Contact</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-xs text-white mt-1">Confirmation</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 self-center mx-2"></div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                4
              </div>
              <span className="text-xs text-white mt-1">Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4 text-white hover:text-gray-300 transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">Payment</h1>
          </div>
          <div className="flex items-center text-white">
            <Clock className="h-5 w-5 mr-2 text-yellow-400" />
            <span className="font-mono">{formatTimeLeft()}</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-[#f8f5f0] rounded-lg p-6 mb-6 text-[#0f2d3c] max-w-2xl mx-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Total price</h2>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatVNDForDisplay(totalPrice || 1500000)}</p>
              <p className="text-sm text-gray-600">All taxes and fees included</p>
            </div>
          </div>

          {/* Points information for logged-in users */}
          {isLoggedIn && pointsToAdd > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center text-green-600">
                <Award className="h-5 w-5 mr-2" />
                <p className="font-medium">You will earn {pointsToAdd} points with this purchase!</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">Points are calculated at a rate of 1 point per 500,000 VND</p>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mb-4 max-w-2xl mx-auto">Payment options</h2>

        <Tabs
          defaultValue="card"
          onValueChange={(value) => setPaymentMethod(value as "card" | "bank")}
          className="max-w-2xl mx-auto"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="card" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Credit/Debit Card
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              Bank Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card">
            <div className="bg-[#1a3a4a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Credit/Debit Card Payment</h2>

              <form onSubmit={handlePayment} className="space-y-4">
                <div className="pt-4">
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Redirecting to Secure Checkout..." : "Proceed to Checkout"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="bank">
            <div className="bg-[#1a3a4a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bank Transfer</h2>

              {bankQrShown ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <img src="/placeholder-1b948.png" alt="Bank transfer QR code" className="w-48 h-48" />
                  </div>

                  <div className="text-center mb-6">
                    <p className="font-bold">Scan this QR code with your banking app</p>
                    <p className="text-sm text-gray-300 mt-2">
                      Amount: {formatVNDForDisplay(totalPrice || 1500000)}
                      <br />
                      Reference: {bookingReference || "Your booking reference"}
                    </p>
                  </div>

                  <Button onClick={handlePayment} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Verifying Payment..." : "I've Completed the Transfer"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="mb-6 text-center">Generate a QR code to make a bank transfer using your banking app.</p>

                  <Button onClick={handleGenerateQr} className="bg-blue-600 hover:bg-blue-700">
                    Generate QR Code
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            className="border-[#0f2d3c] text-[#0f2d3c]"
            onClick={() => router.push("/confirmation")}
          >
            Back to Confirmation
          </Button>

          <div className="text-xl font-bold text-[#0f2d3c]">
            Total: {formatVNDForDisplay(totalPrice || 1500000)}
          </div>
        </div>
      </div>
    </main>
  )
}
