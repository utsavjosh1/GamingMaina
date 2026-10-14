"use client";

import dynamic from "next/dynamic";

const HomeDeferredSectionsContent = dynamic(
  () => import("./HomeDeferredSectionsContent").then((mod) => mod.HomeDeferredSectionsContent),
  {
    ssr: false,
    loading: () => <div className="min-h-96 bg-[#080912]" aria-hidden="true" />,
  },
);

export function HomeDeferredSections() {
  return <HomeDeferredSectionsContent />;
}
