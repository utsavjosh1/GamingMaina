import React from "react";
import Image from "next/image";
import { getMediaUrl, mediaPaths } from "@/lib/media";

export function AboutSection() {
  return (
    <section
      className="py-32 bg-stealth border-t border-zinc-900 relative overflow-hidden"
      id="about"
    >
      {/* Tech accents */}
      <div className="absolute top-0 right-10 w-px h-full bg-linear-to-b from-brand/50 via-transparent to-transparent"></div>
      <div className="absolute top-20 right-10 w-2 h-2 bg-brand translate-x-[0.5px] animate-pulse"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content Side */}
          <div className="border-l-4 border-brand pl-8 md:pl-12">
            <h2 className="text-sm font-mono font-bold tracking-[0.3em] text-brand uppercase mb-6 flex items-center gap-4">
              <span className="w-8 h-px bg-brand"></span>
              SYS_INIT: ORIGIN
            </h2>
            <h3 className="text-4xl md:text-6xl font-heading font-black tracking-tighter text-white mb-10 leading-[1.1] uppercase">
              Built for Gamers.
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-[#d4b3ff]">
                Zero Fake Hype.
              </span>
            </h3>
            <div className="space-y-6 text-lg md:text-xl text-zinc-300 font-sans leading-relaxed">
              <p>
                Founded in 2018, Gaming Mania was born from a simple mission: to
                create a sanctuary for gamers who demand excellence. We&apos;ve
                engineered an environment where technology meets comfort,
                allowing you to focus entirely on your game.
              </p>
              <p className="text-white border-l-2 border-brand/50 pl-6 py-2 my-8 font-medium bg-linear-to-r from-brand/10 to-transparent">
                Whether you&apos;re a competitive pro pushing for the next rank or a
                group of friends looking for the ultimate co-op experience, our
                stations are optimized for your victory.
              </p>
              <p>
                Our commitment hasn&apos;t wavered since day one: deliver
                bleeding-edge hardware, maintain a secure and high-speed
                network, and foster a community that feels like home the moment
                you step through our doors.
              </p>
            </div>
          </div>

          {/* Image Side */}
          <div className="relative h-[600px] w-full rounded-tr-[100px] rounded-bl-[100px] overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(136,88,237,0.15)] group">
            <Image
              src={getMediaUrl(mediaPaths.rdr2)}
              alt="Premium Gaming Experience"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-tr from-obsidian/80 via-transparent to-brand/20"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
