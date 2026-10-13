/**
 * Audit trail — every important mutation emits an event (contract §20).
 * Written inside the same domain transaction as the state change so
 * history can never diverge from state. No secrets in metadata.
 */
import "server-only";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type Store = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const AUDIT_ACTIONS = {
  bookingCreated: "booking.created",
  bookingCancelled: "booking.cancelled",
  bookingCheckedIn: "booking.checked_in",
  bookingStationAssigned: "booking.station_assigned",
  bookingNoShow: "booking.no_show",
  bookingExpired: "booking.expired",
  bookingCompleted: "booking.completed",
  sessionStarted: "session.started",
  sessionPaused: "session.paused",
  sessionResumed: "session.resumed",
  sessionCompleted: "session.completed",
  paymentCollected: "payment.collected",
  stationStatusChanged: "station.status_changed",
  cashOpened: "cash.opened",
  cashClosed: "cash.closed",
  cashMovement: "cash.movement",
  staffAdded: "staff.added",
  staffPermissionChanged: "staff.permission_changed",
  staffRemoved: "staff.removed",
  customerUpdated: "customer.updated",
  branchUpdated: "branch.updated",
  expenseCreated: "expense.created",
  incomeCreated: "income.created",
  productCreated: "product.created",
  productUpdated: "product.updated",
  inventoryMovement: "inventory.movement",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export async function writeAudit(
  store: Store,
  event: {
    actorId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    orgId?: string | null;
    branchId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
) {
  await store.insert(auditLogs).values({
    actorId: event.actorId ?? null,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    orgId: event.orgId ?? null,
    branchId: event.branchId ?? null,
    oldValue: event.oldValue ?? null,
    newValue: event.newValue ?? null,
    ipAddress: null,
  });
}
