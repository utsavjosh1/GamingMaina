import Link from "next/link";
import { ArrowRight, CalendarDays, Gamepad2, Trophy, Users } from "lucide-react";

export const metadata = {
  title: "Tournaments | Gaming Mania Delhi",
  description: "Competitive gaming tournaments at Gaming Mania Delhi for Valorant, CS2, FIFA, Tekken, Mortal Kombat, and more.",
};

const tournamentGames = [
  "Valorant",
  "Counter-Strike 2",
  "EA FC / FIFA",
  "Tekken",
  "Mortal Kombat",
  "Call of Duty",
];

const formats = [
  { title: "PC esports cups", text: "Valorant, CS2 and squad brackets on 240Hz rigs with tournament admins.", icon: Trophy },
  { title: "Console fight nights", text: "Tekken, Mortal Kombat and EA FC knockouts — couch-competitive, crowd loud.", icon: Gamepad2 },
  { title: "Squad events", text: "Custom 2v2, 4v4 and 5v5 formats for colleges, clans and local crews.", icon: Users },
];

export default function TournamentsPage() {
  return (
    <div className="pb-16 pt-24 lg:pt-28">
      <section className="gm-container">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Competitive nights</p>
        <h1 className="ops-heading mt-3 max-w-[18ch] font-heading text-4xl font-extrabold tracking-tight text-paper sm:text-6xl">
          Tournaments at Kalkaji.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--gm-muted)] sm:text-base">
          Local brackets for PC and console — Valorant and CS2 cups, FIFA and Tekken fight nights,
          custom squad formats. Winners take the pot and the wall of fame.
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/book-online"
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-paper px-7 text-[15px] font-semibold text-ink transition-colors hover:bg-white"
          >
            Book practice setups
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex min-h-[3.25rem] items-center justify-center whitespace-nowrap rounded-xl border border-white/[0.14] px-7 text-[15px] font-semibold text-paper transition-colors hover:border-white/30 hover:bg-white/[0.04]"
          >
            Host your tournament
          </Link>
        </div>

        <ol className="mt-12 grid gap-3 md:grid-cols-3">
          {formats.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="rounded-2xl border border-white/[0.09] bg-[#14100d] p-6">
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-ember" aria-hidden="true" />
                  <span className="tnum text-[13px] text-[var(--gm-subtle)]">0{i + 1}</span>
                </div>
                <h2 className="mt-5 font-heading text-xl font-bold tracking-tight text-paper">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--gm-muted)]">{item.text}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-2xl bg-ember p-6 text-ember-ink sm:p-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]">
            <CalendarDays className="size-4" aria-hidden="true" />
            Games we run brackets for
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {tournamentGames.map((game) => (
              <li key={game} className="rounded-lg bg-ember-ink/90 px-3.5 py-2 text-sm font-semibold text-paper">
                {game}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium">
            Dates drop on the arena notice board and at the counter — ask staff about the next cup.
          </p>
        </div>
      </section>
    </div>
  );
}
