import React from "react";

export function MinimalCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-zinc-800 bg-zinc-950/50 p-6 md:p-8 transition-colors duration-300 hover:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}
