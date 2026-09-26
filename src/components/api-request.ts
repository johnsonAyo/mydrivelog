import { toast } from "@drivetrack/ui";

const UNREACHABLE = "We couldn’t reach MyDriveLog. Check your connection and try again.";
const UNEXPECTED = "Something went wrong. Please try again.";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly correlationId?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Problem = { detail?: string; title?: string; correlationId?: string };

export async function requestJson<T>(url: string, { method = "GET", body }: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }
  if (!response.ok) {
    const problem: Problem = await response.json().catch(() => ({}));
    throw new ApiError(problem.detail ?? problem.title ?? UNEXPECTED, response.status, problem.correlationId);
  }
  return response.json() as Promise<T>;
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message ? cause.message : UNEXPECTED;
}

export function toastError(title: string, cause: unknown) {
  const reason = errorMessage(cause);
  const reference = cause instanceof ApiError && cause.correlationId ? `${/[.!?]$/.test(reason) ? "" : "."} Reference: ${cause.correlationId}` : "";
  toast.error({ title, description: reason + reference });
}
