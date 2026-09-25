"use client";

import { useEffect, useState } from "react";
import { EmptyState, SchedulingSettingsForm, type SchedulingSettings } from "@drivetrack/ui";

export function SchedulingSettingsWorkspace() {
  const [settings, setSettings] = useState<SchedulingSettings | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/v1/settings/scheduling", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Settings unavailable");
      const json: { data: SchedulingSettings } = await response.json();
      if (active) setSettings(json.data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  async function save(input: Pick<SchedulingSettings, "name" | "defaultSessionMinutes" | "bufferWarningMinutes" | "weeklyBookingAllowance">) {
    const response = await fetch("/api/v1/settings/scheduling", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) {
      const body: { detail?: string } = await response.json().catch(() => ({}));
      return body.detail ?? "Could not save settings";
    }
    const json: { data: SchedulingSettings } = await response.json();
    setSettings(json.data);
    return null;
  }
  if (error) return <EmptyState title="Settings unavailable" description="Refresh this page and try again." />;
  if (!settings) return <p>Loading scheduling settings…</p>;
  return <SchedulingSettingsForm settings={settings} onSave={save} />;
}
