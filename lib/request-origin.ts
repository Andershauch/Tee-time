import "server-only";
import { hasTrustedMutationOrigin } from "@/lib/request-origin-validation";

/** Reject cross-origin state changes before a session cookie can be used. */
export function isTrustedMutation(request: Request) {
  return hasTrustedMutationOrigin(request, process.env.NEXT_PUBLIC_APP_URL);
}
