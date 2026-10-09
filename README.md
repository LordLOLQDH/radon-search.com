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

## Version 0.2.0 — Backend-Vorbereitung

- Responsive Website und mobile Navigation
- Suchverlauf standardmäßig aus; ausdrückliche Aktivierung in den Einstellungen
- Supabase-Schema für Suchverlauf, Sicherheitsereignisse und Rate-Limit-Zähler
- Edge Function als Backend-Gerüst mit Anfragevalidierung, einfacher Ratenbegrenzung und Admin-E-Mail-Prüfung
- Admin-Oberfläche mit Supabase-Auth-Anmeldung und serverseitiger Admin-Prüfung
- Impressum und Datenschutzhinweise als klar markierte Vorlagen
- Keine Werbe- oder Analyse-Tracker eingebaut

## Wichtiger aktueller Status

**Das Backend ist noch nicht live verbunden.** Die öffentliche Konfiguration in assets/config.js ist absichtlich leer. Die SQL-Datei muss in einem eigenen Radon-Supabase-Projekt ausgeführt werden; danach müssen die Edge Function bereitgestellt, ihre Secrets konfiguriert und die öffentlichen URL-/Key-Werte eingetragen werden. Das KDS-AI-Projekt wird nicht für Radon Search verwendet.

Der Admin-Zugang funktioniert erst nach der Einrichtung eines Supabase-Auth-Kontos und der serverseitigen Umgebungsvariable RADON_ADMIN_EMAIL. Er benötigt außerdem RADON_ALLOWED_ORIGIN, RATE_LIMIT_SECRET und die vom Supabase-Backend bereitgestellten Datenbank-Zugangsdaten. Niemals service_role oder einen Secret Key in assets/config.js oder andere öffentliche Dateien eintragen.

## Suchverlauf, Datenschutz und Sicherheit

Suchbegriffe werden nur dann an die Backend-Funktion zum Speichern übergeben, wenn die Person die Einstellung ausdrücklich aktiviert hat. Eine aktivierte Einstellung ist keine pauschale rechtliche Freigabe; Zweck, Rechtsgrundlage, Löschfristen und Rechte müssen vor dem öffentlichen Betrieb geprüft und transparent dokumentiert werden. Der aktuelle Filter erkennt nur offensichtliche ungültige Eingaben und begrenzt Anfragen; er ist kein vollständiger DDoS-Schutz oder ausgereiftes Anti-Missbrauchssystem.

Impressum und Datenschutzseite enthalten noch Platzhalter und dürfen nicht als fertige Rechtsdokumente angesehen werden. Vor dem Livebetrieb müssen Betreiberangaben, Kontakt, Anbieter der Dienste, Datenflüsse und Aufbewahrungsfristen korrekt ergänzt werden.

## Noch nicht umgesetzt

- Eigener Crawler und durchsuchbarer Webindex
- Echte Webtreffer und Relevanzsortierung
- Automatische Löschung nach festgelegter Aufbewahrungsfrist
- Produktionsreife Bot-/Missbrauchserkennung
- Live-Verbindung zu einem bereitgestellten Supabase-Projekt

## Kosten und Hosting

GitHub Pages hostet nur die statische Oberfläche, keinen dauerhaft laufenden Crawler. Supabase bietet einen kostenlosen Tarif mit Grenzen; Verfügbarkeit, Datenbank- und Funktionskontingente sind nicht unbegrenzt. Eine vollständige Abdeckung des Internets und garantierter 24/7-Betrieb können nicht versprochen werden.

## Lizenz

MIT — siehe LICENSE.
