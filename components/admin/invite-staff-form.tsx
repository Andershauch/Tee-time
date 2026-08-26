"use client";

import { FormEvent, useState } from "react";

export function InviteStaffForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    setOk(false);
    const response = await fetch("/api/admin/invite-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email, name, role }),
    }).catch(() => undefined);
    const body = await response?.json().catch(() => undefined) as { ok?: boolean; error?: string; warning?: string } | undefined;
    setSubmitting(false);
    if (!response?.ok) { setMessage(body?.error ?? "Kunne ikke oprette kontoen."); return; }
    setOk(true);
    setMessage(body?.warning ?? `${name} er oprettet og har fået en mail til at vælge en adgangskode.`);
    setEmail("");
    setName("");
    setRole("staff");
  }

  return (
    <form onSubmit={submit} className="admin-block">
      <label>Navn<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} /></label>
      <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>
        Rolle
        <select value={role} onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "staff")}>
          <option value="staff">Personale</option>
          <option value="admin">Admin (kan også ændre menuen)</option>
        </select>
      </label>
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Opretter…" : "Send invitation"}</button>
      {message && <p role={ok ? "status" : "alert"} className="office-message">{message}</p>}
    </form>
  );
}
