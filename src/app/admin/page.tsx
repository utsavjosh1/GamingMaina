import React from "react";
import {
  getActingContext,
  getAllStations,
  getActiveSessions,
  getBookingsForDate,
  getTodayRevenue,
} from "./actions";
import { AdminDashboardClient } from "./AdminDashboardClient";
import { getDelhiDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const today = getDelhiDate();

  const [stations, sessions, bookings, revenue, acting] = await Promise.all([
    getAllStations(),
    getActiveSessions(),
    getBookingsForDate(today),
    getTodayRevenue(),
    getActingContext(),
  ]);

  return (
    <AdminDashboardClient
      stations={stations}
      sessions={sessions}
      bookings={bookings}
      revenue={revenue}
      orgName={acting.org.name}
      branchName={acting.branch.name}
    />
  );
}
