"use client";

import React from "react";
import { getBranchProfile, updateBranchProfile, type BranchProfile } from "./actions";
import { OpsAlert, OpsPanel } from "@/components/ui/OpsPrimitives";

const inputClass =
  "tnum w-full rounded-[10px] border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-[var(--erp-subtle)] focus:border-ember/60 focus:outline-none";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--erp-muted)]";

export function BranchClient({
  initialProfile,
  canManage,
}: {
  initialProfile: BranchProfile;
  canManage: boolean;
}) {
  const [profile, setProfile] = React.useState(initialProfile);
  const [name, setName] = React.useState(initialProfile.name);
  const [timezone, setTimezone] = React.useState(initialProfile.timezone);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateBranchProfile({ name: name.trim(), timezone: timezone.trim() });
      setProfile(await getBranchProfile());
      setName(updated.name);
      setTimezone(updated.timezone);
      setNotice("Branch profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }, [name, timezone]);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-6">
      <div>
        <p className="text-[13px] text-[var(--erp-muted)]">Branch · {profile.code}</p>
        <h1 className="ops-heading mt-1 text-2xl font-semibold tracking-tight text-white">{profile.name}</h1>
        <p className="mt-1 text-sm text-[var(--erp-muted)]">
          {profile.orgName} · {profile.stationCount} stations · {profile.staffCount} staff
        </p>
      </div>

      {error && <OpsAlert tone="error" title="Change not applied.">{error}</OpsAlert>}
      {notice && <OpsAlert tone="success" title={notice}>{notice}</OpsAlert>}

      <OpsPanel title="Profile" description="The branch code never changes — seeds and history key on it.">
        {canManage ? (
          <form onSubmit={save} className="grid max-w-xl gap-4">
            <div>
              <label className={labelClass} htmlFor="branch-name">Branch name</label>
              <input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="branch-tz">Timezone</label>
              <input id="branch-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} required maxLength={64} className={inputClass} placeholder="Asia/Kolkata" />
            </div>
            <div>
              <button
                type="submit"
                disabled={busy}
                className="rounded-[10px] bg-ember px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="tnum grid max-w-xl gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--erp-muted)]">Name</dt><dd className="text-white">{profile.name}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--erp-muted)]">Timezone</dt><dd className="text-white">{profile.timezone}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--erp-muted)]">Code</dt><dd className="text-white">{profile.code}</dd></div>
          </dl>
        )}
      </OpsPanel>
    </div>
  );
}
