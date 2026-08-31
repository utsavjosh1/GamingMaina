"use client";

import { useEffect } from "react";
import { DynamicButton } from "@/components/ui/DynamicButton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background text-foreground px-4 text-center">
      <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand/20 bg-brand/5 backdrop-blur-md mb-8">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
        <span className="text-brand font-mono text-xs uppercase tracking-[0.2em] font-bold">
          SYS_CRITICAL: ERROR
        </span>
      </div>
      <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tighter uppercase mb-6">
        Something went <span className="text-brand">wrong.</span>
      </h1>
      <p className="text-zinc-400 max-w-md mb-12 text-lg">
        The system encountered an unexpected exception during deployment.
      </p>
      <div className="flex flex-col sm:flex-row gap-6">
        <DynamicButton
          variant="primary"
          onClick={() => reset()}
          className="w-full sm:w-auto"
        >
          Attempt Reboot
        </DynamicButton>
        <DynamicButton href="/" variant="secondary" className="w-full sm:w-auto">
          Return to Base
        </DynamicButton>
      </div>
    </div>
  );
}
