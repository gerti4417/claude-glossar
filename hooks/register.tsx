import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Block, Term } from '../types'
import { glossaryPath, systemPrompt, type Language } from './prompt'

const PANE = 'glossar'
const STORE_KEY = 'glossary-1'
const OPEN = { id: PANE, title: 'Glossar', focus: true, closeOnEscape: true, columns: 48 } as const

// The terms this session has met, in the order they were met.
const terms = atom({ plugin: 'glossar', key: 'terms' } as const, [], { shape: 'terms-2' })
// The response blocks of the main conversation so far, so a term knows where it first appeared.
const blocks = atom({ plugin: 'glossar', key: 'blocks' } as const, [], { shape: 'blocks-1' })
// The slug of the term whose explanation the pane shows open.
const selected = atom({ plugin: 'glossar', key: 'selected' } as const, null)
// True while a term extraction runs.
const isBusy = atom({ plugin: 'glossar', key: 'isBusy' } as const, false)

// What the global store keeps across sessions and projects: every term ever explained.
type Stored = Record<string, { term: string; explanation: string; context: string; date: string }>

function slugOf(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Does the term occur in the text as a whole word? Case-insensitive, letters as boundaries.
function occursIn(text: string, term: string): boolean {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, 'iu')

  return re.test(text)
}

// Whitespace collapsed, so a block's text compares the same however a surface wraps it.
function norm(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

// Is this block the one the term first appeared in? By id, else by the start of its text.
function isFirstBlock(t: Term, id: string, text: string): boolean {
  if (t.firstIn && t.firstIn === id) return true
  if (!t.firstText) return false

  return norm(text).includes(t.firstText)
}

function today(at: number): string {
  const d = new Date(at)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseTerms(text: string): Array<{ term: string; explanation: string }> {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  try {
    const raw: unknown = JSON.parse(text.slice(start, end + 1))
    if (!Array.isArray(raw)) return []

    return raw
      .map(one => {
        if (typeof one !== 'object' || one === null) return null
        const o = one as Record<string, unknown>
        const term = typeof o.begriff === 'string' ? o.begriff.trim() : ''
        const explanation = typeof o.erklaerung === 'string' ? o.erklaerung.trim() : ''
        if (!term || !explanation || term.length > 60) return null

        return { term, explanation }
      })
      .filter((one): one is { term: string; explanation: string } => one !== null)
  } catch {
    return []
  }
}

export const register: Register = (on, options) => {
  // The three settings each person fills in on install (plugin.json userConfig); empty means the default.
  const settings = {
    profile: typeof options.profil === 'string' ? options.profil : '',
    language: (options.sprache === 'English' ? 'English' : 'Deutsch') as Language,
    file: typeof options.datei === 'string' ? options.datei : '.claude/glossar.md',
    // A separate switch: an empty text field is not stored on a first install, so it cannot mean "off".
    write: options.mitschreiben !== false,
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'glossar',
      description: 'Öffnet das Glossar der Fachbegriffe dieser Sitzung',
    })

    // The whole session's glossary, whatever happened before this load: every answer so far,
    // matched against the terms the store already explains, each placed at its first answer.
    const stored = ((await $.store.get(STORE_KEY)) ?? {}) as Stored
    const entries = Object.values(stored)
    if (entries.length > 0) {
      const messages = await $.session.messages()
      const rebuilt: Term[] = []
      for (const m of messages) {
        if (m.role !== 'assistant' || !m.text.trim()) continue
        for (const entry of entries) {
          const slug = slugOf(entry.term)
          if (rebuilt.some(t => t.slug === slug) || !occursIn(m.text, entry.term)) continue
          rebuilt.push({ term: entry.term, explanation: entry.explanation, slug, firstIn: '', firstText: norm(m.text).slice(0, 160) })
        }
      }
      await update($, terms, list => {
        // One entry per slug: what an earlier version may have doubled is folded here.
        const have = new Set<string>()
        const clean = [...list, ...rebuilt].filter(t => (have.has(t.slug) ? false : (have.add(t.slug), true)))

        return clean
      })
    }

    return next(e)
  })

  on('command.run', { command: 'glossar' }, async $ => {
    const list = await read($, terms)
    const opened = await $.ui.open(OPEN)
    const surfaces = await $.session.surfaces()
    const where = `Oberflächen: ${surfaces.length ? surfaces.join(', ') : 'keine'} · Pane ${opened.isPlaced ? 'platziert' : 'nicht platziert'}`

    return { text: list.length === 0 ? `Noch keine Begriffe in dieser Sitzung. ${where}` : `${list.length} Begriffe. ${where}` }
  })

  // Every response block of the main conversation, as it is stored: remembered with its id.
  on('session.append', { door: 'response' }, async ($, e, next) => {
    const out = await next(e)
    if (e.agentId !== undefined || e.message.type !== 'assistant') return out
    const text = e.message.content
      .map(b => (b.type === 'text' && typeof b.text === 'string' ? b.text : ''))
      .filter(Boolean)
      .join('\n')
    if (text.trim().length > 0) await update($, blocks, list => [...list, { id: e.uuid, text }].slice(-400))

    return out
  })

  // After each answer of the main loop: match known terms locally, ask a small model for new ones.
  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    if (e.agentId !== undefined || e.reason !== 'answer') return out
    const answer = e.answer.trim()
    if (answer.length < 40) return out

    await update($, isBusy, () => true)
    try {
      const stored = ((await $.store.get(STORE_KEY)) ?? {}) as Stored
      const known = await read($, terms)
      const rows = await read($, blocks)
      const found: Term[] = []

      // Where a term first appeared: the earliest stored block that holds it, else the answer itself.
      const place = (term: string): Pick<Term, 'firstIn' | 'firstText'> => {
        const first: Block | undefined = rows.find(b => occursIn(b.text, term))

        return { firstIn: first?.id ?? '', firstText: norm(first?.text ?? answer).slice(0, 160) }
      }

      // Terms the store already explains, found again in this answer: no model call needed.
      for (const entry of Object.values(stored)) {
        const slug = slugOf(entry.term)
        if (known.some(k => k.slug === slug)) continue
        if (occursIn(answer, entry.term)) found.push({ term: entry.term, explanation: entry.explanation, slug, ...place(entry.term) })
      }

      const knownNames = [...known.map(k => k.term), ...Object.values(stored).map(s => s.term)]
      const reply = await $.model.complete({
        model: 'haiku',
        system: systemPrompt(settings),
        prompt: `Bekannte Begriffe (nicht nennen): ${knownNames.join(', ') || '(keine)'}\n\nAntwort des Assistenten:\n\n${answer.slice(0, 12000)}`,
        effort: 'low',
        maxTokens: 1200,
        timeoutMs: 20000,
      })

      const fresh = reply.isAnswered ? parseTerms(reply.text) : []
      const at = await $.clock.now()
      const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
      const path = settings.write ? glossaryPath(home, settings.file) : null
      const cwd = await $.env.get('PWD')
      const context = cwd ? cwd.split('/').pop() ?? '' : ''
      let file: string | null = null

      for (const one of fresh) {
        const slug = slugOf(one.term)
        if (!slug || known.some(k => k.slug === slug) || found.some(f => f.slug === slug)) continue
        found.push({ term: one.term, explanation: one.explanation, slug, ...place(one.term) })
        if (!stored[slug]) {
          stored[slug] = { term: one.term, explanation: one.explanation, context, date: today(at) }
          // Mirror into the person's own glossary file, one line per term, never twice.
          if (path) {
            const current: string = file ?? ((await $.fs.exists(path)) ? await $.fs.read(path) : '# Glossar\n')
            file = current.includes(`- **${one.term}**`)
              ? current
              : `${current.replace(/\n*$/, '\n')}- **${one.term}** — ${one.explanation} · ${context || 'Claude Code'} · ${today(at)}\n`
          }
        }
      }

      // The file first: a term counts as explained only once it is where the person reads it.
      let isFileWritten = true
      if (file !== null && path) {
        try {
          await $.fs.write(path, file)
        } catch {
          isFileWritten = false
          $.ui.status(`Glossar-Datei nicht schreibbar: ${path}. Pfad unter /config prüfen.`)
        }
      }
      if (fresh.length > 0 && isFileWritten) await $.store.set(STORE_KEY, stored)
      if (found.length > 0) {
        // Deduplicate on write: a reload's rebuild may have added the same terms while the model call ran.
        await update($, terms, list => {
          const have = new Set(list.map(t => t.slug))

          return [...list, ...found.filter(t => !have.has(t.slug))]
        })
        $.ui.status(`Glossar: ${found.length} neu`)
      }
    } finally {
      await update($, isBusy, () => false)
    }

    return out
  })

  // Under the block a term first appeared in: a chip. Hover lights the pane row too.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const drawn = await next(e)
    const list = await read($, terms)
    const here = list.filter(t => occursIn(e.props.text, t.term) && isFirstBlock(t, e.requestId, e.props.text))
    if (here.length === 0) return drawn

    const { Box, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {drawn}
        <Box key="chips" flexWrap="wrap">
          {here.map(t => (
            <Button
              key={`chip-${t.slug}`}
              plain
              label={t.term}
              hover={{ scope: `g-${t.slug}`, inverse: true }}
              onPress={async () => {
                await update($, selected, () => t.slug)
                await $.ui.open(OPEN)
              }}
            />
          ))}
        </Box>
      </Box>
    )
  })

  // The pane: every term of the session, alphabetical; the selected one shows its explanation.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = [...(await read($, terms))].sort((a, b) => a.term.localeCompare(b.term, 'de'))
    const open = await read($, selected)
    const busy = await read($, isBusy)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>{busy ? 'Begriffe werden gesucht …' : 'Noch keine Begriffe in dieser Sitzung.'}</Text>}
        {list.map(t => (
          <Box key={`row-${t.slug}`} flexDirection="column">
            <Button
              key={`term-${t.slug}`}
              plain
              label={t.term}
              hover={{ scope: `g-${t.slug}`, inverse: true }}
              onPress={() => update($, selected, cur => (cur === t.slug ? null : t.slug))}
            />
            {open === t.slug && (
              <Box paddingLeft={2} paddingRight={1} marginBottom={1}>
                <Text wrap="wrap">{t.explanation}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    )
  })

  // No band above the prompt: /glossar and the chips are the ways in.
}
