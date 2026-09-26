export async function apiError(response: Response, fallback: string) {
  const body: { detail?: string; title?: string } = await response.json().catch(() => ({}));
  return body.detail ?? body.title ?? fallback;
}
