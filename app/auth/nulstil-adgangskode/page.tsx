"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirm) { setError("Adgangskoderne er ikke ens."); setPending(false); return; }
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword }) }).catch(() => undefined);
    if (!response?.ok) { setError("Linket er ugyldigt eller udløbet. Anmod om et nyt."); setPending(false); return; }
    router.push("/auth/sign-in");
  }

  if (!token) {
    return <div className="auth-card"><p className="eyebrow">Tee-Time drift</p><h1>Link mangler</h1><p>Åbn linket fra mailen igen, eller anmod om et nyt på <a href="/auth/glemt-adgangskode">siden for glemt adgangskode</a>.</p></div>;
  }

  return (
    <form onSubmit={submit} className="auth-card">
      <p className="eyebrow">Tee-Time drift</p>
      <h1>Vælg ny adgangskode</h1>
      <label>Ny adgangskode<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label>Gentag adgangskode<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      {error && <p className="form-hint" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Gemmer…" : "Gem adgangskode"}</button>
    </form>
  );
}

export default function NulstilAdgangskodePage() {
  return (
    <main className="auth-page">
      <Suspense fallback={<div className="auth-card"><p>Indlæser…</p></div>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
