export default function ImpressumPage() {
  return (
    <main className="container legal-page">
      <section className="card">
        <h1>Impressum</h1>
        <p className="page-subtitle">Anbieterkennzeichnung nach § 5 DDG</p>

        <h2>Angaben zum Anbieter</h2>
        <p>
          [Name des Betreibers]
          <br />
          [Anschrift]
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: [E-Mail-Adresse]
          <br />
          Telefon: [Telefon optional]
        </p>

        <h2>Testphase</h2>
        <p>
          Tabletop Matchmaker befindet sich derzeit in einer geschlossenen Testphase. Funktionen,
          Texte und technische Abläufe können sich noch ändern.
        </p>

        <h2>Verantwortlich für den Inhalt</h2>
        <p>[Name des Betreibers], [Anschrift]</p>
      </section>
    </main>
  );
}
