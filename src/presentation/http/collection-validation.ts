import { z } from "zod";
import { isMonday } from "@/domain/collections/week";

export const collectionNameSchema = z.object({ name: z.string().trim().min(2).max(100) });
export const collectionWeekSchema = z.object({ weekStart: z.string().refine(isMonday, "Choose a Monday–Sunday week") });

export const exactSlotSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  makeAvailable: z.boolean().default(false),
}).refine((slot) => {
  const minutes = (new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60_000;
  return minutes >= 15 && minutes <= 480;
}, { message: "A lesson must be between 15 minutes and 8 hours" });

export const invitationSchema = z.object({
  kind: z.literal("invite"),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
});
