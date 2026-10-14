import { ArrowLeft } from "lucide-react";
import { DynamicButton } from "@/components/ui/DynamicButton";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <p className="tnum font-heading text-7xl font-extrabold tracking-tight text-paper sm:text-8xl">404</p>
        <h1 className="ops-heading mt-3 font-heading text-2xl font-bold tracking-tight text-paper">
          This corner of the arcade doesn&rsquo;t exist.
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--gm-muted)]">
          Wrong turn. The stations, games and booking desk are all one click away.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <DynamicButton href="/" variant="primary" size="md">
            <ArrowLeft className="size-4" />
            <span>Back home</span>
          </DynamicButton>
          <DynamicButton href="/book-online" variant="secondary" size="md">
            <span>Book a station</span>
          </DynamicButton>
        </div>
      </div>
    </div>
  );
}
