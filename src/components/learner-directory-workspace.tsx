"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, LearnerDirectory, toast, type Learner } from "@drivetrack/ui";
import { requestJson, toastError } from "./api-request";

async function fetchLearners() {
  return (await requestJson<{ data: Learner[] }>("/api/v1/learners")).data;
}

export function LearnerDirectoryWorkspace() {
  const [learners, setLearners] = useState<Learner[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetchLearners().then((data) => { if (active) setLearners(data); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, []);
  async function save(input: { sourceEmail: string; name: string; email: string }) {
    setBusy(true);
    try {
      await requestJson("/api/v1/learners", { method: "POST", body: input });
      toast.success("Learner details saved");
    } catch (cause) {
      toastError("We couldn’t save this learner", cause);
      throw cause;
    } finally { setBusy(false); }
    try { setLearners(await fetchLearners()); } catch (cause) { toastError("We couldn’t refresh your learners", cause); }
  }
  if (!learners) return loadFailed ? <EmptyState title="Learners unavailable" description="Could not load learners. Refresh to try again." /> : <p>Loading learners…</p>;
  return <LearnerDirectory learners={learners} onSave={save} busy={busy} renderProfileLink={(href, children) => <Link href={href}>{children}</Link>} />;
}
