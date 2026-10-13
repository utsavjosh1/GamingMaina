"use client";

import React, { createContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { DEV_GUEST_EMAIL, DEV_GUEST_NAME, DEV_GUEST_USER_ID } from "@/lib/auth/dev";
import type { Profile } from "@/lib/supabase/types";

export interface AppUser {
  id: string;
  email: string | null;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: (redirect?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<typeof authClient.$Infer.Session.user | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const devGuestEnabled = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";
  const shouldResolveSession = pathname.startsWith("/book-online") || pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const usingDevGuest = devGuestEnabled && !sessionUser;
  const loading = shouldResolveSession && !usingDevGuest ? sessionLoading : false;
  const user: AppUser | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        user_metadata: {
          full_name: sessionUser.name || undefined,
          avatar_url: sessionUser.image || undefined,
        },
      }
    : devGuestEnabled
      ? {
          id: DEV_GUEST_USER_ID,
          email: DEV_GUEST_EMAIL,
          user_metadata: {
            full_name: DEV_GUEST_NAME,
          },
        }
      : null;
  // Dev-guest display profile only. The authoritative role is resolved
  // server-side from memberships via requireStaff()/requireAdmin().
  const profile = React.useMemo<Profile | null>(
    () => usingDevGuest
      ? {
          id: DEV_GUEST_USER_ID,
          full_name: DEV_GUEST_NAME,
          avatar_url: null,
          phone: null,
          role: "admin",
          membership_type: "none",
          created_at: new Date().toISOString(),
        }
      : null,
    [usingDevGuest],
  );

  useEffect(() => {
    let active = true;

    if (devGuestEnabled || !shouldResolveSession) {
      Promise.resolve().then(() => {
        if (active) setSessionUser(null);
      });
      return () => { active = false; };
    }

    Promise.resolve().then(() => {
      if (active) setSessionLoading(true);
    });
    authClient.getSession()
      .then(({ data }) => {
        if (active) setSessionUser(data?.user ?? null);
      })
      .catch(() => {
        if (active) setSessionUser(null);
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    return () => { active = false; };
  }, [devGuestEnabled, shouldResolveSession]);

  const signInWithGoogle = async (redirect?: string) => {
    const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/";
    if (devGuestEnabled) {
      router.push(safeRedirect);
      router.refresh();
      return;
    }
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: safeRedirect,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (devGuestEnabled && !sessionUser) {
      router.push("/");
      router.refresh();
      return;
    }
    const { error } = await authClient.signOut();
    if (error) throw error;
    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
