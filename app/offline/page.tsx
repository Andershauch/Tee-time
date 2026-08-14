import Link from "next/link";

export default function OfflinePage() {
  return <main className="offline-page"><h1>Du er offline</h1><p>Vi kan ikke hente friske varer eller sende en ordre uden internetforbindelse. Din kurv bliver på denne enhed.</p><p>Genopret forbindelsen, før du bekræfter en ordre eller følger status.</p><Link className="button button-primary" href="/">Prøv igen</Link></main>;
}
