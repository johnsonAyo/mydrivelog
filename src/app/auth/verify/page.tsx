import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyAccessLink } from "@/components/verify-access-link";

export const metadata: Metadata = { title: "Verifying access — MyDriveLog", referrer: "no-referrer" };

export default function VerifyPage() {
  return <main data-dt="access-page"><Suspense fallback={null}><VerifyAccessLink /></Suspense></main>;
}
