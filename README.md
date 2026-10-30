# glossar

Ein Mod für Claude Code: Er erkennt in Claudes Antworten Fachbegriffe, die du vermutlich erklärt brauchst, und erklärt sie dir. Die Begriffe stehen als Chips unter der Antwort und gesammelt in einem Glossar-Fenster. Gedacht für Leute, die mit Claude Code arbeiten, aber nicht selbst programmieren.

*English: a Claude Code mod that spots jargon in Claude's answers and explains it in a side pane. Set the language to English on install.*

## Installation

**In der Claude-App** (Bereich *Code*), ohne Tippen und ohne GitHub-Konto:

1. **+** neben dem Eingabefeld, dann **Plugins**
2. **Add marketplace**, eintragen: `gerti4417/claude-glossar`
3. **Add plugin**, `glossar` auswählen und die Einstellungen ausfüllen (siehe unten)
4. Neue Session starten, oder `/reload-plugins` ins Eingabefeld tippen

**Im Terminal**, am Prompt einer Claude-Code-Session:

```
/plugin install glossar --marketplace gerti4417/claude-glossar
```

`y` für „Add marketplace?“, dann den Geltungsbereich *user* wählen und die Einstellungen ausfüllen.

**In VS Code** gibt es `/plugin` nicht. Dort aus der Shell:

```
claude plugin marketplace add gerti4417/claude-glossar
claude plugin install glossar@claude-glossar --scope user
```

Danach `/glossar` tippen: Das Glossar-Fenster öffnet sich. Braucht Claude Code ab Version 2.1.312 (`claude update`).

## Einstellungen

Du füllst sie bei der Installation aus und änderst sie später unter `/config`.

| Einstellung | Was sie bewirkt | Leer oder Standard |
| --- | --- | --- |
| **Wer liest mit?** | Ein Satz über dich, damit die Erklärungen passen, z. B. „Projektleiterin im Marketing, kennt Excel und WordPress, programmiert nicht“. | Jemand, der Code lesen, aber nicht selbst schreiben kann. |
| **Sprache der Erklärungen** | Deutsch (Du-Form) oder English. | Deutsch |
| **Glossar-Datei** | Wohin neue Erklärungen angehängt werden, relativ zu deinem Benutzerordner (`.claude/glossar.md`, `~/Notizen/begriffe.md`) oder als absoluter Pfad. | `.claude/glossar.md`. Ein leeres Feld schaltet die Datei ab, dann gibt es nur das Fenster. |

## Was er tut

- Nach jeder Antwort im Hauptchat fragt er ein kleines Modell (Haiku), welche Begriffe du erklärt brauchst. Höchstens acht pro Antwort, je ein bis zwei Sätze.
- Begriffe, die schon einmal erklärt wurden, erkennt er ohne Modellaufruf wieder. Er merkt sie sich über alle Projekte hinweg.
- Unter der Antwort, in der ein Begriff zum ersten Mal in der Sitzung vorkommt, steht er als Chip. Ein Klick öffnet das Fenster mit der Erklärung.
- Das Fenster „Glossar“ listet alle Begriffe der Sitzung alphabetisch. Fährst du mit der Maus über einen Begriff, werden die passenden Chips im Chat hervorgehoben, und umgekehrt.
- `/glossar` öffnet das Fenster, Esc schließt es.
- Jede neue Erklärung wird an deine Glossar-Datei angehängt, als Zeile `- **Begriff** — Erklärung · Projektordner · Datum`, nie doppelt.

## Kosten und Datenschutz

- Jede längere Antwort löst einen kleinen Modellaufruf aus, über dein eigenes Claude-Konto. Mitgeschickt werden die Antwort (höchstens 12.000 Zeichen) und die Liste der schon bekannten Begriffe, sonst nichts.
- Nichts geht an Dritte. Die Glossar-Datei liegt nur auf deinem Rechner.

## Entscheidungen

- Chips unter der Antwort statt Markierungen im Fließtext, damit die Formatierung der Antworten unangetastet bleibt.
- Kein Knopf in der VS-Code-Leiste: Mods dürfen dort nichts einfügen. Der Weg hinein sind `/glossar` und die Chips.
- Beim Laden wird das Glossar der Sitzung aus allen bisherigen Antworten und dem Speicher wieder aufgebaut. Schreibvorgänge entfernen Doppelte, weil Neuladen und laufende Auswertung sich überschneiden können.
- Nur Antworten des Hauptchats, keine Subagenten, nichts unter 40 Zeichen.
- Tests: `claude plugin test .` (Erklär-Anweisung, Dateipfad und die Wirkung der Einstellungen). Typprüfung: `tsc -p .` gegen die API-Deklarationen von Claude Code 2.1.312.
