// Pure pieces the hooks module builds on: the term finder's instructions and where the glossary file goes.

export type Language = 'Deutsch' | 'English'

/** Used when nobody filled in the "profil" setting. */
export const DEFAULT_PROFILE =
  'eine Person, die Code lesen und Architektur verstehen kann, aber nicht selbst programmiert'

const STYLE: Record<Language, string> = {
  Deutsch: 'Die Erklärung auf Deutsch, Du-Form, ein bis zwei Sätze, konkret, auf Anwendungsebene.',
  English: 'Write the explanation in English, addressing the reader directly, one or two sentences, concrete and practical.',
}

/** The instructions for the small model that picks the terms a reader needs explained. */
export function systemPrompt({ profile, language }: { profile: string; language: Language }): string {
  const reader = profile.trim() || DEFAULT_PROFILE
  return `Du hilfst einer Person, Fachbegriffe in Antworten eines Coding-Assistenten zu verstehen. Die Person: ${reader}.
Du bekommst eine Antwort des Assistenten. Nenne die Fachbegriffe, Abkürzungen und Konzepte darin, die diese Person vermutlich nicht sicher kennt: Begriffe aus Programmierung, Infrastruktur, Datenbanken, Protokollen, Tooling. Keine Alltagswörter, keine Produktnamen, die nur Namen sind, keine Begriffe, die in der Antwort selbst schon erklärt werden, und keine aus der Liste bekannter Begriffe.
Antworte NUR mit einem JSON-Array, ohne Markdown, ohne Text davor oder danach: [{"begriff": "...", "erklaerung": "..."}]. Der Begriff genau so geschrieben wie in der Antwort. ${STYLE[language]} Höchstens 8 Einträge; ein leeres Array [] wenn nichts zu erklären ist.`
}

/**
 * Where new explanations are appended: relative paths and `~/` start in the home folder, absolute paths
 * stay as they are. An empty setting (or no home folder) switches the file off.
 */
export function glossaryPath(home: string, file: string): string | null {
  const f = file.trim()
  if (f === '') return null
  if (f.startsWith('/')) return f
  if (!home) return null
  return `${home}/${f.startsWith('~/') ? f.slice(2) : f}`
}
