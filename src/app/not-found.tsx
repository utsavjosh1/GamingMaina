import { DynamicButton } from "@/components/ui/DynamicButton";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background text-foreground px-4 text-center">
      <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand/20 bg-brand/5 backdrop-blur-md mb-8">
        <span className="w-2 h-2 rounded-full bg-brand"></span>
        <span className="text-brand font-mono text-xs uppercase tracking-[0.2em] font-bold">
          HTTP_404: MISSING_SECTOR
        </span>
      </div>
      <h1 className="text-5xl md:text-8xl font-heading font-black tracking-tighter uppercase mb-6">
        Sector <span className="text-brand">Not Found.</span>
      </h1>
      <p className="text-zinc-400 max-w-md mb-12 text-lg">
        The coordinates you provided do not correspond to any known gaming stations.
      </p>
      <DynamicButton href="/" variant="primary" className="px-12">
        Return to Hub
      </DynamicButton>
    </div>
  );
}
