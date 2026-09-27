"use client";

import "@fontsource-variable/bricolage-grotesque";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button, Container, EmptyState } from "@drivetrack/ui";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html lang="en"><body><Container>
    <EmptyState title="Something went wrong" description="We have been told about it. Please try again."
      action={<Button type="button" onClick={reset}>Try again</Button>} />
  </Container></body></html>;
}
