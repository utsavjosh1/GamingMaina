"use client";

import { useEffect } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
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
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Something broke</p>
        <h1 className="ops-heading mt-3 font-heading text-4xl font-extrabold tracking-tight text-paper sm:text-5xl">
          That wasn&rsquo;t supposed to happen.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--gm-muted)]">
          The page hit an error. Try again, or head back — your bookings are safe.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <DynamicButton variant="primary" size="md" onClick={() => reset()}>
            <RefreshCw className="size-4" />
            <span>Try again</span>
          </DynamicButton>
          <DynamicButton href="/" variant="secondary" size="md">
            <ArrowLeft className="size-4" />
            <span>Back home</span>
          </DynamicButton>
        </div>
      </div>
    </div>
  );
}
