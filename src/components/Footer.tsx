import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-obsidian border-t-[3px] border-stealth mt-auto relative overflow-hidden">
      {/* Tech grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F2833_1px,transparent_1px),linear-gradient(to_bottom,#1F2833_1px,transparent_1px)] bg-size-[40px_40px] opacity-20 mask-[linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto pt-20 pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-heading font-black tracking-tighter text-white mb-6 flex items-center gap-3">
              <span className="w-3 h-6 bg-brand inline-block skew-x-[-15deg]"></span>
              GAMING<span className="text-zinc-600 font-light">MANIA</span>
            </h3>
            <p className="text-zinc-400 max-w-md text-sm leading-relaxed font-sans">
              Your ultimate gaming destination. Console, PC, VR, or racing
              setups — we’ve got the gear and the vibes. No lag. No limits. Just
              pure play.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-heading font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
              <span className="w-2 h-[2px] bg-brand"></span> SYSTEM / NAV
            </h4>
            <ul className="space-y-4 font-sans font-medium text-sm">
              <li>
                <Link
                  href="/book-online"
                  className="text-zinc-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                >
                  &gt; Book Online
                </Link>
              </li>
              <li>
                <Link
                  href="/games"
                  className="text-zinc-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                >
                  &gt; Games Directory
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-zinc-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                >
                  &gt; About Protocol
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-heading font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
              <span className="w-2 h-[2px] bg-brand"></span> COMMS / LINK
            </h4>
            <div className="space-y-3 text-sm font-sans">
              <p className="text-zinc-400 flex flex-col">
                <span className="text-zinc-600 text-xs uppercase mb-1">
                  HQ Location
                </span>
                B-95, Kalkaji, New Delhi
              </p>
              <p className="text-zinc-400 flex flex-col pt-2">
                <span className="text-zinc-600 text-xs uppercase mb-1">
                  Secure Channel
                </span>
                <span className="text-zinc-500">Contact details coming soon</span>
              </p>
              <p className="text-zinc-400 flex flex-col pt-2">
                <span className="text-zinc-600 text-xs uppercase mb-1">
                  Direct Line
                </span>
                <span className="text-zinc-500">Contact details coming soon</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-stealth pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">
            SYS_STATUS: ONLINE &copy; {new Date().getFullYear()} GAMING MANIA
          </p>
        </div>
      </div>
    </footer>
  );
}
