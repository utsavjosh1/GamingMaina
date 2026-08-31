import React from "react";
import { DynamicButton } from "@/components/ui/DynamicButton";

export const metadata = {
  title: "Comms Link | Gaming Mania Delhi",
  description: "Contact us for bookings and inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-[70vh] bg-obsidian flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-brand/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl relative z-10 py-20">
        <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter text-white mb-6 uppercase">
          Open{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-zinc-500">
            Comms
          </span>
        </h1>
        <p className="text-xl text-zinc-400 mb-12 font-sans max-w-2xl mx-auto leading-relaxed">
          Need to secure rigs for a squad? Questions about tournament ladders?
          Initialize contact via our direct secure channels below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
          <div className="bg-stealth/50 border border-zinc-800 p-8 flex flex-col items-center justify-center backdrop-blur-sm">
            <span className="text-brand font-mono text-xs uppercase tracking-widest mb-2">Location</span>
            <span className="text-2xl font-heading font-bold text-white">Kalkaji, Delhi</span>
          </div>
          <div className="bg-stealth/50 border border-zinc-800 p-8 flex flex-col items-center justify-center backdrop-blur-sm">
            <span className="text-brand font-mono text-xs uppercase tracking-widest mb-2">Contact</span>
            <span className="text-lg font-heading font-bold text-zinc-400">Contact details coming soon</span>
          </div>
        </div>

        <DynamicButton href="/" variant="secondary" glow={false}>
          Return to Base
        </DynamicButton>
      </div>
    </div>
  );
}
