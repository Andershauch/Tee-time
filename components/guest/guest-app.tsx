"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Browser storage and polling are external state sources. */
/* eslint-disable @next/next/no-location-assign-relative-destination -- A full navigation clears client-only checkout state after a successful order. */

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { categories as fixtureCategories, offers as fixtureOffers, placementCopy, Placement, Product, products as fixtureProducts } from "@/lib/fixtures";
import { formatPrice } from "@/lib/format";
import type { OrderView } from "@/lib/order-types";

type CartLine = { productId: string; quantity: number; options: string[]; note: string };
type View = "home" | "menu" | "product" | "cart" | "checkout" | "confirmation" | "status" | "previous" | "previous-detail" | "offers";
type GuestMenuData = { categories: readonly string[]; products: Product[]; offers: Array<{ id: string; title: string; badge: string; description: string; imagePath?: string }> };

const storageKey = "tee-time-cart-v1";
const placementKey = "tee-time-placement-v1";
const orderTokensKey = "tee-time-order-tokens-v1";

function moveRadioSelection<T extends string | number>(event: React.KeyboardEvent<HTMLButtonElement>, values: readonly T[], current: T, onChoose: (value: T) => void) {
  const key = event.key;
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const vertical = key === "ArrowUp" || key === "ArrowDown";
  if (!horizontal && !vertical && key !== "Home" && key !== "End") return;
  event.preventDefault();
  const currentIndex = values.indexOf(current);
  const nextIndex = key === "Home" ? 0 : key === "End" ? values.length - 1 : (currentIndex + (key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1) + values.length) % values.length;
  onChoose(values[nextIndex]!);
  const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
  buttons?.[nextIndex]?.focus();
}

export function GuestApp({ view, productId, menuData }: { view: View; productId?: string; menuData?: GuestMenuData }) {
  const data = menuData ?? { categories: fixtureCategories, products: fixtureProducts, offers: fixtureOffers };
  const [cart, setCart] = useState<CartLine[]>([]);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      setCart(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as CartLine[]);
      const saved = window.localStorage.getItem(placementKey) as Placement | null;
      if (saved && saved in placementCopy) setPlacement(saved);
    } catch { setCart([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(storageKey, JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready && placement) window.localStorage.setItem(placementKey, placement); }, [placement, ready]);

  const detailedCart = useMemo(() => cart.flatMap((line) => {
    const product = data.products.find((item) => item.id === line.productId);
    if (!product) return [];
    const optionPrice = line.options.reduce((sum, option) => sum + (product.options?.find((item) => item.label === option)?.price ?? 0), 0);
    return [{ ...line, product, unitPrice: product.price + optionPrice }];
  }), [cart, data.products]);
  const total = detailedCart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const count = detailedCart.reduce((sum, line) => sum + line.quantity, 0);
  const compactHeaderViews: View[] = ["menu", "cart", "checkout", "previous"];
  const showBrandHeader = ["home", "product", "status"].includes(view);
  const showBottomNav = !["product", "cart", "checkout", "confirmation", "previous-detail"].includes(view);
  const addToCart = (line: CartLine) => { setCart((current) => [...current, line]); setToast("Lagt i kurven"); window.setTimeout(() => setToast(""), 2200); };

  let content: React.ReactNode;
  if (view === "home") content = <Home placement={placement} onChoose={setPlacement} />;
  else if (view === "menu") content = <Menu placement={placement} categories={data.categories} products={data.products} />;
  else if (view === "product") content = <ProductDetail product={data.products.find((item) => item.id === productId)} cartCount={count} onAdd={addToCart} />;
  else if (view === "cart") content = <Cart lines={detailedCart} total={total} onQuantity={(index, quantity) => setCart((current) => current.flatMap((line, lineIndex) => lineIndex === index ? (quantity > 0 ? [{ ...line, quantity }] : []) : [line]))} />;
  else if (view === "checkout") content = <Checkout placement={placement} lines={detailedCart} total={total} onOrderCreated={() => setCart([])} />;
  else if (view === "confirmation") content = <Confirmation />;
  else if (view === "status") content = <Status />;
  else if (view === "previous") content = <SessionPrevious />;
  else if (view === "previous-detail") content = <SecurePreviousDetail />;
  else content = <Offers offers={data.offers} />;

  return <div className="guest-app"><a className="skip-link" href="#main-content">Spring til indhold</a>{showBrandHeader && <BrandHeader />}{compactHeaderViews.includes(view) && <ScreenHeader view={view} cartCount={count} />}<main id="main-content" tabIndex={-1} className="page-content">{content}</main>{showBottomNav && <BottomNav active={view} placement={placement} />}<div className="toast" aria-live="polite">{toast}</div></div>;
}

function BrandHeader() { return <header className="app-header"><Link href="/" className="brand" aria-label="Tee-Time forside"><Image src="/images/tee-time-logo.png" alt="" width={38} height={38} priority /><span>Tee-Time<small>Roskilde Golf Restaurant</small></span></Link></header>; }
function Home({ placement, onChoose }: { placement: Placement | null; onChoose: (placement: Placement) => void }) { const choices = Object.keys(placementCopy) as Placement[]; return <><div className="hero"><Image src="/images/golf-restaurant-terrasse.jpg" alt="Terrassen ved golfrestauranten" fill priority sizes="(max-width: 600px) 100vw, 480px" /></div><section className="intro"><h1>Hvor er du?</h1><p>Så viser vi de rigtige muligheder for afhentning eller levering.</p><div className="placement-list" role="radiogroup" aria-label="Vælg din placering">{choices.map((key, index) => <button key={key} role="radio" aria-checked={placement === key} tabIndex={placement === key || (!placement && index === 0) ? 0 : -1} className={`placement-card ${placement === key ? "selected" : ""}`} onKeyDown={(event) => moveRadioSelection(event, choices, key, onChoose)} onClick={() => onChoose(key)}><span className={`placement-mark ${key}`} aria-hidden="true" /><span><strong>{placementCopy[key].title}</strong><small>{placementCopy[key].description}</small></span><span className="check" aria-hidden="true">{placement === key ? "✓" : ""}</span></button>)}</div>{placement ? <Link className="button button-primary" href="/menu">Se menuen</Link> : <p className="hint">Vælg først, hvor du er.</p>}</section></>; }
function Menu({ placement, categories, products }: { placement: Placement | null; categories: readonly string[]; products: Product[] }) { const [activeCategory, setActiveCategory] = useState(categories[0] ?? ""); return <section><PageHeading eyebrow={placement ? placementCopy[placement].title : "Vælg placering på forsiden"} title="" text="Bestil, når det passer ind i din runde." /><nav className="category-tabs" aria-label="Menukategorier">{categories.map((category) => <button key={category} aria-pressed={activeCategory === category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</nav><div className="product-list">{products.filter((product) => product.category === activeCategory).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>; }
function ProductCard({ product }: { product: Product }) { const body = <><Image className="product-image" src={product.imagePath ?? `/images/produktbilleder/produkter/${product.id}.webp`} alt="" width={92} height={92} /><span className="product-copy"><strong>{product.name}</strong><span>{product.description}</span><span className="chips">{product.allergens.map((allergen) => <i key={allergen}>{allergen}</i>)}</span><b>{formatPrice(product.price)}</b></span></>; return product.soldOut ? <div className="product-card sold-out" aria-label={`${product.name}, udsolgt`}>{body}<em>Udsolgt</em></div> : <Link href={`/menu/${product.id}`} className="product-card">{body}</Link>; }
function ProductDetail({ product, cartCount, onAdd }: { product?: Product; cartCount: number; onAdd: (line: CartLine) => void }) { const [quantity, setQuantity] = useState(1); const [selectedOptions, setSelectedOptions] = useState<string[]>([]); const [note, setNote] = useState(""); if (!product) return <PageHeading title="Produktet findes ikke" text="Vælg et produkt fra menuen." />; const price = product.price + selectedOptions.reduce((sum, option) => sum + (product.options?.find((item) => item.label === option)?.price ?? 0), 0); return <section><div className="product-top"><Link className="back-link" href="/menu">← Tilbage til menuen</Link><Link className="cart-link" href="/kurv" aria-label={`Kurv med ${cartCount} varer`}>Kurv <span aria-hidden="true">{cartCount}</span></Link></div><Image className="detail-image" src={product.imagePath ?? `/images/produktbilleder/produkter/${product.id}.webp`} alt={product.name} width={640} height={420} priority /><PageHeading title={product.name} text={product.description} /><p className="price">{formatPrice(product.price)}</p><div className="chips large">{product.allergens.map((allergen) => <i key={allergen}>{allergen}</i>)}</div>{product.options && <fieldset className="options"><legend>Gør den til din egen</legend>{product.options.map((option) => <label key={option.label}><input type="checkbox" checked={selectedOptions.includes(option.label)} onChange={() => setSelectedOptions((current) => current.includes(option.label) ? current.filter((item) => item !== option.label) : [...current, option.label])} />{option.label}<span>{option.price ? `+${formatPrice(option.price)}` : "Uden merpris"}</span></label>)}</fieldset>}<label className="field-label" htmlFor="note">Bemærkning <small>valgfrit</small></label><textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={160} placeholder="Fx uden bestik" /><div className="add-bar"><Quantity value={quantity} onChange={setQuantity} /><button className="button button-primary" onClick={() => onAdd({ productId: product.id, quantity, options: selectedOptions, note })}>Læg i kurv · {formatPrice(price * quantity)}</button></div></section>; }
function Cart({ lines, total, onQuantity }: { lines: Array<CartLine & { product: Product; unitPrice: number }>; total: number; onQuantity: (index: number, quantity: number) => void }) { return <section><PageHeading title="" text="Gennemgå din bestilling, før du fortsætter." />{lines.length === 0 ? <EmptyCart /> : <><div className="cart-list">{lines.map((line, index) => <article key={`${line.productId}-${index}`} className="cart-line"><div><strong>{line.product.name}</strong>{line.options.length > 0 && <small>{line.options.join(", ")}</small>}{line.note && <small>“{line.note}”</small>}<b>{formatPrice(line.unitPrice * line.quantity)}</b></div><Quantity value={line.quantity} onChange={(quantity) => onQuantity(index, quantity)} /></article>)}</div><OrderSummary total={total} /><Link href="/bestilling" className="button button-primary sticky-action">Fortsæt til bestilling</Link></>}</section>; }

function Checkout({ placement, lines, total, onOrderCreated }: { placement: Placement | null; lines: Array<CartLine & { product: Product; unitPrice: number }>; total: number; onOrderCreated: () => void }) { const [requestedMinutes, setRequestedMinutes] = useState<15 | 30 | 45 | null>(null); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(""); const idempotencyKey = useRef(""); const timeChoices = [15, 30, 45] as const; async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!placement || !requestedMinutes || submitting) return; setSubmitting(true); setError(""); if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID(); const form = new FormData(event.currentTarget); const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ idempotencyKey: idempotencyKey.current, placement, requestedMinutes, locationDetail: form.get("locationDetail") ?? "", customerName: form.get("customerName"), phone: form.get("phone") ?? "", lines: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, options: line.options, note: line.note })) }) }).catch(() => undefined); if (!response?.ok) { setError((await response?.json().catch(() => undefined))?.error ?? "Ordren kunne ikke sendes. Prøv igen."); setSubmitting(false); return; } const created = await response.json() as { token: string }; const tokens = JSON.parse(window.localStorage.getItem(orderTokensKey) ?? "[]") as string[]; window.localStorage.setItem(orderTokensKey, JSON.stringify([...new Set([created.token, ...tokens])].slice(0, 20))); window.localStorage.removeItem(storageKey); onOrderCreated(); window.location.assign(`/ordre/bekraeftelse#${created.token}`); } return <section><PageHeading title="" text="Din ordre sendes til restauranten, som først skal godkende den." />{lines.length === 0 ? <EmptyCart /> : <form onSubmit={submit} className="checkout-form"><fieldset><legend>Afhentning eller levering</legend><p className="selected-location">{placement ? placementCopy[placement].title : "Ingen placering valgt"}</p>{placement === "terrasse" && <label>Terrassebord eller område<input required name="locationDetail" placeholder="Fx bord 12" /></label>}<span className="field-label">Ønsket tidspunkt</span><div className="time-chips" role="radiogroup" aria-label="Ønsket tidspunkt">{timeChoices.map((minutes, index) => <button type="button" role="radio" aria-checked={requestedMinutes === minutes} tabIndex={requestedMinutes === minutes || (!requestedMinutes && index === 0) ? 0 : -1} className={requestedMinutes === minutes ? "selected" : ""} key={minutes} onKeyDown={(event) => moveRadioSelection(event, timeChoices, minutes, setRequestedMinutes)} onClick={() => setRequestedMinutes(minutes)}>{minutes} minutter</button>)}</div>{!requestedMinutes && <p className="form-hint">Vælg et tidspunkt før du bekræfter.</p>}</fieldset><fieldset><legend>Dine oplysninger</legend><label>Navn<input required name="customerName" autoComplete="name" placeholder="Dit navn" /></label>{placement === "bane" && <label>Mobilnummer<input required name="phone" inputMode="tel" autoComplete="tel" placeholder="Dit mobilnummer" /></label>}</fieldset><OrderSummary total={total} />{error && <p className="form-hint" role="alert">{error}</p>}<button className="button button-primary sticky-action" type="submit" disabled={!requestedMinutes || !placement || submitting}>{submitting ? "Sender ordre…" : "Send ordre til restauranten"}</button></form>}</section>; }
function readStatusToken() { if (typeof window === "undefined") return undefined; const token = window.location.hash.slice(1); return /^[A-Za-z0-9_-]{32,}$/.test(token) ? token : undefined; }
function Confirmation() { const headingRef = useRef<HTMLHeadingElement>(null); const [token, setToken] = useState<string>(); useEffect(() => { headingRef.current?.focus(); setToken(readStatusToken()); }, []); return <section className="confirmation"><span className="success-icon" aria-hidden="true">✓</span><header className="page-heading"><h1 tabIndex={-1} ref={headingRef}>Din ordre er modtaget</h1><p role="status">Restauranten gennemgår den nu. Du kan følge status på dette personlige link.</p></header>{token && <Link href={`/ordre#${token}`} className="button button-primary">Se ordrestatus</Link>}<Link href="/menu" className="button button-secondary">Tilbage til menuen</Link></section>; }
function Status() {
  const [token, setToken] = useState<string>();
  const [order, setOrder] = useState<OrderView>();
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => setToken(readStatusToken()), []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ token }) });
      if (!response.ok) { if (active) setError("Ordren blev ikke fundet."); return; }
      const next = await response.json() as OrderView;
      if (!active) return;
      setOrder((previous) => {
        if (previous && previous.status !== next.status) setAnnouncement(`Ordre ${next.orderNumber} er nu ${labels[next.status].toLowerCase()}.`);
        return next;
      });
      setError("");
    };
    void load();
    const timer = window.setInterval(() => void load(), 7500);
    return () => { active = false; window.clearInterval(timer); };
  }, [token]);
  if (!token) return <section><PageHeading title="Ordren blev ikke fundet" text="Ordren blev ikke fundet." /></section>;
  if (error) return <section><PageHeading title="Ordren blev ikke fundet" text={error} /></section>;
  if (!order) return <section><PageHeading title="Henter ordrestatus" text="Vent et øjeblik…" /></section>;
  const progress = order.status === "rejected" ? [["Modtaget", true], ["Afvist", true]] : [["Modtaget", true], ["Godkendt", order.status !== "received"], ["Tilberedes", ["preparing", "ready", "delivering", "completed"].includes(order.status)], [order.placement === "terrasse" ? "Leveres" : "Klar", ["ready", "delivering", "completed"].includes(order.status)]];
  return <section><PageHeading title="Din ordre" text={`${order.orderNumber} · ${labels[order.status]}`} /><p className="sr-only" aria-live="polite">{announcement}</p><OrderLines order={order} /><ol className="status-list">{progress.map(([label, done], index) => <li className={done ? "done" : ""} key={String(label)}><span>{done ? "✓" : index + 1}</span><div><strong>{label}</strong></div></li>)}</ol><p className="notice" role="status">Status opdateres automatisk.</p></section>;
}

const labels: Record<OrderView["status"], string> = { received: "Modtaget", approved: "Godkendt", rejected: "Afvist", preparing: "Tilberedes", ready: "Klar", delivering: "Leveres", completed: "Afsluttet" };
function OrderLines({ order }: { order: OrderView }) { return <div className="status-order-card">{order.items.map((item) => <span key={item.id}>{item.productName}{item.options.length ? ` · ${item.options.map((option) => option.name).join(", ")}` : ""}<b>{formatPrice(((item.unitPriceOre + item.options.reduce((sum, option) => sum + option.priceDeltaOre, 0)) * item.quantity) / 100)}</b></span>)}<strong>Total <b>{formatPrice(order.totalOre / 100)}</b></strong></div>; }
function Offers({ offers }: { offers: GuestMenuData["offers"] }) { return <section><PageHeading title="Tilbud" text="Lidt ekstra godt efter runden." /><div className="offer-list">{offers.map((offer) => <article className="offer-card" key={offer.id}><Image src={offer.imagePath ?? `/images/produktbilleder/tilbud/${offer.id}.webp`} alt="" width={640} height={360} /><div><small>{offer.badge}</small><h2>{offer.title}</h2><p>{offer.description}</p><Link href="/menu" className="button button-secondary">Bestil nu</Link></div></article>)}</div></section>; }
function PageHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) { return <header className="page-heading">{eyebrow && <small>{eyebrow}</small>}{title && <h1>{title}</h1>}{text && <p>{text}</p>}</header>; }
function OrderSummary({ total }: { total: number }) { return <><div className="order-summary"><span>Varer <b>{formatPrice(total)}</b></span><span>Betaling <b>Ved afhentning</b></span><strong>Total <b>{formatPrice(total)}</b></strong></div><p className="privacy-link">Når du sender ordren, accepterer du vores <Link href="/databeskyttelse">databeskyttelse</Link>.</p></>; }
function EmptyCart() { return <div className="empty-state"><h2>Kurven er tom</h2><p>Vælg noget fra menuen, når du er klar.</p><Link href="/menu" className="button button-secondary">Se menuen</Link></div>; }
function Quantity({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <div className="quantity" aria-label={`Antal: ${value}`}><button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Fjern én">−</button><span aria-live="polite">{value}</span><button type="button" onClick={() => onChange(value + 1)} aria-label="Tilføj én">+</button></div>; }
function ScreenHeader({ view, cartCount }: { view: View; cartCount: number }) { const config = { menu: { title: "Menu", back: "/" }, cart: { title: "Kurv", back: "/menu" }, checkout: { title: "Bestilling", back: "/kurv" }, previous: { title: "Tidligere", back: "/" } }[view as "menu" | "cart" | "checkout" | "previous"]; return <header className="screen-header"><Link href={config.back} aria-label="Gå tilbage">←</Link><h1>{config.title}</h1>{view !== "cart" && view !== "checkout" ? <Link href="/kurv" aria-label={`Kurv med ${cartCount} varer`}>Kurv <span>{cartCount}</span></Link> : <span aria-hidden="true" />}</header>; }
function BottomNav({ active, placement }: { active: View; placement: Placement | null }) { const menuHref = placement ? "/menu" : "/"; const links = [{ label: "Hjem", href: "/", active: active === "home" }, { label: "Menu", href: menuHref, active: ["menu", "product", "cart", "checkout"].includes(active) }, { label: "Tidligere", href: "/tidligere", active: ["previous", "previous-detail"].includes(active) }, { label: "Tilbud", href: "/tilbud", active: active === "offers" }]; return <nav className="bottom-nav" aria-label="Hovednavigation">{links.map((link) => <Link key={link.label} className={link.active ? "active" : ""} aria-current={link.active ? "page" : undefined} href={link.href}>{link.label}</Link>)}</nav>; }

function SessionPrevious() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  useEffect(() => {
    void fetch("/api/orders/history", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ orders: OrderView[] }> : { orders: [] }).then((data) => setOrders(data.orders));
    const savedTokens = JSON.parse(window.localStorage.getItem(orderTokensKey) ?? "[]") as string[];
    void Promise.all(savedTokens.map(async (token) => { const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ token }) }); return response.ok ? { token, orderNumber: (await response.json() as OrderView).orderNumber } : undefined; })).then((rows) => setTokens(Object.fromEntries(rows.filter((row): row is { token: string; orderNumber: string } => Boolean(row)).map((row) => [row.orderNumber, row.token]))));
  }, []);
  return <section><PageHeading title="Tidligere bestillinger" text="Vises kun på denne enhed." />{orders.length === 0 ? <div className="empty-state"><p>Du har endnu ingen tidligere bestillinger på denne enhed.</p><Link href="/menu" className="button button-secondary">Se menuen</Link></div> : orders.map((order) => { const token = tokens[order.orderNumber]; const body = <><span><strong>{order.orderNumber} · {placementCopy[order.placement].title}</strong><small>{order.items.map((item) => item.productName).join(", ")}</small></span><span><b>{formatPrice(order.totalOre / 100)}</b><small>{order.status} →</small></span></>; return token ? <Link className="previous-card" key={order.orderNumber} href={`/tidligere/status#${token}`}>{body}</Link> : <article className="previous-card" key={order.orderNumber}>{body}</article>; })}</section>;
}

function SecurePreviousDetail() {
  const [token, setToken] = useState<string>();
  const [message, setMessage] = useState("");
  const [reordering, setReordering] = useState(false);
  useEffect(() => setToken(readStatusToken()), []);
  async function reorder() {
    if (!token || reordering) return;
    setReordering(true); setMessage("");
    const response = await fetch("/api/orders/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ token }) }).catch(() => undefined);
    if (!response?.ok) { setMessage("Genbestilling kunne ikke forberedes."); setReordering(false); return; }
    const result = await response.json() as { lines: CartLine[]; unavailable: string[] };
    if (result.lines.length) window.localStorage.setItem(storageKey, JSON.stringify(result.lines));
    if (result.unavailable.length) { setMessage(`Ikke længere tilgængelig: ${result.unavailable.join(", ")}.`); setReordering(false); return; }
    window.location.assign("/kurv");
  }
  return <section><Link className="back-link" href="/tidligere">← Tidligere bestillinger</Link><Status /><button className="button button-primary" type="button" onClick={() => void reorder()} disabled={!token || reordering}>{reordering ? "Forbereder…" : "Genbestil med aktuelle priser"}</button>{message && <p className="form-hint" role="status">{message}</p>}</section>;
}
