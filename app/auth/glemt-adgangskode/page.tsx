"use client";

import { FormEvent, useState } from "react";

export default function GlemtAdgangskodePage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(form.get("email") ?? "") }) }).catch(() => undefined);
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return <main className="auth-page"><div className="auth-card"><p className="eyebrow">Tee-Time drift</p><h1>Tjek din mail</h1><p>Hvis adressen findes hos os, har vi sendt et link til at nulstille adgangskoden.</p></div></main>;
  }

  return (
    <main className="auth-page">
      <form onSubmit={submit} className="auth-card">
        <p className="eyebrow">Tee-Time drift</p>
        <h1>Glemt adgangskode</h1>
        <p>Indtast din e-mail, så sender vi et link til at vælge en ny adgangskode.</p>
        <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
        <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Sender…" : "Send link"}</button>
      </form>
    </main>
  );
}
