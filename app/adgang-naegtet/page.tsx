import Link from "next/link";

export default function AccessDeniedPage() {
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Tee-Time drift</p><h1>Ingen adgang</h1><p>Din konto har ikke adgang til denne del af systemet.</p><Link className="button button-secondary" href="/personale">Til personaleoversigten</Link></section></main>;
}
