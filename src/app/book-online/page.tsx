import { getCachedStationTypeAvailability } from "@/lib/db/queries";
import { BookOnlineClient } from "./BookOnlineClient";

export const revalidate = 60;

export default async function BookOnlinePage() {
  const stationTypes = await getCachedStationTypeAvailability().catch(() => []);

  return <BookOnlineClient initialStationTypes={stationTypes} />;
}
