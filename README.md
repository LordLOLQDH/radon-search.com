# Radon Search

Eine unabhängige Suchmaschinen-Oberfläche mit dem langfristigen Ziel, öffentlich erreichbare Websites über einen eigenen Webcrawler und Suchindex auffindbar zu machen.

## Seitenstruktur

- Startseite: /
- Suche: /search/
- Über das Projekt: /about/
- Einstellungen: /settings/
- Impressum: /impressum/
- Datenschutz: /datenschutz/
- Admin-Modus: /admin/

## Version 0.3.0 — Backend bereitgestellt

- Responsive Website und mobile Navigation
- Suchverlauf standardmäßig aus; ausdrückliche Aktivierung in den Einstellungen
- Eigenes Supabase-Projekt „Radon Search“ in Frankfurt (EU), getrennt von KDS AI
- Datenbanktabellen für Suchverlauf, Sicherheitsereignisse und Rate-Limit-Zähler
- Row-Level Security und kein direkter Browserzugriff auf diese Tabellen
- Bereitgestellte Edge Function `radon-api` mit Eingabeprüfung, einfacher Ratenbegrenzung und Admin-Authentifizierung
- Öffentliche Projekt-URL und Publishable Key in `assets/config.js` verbunden
- Admin-Oberfläche mit Supabase-Auth-Anmeldung und serverseitiger Admin-Prüfung
- Keine Werbe- oder Analyse-Tracker eingebaut

## Projektstatus

Die Supabase-Datenbank und die Edge Function sind bereitgestellt. Die Datenbanktabellen und aktivierte RLS wurden nach der Einrichtung geprüft. Der Frontend-Code ist mit dem neuen Projekt verbunden.

**Noch manuell in Supabase einzurichten:** Öffne das Projekt `czlbvwufyxilavvrzvgb` im Supabase Dashboard. Unter den Edge-Function-Secrets müssen mindestens `RADON_ADMIN_EMAIL` (E-Mail des Admin-Auth-Kontos) und idealerweise `RATE_LIMIT_SECRET` (ein zufälliger, geheimer Wert) gesetzt werden. `RADON_ALLOWED_ORIGIN` kann auf `https://lordlolqdh.github.io` gesetzt werden. Die von Supabase bereitgestellten `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` dürfen nur serverseitig verwendet werden; niemals einen Secret- oder Service-Role-Key in `assets/config.js` oder sonstige öffentliche Dateien eintragen.

Anschließend muss unter Authentication ein Admin-Konto mit E-Mail/Passwort erstellt werden, dessen E-Mail exakt mit `RADON_ADMIN_EMAIL` übereinstimmt. Das Admin-Dashboard bleibt bis dahin gesperrt.

## Suchverlauf, Datenschutz und Sicherheit

Suchbegriffe werden nur dann an die Backend-Funktion zum Speichern übergeben, wenn die Person die Einstellung ausdrücklich aktiviert hat. Eine aktivierte Einstellung ist keine pauschale rechtliche Freigabe; Zweck, Rechtsgrundlage, Löschfristen und Rechte müssen vor dem öffentlichen Betrieb geprüft und transparent dokumentiert werden. Der aktuelle Filter erkennt nur offensichtliche ungültige Eingaben und begrenzt Anfragen; er ist kein vollständiger DDoS-Schutz oder ausgereiftes Anti-Missbrauchssystem.

Impressum und Datenschutzseite enthalten noch Platzhalter und dürfen nicht als fertige Rechtsdokumente angesehen werden. Vor dem öffentlichen Betrieb müssen Betreiberangaben, Kontakt, Anbieter der Dienste, Datenflüsse und Aufbewahrungsfristen korrekt ergänzt werden.

## Noch nicht umgesetzt

- Eigener Crawler und durchsuchbarer Webindex
- Echte Webtreffer und Relevanzsortierung — die API meldet derzeit ausdrücklich, dass noch kein Index angeschlossen ist
- Automatische Löschung nach festgelegter Aufbewahrungsfrist
- Produktionsreife Bot-/Missbrauchserkennung
- Bestätigung des Live-Verhaltens der API aus einem externen Browser-Test

## Kosten und Hosting

Die Kostenprüfung für das neu angelegte Supabase-Projekt ergab zum Erstellungszeitpunkt 0 USD pro Monat. Kostenfreiheit und Verfügbarkeit sind nicht unbegrenzt garantiert; Free-Tier-Grenzen können sich ändern. GitHub Pages hostet nur die statische Oberfläche, keinen dauerhaft laufenden Crawler. Eine vollständige Abdeckung des Internets und garantierter 24/7-Betrieb können nicht versprochen werden.

## Lizenz

MIT — siehe LICENSE.
