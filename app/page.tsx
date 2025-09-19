"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import BookingForm from "@/components/booking-form"
import LoginModal from "@/components/login-modal"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/supabase/auth-context"
import { useLanguage } from "@/lib/language-context"
import LanguageSelector from "@/components/language-selector"

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { user, isAuthenticated, signOut, loading } = useAuth()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const [dropdownView, setDropdownView] = useState("main") // 'main' or 'language'
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  const handleProfileClick = () => {
    router.push("/profile")
  }

  // Function to handle My Bookings click
  const handleMyBookingsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated && user) {
      router.push("/profile/booking-history")
    } else {
      setIsLoginModalOpen(true)
    }
  }

  // Effect to redirect to profile after login
  useEffect(() => {
    if (isAuthenticated && user) {
      const justLoggedIn = sessionStorage.getItem("justLoggedIn")
      if (justLoggedIn === "true") {
        sessionStorage.removeItem("justLoggedIn")
        router.push("/profile")
      }
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!userMenuOpen) {
      setDropdownView("main")
    }
  }, [userMenuOpen])

  // Click outside handler for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [userMenuOpen])

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
                  {t("myBookings")}
                </a>
              </li>
              <li>
                <Link href="/booking-status" className="text-[#0f2d3c] hover:text-[#0f2d3c]/80">
                  {t("bookingStatus")}
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            {/* Global Language Selector */}
            <LanguageSelector />

            {loading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200"></div>
            ) : isAuthenticated && user ? (
              <>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center justify-center rounded-full bg-[#0f2d3c] h-10 w-10 text-white hover:bg-[#0f2d3c]/90"
                    aria-label="User Menu"
                    title={user.email}
                  >
                    {user.email.charAt(0).toUpperCase()}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      {dropdownView === "main" ? (
                        <>
                          <button
                            onClick={() => {
                              router.push("/profile")
                              setUserMenuOpen(false)
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {t("accountCenter")}
                          </button>
                          <button
                            onClick={() => {
                              handleSignOut()
                              setUserMenuOpen(false)
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {t("signOut")}
                          </button>
                        </>
                      ) : (
                        <></>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="hidden text-[#0f2d3c] hover:text-[#0f2d3c]/80 md:block"
                >
                  {t("signIn")}
                </button>
                <Link href="/register" className="rounded-full bg-[#0f2d3c] px-4 py-2 text-white hover:bg-[#0f2d3c]/90">
                  {t("register")}
                </Link>
              </>
            )}
          </div>
        </header>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Rest of the component remains unchanged */}
      {/* Full-width blue section */}
      <section className="mb-12 w-full bg-[#0f2d3c] py-8">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-3xl font-bold text-white">{t("bookYourFlight")}</h2>
          <p className="mb-6 text-white">{t("findBestDeals")}</p>
          <BookingForm />
        </div>
      </section>

      <div className="container mx-auto px-4">
        <section className="mb-12 grid gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">{t("specialOffers")}</h3>
            <p className="text-gray-600">{t("discoverPromotions")}</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              {t("viewOffers")} →
            </a>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">{t("travelDestinations")}</h3>
            <p className="text-gray-600">{t("exploreDestinations")}</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              {t("explore")} →
            </a>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold text-[#0f2d3c]">{t("travelGuide")}</h3>
            <p className="text-gray-600">{t("helpfulTips")}</p>
            <a href="#" className="mt-4 inline-block text-[#0f2d3c] hover:underline">
              {t("readMore")} →
            </a>
          </div>
        </section>
      </div>
      {/* Footer */}
      <footer className="bg-[#0f2d3c] text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("cloudAirlines")}</h3>
              <p className="text-gray-300">{t("trustedPartner")}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("quickLinks")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("bookAFlight")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("checkIn")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("flightStatus")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("manageBooking")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("support")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("contactUs")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("faq")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("baggageInfo")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("travelGuidelines")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("connect")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("newsletter")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("socialMedia")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("mobileApp")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#1a3a4a] mt-8 pt-8 text-center text-gray-300">
            <p>{t("copyright")}</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
