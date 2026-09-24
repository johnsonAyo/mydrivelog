import type { ReactNode } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { Badge, ProductShell, Stack, Surface, Text } from "@drivetrack/ui";

export function PreviewProductShell({ page, title, description, children }: {
  page: "today" | "calendar";
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <ProductShell
      brand="DriveTrack"
      navigation={[
        { href: "/preview/today", label: "Today", icon: <Clock3 size={17} />, active: page === "today" },
        { href: "/preview/calendar", label: "Calendar", icon: <CalendarDays size={17} />, active: page === "calendar" },
      ]}
      title={title}
      description={description}
      identity="Instructor workspace · preview"
    >
      <Stack gap="5">
        <Surface tone="warning" padding="4">
          <Stack gap="2">
            <Badge tone="warning">Design preview</Badge>
            <Text variant="caption">Sample data only. No account or database is needed, and changes are not saved.</Text>
          </Stack>
        </Surface>
        {children}
      </Stack>
    </ProductShell>
  );
}
