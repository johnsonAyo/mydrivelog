"use client";

import { useEffect, useState } from "react";
import { EmptyState, SchedulingSettingsForm, toast, type SchedulingSettings } from "@drivetrack/ui";
import { requestJson, toastError } from "./api-request";

type EditableSchedulingSettings = Pick<SchedulingSettings, "defaultSessionMinutes" | "bufferWarningMinutes" | "weeklyBookingAllowance" | "minimumBookingNoticeHours" | "contactPhone">;

export function SchedulingSettingsWorkspace() {
  const [settings, setSettings] = useState<SchedulingSettings | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    requestJson<{ data: SchedulingSettings }>("/api/v1/settings/scheduling")
      .then(({ data }) => { if (active) setSettings(data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  async function save(input: EditableSchedulingSettings) {
    try {
      const { data } = await requestJson<{ data: SchedulingSettings }>("/api/v1/settings/scheduling", { method: "PATCH", body: input });
      setSettings(data);
      toast.success({ title: "Scheduling settings saved", description: "Existing lesson times stay as they are. Booking limits and notice apply to future online bookings." });
    } catch (cause) {
      toastError("We couldn’t save your settings", cause);
    }
  }
  if (error) return <EmptyState title="Settings unavailable" description="Refresh this page and try again." />;
  if (!settings) return <p>Loading scheduling settings…</p>;
  return <SchedulingSettingsForm settings={settings} onSave={save} />;
}
