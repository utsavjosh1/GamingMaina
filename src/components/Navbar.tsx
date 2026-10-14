"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinks = [
    { path: "/games", label: "Games" },
    { path: "/tournaments", label: "Tournaments" },
    { path: "/#stations", label: "Stations" },
    { path: "/#pricing", label: "Pricing" },
    { path: "/about", label: "About" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "border-b transition-colors duration-200",
          scrolled || mobileMenuOpen
            ? "border-white/[0.08] bg-coal/95 backdrop-blur-md"
            : "border-transparent bg-gradient-to-b from-coal/90 to-transparent",
        )}
      >
        <nav className="gm-container flex h-16 items-center justify-between gap-4" aria-label="Main navigation">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Gaming Mania Delhi home">
            <span className="grid size-8 place-items-center rounded-lg bg-ember text-sm font-black text-ember-ink">
              M
            </span>
            <span className="font-heading text-[17px] font-bold tracking-tight text-paper">
              Gaming Mania
              <span className="ml-2 hidden text-xs font-medium text-[var(--gm-subtle)] sm:inline">Kalkaji · Delhi</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.path ? "text-paper" : "text-[var(--gm-muted)] hover:text-paper",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {loading ? (
              <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  aria-expanded={dropdownOpen}
                  aria-controls="account-menu"
                  aria-label="Open account menu"
                  className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-white/20"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || "User"}
                      width={28}
                      height={28}
                      className="rounded-lg"
                    />
                  ) : (
                    <span className="grid size-7 place-items-center rounded-lg bg-ember/15 text-xs font-bold text-ember-strong">
                      {(user.user_metadata?.full_name?.[0] || "P").toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-24 truncate text-left text-[13px] font-semibold text-paper">
                    {user.user_metadata?.full_name || "Player"}
                  </span>
                  <ChevronDown className={cn("size-3.5 text-[var(--gm-subtle)] transition-transform", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div id="account-menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.1] bg-[#171310] shadow-xl">
                    <div className="border-b border-white/[0.08] p-4">
                      <p className="truncate text-sm font-semibold text-paper">{user.user_metadata?.full_name || "Player"}</p>
                      <p className="tnum mt-0.5 truncate text-xs text-[var(--gm-muted)]">{user.email}</p>
                    </div>
                    <div className="space-y-1 p-2">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="block rounded-lg px-3 py-2 text-[13px] font-medium text-stone-300 transition-colors hover:bg-white/[0.05] hover:text-paper"
                      >
                        My bookings
                      </Link>
                      <Link
                        href="/book-online"
                        onClick={() => setDropdownOpen(false)}
                        className="block rounded-lg px-3 py-2 text-[13px] font-medium text-stone-300 transition-colors hover:bg-white/[0.05] hover:text-paper"
                      >
                        Book a station
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          void signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-300 transition-colors hover:bg-red-400/10"
                      >
                        <LogOut className="size-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-300 transition-colors hover:text-paper"
              >
                Sign in
              </Link>
            )}

            <Link
              href="/book-online"
              className="whitespace-nowrap rounded-xl bg-paper px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white"
            >
              Book a station
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-xl border border-white/[0.1] text-stone-300 lg:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div id="mobile-navigation" className="border-t border-white/[0.08] px-5 pb-5 pt-2 lg:hidden">
            <div className="divide-y divide-white/[0.06]">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={closeMobileMenu}
                  className="block py-3 text-[15px] font-medium text-stone-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={closeMobileMenu} className="rounded-xl border border-white/[0.12] px-4 py-3 text-center text-sm font-semibold text-paper">
                    My bookings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      void signOut();
                    }}
                    className="rounded-xl border border-red-400/30 px-4 py-3 text-center text-sm font-semibold text-red-300"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMobileMenu} className="rounded-xl border border-white/[0.12] px-4 py-3 text-center text-sm font-semibold text-paper">
                    Sign in
                  </Link>
                  <Link href="/book-online" onClick={closeMobileMenu} className="rounded-xl bg-paper px-4 py-3 text-center text-sm font-semibold text-ink">
                    Book a station
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
