# Co-Creating AI Ethics – Interaktive Lernplattform

**Entwickelt von:** Boris Liu
**Auftraggeber:** Technical University of Munich (TUM) – Institute for Ethics in Artificial Intelligence (IEAI)
**Förderprojekt:** „Co-designing a Risk-Assessment Dashboard for AI Ethics Literacy in EdTech"
**Lizenz:** Creative Commons Attribution 4.0 International (CC BY 4.0)
**Live-Website:** https://aiethics-5ncx.onrender.com

---

## Was ist dieses Projekt?

„Co-Creating AI Ethics" ist eine vollständige, interaktive **Bildungswebsite**, die jungen Menschen (Schülerinnen und Schüler im Alter von ca. 12–15 Jahren) beibringt, wie man Künstliche Intelligenz (KI) **ethisch und verantwortungsvoll** nutzt. Das Projekt entstand im Auftrag des Instituts für Ethik in der Künstlichen Intelligenz an der Technischen Universität München (TUM-IEAI).

Die Website verbindet **kreative Kunstprojekte** (z. B. Zeichnen, Basteln, Collagen) mit modernen **KI-Werkzeugen** und regt Schülerinnen und Schüler an, kritisch über den Einsatz von KI nachzudenken – etwa: Wem gehört ein KI-generiertes Bild? Ist es fair, wenn ein Algorithmus entscheidet, was ich lerne? Was passiert mit meinen Daten?

Der didaktische Ansatz folgt den **OECD-Prinzipien für verantwortungsvolle KI** und ist für den Einsatz im Unterricht konzipiert.

---

## Was wurde entwickelt?

Boris Liu hat diese Plattform **von Grund auf eigenständig konzipiert, gestaltet und technisch umgesetzt**. Im Einzelnen umfasst das Projekt:

### 1. Komplette Website mit mehreren Bereichen

Die Website besteht aus folgenden Hauptbereichen:

- **Startseite** – Übersicht und Einführung in das Thema KI-Ethik
- **9 interaktive Lernaktivitäten** – Anleitungen für kreative Unterrichtsprojekte
- **10 Ethik-Szenarien** – Reale Fallbeispiele aus dem Schulalltag mit Diskussionsmaterial
- **Forschungsbereich** – Verlinkung zu wissenschaftlichen Publikationen des TUM-IEAI
- **Feedback-Bereich** – Formular zur Rückmeldung für Lehrkräfte und Schüler
- **Datenschutz & Impressum** – Rechtlich konforme Seiten
- **Admin-Bereich** – Verwaltungsoberfläche für Nutzerzugänge und Feedback-Auswertung

---

### 2. Die 9 Lernaktivitäten (je ca. 45 Minuten)

Jede Aktivität kombiniert physisches Gestalten mit dem Einsatz von KI-Bildgenerierung und enthält:
- Schritt-für-Schritt-Anleitungen
- Lehrerhandbuch und Schülerarbeitsblatt (als PDF zum Download)
- Gesprächsimpulse zu ethischen Fragen

| # | Aktivität | Thema |
|---|-----------|-------|
| 1 | **Hommage an lokale Künstler** | KI-Bilderzeugung, Urheberrecht, Kreativität |
| 2 | **Magazin-Collagen** | Iterative Gestaltung mit KI und realen Materialien |
| 3 | **Zeichnungen mit Texturen** | Kombination von Handzeichnung und KI |
| 4 | **Expanded Frames** | KI-Kunst mit physischen Bilderrahmen |
| 5 | **KI-Superheld** | Storytelling und Comicgestaltung mit KI |
| 6 | **Prototyp-Pitch für KI-Produkte** | KI für nachhaltige Entwicklungsziele (SDGs) |
| 7 | **Zeitkapsel** | KI, Gesellschaft und Zukunftsvisionen |
| 8 | **KI-Karriere-Figuren trainieren** | Training eigener KI-Modelle mit Google Teachable Machine |
| 9 | **Knetmasse-Storyboards** | Physisches Modellieren kombiniert mit KI-Bildgenerierung |

---

### 3. Die 10 Ethik-Szenarien

Die Szenarien zeigen kritische oder potenziell problematische Einsätze von KI im Bildungsbereich. Sie beinhalten Comic-artige Illustrationen, Hintergrundinformationen und strukturierte Diskussionsimpulse. Themen sind u. a.:

- KI-Bildgenerierung und Urheberschaft
- Deepfakes im Unterricht
- Algorithmen in sozialen Medien
- KI-generiertes Feedback von Lehrkräften
- Gesichtserkennung zur Wohlbefindensüberwachung
- Personalisiertes Lernen durch KI-Tutorsysteme
- KI-gestützte Klassenraumüberwachung

---

### 4. Technische Umsetzung (nicht-technische Zusammenfassung)

Boris Liu hat die gesamte technische Infrastruktur der Plattform selbstständig entwickelt:

**Was das bedeutet in einfachen Worten:**

- Er hat die **komplette Website** gebaut – alle Seiten, das Design und die Bedienung.
- Er hat **KI-Schnittstellen eingebunden** – die Website kann selbst Bilder mit KI generieren (über Google Imagen 4.0), direkt im Browser.
- Er hat ein **Benutzer-Anmeldesystem** entwickelt – Lehrkräfte können sich mit einem Passwort anmelden; Zugänge sind zeitlich begrenzt und gesichert.
- Er hat eine **Datenbank** (Supabase/PostgreSQL) eingerichtet, in der Feedback der Nutzerinnen und Nutzer gespeichert wird.
- Er hat **interaktive Chatbots** für einzelne Aktivitäten eingebunden, die Schülerinnen und Schüler durch die Übungen begleiten.
- Er hat ein **Admin-Panel** gebaut, über das Zugänge und Rückmeldungen verwaltet werden können.
- Er hat die Website auf einem **Cloud-Server** (Render) deployed, sodass sie weltweit erreichbar ist.
- Er hat **PDF-Generierung** eingebaut, sodass Lernmaterialien direkt heruntergeladen werden können.
- Die Website ist vollständig **responsiv** – sie funktioniert sowohl auf Computern als auch auf Tablets und Smartphones.

**Eingesetzte Technologien (vereinfacht erklärt):**

| Bereich | Eingesetzt |
|---------|-----------|
| Webseiten-Programmierung | HTML, CSS, JavaScript |
| Server-Programmierung | Node.js / Express.js |
| KI-Bildgenerierung | Google Imagen 4.0, FAL AI |
| Datenbank | Supabase (PostgreSQL) |
| PDF-Erstellung | pdf-lib |
| Bildverarbeitung | Sharp |
| Hosting | Render (Cloud) |
| Lizenz | Creative Commons CC BY 4.0 |

---

## Wissenschaftlicher Kontext

Die Plattform entstand im Rahmen eines aktiven Forschungsprojekts an der TUM. Die zugehörigen wissenschaftlichen Publikationen wurden bei internationalen Konferenzen veröffentlicht:

- **Humburg et al. (2025)** – Präsentation auf der ICLS 2025
- **Keune et al. (2024)** – Präsentation auf der ICLS 2024 zu KI-Ethik-Szenarien
- **Keune & Hurtado (2025)** – IEAI Research Brief: „Art Making with AI"

---

## Kontakt & Institution

**Institut:** Institute for Ethics in Artificial Intelligence (IEAI)
Technische Universität München
Marsstraße 20–22, 80335 München
**Kontakt:** s.hurtado@tum.de

---

## Zusammenfassung für das Arbeitszeugnis

Boris Liu hat im Rahmen dieses Projekts eine umfangreiche, vollständig funktionsfähige Bildungsplattform für die Technische Universität München entwickelt. Er übernahm dabei sowohl die **konzeptionelle Gestaltung** (Aufbau der Inhaltsstruktur, Nutzerführung, didaktisches Design) als auch die **gesamte technische Umsetzung** (Programmierung der Website, Einbindung von KI-Diensten, Entwicklung eines Anmeldesystems, Datenbankanbindung, Cloud-Deployment).

Die fertige Plattform umfasst **über 25 einzelne Unterseiten**, **9 vollständige Lernaktivitäten**, **10 Ethik-Szenarien**, ein **Feedback-System**, ein **Benutzerverwaltungssystem** und eine direkte **KI-Bildgenerierungsfunktion** – alles eigenständig entwickelt und live im Internet verfügbar.

Das Projekt zeigt Boris Lius Fähigkeit, komplexe digitale Produkte selbstständig und kompetent von der Idee bis zur fertigen Umsetzung zu realisieren.
