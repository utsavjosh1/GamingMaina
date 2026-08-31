import React from "react";
import { getUserBookings } from "@/app/book-online/actions";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Bookings | Gaming Mania Delhi",
  description: "View and manage your gaming session reservations.",
};

export default async function DashboardPage() {
  const bookings = await getUserBookings();

  return <DashboardClient initialBookings={bookings} />;
}
