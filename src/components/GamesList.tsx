"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { SectionHeading } from "./marketing/SectionHeading";
import { getMediaUrl } from "@/lib/media";
import { gameCategories } from "@/lib/public-content";
import { cn } from "@/lib/utils";

const allGames = gameCategories.flatMap((category) =>
  category.games.map((game) => ({
    ...game,
    label: category.label,
    categoryTitle: category.title,
    platform: category.label === "STORY MODE" ? "PS5 / PC" : "PC / Esports",
  })),
);

export function GamesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("ALL");

  const genres = ["ALL", "Action", "FPS", "Battle Royale", "Open World", "VR", "Action RPG", "MOBA"];

  const filteredGames = allGames.filter((game) => {
    const matchesGenre = selectedGenre === "ALL" || game.genre.toLowerCase() === selectedGenre.toLowerCase();
    const matchesSearch =
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  return (
    <section className="gm-section border-t border-white/[0.06]" id="games" aria-labelledby="games-heading">
      <div className="gm-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Game library"
            title={<span id="games-heading">Installed, patched, ready to launch.</span>}
            description="Day-one PS5 blockbusters to 240Hz PC staples — on high-speed NVMe, no downloads, no waiting."
          />
          <Link
            href="/games"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-paper hover:text-ember-strong"
          >
            Browse all games <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <div className="gm-marquee [--duration:42s] [--gap:0.75rem]" aria-label="Featured titles">
          {[0, 1].map((track) => (
            <div key={track} className="gm-marquee-track" aria-hidden={track === 1}>
              {allGames.map((game) => (
                <article
                  key={`${track}-${game.name}`}
                  className="relative w-52 shrink-0 overflow-hidden rounded-xl border border-white/[0.09]"
                >
                  <Image
                    src={getMediaUrl(game.image)}
                    alt={`${game.name} artwork`}
                    width={208}
                    height={260}
                    sizes="208px"
                    className="aspect-[4/5] w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[11px] font-medium text-ember-strong">{game.genre}</p>
                    <h3 className="mt-0.5 truncate font-heading text-[15px] font-bold text-paper">{game.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="gm-container mt-10 rounded-2xl border border-white/[0.09] bg-[#14100d] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by genre">
            {genres.map((genre) => (
              <button
                key={genre}
                role="tab"
                aria-selected={selectedGenre === genre}
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  selectedGenre === genre ? "bg-white/[0.08] text-paper" : "text-[var(--gm-muted)] hover:text-paper",
                )}
              >
                {genre}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--gm-subtle)]" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search a title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search games"
              className="tnum w-full rounded-xl border border-white/[0.1] bg-black/30 py-2.5 pl-10 pr-4 text-sm text-paper placeholder:text-[var(--gm-subtle)] focus:border-ember/60 focus:outline-none"
            />
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <li
              key={game.name}
              className="flex items-center gap-3.5 rounded-xl border border-white/[0.07] bg-black/20 p-3 transition-colors hover:border-white/[0.16]"
            >
              <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg">
                <Image src={getMediaUrl(game.image)} alt="" fill sizes="56px" className="object-cover object-center" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-heading text-[15px] font-bold text-paper">{game.name}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--gm-muted)]">
                  {game.genre} · {game.platform}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {filteredGames.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--gm-muted)]">No titles match “{searchQuery}”.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre("ALL");
              }}
              className="mt-2 text-sm font-semibold text-paper underline underline-offset-4"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
