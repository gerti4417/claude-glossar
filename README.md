# glossar

Ein Mod für Claude Code: Fachbegriffe aus Claudes Antworten, erklärt für Nicht-Entwickler, als Chips unter der Antwort und als Pane rechts.

**Installation**

Am Prompt einer Claude-Code-Session im Terminal:

```
/plugin install glossar --marketplace gerti4417/claude-glossar
```

Danach `y` für „Add marketplace?“, dann mit Enter den Geltungsbereich *user* wählen. Der Mod läuft ab diesem Moment, in jeder späteren Session von selbst.

`/plugin` gibt es nur in einer Terminal-Session. In VS Code und in der Desktop-App antwortet es mit „isn’t available in this environment“. Dann stattdessen aus der Shell, zwei Zeilen:

```
claude plugin marketplace add gerti4417/claude-glossar
claude plugin install glossar@claude-glossar --scope user
```

Danach in einer laufenden Session `/reload-plugins`, oder einfach eine neue Session starten. In der Desktop-App geht es auch per Klick: **+** neben dem Eingabefeld, dann *Plugins*, *Add marketplace* mit `gerti4417/claude-glossar`, dann *Add plugin*.

Braucht Claude Code ab Version 2.1.312; ein älteres `claude` meldet beim Laden einen Fehler, der mit `claude update` verschwindet.

**Was er tut**

- Nach jeder Antwort im Hauptchat fragt er ein kleines Modell (Haiku, Effort low): Welche Begriffe braucht Gerrit erklärt? Höchstens acht pro Antwort, je ein bis zwei Sätze Erklärung.
- Begriffe, die schon einmal erklärt wurden (globaler Mod-Speicher über alle Projekte), werden ohne Modellaufruf wiedererkannt.
- Unter dem Antwortblock, in dem ein Begriff zum ersten Mal in der Sitzung vorkommt, steht er als Chip; spätere Vorkommen bleiben ohne Chip. Klick auf einen Chip öffnet das Pane mit dem Begriff aufgeklappt.
- Das Pane „Glossar“ listet alle Begriffe der Sitzung alphabetisch. Klick klappt die Erklärung auf. Maus über einer Zeile hebt alle Chips dieses Begriffs im Chat hervor, Maus über einem Chip hebt die Zeile im Pane hervor (gemeinsamer Hover-Scope).
- `/glossar` öffnet das Pane (keine Zeile über der Eingabe, auf Gerrits Wunsch). Esc schließt es.
- Jede neue Erklärung wird an `~/.claude/glossar.md` angehängt, im Format `- **Begriff** — Erklärung · Projekt · YYYY-MM-DD`, nie doppelt.

**Entscheidungen**

- Stufe 1: Chips unter der Antwort statt Markierung im Fließtext, damit die Formatierung der Antworten unangetastet bleibt. Markierung im Text wäre Stufe 2.
- Kein Knopf in der VS-Code-Leiste: Mods dürfen dort nichts einfügen, und die Zeile über der Eingabe war Gerrit zu auffällig. Deshalb nur /glossar und die Chips.
- Beim Laden wird das Sitzungs-Glossar aus allen bisherigen Antworten und dem globalen Speicher rekonstruiert; Schreibvorgänge deduplizieren nach Begriff, weil Neuladen und laufende Auswertung sich überschneiden können.
- Nur Antworten des Hauptchats, keine Subagenten, nichts unter 40 Zeichen.
- Begriffsabgleich im Text als ganzes Wort, Groß-/Kleinschreibung egal.
- Geprüft mit `tsc` gegen die API-Deklarationen von Claude Code 2.1.312. `claude plugin validate` der CLI 2.1.206 kennt das Hooks-Modul-Format nicht und meldet einen Fehler, der keiner ist.
