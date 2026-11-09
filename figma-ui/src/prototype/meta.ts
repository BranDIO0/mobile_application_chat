import type { ScreenId } from './data'

export const SCREEN_META: Record<ScreenId, { desc: string; hints: string[] }> = {
  splash: { desc: 'App-Start · leitet nach kurzer Prüfung automatisch weiter', hints: ['Wartet ~2 s und öffnet dann den Login', 'Tippen überspringt die Wartezeit'] },
  login: { desc: 'Login per Hochschulkürzel · keine privaten Daten', hints: ['Kürzel eingeben (optional) → „Anmelden“', '„Angemeldet bleiben“ umschalten', '„Jetzt registrieren“ öffnet die Registrierung'] },
  register: { desc: 'Neues Konto anlegen', hints: ['Formular wird validiert (Passwort ≥ 8 Zeichen, Bestätigung)', '„Konto erstellen“ startet das Onboarding', '← oder „Anmelden“ zurück zum Login'] },
  onboarding: { desc: 'Erster Start · Schnellstart in 3 Schritten', hints: ['Jeder Schritt ist klickbar und wird nach Erledigung grün', 'Kurs beitreten → Untergruppe erstellen → Einladen', '„Überspringen“ öffnet direkt die Chats'] },
  chats: { desc: 'Kurse & Gruppen als Baumstruktur', hints: ['Kurs-Überschrift antippen klappt ein/aus', 'Kanal antippen öffnet den Chat', '„+ Untergruppe“ öffnet das Modal', 'Avatar oben rechts öffnet das Profil', 'Footer: Chats · Modulkatalog · Einladungen · Benachrichtigungen'] },
  chat: { desc: 'Chat-Ansicht · Untergruppe', hints: ['Nachricht senden – Kommilitonen antworten', 'Büroklammer hängt eine Datei an', 'Dateianhang antippen → Datei-Ansicht', 'Personen-Icon: einladen · ⋮ weitere Aktionen'] },
  archive: { desc: 'Archivierter Kurs · Nur-Lese-Modus', hints: ['Eingabe ist deaktiviert', 'Dateien bleiben abrufbar'] },
  catalog: { desc: 'Modulkatalog · 1-Click Beitritt', hints: ['Suche filtert nach Name, Kürzel oder Dozent', '„Beitreten“ fügt den Kurs der Seitenleiste hinzu'] },
  freegroup: { desc: 'Freie Gruppe · CUSTOM:: Raum', hints: ['Name eingeben aktiviert „Erstellen“', 'Kürzel + Enter fügt Mitglieder hinzu, ✕ entfernt', 'Neue Gruppe erscheint unter „Eigene“'] },
  invite: { desc: 'Nutzer per Kürzel einladen', hints: ['Kürzel eingeben → „Einladung senden“', 'Einladungen zurückziehen, Mitglieder entfernen'] },
  invitations: { desc: 'Einladungen · offen & archiviert', hints: ['„Annehmen“ fügt die Gruppe deinen Chats hinzu', 'Entscheidungen wandern ins Archiv'] },
  file: { desc: 'Datei-Ansicht · Anhang öffnen', hints: ['Herunterladen und Teilen (simuliert)'] },
  profile: { desc: 'Profil · Konto & Statistik', hints: ['„Bearbeiten“ ändert den Anzeigenamen', 'Kurs antippen öffnet den Hauptkanal', '„Einstellungen“ öffnet die App-Konfiguration', '„Abmelden“ zurück zum Login'] },
  settings: { desc: 'Einstellungen · über das Profil erreichbar', hints: ['Schalter sind funktional', '„Archivierte Kurse anzeigen“ blendet das Archiv in der Seitenleiste ein/aus', 'Anzeigename öffnet das Profil'] },
  notifications: { desc: 'Benachrichtigungen · Aktivitätsfeed (Footer-Tab)', hints: ['Eintrag antippen springt zum Ziel', '„Alle lesen“ markiert alles als gelesen', 'Roter Punkt am Glocken-Tab zeigt Ungelesenes'] },
}
