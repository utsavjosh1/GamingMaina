"use client";

import React, { Suspense } from "react";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function LoginContent() {
  const { signInWithGoogle, loading } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 pb-20 pt-28 text-center">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Gaming Mania home">
          <span className="grid size-9 place-items-center rounded-xl bg-ember text-base font-black text-ember-ink">
            M
          </span>
          <span className="font-heading text-xl font-bold tracking-tight text-paper">Gaming Mania</span>
        </Link>

        <div className="mt-8 rounded-2xl border border-white/[0.09] bg-[#14100d] p-7 text-left sm:p-8">
          <h1 className="ops-heading font-heading text-2xl font-extrabold tracking-tight text-paper">
            Sign in to book.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--gm-muted)]">
            One tap with Google — reserve stations, track bookings, skip the queue at the counter.
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-3.5 text-sm text-red-200">
              Sign-in failed. Please try again.
            </div>
          )}

          <button
            onClick={() => signInWithGoogle(redirect)}
            disabled={loading}
            className="mt-6 flex min-h-[3.25rem] w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-paper px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-white disabled:opacity-50"
          >
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>{loading ? "Signing you in…" : "Continue with Google"}</span>
          </button>

          <p className="tnum mt-5 text-center text-xs text-[var(--gm-subtle)]">
            Secure OAuth · We never see your password
          </p>
        </div>

        <Link
          href="/"
          className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--gm-muted)] hover:text-paper"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center" role="status" aria-label="Loading">
          <div className="size-9 animate-spin rounded-full border-2 border-ember border-t-transparent" />
        </div>
      }
    >
      <AuthProvider>
        <LoginContent />
      </AuthProvider>
    </Suspense>
  );
}
