"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- The effect owns the external polling subscription. */

import { useEffect, useState } from "react";
import type { StaffOrder } from "@/lib/staff-orders";
import { formatPrice } from "@/lib/format";

const statusLabels = { received: "Modtaget", approved: "Godkendt", rejected: "Afvist", preparing: "Tilberedes", ready: "Klar", delivering: "Leveres", completed: "Afsluttet" } as const;
type NextStatus = Exclude<keyof typeof statusLabels, "received">;

function actionsFor(order: StaffOrder) {
  if (order.status === "received") return [["approved", "Godkend"], ["rejected", "Afvis"]] as const;
  if (order.status === "approved") return [["preparing", "Start tilberedning"]] as const;
  if (order.status === "preparing") return [[order.placement === "terrasse" ? "delivering" : "ready", order.placement === "terrasse" ? "Send ud" : "Klar til afhentning"]] as const;
  if (order.status === "ready" || order.status === "delivering") return [["completed", "Afslut ordre"]] as const;
  return [] as const;
}

export function StaffDashboard({ initialOrders, displayName, role }: { initialOrders: StaffOrder[]; displayName: string; role: "staff" | "admin" }) {
  const [orders, setOrders] = useState(initialOrders);
  const [scope, setScope] = useState<"active" | "archived">("active");
  const [message, setMessage] = useState("");
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({});

  const load = async (nextScope = scope) => {
    const response = await fetch(`/api/staff/orders?scope=${nextScope}`, { cache: "no-store" });
    if (response.ok) setOrders((await response.json() as { orders: StaffOrder[] }).orders);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8_000);
    return () => window.clearInterval(timer);
  }, [scope]);

  async function changeStatus(order: StaffOrder, status: NextStatus) {
    setMessage("");
    const response = await fetch(`/api/staff/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ expectedVersion: order.version, status, approvedFor: status === "approved" && proposedTimes[order.id] ? new Date(proposedTimes[order.id]).toISOString() : undefined }),
    });
    if (!response.ok) {
      setMessage((await response.json().catch(() => undefined))?.error ?? "Ordren kunne ikke opdateres.");
      await load();
      return;
    }
    setMessage(`Ordre ${order.orderNumber} er ${statusLabels[status].toLowerCase()}.`);
    await load();
  }

  return <main className="back-office">
    <header className="back-office-header">
      <div><p className="eyebrow">Tee-time · Personale</p><h1>Aktive ordrer</h1><p>{displayName} · {role === "admin" ? "Administrator" : "Personale"}</p></div>
      <a className="button button-secondary office-link" href={role === "admin" ? "/menuadmin" : "/"}>{role === "admin" ? "Menuadmin" : "Gæsteside"}</a>
    </header>
    <nav className="office-tabs" aria-label="Ordrevisning">
      <button className={scope === "active" ? "active" : ""} aria-pressed={scope === "active"} onClick={() => setScope("active")}>Aktive</button>
      <button className={scope === "archived" ? "active" : ""} aria-pressed={scope === "archived"} onClick={() => setScope("archived")}>Arkiv</button>
    </nav>
    <p className="sr-only" aria-live="polite">{message}</p>
    {message && <p className="office-message" role="alert">{message}</p>}
    <section className="staff-grid">
      {orders.length === 0 ? <p className="empty-office">Ingen {scope === "active" ? "aktive" : "arkiverede"} ordrer.</p> : orders.map((order) => <article className="staff-order-card" key={order.id}>
        <header><span className={`status-badge ${order.status}`}>{statusLabels[order.status]}</span><strong>{order.orderNumber}</strong><time dateTime={order.requestedFor}>{new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.approvedFor ?? order.requestedFor))}</time></header>
        <h2>{order.customerName}</h2>
        <p>{order.placement}{order.locationDetail ? ` · ${order.locationDetail}` : ""}{order.phone ? ` · ${order.phone}` : ""}</p>
        <ul>{order.items.map((item) => <li key={item.id}>{item.quantity}× {item.name}{item.options.length ? ` · ${item.options.join(", ")}` : ""}{item.note ? ` — ${item.note}` : ""}</li>)}</ul>
        {order.status === "received" && <label className="staff-time">Foreslå tidspunkt (valgfrit)<input type="datetime-local" value={proposedTimes[order.id] ?? ""} onChange={(event) => setProposedTimes((current) => ({ ...current, [order.id]: event.target.value }))} /></label>}
        <footer><strong>{formatPrice(order.totalOre / 100)}</strong><div>{actionsFor(order).map(([status, label]) => <button className={status === "rejected" ? "office-danger" : "office-action"} key={status} type="button" onClick={() => void changeStatus(order, status)}>{label}</button>)}</div></footer>
      </article>)}
    </section>
  </main>;
}
