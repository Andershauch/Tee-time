"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/staff/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") }) }).catch(() => undefined);
    if (!response?.ok) { setError("Login kunne ikke godkendes."); setPending(false); return; }
    router.push("/personale");
  }
  return <main className="auth-page"><form onSubmit={submit} className="auth-card"><p className="eyebrow">Tee-Time drift</p><h1>Log ind</h1><p>Kun restaurantens personale har adgang.</p><label>E-mail<input name="email" type="email" autoComplete="username" required /></label><label>Adgangskode<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="form-hint" role="alert">{error}</p>}<button className="button button-primary" type="submit" disabled={pending}>{pending ? "Logger ind…" : "Log ind"}</button><p><a href="/auth/glemt-adgangskode">Glemt adgangskode?</a></p></form></main>;
}
