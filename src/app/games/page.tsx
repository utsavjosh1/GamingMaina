import { GamesList } from "@/components/GamesList";

export const metadata = {
  title: "Games Vault & Library | Gaming Mania Delhi",
  description: "Browse featured PlayStation 5, PC Esports, VR, story mode, racing and co-op multiplayer titles available to play at Gaming Mania Delhi.",
};

export default function GamesPage() {
  return (
    <div className="pb-4 pt-24 lg:pt-28">
      <div className="gm-container">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Game library</p>
        <h1 className="ops-heading mt-3 max-w-[20ch] font-heading text-4xl font-extrabold tracking-tight text-paper sm:text-6xl">
          50+ titles, installed and patched.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--gm-muted)]">
          Every PC and PlayStation station is loaded with the latest patches and ready to launch —
          pick a title below, then book the rig that runs it.
        </p>
      </div>
      <GamesList />
    </div>
  );
}
