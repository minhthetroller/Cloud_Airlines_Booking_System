"use client"

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/contexts/language-context'

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const changeLanguage = (lang: 'en' | 'vi') => {
    setLanguage(lang)
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center text-[#0f2d3c] hover:text-[#0f2d3c]/80"
        aria-label="Select language"
      >
        <span className="mr-1">{language === 'en' ? 'EN' : 'VI'}</span>
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
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg py-1 z-10">
          <button
            onClick={() => changeLanguage('en')}
            className={`flex items-center w-full px-4 py-2 text-sm ${
              language === 'en' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>English</span>
            {language === 'en' && (
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
            onClick={() => changeLanguage('vi')}
            className={`flex items-center w-full px-4 py-2 text-sm ${
              language === 'vi' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>Tiếng Việt</span>
            {language === 'vi' && (
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
        </div>
      )}
    </div>
  )
}
