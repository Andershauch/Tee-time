import "server-only";

/** Reject cross-origin state changes before a session cookie can be used. */
export function isTrustedMutation(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const origin = request.headers.get("origin");
  if (!configuredOrigin || !origin) return false;

  try {
    return new URL(origin).origin === new URL(configuredOrigin).origin;
  } catch {
    return false;
  }
}
