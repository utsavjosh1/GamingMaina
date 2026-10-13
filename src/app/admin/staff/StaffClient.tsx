"use client";

import React from "react";
import {
  addStaff,
  changeStaffRole,
  getStaffRoster,
  removeStaff,
  type StaffRosterEntry,
} from "./actions";
import { OpsAlert, OpsPanel } from "@/components/ui/OpsPrimitives";
import { cn } from "@/lib/utils";

const BRANCH_ROLES = ["admin", "staff", "customer"] as const;
const ORG_ROLES = ["owner", "admin", "staff", "customer"] as const;

const inputClass =
  "tnum w-full rounded-[10px] border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-[var(--erp-subtle)] focus:border-ember/60 focus:outline-none";
const selectClass =
  "rounded-[10px] border border-white/[0.1] bg-black/30 px-2.5 py-2 text-[13px] text-white focus:border-ember/60 focus:outline-none";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--erp-muted)]";

export function StaffClient({
  initialRoster,
  canManage,
  branchName,
}: {
  initialRoster: StaffRosterEntry[];
  canManage: boolean;
  branchName: string;
}) {
  const [roster, setRoster] = React.useState(initialRoster);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [newOrgRole, setNewOrgRole] = React.useState<string>("staff");
  const [newBranchRole, setNewBranchRole] = React.useState<string>("staff");

  const refresh = React.useCallback(async () => {
    setRoster(await getStaffRoster());
  }, []);

  const run = React.useCallback(async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await refresh();
      setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Team · {branchName}</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">Staff</h1>
        <p className="mt-1 text-sm text-[var(--erp-muted)]">
          Who can work this branch, and what they may do. Every change is audited.
        </p>
      </div>

      {error && <OpsAlert tone="error" title="Change not applied.">{error}</OpsAlert>}
      {notice && <OpsAlert tone="success" title={notice}>{notice}</OpsAlert>}

      {canManage && (
        <OpsPanel title="Add staff" description="Grant an existing account access to this branch.">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              void run(`add:${email}`, () => addStaff({ email: email.trim(), orgRole: newOrgRole, branchRole: newBranchRole }), `${email.trim()} added to the roster.`);
              setEmail("");
            }}
          >
            <div>
              <label className={labelClass} htmlFor="staff-email">Account email</label>
              <input
                id="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="staff-org-role">Org role</label>
              <select id="staff-org-role" value={newOrgRole} onChange={(e) => setNewOrgRole(e.target.value)} className={cn(selectClass, "w-full")}>
                {ORG_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="staff-branch-role">Branch role</label>
              <select id="staff-branch-role" value={newBranchRole} onChange={(e) => setNewBranchRole(e.target.value)} className={cn(selectClass, "w-full")}>
                {BRANCH_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy !== null}
                className="rounded-[10px] bg-ember px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy !== null ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        </OpsPanel>
      )}

      <OpsPanel title={`Roster (${roster.length})`} description="Roles resolve from memberships, never profiles.">
        {roster.length === 0 ? (
          <p className="text-sm text-[var(--erp-muted)]">No staff yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {roster.map((member) => {
              const branchRole = member.branches[0]?.role ?? "—";
              return (
                <li key={member.userId} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{member.name ?? member.email}</p>
                    <p className="truncate text-[13px] text-[var(--erp-muted)]">{member.email}</p>
                    <p className="mt-1 text-xs text-[var(--erp-subtle)]">
                      org: <span className="text-[var(--erp-muted)]">{member.orgRole}</span>
                      {" · "}
                      {branchName}: <span className="text-[var(--erp-muted)]">{branchRole}</span>
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Branch role for ${member.email}`}
                        value={branchRole === "—" ? "customer" : branchRole}
                        disabled={busy !== null}
                        onChange={(e) => {
                          void run(`role:${member.userId}`, () => changeStaffRole({ userId: member.userId, branchRole: e.target.value }), `Branch role updated for ${member.email}.`);
                        }}
                        className={selectClass}
                      >
                        {BRANCH_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select
                        aria-label={`Org role for ${member.email}`}
                        value={member.orgRole}
                        disabled={busy !== null}
                        onChange={(e) => {
                          void run(`org:${member.userId}`, () => changeStaffRole({ userId: member.userId, orgRole: e.target.value }), `Org role updated for ${member.email}.`);
                        }}
                        className={selectClass}
                      >
                        {ORG_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          if (!window.confirm(`Remove ${member.email} from the roster?`)) return;
                          void run(`rm:${member.userId}`, () => removeStaff({ userId: member.userId }), `${member.email} removed.`);
                        }}
                        className="rounded-[10px] border border-red-500/30 px-3 py-2 text-[13px] font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </OpsPanel>
    </div>
  );
}
