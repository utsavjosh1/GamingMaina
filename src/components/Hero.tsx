import React from "react";
import { DynamicButton } from "./ui/DynamicButton";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-obsidian overflow-hidden">
      {/* Immersive Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/marvels-spider-man-2048x2048-11609.jpeg"
          alt="Premium Gaming Lounge Delhi - Gaming Mania"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-linear-to-t from-obsidian via-obsidian/70 to-transparent"></div>
        <div className="absolute inset-0 bg-linear-to-r from-obsidian via-obsidian/80 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-heading font-black tracking-tighter text-white leading-[0.9] mb-4 uppercase">
            The Hub.
            <br />
            The Game.
            <br />
            <span className="text-brand">The Culture.</span>
          </h1>

          <p className="mt-8 text-xl md:text-2xl text-zinc-300 font-sans tracking-widest uppercase font-medium mb-12 border-l-2 border-brand pl-6">
            Premium Gaming Lounge in Kalkaji, Delhi
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <DynamicButton href="/book-online" variant="primary" className="w-full sm:w-auto" >
              Book Station
            </DynamicButton>
            <DynamicButton href="/games" variant="secondary" className="w-full sm:w-auto">
              View Games
            </DynamicButton>
          </div>
        </div>
      </div>

      {/* Structural Accent */}
      <div className="hidden lg:block absolute right-24 top-0 bottom-0 w-px bg-zinc-800">
        <div className="absolute top-1/2 right-0 w-1 h-32 bg-brand transform -translate-y-1/2 translate-x-[0.5px]"></div>
      </div>
    </section>
  );
}
