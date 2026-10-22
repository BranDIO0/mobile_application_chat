# Abgleich mit der API & Frontend-Workarounds (Hochschul-Chat-App)

Dieses Dokument fasst zusammen, wie die Anforderungen aus der Projektdokumentation mit der bereitgestellten Chat Server API umgesetzt werden, wo es Lücken gibt und wie unser Team diese mit Workarounds löst.

## 1. Authentifizierung & Benutzer

*   **Login & Registrierung:** 
    *   **Status:** ✅ Möglich
    *   **Umsetzung:** Nutzung von `GET /login` mit `userid` und `password`, um den Session-Token zu erhalten.
*   **Auto-Login (Sitzung speichern):** 
    *   **Status:** ✅ Möglich
    *   **Umsetzung:** Das Frontend speichert den Token lokal und verifiziert ihn beim App-Start über den Endpunkt `GET /validatetoken`.
*   **Dozenten-Rolle erkennen & kennzeichnen:** 
    *   **Status:** ⚠️ Lücke
    *   **Problem:** Der Endpunkt `GET /getprofiles` liefert kein explizites Rollen-Feld für die User.
    *   **Workaround:** Da sich das Format der `User-ID` bei Studierenden und Dozenten unterscheidet, analysiert das Frontend die ID. Wird ein Dozenten-Format erkannt, fügt das Frontend automatisch das optische Abzeichen (z. B. `[Dozent]`) in der UI hinzu und schaltet Dozenten-spezifische Features frei.

## 2. Raum- & Gruppenmanagement

*   **Intelligente Raumbenennung & Modulkatalog:** 
    *   **Status:** ✅ Möglich
    *   **Umsetzung:** Beim Anlegen eines Raumes über `GET /createchat` generiert das Frontend den Namen nach unserem Schema (z. B. `WS26::MOD::Mathe_1::SUB::Lerngruppe_A`). Über `GET /getchats` werden alle öffentlichen Räume geladen. Das Frontend parst die Namen und baut daraus die visuelle Baumstruktur und den Modulkatalog.
*   **Berechtigungen für Modulerstellung:** 
    *   **Status:** ⚠️ Lücke
    *   **Problem:** Die API erlaubt es jedem User, öffentliche Chats (`ispublic=true`) zu erstellen.
    *   **Workaround:** Das Frontend blendet den Button zur Erstellung von Hauptmodulen für normale Studierende aus. Nur wenn die App den User anhand der `User-ID` als Dozent identifiziert, wird diese Funktion in der Oberfläche freigeschaltet.
*   **Direkteinladungen per User-ID:** 
    *   **Status:** ⚠️ Umweg erforderlich
    *   **Problem:** Die Anforderung besagt, dass User über ihre `User-ID` eingeladen werden sollen. Der Endpunkt `GET /invite` erwartet jedoch zwingend den `invitedhash`.
    *   **Workaround:** Wenn ein Nutzer jemanden per User-ID einladen möchte, ruft das Frontend im Hintergrund `GET /getprofiles` ab, sucht den passenden Hash zur eingegebenen User-ID und sendet erst dann den Invite-Request an den Server.

## 3. Nachrichten & Dateien

*   **Echtzeit-Chat (Echtzeit-Kommunikation):** 
    *   **Status:** ⚠️ Lücke
    *   **Problem:** Der Server unterstützt keine Push-Technologien wie WebSockets.
    *   **Workaround:** Das Frontend muss "Polling" implementieren. Die App fragt in regelmäßigen Abständen `GET /getmessages` ab. Dabei wird die ID der zuletzt empfangenen Nachricht als `fromid` übergeben, um Traffic zu sparen und nur neue Nachrichten zu laden.
*   **Bilder & Dateien teilen:** 
    *   **Status:** ✅ Möglich
    *   **Umsetzung:** `POST /postmessage` unterstützt das Senden von Base64-kodierten Dateien und Bildern. Der Download erfolgt anschließend regulär über `GET /getphoto` bzw. `GET /getfile`.

## 4. Archivierung (Nachschlagewerk)

*   **Read-Only-Modus für vergangene Semester:** 
    *   **Status:** ⚠️ Lücke
    *   **Problem:** Der Chat-Server hat keine native Archiv-Funktion oder Möglichkeiten, Schreibrechte für einzelne Räume serverseitig zu entziehen.
    *   **Workaround:** Das Frontend übernimmt die komplette Logik. Wenn die App die Chats lädt, wird das Semester aus dem Chat-Namen ausgelesen (z. B. `WS25`). Liegt das Semester in der Vergangenheit, wird in der UI ein "Archiviert" Banner eingeblendet und das Texteingabefeld komplett deaktiviert. Alte Nachrichten und Dateien bleiben normal lesbar.
