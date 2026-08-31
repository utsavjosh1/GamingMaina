"use client";

import React, { Suspense } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const { signInWithGoogle, loading } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const error = searchParams.get("error");

  return (
    <div className="min-h-[80vh] pt-32 pb-20 bg-obsidian flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/8 blur-[200px] pointer-events-none rounded-full -mt-64"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="mb-12">
          <Link
            href="/"
            className="font-heading font-black text-3xl tracking-tighter text-white inline-flex items-center gap-3"
          >
            <span className="w-5 h-5 bg-brand inline-block transform -skew-x-12"></span>
            GAMING
            <span className="text-zinc-600 font-light tracking-widest">
              MANIA
            </span>
          </Link>
        </div>

        <div className="bg-stealth/30 border border-zinc-800 backdrop-blur-xl p-10 relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand"></div>

          <div className="inline-block bg-brand/10 border border-brand/30 px-3 py-1 mb-8 rounded-full">
            <span className="text-brand font-mono text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
              AUTHENTICATION REQUIRED
            </span>
          </div>

          <h1 className="text-3xl font-heading font-black tracking-tighter text-white mb-3 uppercase">
            Initialize{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-zinc-500">
              Session
            </span>
          </h1>
          <p className="text-zinc-400 text-sm font-sans mb-10 leading-relaxed">
            Sign in to book gaming stations, track sessions, and access
            exclusive member perks.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 mb-6 font-mono">
              Authentication failed. Please try again.
            </div>
          )}

          <button
            onClick={() => signInWithGoogle(redirect)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-heading font-bold text-sm tracking-wide py-4 px-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "INITIALIZING..." : "SIGN IN WITH GOOGLE"}
          </button>

          <div className="mt-6 text-zinc-600 text-[10px] font-mono tracking-wide uppercase">
            Secure authentication via Google OAuth 2.0
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="text-zinc-500 hover:text-brand text-sm font-heading font-bold uppercase tracking-widest transition-colors"
          >
            ← Return to Base
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-obsidian">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
