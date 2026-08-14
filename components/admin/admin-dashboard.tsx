"use client";

import { useState } from "react";
import type { AdminCatalog } from "@/lib/admin-catalog";

type Kind = "category" | "product" | "allergen" | "option" | "offer";
type Save = (kind: Kind, id: string, patch: Record<string, unknown>, risky?: boolean) => Promise<void>;

export function AdminDashboard({ catalog, displayName }: { catalog: AdminCatalog; displayName: string }) {
  const [message, setMessage] = useState("");

  async function save(kind: Kind, id: string, patch: Record<string, unknown>, risky = false) {
    if (risky && !window.confirm("Bekræft ændringen. Den skjuler indholdet fra gæster efter næste genindlæsning.")) return;
    setMessage("");
    const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ kind, id, patch }) });
    setMessage(response.ok ? "Ændringen er gemt. Gæstemenuen opdateres ved genindlæsning." : (await response.json().catch(() => undefined))?.error ?? "Ændringen kunne ikke gemmes.");
  }

  return <main className="back-office">
    <header className="back-office-header"><div><p className="eyebrow">Tee-time · Menuadministration</p><h1>Menu og tilbud</h1><p>{displayName} · Administrator</p></div><a className="button button-secondary office-link" href="/personale">Personale</a></header>
    {message && <p className="office-message" role="status">{message}</p>}
    <section className="admin-section"><h2>Produkter</h2><div className="admin-list">
      {catalog.products.map((product) => <form key={product.id} className="admin-row" aria-label={`Rediger ${product.name}`} onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        void save("product", product.id, { name: data.get("name"), description: data.get("description"), priceOre: Math.round(Number(data.get("price")) * 100), isSoldOut: data.get("soldOut") === "on", isActive: data.get("active") === "on" }, data.get("active") !== "on" || data.get("soldOut") === "on");
      }}>
        <label>Navn<input name="name" defaultValue={product.name} /></label><label>Beskrivelse<input name="description" defaultValue={product.description} /></label><label>Pris, kr.<input name="price" type="number" step="0.01" min="0" defaultValue={(product.priceOre / 100).toFixed(2)} /></label><label className="check-field"><input name="soldOut" type="checkbox" defaultChecked={product.isSoldOut} /> Udsolgt</label><label className="check-field"><input name="active" type="checkbox" defaultChecked={product.isActive} /> Aktiv</label><button className="office-action" type="submit">Gem</button>
      </form>)}
    </div></section>
    <SimpleSection title="Kategorier" kind="category" rows={catalog.categories} save={save} />
    <SimpleSection title="Allergener" kind="allergen" rows={catalog.allergens} save={save} />
    <OptionSection rows={catalog.options} save={save} />
    <OfferSection rows={catalog.offers} save={save} />
  </main>;
}

function SimpleSection({ title, kind, rows, save }: { title: string; kind: "category" | "allergen"; rows: Array<{ id: string; name: string; isActive: boolean }>; save: Save }) {
  return <section className="admin-section"><h2>{title}</h2><div className="admin-list compact">{rows.map((row) => <form key={row.id} className="admin-row" aria-label={`Rediger ${row.name}`} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save(kind, row.id, { name: data.get("name"), isActive: data.get("active") === "on" }, data.get("active") !== "on"); }}><label>Navn<input name="name" defaultValue={row.name} /></label><label className="check-field"><input name="active" type="checkbox" defaultChecked={row.isActive} /> Aktiv</label><button className="office-action" type="submit">Gem</button></form>)}</div></section>;
}

function OptionSection({ rows, save }: { rows: AdminCatalog["options"]; save: Save }) {
  return <section className="admin-section"><h2>Tilvalg</h2><div className="admin-list compact">{rows.map((row) => <form key={row.id} className="admin-row" aria-label={`Rediger ${row.name}`} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("option", row.id, { name: data.get("name"), priceDeltaOre: Math.round(Number(data.get("price")) * 100), isActive: data.get("active") === "on" }, data.get("active") !== "on"); }}><label>Tilvalg<input name="name" defaultValue={row.name} /></label><label>Merpris, kr.<input name="price" type="number" step="0.01" min="0" defaultValue={(row.priceDeltaOre / 100).toFixed(2)} /></label><label className="check-field"><input name="active" type="checkbox" defaultChecked={row.isActive} /> Aktiv</label><button className="office-action" type="submit">Gem</button></form>)}</div></section>;
}

function OfferSection({ rows, save }: { rows: AdminCatalog["offers"]; save: Save }) {
  return <section className="admin-section"><h2>Tilbud</h2><div className="admin-list">{rows.map((row) => <form key={row.id} className="admin-row" aria-label={`Rediger ${row.title}`} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("offer", row.id, { title: data.get("title"), badge: data.get("badge"), description: data.get("description"), isActive: data.get("active") === "on" }, data.get("active") !== "on"); }}><label>Titel<input name="title" defaultValue={row.title} /></label><label>Mærke<input name="badge" defaultValue={row.badge} /></label><label>Beskrivelse<input name="description" defaultValue={row.description} /></label><label className="check-field"><input name="active" type="checkbox" defaultChecked={row.isActive} /> Aktiv</label><button className="office-action" type="submit">Gem</button></form>)}</div></section>;
}
