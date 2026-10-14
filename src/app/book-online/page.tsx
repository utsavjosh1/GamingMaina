import { getCachedStationTypeAvailability } from "@/lib/db/queries";
import { BookOnlineClient } from "./BookOnlineClient";

// Rendered on demand: building must never require a live database
// (Vercel preview builds have no DB). The inner unstable_cache(60s)
// still absorbs floor traffic.
export const dynamic = "force-dynamic";

export default async function BookOnlinePage() {
  const stationTypes = await getCachedStationTypeAvailability().catch(() => []);

  return <BookOnlineClient initialStationTypes={stationTypes} />;
}
