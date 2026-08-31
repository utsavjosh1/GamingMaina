import React from "react";
import { PremiumCard } from "./ui/PremiumCard";
import { DynamicButton } from "./ui/DynamicButton";
import Image from "next/image";
import { getMediaUrl, mediaPaths } from "@/lib/media";

const services = [
  {
    name: "PC-RTX",
    price: "₹150/hr",
    type: "COMPETITIVE",
    image: mediaPaths.spiderman,
  },
  {
    name: "PC-GTX",
    price: "₹100/hr",
    type: "CASUAL",
    image: mediaPaths.gta5,
  },
  {
    name: "PS5",
    price: "₹200/hr",
    type: "NEXT-GEN",
    image: mediaPaths.gow,
  },
  {
    name: "PS4",
    price: "₹150/hr",
    type: "CO-OP",
    image: mediaPaths.rdr2,
  },
  {
    name: "Virtual Reality",
    price: "₹250/hr",
    type: "IMMERSIVE",
    image: mediaPaths.spiderman,
  },
  {
    name: "Racing Wheel",
    price: "₹180/hr",
    type: "SIMULATOR",
    image: mediaPaths.bmw,
  },
  {
    name: "Billiards",
    price: "₹200/hr",
    type: "LOUNGE",
    image: mediaPaths.gta5,
  },
  {
    name: "Air Hockey",
    price: "₹150/hr",
    type: "ARCADE",
    image: mediaPaths.gow,
  },
  {
    name: "Shooting",
    price: "₹150/hr",
    type: "CASUAL",
    image: mediaPaths.rdr2,
  },
];

export function Services() {
  return (
    <section className="py-32 bg-obsidian relative" id="services">
      {/* Background divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-20 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h2 className="text-4xl md:text-6xl font-heading font-black tracking-tighter text-white mb-4 uppercase">
              Premier{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-zinc-500">
                Stations
              </span>
            </h2>
            <p className="text-zinc-400 max-w-2xl text-lg font-sans">
              High-performance environments engineered for immersion and
              competitive edge. Choose your loadout.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="flex gap-2">
              <div className="w-16 h-1 bg-brand"></div>
              <div className="w-2 h-1 bg-brand"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {services.map((svc, idx) => (
            <PremiumCard
              key={idx}
              className="group p-0 overflow-hidden relative"
            >
              <div className="absolute inset-0 w-full h-full z-0">
                <Image
                  src={getMediaUrl(svc.image)}
                  alt={svc.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-linear-to-t from-obsidian via-obsidian/60 to-transparent"></div>
              </div>

              <div className="relative z-10 flex flex-col h-full p-8 min-h-[400px]">
                <div className="flex justify-between items-start flex-1 mb-8 gap-4 relative">
                  <div className="flex-1 max-w-[60%]">
                    <span className="text-xs font-mono text-brand mb-2 block tracking-widest">
                      {svc.type}
                    </span>
                    <h3 className="text-2xl font-heading font-black text-white tracking-wide uppercase drop-shadow-md wrap-break-word">
                      {svc.name}
                    </h3>
                  </div>
                  <span className="shrink-0 text-xl font-heading font-bold text-white bg-obsidian/80 backdrop-blur-md px-3 py-1 border border-brand/50 shadow-[0_0_15px_rgba(136,88,237,0.3)] absolute top-0 right-0 z-20">
                    {svc.price}
                  </span>
                </div>

                <div className="transition-transform duration-500 transform translate-y-4 group-hover:translate-y-0 opacity-80 group-hover:opacity-100">
                  <DynamicButton
                    href="/book-online"
                    variant="secondary"
                    glow={false}
                    className="w-full text-xs py-3 backdrop-blur-sm"
                  >
                    Reserve Station
                  </DynamicButton>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>
      </div>
    </section>
  );
}
