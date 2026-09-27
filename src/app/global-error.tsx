"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html><body><main>
    <h1>Something went wrong</h1><p>Please try again. If this continues, contact us.</p>
    <button type="button" onClick={reset}>Try again</button>
  </main></body></html>;
}
