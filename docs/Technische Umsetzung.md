# Technisches Implementierungskonzept: Hochschul-Chat-App

## 1. Technische Rahmenbedingungen der Server-API
Die Anbindung erfolgt über den zentralen Server-Endpunkt:
`[https://www2.hs-esslingen.de/~chkohl/chat/?request=](https://www2.hs-esslingen.de/~chkohl/chat/?request=)<BEFEHL>`
- **Architektur:** Single-Endpoint-API, Routing gesteuert über den URL-Parameter `request`.
- **Protokoll & Payload:**
    - Datenabfragen und Aktionen über HTTP GET (mit Query-Parametern).
    - Nachrichtenversand über HTTP POST (mit JSON-Body bei `postmessage`).
- **Authentifizierung:** Token-basiert. Nach erfolgreichem `login` oder `register` wird ein Session-Token zurückgegeben, das bei allen weiteren Anfragen mitgeschickt werden muss.
- **Rückgabeformat:** Standardisiertes JSON mit Statusfeldern:
```JSON
{
  "status": "ok",
  "code": 200,
  "message": "...",
  "token": "..."
}
```
## 2. Was direkt und ohne Umwege funktioniert (100 % machbar)
Alle folgenden Funktionen werden nativ von den 17 Server-Endpunkten abgedeckt und können ohne Workarounds im Code aufgerufen werden:
### Authentifizierung & Session-Management
- **Registrierung & Login:**
    - `register`: Anlegen des Accounts mit Hochschulkürzel (z. B. `userid=abcdit01`) und Passwort.
    - `login`: Generierung des Zugriffstokens.
    - `validatetoken`: Prüfung beim App-Start, ob die Sitzung noch gültig ist (Auto-Login).
    - `logout` / `deregister`: Beenden der Sitzung oder Löschen des Nutzerprofils.
- **Datenschutz:** Da die Anmeldung direkt über die Server-User-ID (`userid`) läuft, müssen im Frontend zu keinem Zeitpunkt Handynummern, Mailadressen oder private Kontaktdaten erfasst werden.
### Chat- & Gruppenverwaltung
- **Räume erstellen:** `createchat` legt einen neuen Raum auf dem Server an.
- **Eigene Räume auflisten:** `getchats` liefert die Liste aller Räume zurück, in denen der angemeldete Nutzer Mitglied ist.
- **Räumen beitreten & verlassen:**
    - `joinchat` ermöglicht den gezielten Beitritt zu einem bekannten Raum.
    - `leavechat` entfernt den Nutzer aus dem Raum.
    - `deletechat` löscht einen Raum (serverseitig).
### Nachrichten & Medienübertragung
- **Textnachrichten:**
    - `postmessage`: Senden von Nachrichten per HTTP POST mit JSON-Body.
    - `getmessages`: Abrufen des Chatverlaufs eines Raums.
- **Medien:**
    - `getphoto`: Laden von Bildanhängen.
    - `getfile`: Herunterladen von Dokumenten/PDFs.
### Einladungssystem & Nutzerverzeichnis
- **Direktes Einladen:** Über `invite` können andere Studierende anhand ihrer User-ID gezielt in einen Raum geholt werden.
- **Einladungsverwaltung:** `getinvites` listet offene Einladungen auf; `rejectinvite` lehnt diese ab (bzw. Annahme via `joinchat`).
- **Nutzerprofile:** `getprofiles` ermöglicht das Abfragen und Darstellen von Nutzerinformationen im Chat.
## 3. Was der Server nicht kann 
Da der Server weder ein Rollenmodell noch Raumhierarchien oder Schreibschutzflags kennt, werden diese Anforderungen vollständig clientseitig über **Namenskonventionen**, **Parsing** und **UI-Restriktionen** umgesetzt.
### A. Subgruppen & Hierarchien (Module vs. Lerngruppen)
- **Problem:** Der Server kennt nur eine flache Liste isolierter Chaträume. Es gibt kein Konzept von „Unterräumen“.
- **Frontend-Lösung:** Semantische Namenskonvention mit Delimiter (Trennzeichen).
Beim Erstellen von Räumen hängt das Frontend Metadaten strukturiert an den Raumnamen an:

| **Raumtyp**      | **Generierter Raumname auf dem Server** |
| ---------------- | --------------------------------------- |
| **Hauptmodul**   | `MOD::Mathe_1::MAIN`                    |
| **Subgruppe**    | `MOD::Mathe_1::SUB::Lerngruppe_A`       |
| **Freie Gruppe** | `CUSTOM::Projekt_Webtech`               |

**Clientseitige Verarbeitung:**
1. Nach dem Aufruf von `getchats` parst das Frontend alle Raumnamen per Regular Expression:
```TypeScript
const regex = /^MOD::(?<modul>[^:]+)(?:::SUB::(?<subgroup>.+))?$/;
```
1. Die Räume werden im State nach dem Modulnamen gruppiert.
2. **UI-Rendering:** In der Navigation erscheint kein flacher Verlauf, sondern eine Baumstruktur:
    - 📁 **Mathematik 1** _(Hauptkanal)_
        - ↳ 💬 Lerngruppe A
        - ↳ 💬 Übungsblatt 3
        - ↳ ➕ _Subgruppe erstellen_
### B. Semester-Archivierung & Read-Only-Modus
- **Problem:** Die API besitzt keinen Befehl, um Räume auf „Nur-Lesen“ zu setzen. Jeder Raumteilnehmer kann theoretisch jederzeit `postmessage` ausführen.
- **Frontend-Lösung:** Zeitstempel/Semester-Präfix im Raumnamen + UI-Locking.
1. **Namensschema mit Semester:**
    - `WS26::MOD::Mathe_1::MAIN`
2. **Frontend-Logik:**
    - In der App wird das aktuell aktive Semester hinterlegt (z. B. `WS26`).
    - Beim Öffnen eines Raums prüft das Frontend das Semester-Kürzel im Raumnamen.
    - Wenn das Semester in der Vergangenheit liegt (z. B. `SS26` oder `WS25`):
        - Das Eingabefeld (`<input>` / `<textarea>`) und der Sende-Button werden ausgeblendet bzw. deaktiviert (`disabled`).
        - Es wird ein Banner eingeblendet: _„Dieser Kurs stammt aus einem vergangenen Semester und ist archiviert (Nur Lesezugriff).“_
        - `getmessages`, `getphoto` und `getfile` funktionieren weiterhin uneingeschränkt, sodass alte Lösungen und Dokumente lesbar bleiben.
### C. Dozierenden-Kennzeichnung (Visuelle Rollen)
- **Problem:** Es gibt keine serverseitigen Rollen (`Admin`, `Tutor`, `Student`).
- **Frontend-Lösung:** Benutzer-ID-Heuristik & Badge-Rendering.
1. An Hochschulen folgen Nutzer-IDs meist festen Schemata (z. B. 6–7-stellige Kürzel für Studierende vs. Nachnamen/spezifische Kennungen für Beschäftigte).
2. Falls Dozierenden-IDs ein klares Muster aufweisen (oder über eine kleine, im Frontend hinterlegte Konfigurationsliste abgeglichen werden):
    - Das Frontend versieht Nachrichten dieser User-IDs automatisch mit einem optischen Badge (z. B. `[Dozent]` / `[Prof]`).
    - Nur Nutzer mit verifizierter Dozierenden-Kennung erhalten in der UI den Button _„Offizielle Modulgruppe anlegen“_.

### D. Modul-Katalog & Kursbeitritt (Ersatz für Moodle)
- **Problem:** `getchats` liefert nur Räume zurück, in denen der Nutzer bereits Mitglied ist. Manuelle Moodle-Synchronisation ist ohne Moodle-API-Schlüssel nicht möglich.
- **Frontend-Lösung:** Deterministische Modul-Raumnamen + Lokaler Modul-Finder.
1. **Feste Benennung der Pflichtfächer:**
    - Hauptmodule heißen immer exakt: `WS26::MOD::<Modulkürzel>::MAIN` (z. B. `WS26::MOD::INFB101::MAIN`).
2. **Frontend-Modulkatalog:**
    - In der App gibt es eine Auswahlliste aller Fächer des aktuellen Semesters (als statische JSON-Datei in der App gebündelt).
3. **Beitritt per 1-Click:**
    - Klickt ein Studierender auf _„Mathe 1 beitreten“_, generiert das Frontend den Zielnamen `WS26::MOD::INFB101::MAIN` und ruft direkt `joinchat` auf.
    - Es ist kein manuelles Abtippen kryptischer Raum-IDs oder Einladungscodes notwendig.
## 4. Technische Implementierungs-Checkliste

| **Anforderung**                 | **Status**       | **Realisierungsort**                         | **Benötigte Server-Calls**              |
| ------------------------------- | ---------------- | -------------------------------------------- | --------------------------------------- |
| **Login ohne Mobilnummer**      | Direkt machbar   | Server                                       | `login`, `validatetoken`                |
| **Nachrichten & Dateitransfer** | Direkt machbar   | Server                                       | `postmessage`, `getmessages`, `getfile` |
| **Direkteinladungen**           | Direkt machbar   | Server                                       | `invite`, `getinvites`                  |
| **Subgruppen unter Modulen**    | Gelöst per Trick | Frontend (Regex/Name-Splitting)              | `createchat`, `getchats`                |
| **Read-Only Archivierung**      | Gelöst per Trick | Frontend (UI-Sperre nach Namens-Check)       | `getmessages` (kein `postmessage`)      |
| **Modulkatalog / Kursfindung**  | Gelöst per Trick | Frontend (statische Kurs-JSON + Direct-Join) | `joinchat`                              |
