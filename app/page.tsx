"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import BookingForm from "@/components/booking-form"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Home() {
  const router = useRouter()

  // Function to handle My Bookings click
  const handleMyBookingsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/login")
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Image src="/logo.png" alt="Cloud Airlines Logo" width={180} height={60} className="h-8 w-auto" />
            </Link>
          </div>
          <nav className="hidden md:block">
            <ul className="flex gap-6">
              <li>
                <a href="#" onClick={handleMyBookingsClick} className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  My Bookings
                </a>
              </li>
              <li>
                <Link href="/booking-status" className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  Booking Status
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            <>
              <Link href="/login" className="hidden text-[#0f2d3c] hover:text-[#0f2d3c]/80 md:block">
                Sign In
              </Link>
              <Link href="/register" className="rounded-full bg-[#0f2d3c] px-4 py-2 text-white hover:bg-[#0f2d3c]/90">
                Register
              </Link>
            </>
          </div>
        </header>
      </div>

      {/* Full-width blue section */}
      <section className="mb-12 w-full bg-[#0f2d3c] py-8">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-3xl font-bold text-white">Book Your Flight</h2>
          <p className="mb-6 text-white">Find the best deals on flights to your dream destinations.</p>
          <BookingForm />
        </div>
      </section>

      <div className="container mx-auto px-4">
        <section className="mb-12 grid gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">Special Offers</h3>
            <p className="text-gray-600">Discover our latest promotions and save on your next trip.</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              View Offers →
            </a>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">Top Destinations</h3>
            <p className="text-gray-600">Explore breathtaking destinations around the world.</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              Explore →
            </a>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">Travel Guide</h3>
            <p className="text-gray-600">Get helpful tips and information for a smooth journey.</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              Read More →
            </a>
          </div>
        </section>
      </div>
      {/* Footer */}
      <footer className="bg-[#0f2d3c] text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Cloud Airlines</h3>
              <p className="text-gray-300">Your trusted partner for comfortable and reliable air travel.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    Book a Flight
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Check-in
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Flight Status
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Manage Booking
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Baggage Info
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Travel Guidelines
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    Newsletter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Social Media
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Mobile App
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#1a3a4a] mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Cloud Airlines. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
