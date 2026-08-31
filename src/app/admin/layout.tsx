import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin | Gaming Mania Delhi" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  const links = [
    { href: "/admin", label: "Dashboard", icon: "◆" },
    { href: "/admin/sessions", label: "Sessions", icon: "▶" },
    { href: "/admin/payments", label: "Payments", icon: "₹" },
  ];

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-80px)] border-r border-zinc-800/50 bg-stealth/20 pt-8 px-4">
          <div className="mb-8">
            <span className="text-brand font-mono text-[10px] tracking-widest uppercase block mb-1">Control Panel</span>
            <span className="text-white font-heading font-bold text-lg">Admin</span>
          </div>
          <nav className="space-y-1 flex-1" aria-label="Admin navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-brand/10 transition-colors font-heading text-sm tracking-wide">
                <span className="text-brand text-xs">{link.icon}</span>{link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-h-[calc(100vh-80px)]">
          <nav className="lg:hidden flex gap-2 overflow-x-auto border-b border-zinc-800 p-4" aria-label="Admin navigation">
            {links.map((link) => <Link key={link.href} href={link.href} className="shrink-0 border border-zinc-800 px-3 py-2 text-zinc-300 text-xs font-mono uppercase">{link.label}</Link>)}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
