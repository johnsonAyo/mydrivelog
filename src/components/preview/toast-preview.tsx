"use client";

import { Button, Inline, toast } from "@drivetrack/ui";

export function ToastPreview() {
  return <Inline>
    <Button type="button" variant="surface" onClick={() => toast.success({ title: "Scheduling settings saved", description: "Existing lesson times stay as they are. Booking limits and notice apply to future online bookings." })}>Show success</Button>
    <Button type="button" variant="surface" onClick={() => toast.info({ title: "Google sign-in was closed", description: "Nothing has changed. Choose Google again when you’re ready." })}>Show info</Button>
    <Button type="button" variant="surface" onClick={() => toast.error({ title: "Your lesson notes aren’t saved", description: "The lesson changed in another tab. Review it again", action: { label: "Retry save", onClick: () => toast.dismiss() } })}>Show error with action</Button>
  </Inline>;
}
