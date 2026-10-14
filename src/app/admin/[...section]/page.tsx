import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OpsEmpty, OpsPanel } from "@/components/ui/OpsPrimitives";

const pageCopy: Record<string, { title: string; description: string; cards: string[] }> = {
  reservations: {
    title: "Reservations",
    description: "Scheduler, timeline, conflict prevention, check-in, no-show, and reservation payments.",
    cards: ["Day / week scheduler", "Station timeline", "Conflict indicators", "Upcoming arrivals"],
  },
  customers: {
    title: "Customers",
    description: "Profiles, visit history, memberships, wallet balances, notes, and current sessions.",
    cards: ["Fast phone search", "Membership status", "Wallet balance", "Lifetime spend"],
  },
  pos: {
    title: "POS",
    description: "Touch-friendly product grid, right-side cart, session attachment, and split payments.",
    cards: ["Quick product grid", "Attach to station", "Kitchen status", "Split tender"],
  },
  inventory: {
    title: "Inventory",
    description: "Products, stock levels, low stock alerts, suppliers, and full movement traceability.",
    cards: ["Low stock", "Out of stock", "Stock ledger", "Supplier view"],
  },
  analytics: {
    title: "Analytics",
    description: "Busiest hours, station revenue, retention, product sales, and downtime.",
    cards: ["Revenue trend", "Hourly occupancy", "Station utilization", "Top products"],
  },
  maintenance: {
    title: "Maintenance",
    description: "Station issues, technician workflow, hardware health, history, and downtime tracking.",
    cards: ["Open issues", "Waiting for part", "Device offline", "Fixed today"],
  },
  settings: {
    title: "Settings",
    description: "Branch profile, pricing rules, staff roles, receipts, and notification preferences.",
    cards: ["Branch profile", "Pricing rules", "Roles", "Receipts"],
  },
  help: {
    title: "Help",
    description: "Shift playbooks: opening, rush hour, disputes, closing, and cash handover.",
    cards: ["Opening checklist", "Rush-hour playbook", "Disputes", "Cash handover"],
  },
};

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const key = section[0] ?? "dashboard";
  const copy = pageCopy[key] ?? {
    title: toTitle(key),
    description: "This module ships after bookings, sessions, payments and cash are stable.",
    cards: ["Planned workflow", "Planned states", "Planned permissions", "Planned audit"],
  };

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-5">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--erp-muted)] hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to floor
      </Link>
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Coming after the floor is stable</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
        <p className="mt-1.5 max-w-[65ch] text-sm leading-6 text-[var(--erp-muted)]">{copy.description}</p>
      </div>
      <OpsPanel title="Planned scope" description="Locked in build order — floor, sessions and cash come first.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {copy.cards.map((card) => (
            <li key={card} className="ops-sunken rounded-[10px] px-3.5 py-3 text-sm font-medium text-slate-200">
              {card}
            </li>
          ))}
        </ul>
      </OpsPanel>
      <OpsEmpty
        title={`${copy.title} isn't live yet`}
        description="Run today's floor from the overview — this module unlocks in its build phase, not before."
        action={
          <Link
            href="/admin"
            className="inline-flex min-h-10 items-center whitespace-nowrap rounded-[10px] bg-paper px-4 text-sm font-semibold text-ink hover:bg-white"
          >
            Open floor overview
          </Link>
        }
      />
    </div>
  );
}

function toTitle(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
