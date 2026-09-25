"use client";

import { useEffect, useState } from "react";
import { EmptyState, LearnerDirectory, type Learner } from "@drivetrack/ui";

export function LearnerDirectoryWorkspace() {
  const [learners, setLearners] = useState<Learner[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const response = await fetch("/api/v1/learners", { cache: "no-store" });
    if (!response.ok) throw new Error("Learners unavailable");
    const json: { data: Learner[] } = await response.json();
    setLearners(json.data);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/v1/learners", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Learners unavailable");
      const json: { data: Learner[] } = await response.json();
      if (active) setLearners(json.data);
    }).catch(() => { if (active) setMessage("Could not load learners. Refresh to try again."); });
    return () => { active = false; };
  }, []);
  async function save(input: { sourceEmail: string; name: string; email: string }) {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/learners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error("Could not save this learner");
      await load();
      setMessage("Learner details saved.");
    } catch { setMessage("Could not save this learner. Please try again."); throw new Error("Save failed"); }
    finally { setBusy(false); }
  }
  if (!learners) return message ? <EmptyState title="Learners unavailable" description={message} /> : <p>Loading learners…</p>;
  return <LearnerDirectory learners={learners} onSave={save} busy={busy} message={message} />;
}
