import { CalendarDays, ListChecks, SlidersHorizontal, UsersRound } from "lucide-react";

export type InstructorSection = "today" | "calendar" | "learners" | "scheduling";

export function instructorNavigation(active?: InstructorSection) {
  return [
    { href: "/today", label: "Today", icon: <ListChecks size={17} />, active: active === "today" },
    { href: "/calendar", label: "Calendar", icon: <CalendarDays size={17} />, active: active === "calendar" },
    { href: "/learners", label: "Learners", icon: <UsersRound size={17} />, active: active === "learners" },
    { href: "/settings/scheduling", label: "Scheduling", icon: <SlidersHorizontal size={17} />, active: active === "scheduling" },
  ];
}
