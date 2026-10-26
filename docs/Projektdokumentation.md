# Projektdokumentation: Hochschul-Chat-App

### 1. Die Grundidee: Warum diese App?
Wenn sich Studierende heute zu Vorlesungen, Übungen oder Projekten austauschen wollen, nutzen sie meistens Dienste wie WhatsApp, Discord oder Telegram. Das hat jedoch große Nachteile: Man muss private Handynummern oder persönliche Accounts in großen Gruppen mit teils unbekannten Kommilitonen teilen. Zudem herrscht oft ein unübersichtliches Chaos aus zahllosen Einzelgruppen.

**Unsere Lösung:** Wir entwickeln eine eigene Chat-App speziell für die Hochschule. Studierende und Dozierende melden sich einfach mit ihrem normalen Hochschulkürzel an. Es werden keinerlei private Kontaktdaten wie Handynummern oder E-Mail-Adressen benötigt. Die gesamte Kommunikation rund um das Studium bleibt an einem zentralen, geschützten Ort.
### 2. Wie funktioniert die App im Alltag? (Kernfunktionen)
#### Geschützter Login ohne private Daten
Jeder Nutzer registriert und meldet sich direkt über sein Hochschulkürzel (User-ID) und ein Passwort an. Die App merkt sich die Sitzung für zukünftige Starts automatisch (Auto-Login), sodass man direkt loslegen kann, ohne persönliche Daten preiszugeben.
#### Einfacher Kursbeitritt per 1-Klick (Modulkatalog)
Anstatt mühsam nach Einladungslinks in Foren zu suchen oder lange Codes abzutippen, bietet die App einen integrierten **Modulkatalog**.
- In einer übersichtlichen Liste sind alle Fächer des aktuellen Semesters hinterlegt.
- Mit einem einzigen Klick auf ein Fach (z. B. _„Mathematik 1 beitreten"_) landet man sofort im richtigen Hauptchat des Kurses.
#### Klare Struktur: Hauptkurse, Lerngruppen & freie Projekte
Damit in großen Vorlesungen mit vielen Teilnehmenden kein Chaos entsteht, sind die Chats in einer übersichtlichen Baumstruktur organisiert:
- **Hauptmodul (Hauptkanal):** Für jedes Studienfach gibt es einen zentralen Raum für allgemeine Fragen und Ankündigungen (z. B. _Mathematik 1_).
- **Subgruppen (Unterräume):** Unterhalb eines jeden Fachs können beliebig viele Untergruppen erstellt werden – etwa für kleinere Lerngruppen oder spezifische Übungsblätter (z. B. _Lerngruppe A_ oder _Übungsblatt 3_). In der Seitenleiste der App werden diese ordentlich unter dem jeweiligen Hauptfach eingeklappt dargestellt.
- **Freie Gruppen & Direkteinladungen:** Unabhängig von Vorlesungen können Studierende eigene Räume für freie Projekte anlegen und Kommilitonen gezielt über deren Hochschulkürzel in einen Raum einladen.
#### Austausch von Nachrichten, Bildern & Dokumenten
In allen Räumen können Textnachrichten in Echtzeit ausgetauscht werden. Darüber hinaus unterstützt der Chat das Teilen und Herunterladen von Bildern (z. B. abfotografierte Tafelanschriebe) sowie Dokumenten und PDFs (z. B. Zusammenfassungen oder Übungsblätter).
#### Automatische Semester-Archivierung (Nachschlagewerk)
Die Organisation der App orientiert sich am Semesterrhythmus der Hochschule:
- Solange ein Semester läuft, sind alle zugehörigen Kursräume aktiv.
- Ist das Semester vorbei, werden die Kurse automatisch **archiviert** und in einen **Lese-Modus (Read-Only)** versetzt.
- Ein Hinweisbanner zeigt an, dass der Kurs aus einem vergangenen Semester stammt. Das Texteingabefeld wird deaktiviert, sodass niemand mehr alte Gruppen durch neue Nachrichten stört. Alle bisherigen Nachrichten, Lösungen, Bilder und PDF-Dokumente bleiben aber dauerhaft abrufbar.
#### Sichtbare Kennzeichnung von Dozierenden
Nehmen Professorinnen, Professoren oder Lehrbeauftragte am Chat teil, werden ihre Nachrichten automatisch mit einem optischen Abzeichen (z. B. **`[Dozent]`** oder **`[Prof]`**) hervorgehoben. So erkennen Studierende auf einen Blick, welche Antworten und Hinweise offiziell von den Lehrenden stammen. Zudem ist das Anlegen neuer offizieller Modul-Hauptgruppen in der Oberfläche speziell für Dozierende vorgesehen.
### 3. Wie wird das technisch umgesetzt? (Hintergrund für Nicht-Techniker)
Die Hochschule stellt für das Projekt einen fertigen Chat-Server bereit, über den alle Nachrichten und Dateien sicher verschickt werden.

Da dieser Basis-Server von Haus aus nur sehr einfache Standard-Chaträume kennt, übernimmt unsere App (das **Frontend**) die gesamte intelligente Organisation im Hintergrund:
1. **Keine zusätzliche Datenbank nötig:** Die App kommuniziert direkt mit dem Hochschul-Server und benötigt keinen eigenen Zwischen-Server.
2. **Intelligente Raumbenennung im Hintergrund:** Wenn ein Nutzer in der App eine Untergruppe für _Mathematik 1_ im _Wintersemester 2026_ anlegt, speichert die App diesen Raum auf dem Server intern nach einem festen Muster ab (z. B. `WS26::MOD::Mathe_1::SUB::Lerngruppe_A`).
3. **Automatische Aufbereitung in der App:** Für die Nutzerinnen und Nutzer sind diese technischen Namen unsichtbar. Die App liest das Muster beim Start aus, sortiert alle Untergruppen ordentlich unter das richtige Hauptfach und sperrt automatisch das Textfeld, sobald das im Namen hinterlegte Semester abgelaufen ist.