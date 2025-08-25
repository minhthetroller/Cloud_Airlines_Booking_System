"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import BookingForm from "@/components/booking-form"
import LoginModal from "@/components/login-modal"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/language-context"

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { user, isAuthenticated, signOut, loading } = useAuth()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const [dropdownView, setDropdownView] = useState("main") // 'main' or 'language'

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
                  Booking Status
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200"></div>
            ) : isAuthenticated && user ? (
              <>
                <div className="relative">
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
                              setDropdownView("language")
                            }}
                            className="flex w-full justify-between items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span>{t("language")}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
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
                        <>
                          <div className="flex items-center px-4 py-2 text-sm font-medium border-b">
                            <button onClick={() => setDropdownView("main")} className="mr-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="15 18 9 12 15 6" />
                              </svg>
                            </button>
                            <span>{t("language")}</span>
                          </div>
                          <button
                            onClick={() => {
                              setLanguage("en")
                              setDropdownView("main")
                            }}
                            className={`flex items-center w-full px-4 py-2 text-sm ${
                              language === "en" ? "bg-gray-100 font-medium" : ""
                            }`}
                          >
                            <span className="ml-8">English</span>
                            {language === "en" && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="ml-auto"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setLanguage("vi")
                              setDropdownView("main")
                            }}
                            className={`flex items-center w-full px-4 py-2 text-sm ${
                              language === "vi" ? "bg-gray-100 font-medium" : ""
                            }`}
                          >
                            <span className="ml-8">Tiếng Việt</span>
                            {language === "vi" && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="ml-auto"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        </>
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
