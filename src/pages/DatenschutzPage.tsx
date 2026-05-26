export default function DatenschutzPage() {
  return (
    <main className="container legal-page">
      <section className="card">
        <h1>Datenschutzerklärung</h1>
        <p className="page-subtitle">
          Hinweise zur Verarbeitung personenbezogener Daten in der geschlossenen Testphase.
        </p>

        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlich für diese Anwendung ist [Name des Betreibers], [Anschrift].
          Kontakt: [E-Mail-Adresse], [Telefon optional].
        </p>

        <h2>2. Zweck der Verarbeitung</h2>
        <p>
          Tabletop Matchmaker unterstützt Spieler, Gastgeber und Spielorte dabei, Spiele,
          Spielgesuche, Einladungen, Nachrichten und wiederkehrende Treffen zu organisieren.
        </p>

        <h2>3. Verarbeitete Daten</h2>
        <p>
          Verarbeitet werden insbesondere Nutzerprofil, Vorname, Nachname, Anzeigename,
          optionale Kontaktdaten, Adresse, Ort, Postleitzahl, Koordinaten, Freundschaften,
          Spielsessions, Bewerbungen, Einladungen, Nachrichten, Benachrichtigungen,
          öffentliche Profilseiten und öffentliche Session-Links.
        </p>

        <h2>4. Sichtbarkeit und Standortdaten</h2>
        <p>
          Nutzer können Sichtbarkeiten für Kontaktdaten, Straße, Postleitzahl und Ort getrennt
          einstellen. Genaue Koordinaten werden nicht öffentlich ausgegeben, wenn die genaue
          Adresse oder Position verborgen werden soll. Wenn der Ort sichtbar bleibt, kann die App
          dennoch ohne exakte Wohnort-Koordinaten arbeiten.
        </p>

        <h2>5. Nachrichten und Benachrichtigungen</h2>
        <p>
          Direktnachrichten, Session-Kommentare, Tisch-Nachrichten und Benachrichtigungen werden
          gespeichert, damit die Abstimmung rund um Spiele innerhalb der App möglich ist.
        </p>

        <h2>6. Öffentliche Inhalte</h2>
        <p>
          Öffentliche Profile und öffentliche Session-Links zeigen nur Daten, die für diese Ansicht
          vorgesehen sind. Private Kontaktdaten und genaue Standortdaten werden abhängig von den
          gewählten Einstellungen nicht öffentlich angezeigt.
        </p>

        <h2>7. Technische Infrastruktur</h2>
        <p>
          Für Betrieb, Hosting und Datenbank können technische Dienstleister eingesetzt werden,
          zum Beispiel MongoDB Atlas oder Hosting-Anbieter. Diese Verarbeitung erfolgt als
          technische Infrastruktur bzw. mögliche Auftragsverarbeitung.
        </p>

        <h2>8. Cookies und Tracking</h2>
        <p>
          Nach aktuellem Stand wird kein Tracking zu Werbe- oder Analysezwecken eingesetzt. Lokale
          Browser-Speicherung kann für Testmodus, Nutzerwechsel und App-Einstellungen verwendet
          werden.
        </p>

        <h2>9. Rechte der betroffenen Personen</h2>
        <p>
          Betroffene Personen haben nach DSGVO insbesondere Rechte auf Auskunft, Berichtigung,
          Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit. Anfragen können an
          [E-Mail-Adresse] gerichtet werden.
        </p>
      </section>
    </main>
  );
}
