"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Browser storage and polling are external state sources. */
/* eslint-disable @next/next/no-location-assign-relative-destination -- A full navigation clears client-only checkout state after a successful order. */

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { categories as fixtureCategories, defaultRestaurantHours, Offer, offers as fixtureOffers, Product, products as fixtureProducts } from "@/lib/fixtures";
import { formatPrice } from "@/lib/format";
import { isValidPhone } from "@/lib/phone";
import { minLeadMinutes, timeOfDayToDate, useTimeSlots, type RestaurantHours } from "@/lib/time-slots";
import type { OrderView } from "@/lib/order-types";

type CartLine = { productId: string; quantity: number; options: string[]; note: string };
type View = "home" | "menu" | "product" | "cart" | "checkout" | "confirmation" | "status" | "previous" | "previous-detail" | "offers";
type GuestMenuData = { categories: readonly string[]; products: Product[]; offers: Offer[]; hours: RestaurantHours };

const storageKey = "tee-time-cart-v1";
const orderTokensKey = "tee-time-order-tokens-v1";

type CheckoutFieldErrors = { customerName?: string; phone?: string; requestedTime?: string };

/** "" means an admin explicitly removed the image; undefined (fixture data) falls back to the by-id convention. */
function resolveImagePath(imagePath: string | undefined, derivedPath: string) {
  if (imagePath === "") return undefined;
  return imagePath ?? derivedPath;
}

export function GuestApp({ view, productId, menuData }: { view: View; productId?: string; menuData?: GuestMenuData }) {
  const data = menuData ?? { categories: fixtureCategories, products: fixtureProducts, offers: fixtureOffers, hours: defaultRestaurantHours };
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      setCart(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as CartLine[]);
    } catch { setCart([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(storageKey, JSON.stringify(cart)); }, [cart, ready]);

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
  if (view === "home") content = <Home />;
  else if (view === "menu") content = <Menu categories={data.categories} products={data.products} />;
  else if (view === "product") content = <ProductDetail product={data.products.find((item) => item.id === productId)} cartCount={count} onAdd={addToCart} />;
  else if (view === "cart") content = <Cart lines={detailedCart} total={total} onQuantity={(index, quantity) => setCart((current) => current.flatMap((line, lineIndex) => lineIndex === index ? (quantity > 0 ? [{ ...line, quantity }] : []) : [line]))} />;
  else if (view === "checkout") content = <Checkout hours={data.hours} lines={detailedCart} total={total} onOrderCreated={() => setCart([])} />;
  else if (view === "confirmation") content = <Confirmation />;
  else if (view === "status") content = <Status />;
  else if (view === "previous") content = <SessionPrevious />;
  else if (view === "previous-detail") content = <SecurePreviousDetail />;
  else content = <Offers offers={data.offers} />;

  return <div className="guest-app"><a className="skip-link" href="#main-content">Spring til indhold</a>{showBrandHeader && <BrandHeader />}{compactHeaderViews.includes(view) && <ScreenHeader view={view} cartCount={count} />}<main id="main-content" tabIndex={-1} className="page-content">{content}</main>{showBottomNav && <BottomNav active={view} />}<div className="toast" aria-live="polite">{toast}</div></div>;
}

function BrandHeader() { return <header className="app-header"><Link href="/" className="brand" aria-label="Tee-Time forside"><Image className="brand-logo" src="/images/tee-time-logo.png" alt="" width={50} height={50} priority /><span>Tee-Time<small>Roskilde Golf Restaurant</small></span></Link></header>; }
function Home() { return <><div className="hero"><Image src="/images/golf-restaurant-terrasse.jpg" alt="Terrassen ved golfrestauranten" fill priority sizes="(max-width: 600px) 100vw, 480px" /></div><section className="intro"><h1>Banebestilling</h1><p>Bestil mad og drikke fra banen. Vi har det klar til det tidspunkt, du vælger.</p><Link className="button button-primary" href="/menu">Bestil</Link></section></>; }
function Menu({ categories, products }: { categories: readonly string[]; products: Product[] }) { const [activeCategory, setActiveCategory] = useState(categories[0] ?? ""); return <section><PageHeading title="" text="Bestil, når det passer ind i din runde." /><nav className="category-tabs" aria-label="Menukategorier">{categories.map((category) => <button key={category} aria-pressed={activeCategory === category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</nav><div className="product-list">{products.filter((product) => product.category === activeCategory).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>; }
function ProductCard({ product }: { product: Product }) { const src = resolveImagePath(product.imagePath, `/images/produktbilleder/produkter/${product.id}.webp`); const body = <>{src ? <Image className="product-image" src={src} alt="" width={92} height={92} /> : <span className="product-image image-placeholder" aria-hidden="true" />}<span className="product-copy"><strong>{product.name}</strong><span>{product.description}</span><span className="chips">{product.allergens.map((allergen) => <i key={allergen}>{allergen}</i>)}</span><b>{formatPrice(product.price)}</b></span></>; return product.soldOut ? <div className="product-card sold-out" aria-label={`${product.name}, udsolgt`}>{body}<em>Udsolgt</em></div> : <Link href={`/menu/${product.id}`} className="product-card">{body}</Link>; }
function ProductDetail({ product, cartCount, onAdd }: { product?: Product; cartCount: number; onAdd: (line: CartLine) => void }) { const [quantity, setQuantity] = useState(1); const [selectedOptions, setSelectedOptions] = useState<string[]>([]); const [note, setNote] = useState(""); if (!product) return <PageHeading title="Produktet findes ikke" text="Vælg et produkt fra menuen." />; const price = product.price + selectedOptions.reduce((sum, option) => sum + (product.options?.find((item) => item.label === option)?.price ?? 0), 0); const src = resolveImagePath(product.imagePath, `/images/produktbilleder/produkter/${product.id}.webp`); return <section><div className="product-top"><Link className="back-link" href="/menu">← Tilbage til menuen</Link><Link className="cart-link" href="/kurv" aria-label={`Kurv med ${cartCount} varer`}>Kurv <span aria-hidden="true">{cartCount}</span></Link></div>{src ? <Image className="detail-image" src={src} alt={product.name} width={640} height={420} priority /> : <div className="detail-image image-placeholder" aria-hidden="true" />}<PageHeading title={product.name} text={product.description} /><p className="price">{formatPrice(product.price)}</p><div className="chips large">{product.allergens.map((allergen) => <i key={allergen}>{allergen}</i>)}</div>{product.options && product.options.length > 0 && <fieldset className="options"><legend>Gør den til din egen</legend>{product.options.map((option) => <label key={option.label}><input type="checkbox" checked={selectedOptions.includes(option.label)} onChange={() => setSelectedOptions((current) => current.includes(option.label) ? current.filter((item) => item !== option.label) : [...current, option.label])} />{option.label}<span>{option.price ? `+${formatPrice(option.price)}` : "Uden merpris"}</span></label>)}</fieldset>}<label className="field-label" htmlFor="note">Bemærkning <small>valgfrit</small></label><textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={160} placeholder="Fx uden bestik" /><div className="add-bar"><Quantity value={quantity} onChange={setQuantity} /><button className="button button-primary" onClick={() => onAdd({ productId: product.id, quantity, options: selectedOptions, note })}>Læg i kurv · {formatPrice(price * quantity)}</button></div></section>; }
function Cart({ lines, total, onQuantity }: { lines: Array<CartLine & { product: Product; unitPrice: number }>; total: number; onQuantity: (index: number, quantity: number) => void }) { return <section><PageHeading title="" text="Gennemgå din bestilling, før du fortsætter." />{lines.length === 0 ? <EmptyCart /> : <><div className="cart-list">{lines.map((line, index) => <article key={`${line.productId}-${index}`} className="cart-line"><div><strong>{line.product.name}</strong>{line.options.length > 0 && <small>{line.options.join(", ")}</small>}{line.note && <small>“{line.note}”</small>}<b>{formatPrice(line.unitPrice * line.quantity)}</b></div><Quantity value={line.quantity} onChange={(quantity) => onQuantity(index, quantity)} /></article>)}</div><OrderSummary total={total} /><Link href="/bestilling" className="button button-primary sticky-action">Fortsæt til bestilling</Link></>}</section>; }

function Checkout({ hours, lines, total, onOrderCreated }: { hours: RestaurantHours; lines: Array<CartLine & { product: Product; unitPrice: number }>; total: number; onOrderCreated: () => void }) {
  const [requestedTime, setRequestedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const idempotencyKey = useRef("");
  const { minTime, slots: timeSlots } = useTimeSlots(hours);
  const closedForToday = minTime !== "" && timeSlots.length === 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("customerName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();

    const nextFieldErrors: CheckoutFieldErrors = {};
    if (customerName.length < 2) nextFieldErrors.customerName = "Skriv dit fulde navn.";
    if (!isValidPhone(phone)) nextFieldErrors.phone = "Skriv et gyldigt mobilnummer, fx 12345678.";
    if (!requestedTime) nextFieldErrors.requestedTime = "Vælg et tidspunkt.";

    let requestedMinutes = 0;
    if (requestedTime) {
      requestedMinutes = Math.round((timeOfDayToDate(requestedTime).getTime() - Date.now()) / 60_000);
      if (requestedMinutes < minLeadMinutes) nextFieldErrors.requestedTime = `Vælg et tidspunkt mindst ${minLeadMinutes} minutter fra nu.`;
    }

    if (Object.keys(nextFieldErrors).length > 0) { setFieldErrors(nextFieldErrors); return; }
    setFieldErrors({});
    setSubmitting(true);
    setError("");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ idempotencyKey: idempotencyKey.current, placement: "bane", requestedMinutes, locationDetail: "", customerName, phone, lines: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, options: line.options, note: line.note })) }) }).catch(() => undefined);
    if (!response?.ok) { setError((await response?.json().catch(() => undefined))?.error ?? "Ordren kunne ikke sendes. Prøv igen."); setSubmitting(false); return; }
    const created = await response.json() as { token: string };
    const tokens = JSON.parse(window.localStorage.getItem(orderTokensKey) ?? "[]") as string[];
    window.localStorage.setItem(orderTokensKey, JSON.stringify([...new Set([created.token, ...tokens])].slice(0, 20)));
    window.localStorage.removeItem(storageKey);
    onOrderCreated();
    window.location.assign(`/ordre/bekraeftelse#${created.token}`);
  }

  return <section><PageHeading title="" text="Din ordre sendes til restauranten, som først skal godkende den." />
    {lines.length === 0 ? <EmptyCart /> : closedForToday ? <div className="empty-state"><h2>Lukket for bestillinger</h2><p>Vi holder åbent kl. {hours.opensAt}–{hours.closesAt}. Prøv igen inden for åbningstiden.</p></div> : <form onSubmit={submit} noValidate className="checkout-form">
      <fieldset>
        <legend>Ønsket tidspunkt</legend>
        <label>Tidspunkt<select required value={requestedTime} aria-invalid={Boolean(fieldErrors.requestedTime)} aria-describedby={fieldErrors.requestedTime ? "requestedTime-error" : undefined} onChange={(event) => { setRequestedTime(event.target.value); setFieldErrors((current) => ({ ...current, requestedTime: undefined })); }}><option value="" disabled>Vælg tidspunkt</option>{timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
        {fieldErrors.requestedTime && <p className="field-error" id="requestedTime-error" role="alert">{fieldErrors.requestedTime}</p>}
      </fieldset>
      <fieldset>
        <legend>Dine oplysninger</legend>
        <label>Navn<input required name="customerName" autoComplete="name" placeholder="Dit navn" aria-invalid={Boolean(fieldErrors.customerName)} aria-describedby={fieldErrors.customerName ? "customerName-error" : undefined} onChange={() => setFieldErrors((current) => ({ ...current, customerName: undefined }))} /></label>
        {fieldErrors.customerName && <p className="field-error" id="customerName-error" role="alert">{fieldErrors.customerName}</p>}
        <label>Mobilnummer<input required name="phone" inputMode="tel" autoComplete="tel" placeholder="Dit mobilnummer" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} onChange={() => setFieldErrors((current) => ({ ...current, phone: undefined }))} /></label>
        {fieldErrors.phone && <p className="field-error" id="phone-error" role="alert">{fieldErrors.phone}</p>}
      </fieldset>
      <OrderSummary total={total} />
      {error && <p className="form-hint" role="alert">{error}</p>}
      <button className="button button-primary sticky-action" type="submit" disabled={submitting}>{submitting ? "Sender ordre…" : "Send ordre til restauranten"}</button>
    </form>}
  </section>;
}
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
        if (previous && previous.status !== next.status) setAnnouncement(statusMessage(next));
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
  return <section><PageHeading title="Din ordre" text={order.orderNumber} /><p className="sr-only" aria-live="polite">{announcement}</p><OrderLines order={order} /><p className="notice" role="status">{statusMessage(order)}</p></section>;
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function statusMessage(order: OrderView) {
  if (order.status === "rejected") return "Din ordre er desværre blevet afvist.";
  if (order.status === "received") return "Restauranten har modtaget din ordre og gennemgår den nu.";
  const pickupTime = order.approvedFor ?? order.requestedFor;
  return `Din bestilling er i gang med at blive lavet. Du kan hente den i baren kl. ${formatClock(pickupTime)}.`;
}

const statusLabels: Record<OrderView["status"], string> = { received: "Modtaget", approved: "Godkendt", rejected: "Afvist", preparing: "Godkendt", ready: "Godkendt", delivering: "Godkendt", completed: "Godkendt" };
function OrderLines({ order }: { order: OrderView }) { return <div className="status-order-card">{order.items.map((item) => <span key={item.id}>{item.productName}{item.options.length ? ` · ${item.options.map((option) => option.name).join(", ")}` : ""}<b>{formatPrice(((item.unitPriceOre + item.options.reduce((sum, option) => sum + option.priceDeltaOre, 0)) * item.quantity) / 100)}</b></span>)}<strong>Total <b>{formatPrice(order.totalOre / 100)}</b></strong></div>; }
function Offers({ offers }: { offers: GuestMenuData["offers"] }) { return <section><PageHeading title="Tilbud" text="Lidt ekstra godt efter runden." /><div className="offer-list">{offers.map((offer) => { const src = resolveImagePath(offer.imagePath, `/images/produktbilleder/tilbud/${offer.id}.webp`); return <article className={`offer-card${offer.soldOut ? " sold-out" : ""}`} key={offer.id}>{src ? <Image src={src} alt="" width={640} height={360} /> : <div className="offer-image image-placeholder" aria-hidden="true" />}{offer.soldOut && <em>Udsolgt</em>}<div><small>{offer.badge}</small><h2>{offer.title}</h2><p>{offer.description}</p>{typeof offer.price === "number" && <b className="offer-price">{formatPrice(offer.price)}</b>}{offer.soldOut ? <span className="button button-secondary offer-sold-out-button" aria-disabled="true">Udsolgt</span> : <Link href={offer.orderSlug ? `/menu/${offer.orderSlug}` : "/menu"} className="button button-secondary">Bestil nu</Link>}</div></article>; })}</div></section>; }
function PageHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) { return <header className="page-heading">{eyebrow && <small>{eyebrow}</small>}{title && <h1>{title}</h1>}{text && <p>{text}</p>}</header>; }
function OrderSummary({ total }: { total: number }) { return <><div className="order-summary"><span>Varer <b>{formatPrice(total)}</b></span><span>Betaling <b>Ved afhentning</b></span><strong>Total <b>{formatPrice(total)}</b></strong></div><p className="privacy-link">Når du sender ordren, accepterer du vores <Link href="/databeskyttelse">databeskyttelse</Link>.</p></>; }
function EmptyCart() { return <div className="empty-state"><h2>Kurven er tom</h2><p>Vælg noget fra menuen, når du er klar.</p><Link href="/menu" className="button button-secondary">Se menuen</Link></div>; }
function Quantity({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <div className="quantity" aria-label={`Antal: ${value}`}><button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Fjern én">−</button><span aria-live="polite">{value}</span><button type="button" onClick={() => onChange(value + 1)} aria-label="Tilføj én">+</button></div>; }
function ScreenHeader({ view, cartCount }: { view: View; cartCount: number }) { const config = { menu: { title: "Menu", back: "/" }, cart: { title: "Kurv", back: "/menu" }, checkout: { title: "Bestilling", back: "/kurv" }, previous: { title: "Tidligere", back: "/" } }[view as "menu" | "cart" | "checkout" | "previous"]; return <header className="screen-header"><Link href={config.back} aria-label="Gå tilbage">←</Link><h1>{config.title}</h1>{view !== "cart" && view !== "checkout" ? <Link href="/kurv" aria-label={`Kurv med ${cartCount} varer`}>Kurv <span>{cartCount}</span></Link> : <span aria-hidden="true" />}</header>; }
function BottomNav({ active }: { active: View }) { const links = [{ label: "Hjem", href: "/", active: active === "home" }, { label: "Menu", href: "/menu", active: ["menu", "product", "cart", "checkout"].includes(active) }, { label: "Tidligere", href: "/tidligere", active: ["previous", "previous-detail"].includes(active) }, { label: "Tilbud", href: "/tilbud", active: active === "offers" }]; return <nav className="bottom-nav" aria-label="Hovednavigation">{links.map((link) => <Link key={link.label} className={link.active ? "active" : ""} aria-current={link.active ? "page" : undefined} href={link.href}>{link.label}</Link>)}</nav>; }

function SessionPrevious() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  useEffect(() => {
    void fetch("/api/orders/history", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<{ orders: OrderView[] }> : { orders: [] }).then((data) => setOrders(data.orders));
    const savedTokens = JSON.parse(window.localStorage.getItem(orderTokensKey) ?? "[]") as string[];
    void Promise.all(savedTokens.map(async (token) => { const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ token }) }); return response.ok ? { token, orderNumber: (await response.json() as OrderView).orderNumber } : undefined; })).then((rows) => setTokens(Object.fromEntries(rows.filter((row): row is { token: string; orderNumber: string } => Boolean(row)).map((row) => [row.orderNumber, row.token]))));
  }, []);
  return <section><PageHeading title="Tidligere bestillinger" text="Vises kun på denne enhed." />{orders.length === 0 ? <div className="empty-state"><p>Du har endnu ingen tidligere bestillinger på denne enhed.</p><Link href="/menu" className="button button-secondary">Se menuen</Link></div> : orders.map((order) => { const token = tokens[order.orderNumber]; const body = <><span><strong>{order.orderNumber}</strong><small>{order.items.map((item) => item.productName).join(", ")}</small></span><span><b>{formatPrice(order.totalOre / 100)}</b><small>{statusLabels[order.status]} →</small></span></>; return token ? <Link className="previous-card" key={order.orderNumber} href={`/tidligere/status#${token}`}>{body}</Link> : <article className="previous-card" key={order.orderNumber}>{body}</article>; })}</section>;
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
