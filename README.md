# Radon Search

Eine unabhängige Suchmaschinen-Oberfläche mit dem langfristigen Ziel, öffentlich erreichbare Websites über einen eigenen Webcrawler und Suchindex auffindbar zu machen.

## Seitenstruktur

GitHub Pages unterstützt Verzeichnisse mit einer index.html. Dadurch sind die Unterseiten ohne .html erreichbar:

- Startseite: /
- Suche: /search/
- Über das Projekt: /about/
- Einstellungen: /settings/

## Projektstatus

**Version 0.1.0 — Grundstruktur**

- Responsive Oberfläche für Mobilgeräte und Desktop
- Gemeinsames Stylesheet
- Unterseiten mit Verzeichnis-URLs
- Noch kein eigener Webcrawler oder Suchindex angeschlossen

## Roadmap

1. Kostenloses statisches Hosting aktivieren und URLs prüfen.
2. Crawler mit Rücksicht auf robots.txt, Rate Limits und Website-Regeln entwickeln.
3. Index-Speicherung und Suchabfragen einrichten.
4. Automatische, begrenzte Crawl-Läufe planen.
5. Ergebnisse nach Relevanz sortieren und Abdeckung schrittweise ausbauen.

## Kostenhinweis

GitHub Pages kann die statische Oberfläche hosten, aber keinen dauerhaft laufenden Crawler ausführen. Backend-, Speicher- und Laufzeitdienste haben jeweils eigene kostenlose Kontingente und Grenzen. Unbegrenzte, garantierte 24/7-Verfügbarkeit und ein vollständiger Index des Internets können nicht versprochen werden.

## Lizenz

MIT — siehe LICENSE.
