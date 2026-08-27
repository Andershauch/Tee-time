function normalizedOrigin(value: string | null | undefined) {
  if (!value) return undefined;
  try { return new URL(value).origin; } catch { return undefined; }
}

function forwardedOrigin(request: Request) {
  const host = request.headers.get("host")?.trim()
    ?? request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  if (!host) return undefined;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim()
    ?? new URL(request.url).protocol.replace(":", "");
  return normalizedOrigin(`${protocol}://${host}`);
}

export function hasTrustedMutationOrigin(request: Request, configuredAppUrl?: string) {
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (!origin) return false;

  const allowedOrigins = new Set([
    normalizedOrigin(request.url),
    forwardedOrigin(request),
    normalizedOrigin(configuredAppUrl),
  ].filter((value): value is string => Boolean(value)));

  return allowedOrigins.has(origin);
}
