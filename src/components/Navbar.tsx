"use client";

import Link from "next/link";
import Image from "next/image";
import { DynamicButton } from "./ui/DynamicButton";
import { useAuth } from "./providers/AuthProvider";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { path: "/book-online", label: "Book Online" },
    { path: "/games", label: "Games" },
    { path: "/about", label: "About" },
    { path: "/contact-us", label: "Contact Us" },
  ];

  // Role-based extra links
  const roleLinks =
    profile?.role === "admin" || profile?.role === "staff"
      ? [{ path: "/admin", label: "Dashboard" }]
      : user
        ? [{ path: "/dashboard", label: "My Bookings" }]
        : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-obsidian/90 backdrop-blur-md border-b-2 border-stealth transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="shrink-0">
            <Link
              href="/"
              className="font-heading font-black text-2xl tracking-tighter text-white flex items-center gap-2 group p-2 rounded-lg transition-all duration-300 hover:bg-brand/5 hover:shadow-[0_0_20px_rgba(136,88,237,0.1)]"
            >
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1">
                  <span>GAMING</span>
                  <span className="text-zinc-600 font-light tracking-widest">
                    MANIA
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-10">
              {[...navLinks, ...roleLinks].map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="relative text-zinc-400 hover:text-white transition-colors text-sm font-heading font-bold tracking-widest uppercase group py-2"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse"></div>
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-controls="account-menu"
                  aria-label="Open account menu"
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || "User"}
                      width={36}
                      height={36}
                      className="rounded-full border-2 border-zinc-700 group-hover:border-brand transition-colors"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand/20 border-2 border-zinc-700 group-hover:border-brand transition-colors flex items-center justify-center">
                      <span className="text-brand font-heading font-bold text-sm">
                        {(
                          user.user_metadata?.full_name?.[0] || "U"
                        ).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-white text-xs font-heading font-bold leading-none">
                      {user.user_metadata?.full_name || "Player"}
                    </span>
                    <span className="text-brand font-mono text-[9px] tracking-widest uppercase">
                      {profile?.role || "customer"}
                    </span>
                  </div>
                  <svg
                    className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div id="account-menu" className="absolute right-0 mt-3 w-56 bg-stealth/90 border border-zinc-700 backdrop-blur-xl shadow-2xl z-50">
                    <div className="p-4 border-b border-zinc-700/50">
                      <p className="text-white text-sm font-heading font-bold truncate">
                        {user.user_metadata?.full_name}
                      </p>
                      <p className="text-zinc-500 text-xs font-mono truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-2">
                      {(profile?.role === "admin" ||
                        profile?.role === "staff") && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-brand/10 transition-colors text-sm font-heading tracking-wide"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan"></span>
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-brand/10 transition-colors text-sm font-heading tracking-wide"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                        My Bookings
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-heading tracking-wide w-full text-left cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <DynamicButton
                href="/login"
                variant="primary"
                glow={false}
                className="scale-75 origin-right"
              >
                Sign In
              </DynamicButton>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            {!loading && user && user.user_metadata?.avatar_url && (
              <Image
                src={user.user_metadata.avatar_url}
                alt="User"
                width={28}
                height={28}
                className="rounded-full border border-zinc-700"
              />
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="text-zinc-400 hover:text-brand p-2 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden border-t border-zinc-800 bg-obsidian/95 backdrop-blur-xl">
          <div className="px-4 py-6 space-y-1">
            {[...navLinks, ...roleLinks].map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-zinc-400 hover:text-white hover:bg-brand/10 px-4 py-3 text-sm font-heading font-bold tracking-widest uppercase transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-zinc-800 mt-4">
              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="block w-full text-left text-red-400 hover:bg-red-500/10 px-4 py-3 text-sm font-heading font-bold tracking-widest uppercase transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-brand hover:bg-brand/10 px-4 py-3 text-sm font-heading font-bold tracking-widest uppercase transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-brand/50 via-transparent to-brand/50"></div>
    </nav>
  );
}
