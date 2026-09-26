import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canWriteWorkspace } from "@/application/auth/can-write-workspace";
import { readInstructorLesson, saveInstructorLessonDraft } from "@/application/lessons/manage-lesson-draft";
import { currentSessionResolver } from "@/infrastructure/auth/current-session-resolver";
import { postgresLessonRepository } from "@/infrastructure/lessons/postgres-lesson-repository";
import { authenticateRequest } from "@/presentation/http/authenticate-request";
import { problem } from "@/presentation/http/problem";

const draftSchema = z.object({
  expectedRevision: z.number().int().min(0),
  privateNotes: z.string().max(10000),
  whatWeWorkedOn: z.string().max(5000),
  whatToPractise: z.string().max(5000),
  nextLessonFocus: z.string().max(2000),
  skills: z.array(z.object({ skill: z.string().trim().min(1).max(80), outcome: z.enum(["introduced", "developing", "confident"]) }).strict()).max(30).refine((items) => new Set(items.map((item) => item.skill.toLowerCase())).size === items.length),
}).strict();

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) return problem(404, "not_found", "Lesson not found");
  const lesson = await readInstructorLesson(postgresLessonRepository, auth.session.workspaceId, bookingId, new Date());
  if (!lesson) return problem(404, "not_found", "Lesson not found");
  return NextResponse.json({ data: lesson }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, currentSessionResolver);
  if (!auth.ok) return problem(401, "unauthenticated", "Workspace access is required");
  if (!canWriteWorkspace(auth.session)) return problem(403, "read_only", "This workspace is read-only");
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) return problem(404, "not_found", "Lesson not found");
  const parsed = draftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem(400, "invalid_draft", "Check the lesson notes and try again");
  const { expectedRevision, ...fields } = parsed.data;
  const result = await saveInstructorLessonDraft(postgresLessonRepository, {
    workspaceId: auth.session.workspaceId,
    bookingId,
    expectedRevision,
    fields,
  });
  if (!result.ok) {
    if (result.reason === "not_found") return problem(404, "not_found", "Lesson not found");
    if (result.reason === "cancelled") return problem(409, "cancelled", "This lesson was cancelled");
    return problem(409, "revision_conflict", "These notes changed or the booking is no longer available. Reload before saving again");
  }
  return NextResponse.json({ data: result.lesson }, { headers: { "Cache-Control": "private, no-store" } });
}
