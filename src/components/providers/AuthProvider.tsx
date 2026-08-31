"use client";

import React, { createContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resolvedProfileUserId, setResolvedProfileUserId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const sessionUser = session?.user;
  const userId = sessionUser?.id;
  const loading = isPending || Boolean(userId && resolvedProfileUserId !== userId);
  const user: AppUser | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        user_metadata: {
          full_name: sessionUser.name || undefined,
          avatar_url: sessionUser.image || undefined,
        },
      }
    : null;

  useEffect(() => {
    let active = true;
    if (isPending) return () => { active = false; };
    if (!userId) {
      queueMicrotask(() => {
        if (active) setProfile(null);
      });
      return () => { active = false; };
    }
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = (await response.json()) as {
          profile: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
            phone: string | null;
            role: Profile["role"];
            membershipType: Profile["membership_type"];
            createdAt: Date | string;
          } | null;
        };
        return result.profile;
      })
      .then((row) => {
        if (!active) return;
        setProfile(
          row
            ? {
                id: row.id,
                full_name: row.fullName,
                avatar_url: row.avatarUrl,
                phone: row.phone,
                role: row.role,
                membership_type: row.membershipType,
                created_at: new Date(row.createdAt).toISOString(),
              }
            : null,
        );
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setResolvedProfileUserId(userId!);
      });

    return () => {
      active = false;
    };
  }, [isPending, userId]);

  const signInWithGoogle = async (redirect?: string) => {
    const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/";
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: safeRedirect,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await authClient.signOut();
    if (error) throw error;
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
