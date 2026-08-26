import "server-only";

import { createPublicKey, verify as verifyEd25519, type JsonWebKey as NodeJsonWebKey } from "node:crypto";

// Neon rotates signing keys rarely; a short cache avoids a JWKS fetch on every webhook delivery.
const jwksMaxAgeMs = 10 * 60 * 1000;
const signatureMaxAgeMs = 5 * 60 * 1000;

type Jwk = NodeJsonWebKey & { kid: string };
type Jwks = { keys: Jwk[] };

let cachedJwks: Jwks | undefined;
let cachedJwksAt = 0;

async function getJwks(baseUrl: string): Promise<Jwks> {
  if (cachedJwks && Date.now() - cachedJwksAt < jwksMaxAgeMs) return cachedJwks;
  const response = await fetch(`${baseUrl}/.well-known/jwks.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`jwks_fetch_failed_${response.status}`);
  cachedJwks = (await response.json()) as Jwks;
  cachedJwksAt = Date.now();
  return cachedJwks;
}

export class WebhookSignatureError extends Error {}

/**
 * Verifies a Neon Auth (Managed Better Auth) webhook delivery per Neon's
 * documented scheme: a detached Ed25519 JWS over `${timestamp}.${payload}`,
 * keyed by a JWKS served from the auth base URL, plus a 5-minute freshness
 * window against replay. Returns the raw body unchanged — the caller still
 * owns JSON parsing and validation.
 *
 * Reference: https://neon.com/guides/neon-auth-webhooks-nextjs
 */
export async function verifyNeonAuthWebhook(rawBody: string, headers: Headers): Promise<string> {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");
  if (!signature || !kid || !timestamp) throw new WebhookSignatureError("missing_headers");

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL is required to verify Neon Auth webhooks.");

  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > signatureMaxAgeMs) throw new WebhookSignatureError("stale_timestamp");

  const [headerB64, emptyPayload, signatureB64] = signature.split(".");
  if (emptyPayload !== "" || !headerB64 || !signatureB64) throw new WebhookSignatureError("malformed_signature");

  const jwks = await getJwks(baseUrl);
  const jwk = jwks.keys.find((key) => key.kid === kid);
  if (!jwk) throw new WebhookSignatureError("unknown_key");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signingInput = `${headerB64}.${Buffer.from(`${timestamp}.${payloadB64}`, "utf8").toString("base64url")}`;
  const isValid = verifyEd25519(null, Buffer.from(signingInput), publicKey, Buffer.from(signatureB64, "base64url"));
  if (!isValid) throw new WebhookSignatureError("invalid_signature");

  return rawBody;
}
