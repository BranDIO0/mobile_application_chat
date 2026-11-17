# Persona: Lea (22) – Die vielbeschäftigte Kleingruppen-Organisatorin
> **„Wenn ich meine Uni-Sachen endlich komplett von meinem privaten WhatsApp trennen könnte, ohne fünfmal am Tag nach irgendwelchen Einladungslinks betteln zu müssen, wäre ich sofort dabei.“**
### 1. Steckbrief & Hintergrund
- **Studiengang:** Soziale Arbeit (Bachelor)
- **Nebentätigkeit:** Werkstudentin in einer Jugendhilfeeinrichtung
- **Alltag:** Stark zerstückelter Wochenplan zwischen großen Vorlesungen (Sozialrecht, Psychologie), vielen praxisnahen Kleingruppen-Seminaren und ihrem Job. Sie ist viel in der S-Bahn unterwegs und zeitlich oft knapp angebunden.
- **Gerätenutzung:**
    - **90 % Smartphone:** Unterwegs in der Bahn oder zwischen den Vorlesungen.
    - **10 % Laptop:** Abends am Schreibtisch für Hausarbeiten und längere Texte, wenn Dokumente und Literatur direkt am Rechner benötigt werden.
### 2. Kommunikationsverhalten
- **In großen Vorlesungsgruppen (Hauptkanälen):** Eher **stille Mitleserin („Lurker“)**. Sie möchte vor allem keine wichtigen Fristen, Prüfungsdetails oder Unterlagen verpassen und fragt nur im Notfall selbst nach.
- **In kleinen Gruppen (3–5 Personen):** **Aktive Organisatorin.** In Referatsgruppen, Fallarbeits-Teams oder Lesezirkeln übernimmt sie die Initiative, koordiniert Treffen und teilt Literatur sowie Links.
### 3. Frustrationen & Schmerzpunkte (Pain Points)
- **Fehlende Trennung von Privatleben, Job und Studium:** Da fast alles über WhatsApp läuft, ploppen abends auf dem Sofa oder während der Arbeit in der Jugendhilfe dutzende Nachrichten zu Prüfungsdiskussionen auf. Stummschalten löst das Problem nicht, da die Angst besteht, wichtige Fristen zu verpassen („Fear of Missing Out“).
- **Mangelnder Datenschutz in Großgruppen:** Es ist ihr unangenehm, dass in großen Vorlesungsgruppen jeder ihre private Handynummer einsehen kann – insbesondere, da sie bereits unerwünschte Privatnachrichten von Unbekannten erhalten hat.
- **Chaos beim Gruppenbeitritt zum Semesterstart:** Es gibt keinen zentralen Ort für Kursgruppen. Wer in der ersten Semesterwoche krank ist, verpasst den Anschluss und muss mühsam nach Einladungslinks suchen.
- **Unauffindbare Dateien kurz vor Prüfungen:** Wichtige Tafelbilder oder Zusammenfassungen gehen in einer Flut aus Memes, Stundenplan-Screenshots und kryptisch benannten Dateien (`Scan_001.pdf`) unter. Zudem nervt der Umweg, sich Dateien für Hausarbeiten erst umständlich über WhatsApp Web auf den Laptop ziehen zu müssen.
- **Alte Gruppen als „Karteileichen“:** Gruppen vergangener Semester verstopfen die eigene Chatliste, werden aber nicht verlassen, da man alte Unterlagen später noch braucht.
### 4. Ziele & Wünsche an die Hochschul-Chat-App
- **Klare Abgrenzung & Schutz der Privatsphäre:** Eine dedizierte App nur für das Studium, bei der die Anmeldung über das Hochschulkürzel läuft und die private Handynummer unsichtbar bleibt.
- **Garantierter Anschluss ab Tag 1:** Direktes Finden und Beitreten aller belegten Module über den **1-Klick-Modulkatalog** – auch wenn man in der ersten Vorlesungswoche fehlt.
- **Schnelle Kleingruppen-Organisation ohne Gruppen-Wildwuchs:** Unterhalb eines Moduls direkt **Subgruppen** für Referate, Fallstudien oder Lesezirkel eröffnen und die 3–4 Gruppenmitglieder gezielt per Kürzel (oder Namenssuche via Nutzerprofil) einladen.
- **Verlässliches Nachschlagewerk bis zur Bachelorarbeit:** Durch die **Read-Only-Archivierung** nach Semesterende bleiben wichtige Schemata und Gesetzestext-Zusammenfassungen aus Grundlagenmodulen (z. B. Sozialrecht) sauber und ohne neuen Spam für das Praxissemester oder die Abschlussarbeit abrufbar.
- **Geschützter Raum trotz Dozierenden-Präsenz:** Sie schätzt das **`[Dozent]`-Abzeichen** im offiziellen Hauptkanal für verbindliche Aussagen zu Hausarbeits-Vorgaben oder Seminarausfällen. Gleichzeitig benötigt sie zwingend **„Studi-Only“-Bereiche (Subgruppen)** ohne Lehrende, um ohne Hemmschwelle auch informelle Fragen (z. B. nach kurzen Textzusammenfassungen) stellen zu können.
### 5. Bedeutung dieser Persona für euer Projekt (Design-Implikationen)
Aus Leas Interview ergeben sich drei konkrete Anforderungen für eure Umsetzung:
1. **Sichtbarkeit für „Studi-Only“-Räume:** Da die Anwesenheit von Dozierenden im Hauptkanal die Hemmschwelle für einfache Fragen erhöht, sollte in der Oberfläche klar erkennbar sein, dass **Subgruppen** (oder ein spezieller Unterraum wie `Austausch_Studierende`) frei von Dozierenden sind.
2. **Nutzerverzeichnis beim Einladen nutzen:** Lea kennt die kryptischen Hochschulkürzel ihrer Referatspartner oft nicht auswendig. Beim Einladen in eine Subgruppe (`invite`) sollte das Frontend daher den Endpunkt `getprofiles` nutzen, damit man Kommilitonen auch über ihren Klarnamen auswählen kann.
3. **Nahtloser Wechsel zwischen Handy und Laptop:** Da Lea unterwegs am Smartphone liest, aber für Hausarbeiten PDFs am Laptop herunterlädt (`getfile`), sollte die Web-/App-Oberfläche auf beiden Bildschirmgrößen (Responsive Design) gut bedienbar sein.