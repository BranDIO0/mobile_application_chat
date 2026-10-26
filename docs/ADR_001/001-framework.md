# ADR-001: Wahl des Frontend-Frameworks für die Chat-App

## 1. Titel und Nummer
**ADR-001: Wahl des Frontend-Frameworks für die Chat-App**

## 2. Status
**Akzeptiert**

---

## 3. Kontext
Im Rahmen der Lehrveranstaltung *Mobile UI* an der Hochschule Esslingen soll eine Webanwendung entwickelt werden, die mit einem vorgegebenen Chat-Server (`https://www2.hs-esslingen.de/~chkohl/chat/`) kommuniziert. 

### Anforderungen & Randbedingungen:
* **API-Testbench:** Umsetzung eines 4-stufigen Ablaufs (Registrierung, Token-Handhabung, 1s-Delay-Validierung und Auswertung von HTTP-Fehlercodes 451–469).
* **Live-Chat:** Interaktive Benutzeroberfläche für Nachrichten-Streams, Raumverwaltung, Dateianhänge (Base64) und Mitgliedersuche.
* **Wartbarkeit & Struktur:** Der Code soll übersichtlich, gut strukturiert und leicht nachvollziehbar sein.
* **Entwicklungsaufwand:** Schnelle Setup- und Iterationszeiten im Rahmen der Übung.

---

## 4. Optionen und Bewertung

Es wurden drei grundlegende Architektur-Optionen für die Erstellung der Client-Anwendung betrachtet:

1. **Option A: React 19 (mit Vite & TypeScript)**
2. **Option B: Vue.js 3 (Single File Components)**
3. **Option C: Vanilla HTML5 / JavaScript (ES6+ ohne Framework)**

### Gewichte Entscheidungsmatrix

| Kriterium | Gewichtung | Option A: React + Vite | Option B: Vue.js 3 | Option C: Vanilla JS |
| :--- | :---: | :---: | :---: | :---: |
| **Komponentenstruktur & Wiederverwendbarkeit** | 25% | Hoch (JSX / TSX) | Hoch (SFC `.vue`) | Niedrig (Manuelles DOM) |
| **State Management (Polling & Token)** | 25% | Sehr gut (`useState`, `useRef`) | Sehr gut (`ref`, `reactive`) | Mittel (Manuelle Mutationen) |
| **TypeScript-Integration & Typsicherheit** | 25% | Erstklassig (Native TSX) | Sehr gut | Mäßig / Aufwendig |
| **Tooling & Build-Geschwindigkeit** | 15% | Sehr schnell (Vite) | Sehr schnell (Vite) | Keins nötig / Einfach |
| **Geringer Boilerplate & Übersichtlichkeit** | 10% | Hoch | Hoch | Sehr hoch |
| **Gesamtbewertung** | **100%** | **4.7 / 5.0** | **4.4 / 5.0** | **2.8 / 5.0** |

### Detaillierte Bewertung der Alternativen:

* **Vanilla HTML / JS (Option C):** 
  * *Vorteile:* Kein Build-Schritt erforderlich, läuft direkt im Browser.
  * *Nachteile:* Bei komplexerem Zustand (Token-Persistenz, Raumwechsel, Polling-Updates, Modals) wird manuelles DOM-Manipulieren schnell unübersichtlich und fehleranfällig.

* **Vue.js 3 (Option B):** 
  * *Vorteile:* Sehr übersichtliche Syntax durch Template-Trennung, hervorragende Reaktivität.
  * *Nachteile:* Benötigt spezifische Tooling-Plugins; TypeScript-Unterstützung zwar sehr gut, aber in React noch nahtloser integriert.

* **React 19 mit Vite & TypeScript (Option A):** 
  * *Vorteile:* Deklarative UI-Entwicklung, exzellentes Ökosystem, typensichere Custom Hooks für Kapselung von Logik (`useAuth`, `useChat`), sehr schnelle Entwicklungszyklen durch Vite HMR.
  * *Nachteile:* Erfordert Node.js und einen Build-Schritt.

---

## 5. Entscheidung

Wir entscheiden uns für **Option A: React 19 mit Vite und TypeScript**.

Die Anwendung wird in eine klare Schichtenarchitektur aufgeteilt:
* `src/api/`: Reines HTTP-Client-Handling (GET Query / POST JSON Body).
* `src/hooks/`: Entkoppelte Anwendungslogik & State (Auth & Chat-Polling).
* `src/components/`: Wiederverwendbare UI-Bausteine (Header, Modals, Forms).
* `src/pages/`: Seiten-Container für die Tabs *API-Test* und *Live-Chat*.

---

## 6. Konsequenzen

### Positive Folgen:
* **Hohe Übersichtlichkeit:** Durch Entkopplung von UI und Logik in Custom Hooks bleibt jede Komponente unter ~100 Zeilen Code.
* **Typsicherheit:** Die Schnittstellen des Chat-Servers (`ChatMessage`, `ApiResponse`, etc.) sind vollständig typisiert, was Laufzeitfehler minimiert.
* **Effizientes Re-Rendering:** Reaktivität bei eingehenden Nachrichten durch Polling ohne manuelle DOM-Aktualisierungen.
* **Lokales Dev-Proxying:** Vite ermöglicht das einfache Weiterleiten von `/api-proxy` an den HSE-Chat-Server zur Vermeidung von CORS-Problemen.

### Negative Folgen & Risiken:
* Einarbeitung in JSX/TSX und React-Lifecycle (z. B. Vermeidung von Render-Seiteneffekten bei `useEffect`).
* Abhängigkeit von `npm` und Build-Tools (Vite).
