import React from "react";
import { getOperationalAlerts, getReports } from "./actions";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reports | Gaming Mania Delhi" };

export default async function ReportsPage() {
  const [report, alerts] = await Promise.all([getReports("7d"), getOperationalAlerts()]);
  return <ReportsClient initial={report} initialAlerts={alerts} />;
}
