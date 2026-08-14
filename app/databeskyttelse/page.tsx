import Link from "next/link";

export const metadata = {
  title: "Databeskyttelse | Tee-Time",
  description: "Sådan behandler Tee-Time ordreoplysninger.",
};

export default function DataProtectionPage() {
  const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "Kontaktoplysninger indsættes før pilot";
  return <main className="privacy-page">
    <Link className="back-link" href="/">← Tilbage til Tee-Time</Link>
    <p className="eyebrow">Databeskyttelse</p>
    <h1>Sådan behandler vi dine oplysninger</h1>
    <p>Vi bruger kun de oplysninger, der er nødvendige for at modtage, tilberede og udlevere din bestilling.</p>

    <section><h2>Hvem er ansvarlig?</h2><p>Den restaurant, du bestiller hos via Tee-Time, er dataansvarlig. Kontakt: {contact}.</p></section>
    <section><h2>Hvad bruger vi?</h2><p>Navn, eventuelt telefonnummer, valgt placering og terrassebord, ordrelinjer samt en eventuel bemærkning. Telefonnummer indsamles kun, når du bestiller til banen.</p></section>
    <section><h2>Hvorfor?</h2><p>Oplysningerne bruges alene til at bekræfte, tilberede og levere eller udlevere din ordre samt til nødvendig driftsopfølgning.</p></section>
    <section><h2>Hvor længe?</h2><p>Kundeoplysninger anonymiseres senest 30 dage efter ordreoprettelsen. Derefter beholdes kun anonyme ordre- og driftsoplysninger, når det er nødvendigt for drift, regnskab eller fejlsøgning.</p></section>
    <section><h2>Hvem behandler data?</h2><p>Tee-Time bruger Neon til database, Vercel til drift af appen og Brevo til restaurantens driftsmail. Leverandørerne må kun behandle data på restaurantens vegne.</p></section>
    <section><h2>Dine rettigheder</h2><p>Du kan bede om indsigt, rettelse, sletning eller begrænsning af behandlingen ved at kontakte restauranten. Du kan også klage til Datatilsynet.</p></section>
    <p className="privacy-note">Denne tekst skal gennemgås og have restaurantens juridiske navn og kontaktoplysninger før produktion.</p>
  </main>;
}
