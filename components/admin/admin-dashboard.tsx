"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import type { AdminCatalog } from "@/lib/admin-catalog";

type RestaurantHours = { opensAt: string; closesAt: string };
type Product = AdminCatalog["products"][number];
type ProductOptionRow = Product["options"][number];
type Offer = AdminCatalog["offers"][number];
type NamedRow = { id: string; name: string; isActive: boolean };

export function AdminDashboard({ catalog: initialCatalog, hours, displayName }: { catalog: AdminCatalog; hours: RestaurantHours; displayName: string }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [message, setMessage] = useState("");

  async function patch(body: Record<string, unknown>) {
    setMessage("");
    const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) });
    if (!response.ok) { setMessage((await response.json().catch(() => undefined))?.error ?? "Ændringen kunne ikke gemmes."); return false; }
    return true;
  }

  async function create<T>(body: Record<string, unknown>): Promise<T | undefined> {
    setMessage("");
    const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) });
    if (!response.ok) { setMessage((await response.json().catch(() => undefined))?.error ?? "Kunne ikke oprettes."); return undefined; }
    return (await response.json() as { item: T }).item;
  }

  async function saveHours(next: RestaurantHours) {
    setMessage("");
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(next) });
    setMessage(response.ok ? "Åbningstiderne er gemt." : (await response.json().catch(() => undefined))?.error ?? "Åbningstiderne kunne ikke gemmes.");
  }

  async function saveProduct(id: string, fields: Partial<Pick<Product, "name" | "description" | "priceOre" | "imagePath" | "isSoldOut" | "isActive">>) {
    if (await patch({ kind: "product", id, patch: fields })) setCatalog((current) => ({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...fields } : product) }));
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Fjern "${product.name}" fra gæstemenuen? Du kan ikke fortryde det fra denne side.`)) return;
    await saveProduct(product.id, { isActive: false });
  }

  async function saveCategory(id: string, fields: Partial<Pick<NamedRow, "name" | "isActive">>) {
    if (await patch({ kind: "category", id, patch: fields })) setCatalog((current) => ({ ...current, categories: current.categories.map((category) => category.id === id ? { ...category, ...fields } : category) }));
  }

  async function removeCategory(category: NamedRow) {
    if (!window.confirm(`Fjern kategorien "${category.name}"? Den og dens menupunkter forsvinder fra gæstemenuen. Du kan ikke fortryde det fra denne side.`)) return;
    await saveCategory(category.id, { isActive: false });
  }

  async function removeAllergen(allergen: NamedRow) {
    if (!window.confirm(`Fjern allergenet "${allergen.name}"? Det fjernes fra alle menupunkter. Du kan ikke fortryde det fra denne side.`)) return;
    if (await patch({ kind: "allergen", id: allergen.id, patch: { isActive: false } })) setCatalog((current) => ({ ...current, allergens: current.allergens.map((row) => row.id === allergen.id ? { ...row, isActive: false } : row) }));
  }

  async function toggleProductAllergen(productId: string, allergenId: string, isActive: boolean) {
    if (await patch({ kind: "product-allergen", productId, allergenId, isActive })) {
      setCatalog((current) => ({ ...current, products: current.products.map((product) => product.id !== productId ? product : { ...product, allergenIds: isActive ? [...product.allergenIds, allergenId] : product.allergenIds.filter((id) => id !== allergenId) }) }));
    }
  }

  async function saveOption(productId: string, optionId: string, fields: Partial<Pick<ProductOptionRow, "name" | "priceDeltaOre" | "isActive">>) {
    if (await patch({ kind: "option", id: optionId, patch: fields })) {
      setCatalog((current) => ({ ...current, products: current.products.map((product) => product.id !== productId ? product : { ...product, options: product.options.map((option) => option.id === optionId ? { ...option, ...fields } : option) }) }));
    }
  }

  async function removeOption(productId: string, option: ProductOptionRow) {
    if (!window.confirm(`Fjern tilvalget "${option.name}"? Du kan ikke fortryde det fra denne side.`)) return;
    await saveOption(productId, option.id, { isActive: false });
  }

  async function addOption(productId: string, name: string, priceDeltaOre: number) {
    const item = await create<ProductOptionRow & { productId: string }>({ kind: "option", productId, name, priceDeltaOre });
    if (item) setCatalog((current) => ({ ...current, products: current.products.map((product) => product.id !== productId ? product : { ...product, options: [...product.options, { id: item.id, name: item.name, priceDeltaOre: item.priceDeltaOre, isActive: item.isActive }] }) }));
    return Boolean(item);
  }

  async function saveOffer(id: string, fields: Partial<Pick<Offer, "title" | "badge" | "description" | "imagePath" | "priceOre" | "isSoldOut" | "isActive">>) {
    if (await patch({ kind: "offer", id, patch: fields })) setCatalog((current) => ({ ...current, offers: current.offers.map((row) => row.id === id ? { ...row, ...fields } : row) }));
  }

  async function removeOffer(offer: Offer) {
    if (!window.confirm(`Fjern tilbuddet "${offer.title}"? Du kan ikke fortryde det fra denne side.`)) return;
    await saveOffer(offer.id, { isActive: false });
  }

  async function addOffer(title: string, badge: string, description: string, priceOre: number | null) {
    const item = await create<Offer>({ kind: "offer", title, badge, description, priceOre });
    if (item) setCatalog((current) => ({ ...current, offers: [...current.offers, item] }));
    return Boolean(item);
  }

  async function addCategory(name: string) {
    const item = await create<NamedRow>({ kind: "category", name });
    if (item) setCatalog((current) => ({ ...current, categories: [...current.categories, item] }));
    return Boolean(item);
  }

  async function addAllergen(name: string) {
    const item = await create<NamedRow>({ kind: "allergen", name });
    if (item) setCatalog((current) => ({ ...current, allergens: [...current.allergens, item] }));
    return Boolean(item);
  }

  async function addProduct(categoryId: string, name: string, priceOre: number) {
    const item = await create<Product>({ kind: "product", categoryId, name, priceOre });
    if (item) setCatalog((current) => ({ ...current, products: [...current.products, item] }));
    return Boolean(item);
  }

  const activeCategories = catalog.categories.filter((category) => category.isActive);
  const activeAllergens = catalog.allergens.filter((allergen) => allergen.isActive);
  const activeOffers = catalog.offers.filter((offer) => offer.isActive);

  return <>
    <header className="menuadmin-header">
      <span className="menuadmin-brand"><Image src="/images/tee-time-logo.png" alt="" width={24} height={24} /><span>Tee-time · Menuadministration</span></span>
      <a href="/personale">Personale</a>
      <a href="/menuadmin/personale">Inviter medarbejder</a>
    </header>
    <div className="menuadmin-page">
      <h1>Menuadministration</h1>
      <p className="lede">Priser og udsolgt-status opdateres straks i gæstens menu. {displayName}.</p>
      <p className="sr-only" aria-live="polite">{message}</p>
      {message && <p className="office-message" role="alert">{message}</p>}

      <div className="admin-block"><h2>Åbningstider</h2><HoursForm hours={hours} onSave={saveHours} /></div>

      <div className="admin-block">
        <h2>Allergener</h2>
        <div className="chip-row">{activeAllergens.map((allergen) => <span className="chip" key={allergen.id}>{allergen.name}<button className="chip-remove" type="button" aria-label={`Fjern ${allergen.name}`} onClick={() => void removeAllergen(allergen)}>×</button></span>)}</div>
        <AddNameForm placeholder="Nyt allergen" buttonLabel="Tilføj allergen" onAdd={addAllergen} />
      </div>

      {activeCategories.map((category) => <CategoryBlock key={category.id} category={category} products={catalog.products.filter((product) => product.categoryId === category.id && product.isActive)} allergens={activeAllergens} onRemoveCategory={() => void removeCategory(category)} onSaveProduct={saveProduct} onRemoveProduct={removeProduct} onToggleAllergen={toggleProductAllergen} onAddProduct={(name, priceOre) => addProduct(category.id, name, priceOre)} onRemoveOption={removeOption} onAddOption={addOption} />)}

      <AddNameForm placeholder="Ny kategori" buttonLabel="+ Tilføj kategori" onAdd={addCategory} />

      <div className="admin-block">
        <h2>Tilbud</h2>
        {activeOffers.map((offer) => <OfferRow key={offer.id} offer={offer} onSave={saveOffer} onRemove={removeOffer} />)}
        <AddOfferForm onAdd={addOffer} />
      </div>
    </div>
  </>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track"><span className="toggle-knob" /></span>{label}</label>;
}

function ImageUploader({ imagePath, onUploaded, onRemove }: { imagePath: string; onUploaded: (url: string) => void; onRemove: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!response.ok) { setError((await response.json().catch(() => undefined))?.error ?? "Billedet kunne ikke uploades."); return; }
    const { url } = await response.json() as { url: string };
    onUploaded(url);
  }

  return <div className="image-uploader">
    {imagePath ? <Image src={imagePath} alt="" width={56} height={56} className="image-thumb" /> : <span className="image-thumb image-placeholder" aria-hidden="true" />}
    <div className="image-uploader-actions">
      <label className="image-upload-btn">{uploading ? "Uploader…" : "Billede"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void handleFile(event)} disabled={uploading} /></label>
      {imagePath && <button type="button" className="remove-link" onClick={onRemove}>Fjern billede</button>}
    </div>
    {error && <p className="field-error">{error}</p>}
  </div>;
}

function HoursForm({ hours, onSave }: { hours: RestaurantHours; onSave: (next: RestaurantHours) => Promise<void> }) {
  return <form className="add-row" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onSave({ opensAt: String(data.get("opensAt")), closesAt: String(data.get("closesAt")) }); }}>
    <label>Åbner <input name="opensAt" type="time" lang="da-DK" step={60} required defaultValue={hours.opensAt} /></label>
    <label>Lukker <input name="closesAt" type="time" lang="da-DK" step={60} required defaultValue={hours.closesAt} /></label>
    <button type="submit">Gem</button>
  </form>;
}

function AddNameForm({ placeholder, buttonLabel, onAdd }: { placeholder: string; buttonLabel: string; onAdd: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onAdd(name.trim());
    setSubmitting(false);
    if (ok) setName("");
  }
  return <form className="add-row" onSubmit={submit}><input className="grow" value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} maxLength={80} /><button type="submit" disabled={submitting}>{buttonLabel}</button></form>;
}

function AddOptionForm({ onAdd }: { onAdd: (name: string, priceDeltaOre: number) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceDeltaOre = Math.round(Number(price || "0") * 100);
    if (!name.trim() || !Number.isFinite(priceDeltaOre) || priceDeltaOre < 0 || submitting) return;
    setSubmitting(true);
    const ok = await onAdd(name.trim(), priceDeltaOre);
    setSubmitting(false);
    if (ok) { setName(""); setPrice(""); }
  }
  return <form className="add-row mini" onSubmit={submit}>
    <input className="grow" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nyt tilvalg" maxLength={80} />
    <input className="price-input" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Merpris" type="number" step="0.01" min="0" />
    <button type="submit" disabled={submitting}>+ Tilføj</button>
  </form>;
}

function AddOfferForm({ onAdd }: { onAdd: (title: string, badge: string, description: string, priceOre: number | null) => Promise<boolean> }) {
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceOre = price.trim() === "" ? null : Math.round(Number(price) * 100);
    if (!title.trim() || (priceOre !== null && (!Number.isFinite(priceOre) || priceOre < 0)) || submitting) return;
    setSubmitting(true);
    const ok = await onAdd(title.trim(), badge.trim(), description.trim(), priceOre);
    setSubmitting(false);
    if (ok) { setTitle(""); setBadge(""); setDescription(""); setPrice(""); }
  }
  return <form className="add-row" onSubmit={submit}>
    <input className="grow" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nyt tilbud" maxLength={120} />
    <input value={badge} onChange={(event) => setBadge(event.target.value)} placeholder="Mærke, fx Hverdage" maxLength={100} />
    <input className="grow" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Beskrivelse" maxLength={300} />
    <input className="price-input" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Pris (valgfri)" type="number" step="0.01" min="0" />
    <button type="submit" disabled={submitting}>+ Tilføj tilbud</button>
  </form>;
}

function CategoryBlock({ category, products, allergens, onRemoveCategory, onSaveProduct, onRemoveProduct, onToggleAllergen, onAddProduct, onRemoveOption, onAddOption }: {
  category: NamedRow;
  products: Product[];
  allergens: NamedRow[];
  onRemoveCategory: () => void;
  onSaveProduct: (id: string, fields: Partial<Pick<Product, "name" | "description" | "priceOre" | "imagePath" | "isSoldOut" | "isActive">>) => Promise<void>;
  onRemoveProduct: (product: Product) => Promise<void>;
  onToggleAllergen: (productId: string, allergenId: string, isActive: boolean) => Promise<void>;
  onAddProduct: (name: string, priceOre: number) => Promise<boolean>;
  onRemoveOption: (productId: string, option: ProductOptionRow) => Promise<void>;
  onAddOption: (productId: string, name: string, priceDeltaOre: number) => Promise<boolean>;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceOre = Math.round(Number(draftPrice) * 100);
    if (!draftName.trim() || !Number.isFinite(priceOre) || priceOre < 0 || submitting) return;
    setSubmitting(true);
    const ok = await onAddProduct(draftName.trim(), priceOre);
    setSubmitting(false);
    if (ok) { setDraftName(""); setDraftPrice(""); }
  }

  return <div className="category-group">
    <div className="category-group-header"><h2>{category.name}</h2><button className="remove-link" type="button" onClick={onRemoveCategory}>Fjern kategori</button></div>
    {products.map((product) => <ProductRow key={product.id} product={product} allergens={allergens} onSave={onSaveProduct} onRemove={onRemoveProduct} onToggleAllergen={onToggleAllergen} onRemoveOption={onRemoveOption} onAddOption={onAddOption} />)}
    <form className="add-row" onSubmit={submitProduct}>
      <input className="grow" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Navn på nyt menupunkt" maxLength={120} />
      <input className="price-input" value={draftPrice} onChange={(event) => setDraftPrice(event.target.value)} placeholder="Pris" type="number" step="0.01" min="0" />
      <button type="submit" disabled={submitting}>+ Tilføj menupunkt</button>
    </form>
  </div>;
}

function ProductRow({ product, allergens, onSave, onRemove, onToggleAllergen, onRemoveOption, onAddOption }: {
  product: Product;
  allergens: NamedRow[];
  onSave: (id: string, fields: Partial<Pick<Product, "name" | "description" | "priceOre" | "imagePath" | "isSoldOut" | "isActive">>) => Promise<void>;
  onRemove: (product: Product) => Promise<void>;
  onToggleAllergen: (productId: string, allergenId: string, isActive: boolean) => Promise<void>;
  onRemoveOption: (productId: string, option: ProductOptionRow) => Promise<void>;
  onAddOption: (productId: string, name: string, priceDeltaOre: number) => Promise<boolean>;
}) {
  const activeOptions = product.options.filter((option) => option.isActive);
  return <div className="product-row">
    <ImageUploader imagePath={product.imagePath} onUploaded={(url) => void onSave(product.id, { imagePath: url })} onRemove={() => void onSave(product.id, { imagePath: "" })} />
    <div className="product-main">
      <input className="product-name-input" defaultValue={product.name} aria-label={`Navn på ${product.name}`} onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== product.name) void onSave(product.id, { name: value }); else event.target.value = product.name; }} />
      <input className="product-desc-input" defaultValue={product.description} placeholder="Beskrivelse" aria-label={`Beskrivelse af ${product.name}`} onBlur={(event) => { const value = event.target.value.trim(); if (value !== product.description) void onSave(product.id, { description: value }); }} />
      <div className="chip-row">{allergens.map((allergen) => { const selected = product.allergenIds.includes(allergen.id); return <button key={allergen.id} type="button" className={`mini-chip${selected ? " selected" : ""}`} onClick={() => void onToggleAllergen(product.id, allergen.id, !selected)}>{allergen.name}</button>; })}</div>
      <div className="chip-row">{activeOptions.map((option) => <span className="chip" key={option.id}>{option.name}{option.priceDeltaOre > 0 ? ` +${(option.priceDeltaOre / 100).toFixed(2)} kr.` : ""}<button className="chip-remove" type="button" aria-label={`Fjern ${option.name}`} onClick={() => void onRemoveOption(product.id, option)}>×</button></span>)}</div>
      <AddOptionForm onAdd={(name, priceDeltaOre) => onAddOption(product.id, name, priceDeltaOre)} />
    </div>
    <div className="price-field"><input type="number" step="0.01" min="0" defaultValue={(product.priceOre / 100).toFixed(2)} aria-label={`Pris på ${product.name}`} onBlur={(event) => { const priceOre = Math.round(Number(event.target.value) * 100); if (Number.isFinite(priceOre) && priceOre >= 0 && priceOre !== product.priceOre) void onSave(product.id, { priceOre }); }} /><span>kr.</span></div>
    <Toggle checked={product.isSoldOut} onChange={(checked) => void onSave(product.id, { isSoldOut: checked })} label="Udsolgt" />
    <button className="remove-link" type="button" onClick={() => void onRemove(product)}>Fjern</button>
  </div>;
}

function OfferRow({ offer, onSave, onRemove }: { offer: Offer; onSave: (id: string, fields: Partial<Pick<Offer, "title" | "badge" | "description" | "imagePath" | "priceOre" | "isSoldOut" | "isActive">>) => Promise<void>; onRemove: (offer: Offer) => Promise<void> }) {
  return <div className="plain-row">
    <div className="plain-row-top">
      <ImageUploader imagePath={offer.imagePath} onUploaded={(url) => void onSave(offer.id, { imagePath: url })} onRemove={() => void onSave(offer.id, { imagePath: "" })} />
      <input defaultValue={offer.title} aria-label="Titel" onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== offer.title) void onSave(offer.id, { title: value }); }} />
      <div className="price-field"><input type="number" step="0.01" min="0" defaultValue={offer.priceOre === null ? "" : (offer.priceOre / 100).toFixed(2)} placeholder="Pris" aria-label="Pris" onBlur={(event) => { const raw = event.target.value.trim(); const priceOre = raw === "" ? null : Math.round(Number(raw) * 100); if ((priceOre === null || (Number.isFinite(priceOre) && priceOre >= 0)) && priceOre !== offer.priceOre) void onSave(offer.id, { priceOre }); }} /><span>kr.</span></div>
      <Toggle checked={offer.isSoldOut} onChange={(checked) => void onSave(offer.id, { isSoldOut: checked })} label="Udsolgt" />
      <Toggle checked={offer.isActive} onChange={(checked) => void onSave(offer.id, { isActive: checked })} label="Aktiv" />
      <button className="remove-link" type="button" onClick={() => void onRemove(offer)}>Fjern</button>
    </div>
    <input defaultValue={offer.badge} aria-label="Mærke" onBlur={(event) => { const value = event.target.value.trim(); if (value !== offer.badge) void onSave(offer.id, { badge: value }); }} />
    <input defaultValue={offer.description} aria-label="Beskrivelse" onBlur={(event) => { const value = event.target.value.trim(); if (value !== offer.description) void onSave(offer.id, { description: value }); }} />
  </div>;
}
