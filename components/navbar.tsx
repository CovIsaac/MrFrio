"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Truck, Menu, X, Home } from "lucide-react"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-black/80 border-b border-gray-800 sticky top-0 z-40 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/mrfrio-logo.png" alt="Mr. Frío" width={120} height={40} className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Inicio
            </Link>
            <Link
              href="/seguimiento"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <Truck className="h-4 w-4 mr-2" />
              Seguimiento
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white focus:outline-none focus:text-white"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-900/90 backdrop-blur-sm">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                Inicio
              </div>
            </Link>
            <Link
              href="/seguimiento"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Seguimiento
              </div>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
