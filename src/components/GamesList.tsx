import React from "react";
import Image from "next/image";
import { getMediaUrl, mediaPaths } from "@/lib/media";

const gameCategories = [
  {
    title: "STORY_MODE // PS5 & PS4",
    accent: "bg-brand",
    games: [
      {
        name: "God of War Ragnarok",
        image: mediaPaths.gow,
      },
      {
        name: "GTA 5 / Legacy",
        image: mediaPaths.gta5,
      },
      {
        name: "Red Dead Redemption 2",
        image: mediaPaths.rdr2,
      },
      {
        name: "Spider-Man 2",
        image: mediaPaths.spiderman,
      },
      {
        name: "Black Myth Wukong",
        image: mediaPaths.bmw,
      },
      {
        name: "More Top Titles...",
        image: mediaPaths.gow,
      },
    ],
  },
  {
    title: "COMPETITIVE // PC & VR",
    accent: "bg-[#45A29E]",
    games: [
      {
        name: "Valorant",
        image: mediaPaths.spiderman,
      },
      {
        name: "Counter Strike 2",
        image: mediaPaths.gta5,
      },
      {
        name: "Call of Duty Warzone",
        image: mediaPaths.rdr2,
      },
      {
        name: "Beat Saber (VR)",
        image: mediaPaths.gow,
      },
      {
        name: "PUBG / DOTA 2",
        image: mediaPaths.spiderman,
      },
      {
        name: "More E-Sports...",
        image: mediaPaths.bmw,
      },
    ],
  },
];

export function GamesList() {
  return (
    <section
      className="py-32 bg-obsidian border-t border-stealth relative"
      id="games"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-20">
          <h2 className="text-4xl md:text-6xl font-heading font-black tracking-tighter text-white mb-4 uppercase">
            Active{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-brand to-zinc-500">
              Arsenal
            </span>
          </h2>
          <p className="text-zinc-400 max-w-2xl text-lg font-sans">
            Access our complete database of currently deployed titles. Over 50+
            fully updated games ready to deploy.
          </p>
        </div>
        <div className="flex flex-col gap-20">
          {gameCategories.map((category, idx) => (
            <div key={idx} className="relative group/category">
              {/* Category Header */}
              <div className="flex items-center gap-4 mb-10 border-b border-zinc-800 pb-4">
                <div
                  className={`w-3 h-3 ${category.accent} animate-pulse shadow-[0_0_10px_currentColor]`}
                ></div>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-widest uppercase">
                  {category.title}
                </h3>
              </div>

              {/* Game Image Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
                {category.games.map((game, i) => (
                  <div
                    key={i}
                    className="relative aspect-3/4 rounded-sm overflow-hidden border border-zinc-800 group cursor-pointer bg-zinc-900 transition-all duration-300 hover:border-brand hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(136,88,237,0.4)]"
                  >
                    <Image
                      src={getMediaUrl(game.image)}
                      alt={game.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 mix-blend-luminosity group-hover:mix-blend-normal"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent"></div>

                    <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col justify-end">
                      <span className="text-brand font-mono text-[10px] tracking-widest mb-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        DEPLOY
                      </span>
                      <h4 className="text-white font-sans font-bold text-sm leading-tight drop-shadow-md relative z-10">
                        {game.name}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
