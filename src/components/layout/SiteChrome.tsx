"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/providers/AuthProvider";

const Footer = dynamic(() => import("@/components/Footer").then((mod) => mod.Footer), { ssr: false });

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOperationsRoute = pathname.startsWith("/admin");

  if (isOperationsRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
      <main className="grow pt-20">{children}</main>
      <Footer />
    </>
  );
}
